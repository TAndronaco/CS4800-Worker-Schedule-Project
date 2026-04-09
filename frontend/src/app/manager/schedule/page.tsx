"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }
interface Member { id: number; first_name: string; last_name: string; }
interface Shift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  first_name: string;
  last_name: string;
  employee_id: number;
}

interface TooltipState {
  top: number;
  left: number;
  shifts: Shift[];
}

interface ProposedShift {
  employee_id: number;
  employeeName: string;
  date: string;
  start_time: string;
  end_time: string;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM – 10 PM
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EMPTY_FORM = { employee_id: "", date: "", start_time: "", end_time: "" };

function pad2(n: number) { return String(n).padStart(2, "0"); }

function buildAutoSchedule(
  employees: Member[],
  weekDays: string[],
  activeDays: boolean[],
  coverStart: number,
  coverEnd: number
): ProposedShift[] {
  if (employees.length < 2 || coverEnd <= coverStart) return [];
  const proposed: ProposedShift[] = [];

  // Round-robin index across the whole week so different employees lead each day
  let globalRoundRobin = 0;

  for (let di = 0; di < weekDays.length; di++) {
    if (!activeDays[di]) continue;
    const date = weekDays[di];
    // Track hours worked per employee this day (employee id -> hours)
    const dayHours: Record<number, number> = {};
    employees.forEach((e) => (dayHours[e.id] = 0));

    const windowSize = coverEnd - coverStart;

    if (windowSize <= 8) {
      // One shift per assigned employee covering the entire window
      let assigned = 0;
      for (let attempt = 0; attempt < employees.length && assigned < 2; attempt++) {
        const emp = employees[(globalRoundRobin + attempt) % employees.length];
        if (dayHours[emp.id] + windowSize <= 8) {
          proposed.push({
            employee_id: emp.id,
            employeeName: `${emp.first_name} ${emp.last_name}`,
            date,
            start_time: `${pad2(coverStart)}:00`,
            end_time: `${pad2(coverEnd)}:00`,
          });
          dayHours[emp.id] += windowSize;
          assigned++;
        }
      }
      globalRoundRobin = (globalRoundRobin + 2) % employees.length;
    } else {
      // Split into max-8-hour segments and assign 2 employees per segment
      let cursor = coverStart;
      let segIndex = 0;
      while (cursor < coverEnd) {
        const segEnd = Math.min(cursor + 8, coverEnd);
        const segLen = segEnd - cursor;
        let assigned = 0;
        const baseIdx = (globalRoundRobin + segIndex * 2) % employees.length;
        for (let attempt = 0; attempt < employees.length && assigned < 2; attempt++) {
          const emp = employees[(baseIdx + attempt) % employees.length];
          if (dayHours[emp.id] + segLen <= 8) {
            proposed.push({
              employee_id: emp.id,
              employeeName: `${emp.first_name} ${emp.last_name}`,
              date,
              start_time: `${pad2(cursor)}:00`,
              end_time: `${pad2(segEnd)}:00`,
            });
            dayHours[emp.id] += segLen;
            assigned++;
          }
        }
        cursor = segEnd;
        segIndex++;
      }
      globalRoundRobin = (globalRoundRobin + 2) % employees.length;
    }
  }

  return proposed;
}

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getWeekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function shiftsForCell(shifts: Shift[], day: string, hour: number): Shift[] {
  return shifts.filter((s) => {
    if (s.date.split("T")[0] !== day) return false;
    const [startH] = s.start_time.split(":").map(Number);
    const [endH, endM] = s.end_time.split(":").map(Number);
    return startH <= hour && endH * 60 + endM > hour * 60;
  });
}

export default function ManagerSchedulePage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [originalShifts, setOriginalShifts] = useState<Shift[]>([]); // From DB
  const [shifts, setShifts] = useState<Shift[]>([]); // Local working copy
  const [week, setWeek] = useState(getMondayOf(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate modal state
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoStep, setAutoStep] = useState<"config" | "preview">("config");
  const [autoEmployees, setAutoEmployees] = useState<number[]>([]);
  const [autoCoverStart, setAutoCoverStart] = useState(9);
  const [autoCoverEnd, setAutoCoverEnd] = useState(17);
  const [autoDays, setAutoDays] = useState([true, true, true, true, true, false, false]);
  const [proposedShifts, setProposedShifts] = useState<ProposedShift[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [autoError, setAutoError] = useState("");

  const isDirty = JSON.stringify(originalShifts) !== JSON.stringify(shifts);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "manager") { router.push("/dashboard"); return; }
    apiFetch("/teams")
      .then((r) => r.json())
      .then((data: Team[]) => {
        setTeams(data);
        if (data.length > 0) setSelectedTeam(data[0].id);
      });
  }, [router]);

  useEffect(() => {
    if (!selectedTeam) return;
    apiFetch(`/teams/${selectedTeam}/members`).then((r) => r.json()).then(setMembers);
    apiFetch(`/shifts?team_id=${selectedTeam}&week=${week}`).then((r) => r.json()).then((data) => {
      setOriginalShifts(data);
      setShifts(data);
    });
  }, [selectedTeam, week]);

  function addShift(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    const emp = members.find(m => String(m.id) === form.employee_id);
    if (!emp) return;

    const newShift: Shift = {
      id: Math.random() * -1, // Temporary negative ID for local-only shifts
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      employee_id: Number(form.employee_id),
      first_name: emp.first_name,
      last_name: emp.last_name
    };

    // Replace if duplicate locally
    setShifts(prev => {
      const filtered = prev.filter(s => 
        !(s.employee_id === newShift.employee_id && s.date.split('T')[0] === newShift.date.split('T')[0])
      );
      return [...filtered, newShift].sort((a, b) => a.date.localeCompare(b.date));
    });

    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function deleteShift(id: number) {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    setTooltip((prev) =>
      prev ? { ...prev, shifts: prev.shifts.filter((s) => s.id !== id) } : null
    );
  }

  async function persistChanges() {
    setIsSaving(true);
    try {
      // 1. Clear the week first to make it a clean sync
      await apiFetch(`/shifts/bulk?team_id=${selectedTeam}&week=${week}`, {
        method: "DELETE",
      });

      // 2. Save all current local shifts
      for (const s of shifts) {
        await apiFetch("/shifts", {
          method: "POST",
          body: JSON.stringify({
            team_id: selectedTeam,
            employee_id: String(s.employee_id),
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
          }),
        });
      }

      // 3. Refresh from server to get real IDs
      const res = await apiFetch(`/shifts?team_id=${selectedTeam}&week=${week}`);
      const data = await res.json();
      setOriginalShifts(data);
      setShifts(data);
      alert("Changes saved successfully!");
    } catch (e) {
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  function discardChanges() {
    if (confirm("Discard all unsaved changes?")) {
      setShifts(originalShifts);
    }
  }

  function changeWeek(dir: number) {
    if (isDirty && !confirm("You have unsaved changes. Change week anyway?")) {
      return;
    }
    const d = new Date(week);
    d.setDate(d.getDate() + dir * 7);
    setWeek(d.toISOString().split("T")[0]);
  }

  function openTooltip(e: React.MouseEvent<HTMLTableCellElement>, cellShifts: Shift[]) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 260;
    const left = Math.min(rect.left, window.innerWidth - tooltipWidth - 8);
    setTooltip({ top: rect.bottom + 4, left, shifts: cellShifts });
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setTooltip(null), 150);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  const weekDays = getWeekDays(week);

  function openAutoModal() {
    setAutoEmployees(members.map((m) => m.id));
    setAutoStep("config");
    setProposedShifts([]);
    setAutoError("");
    setShowAutoModal(true);
  }

  function toggleAutoEmployee(id: number) {
    setAutoEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  function toggleAutoDay(i: number) {
    setAutoDays((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function handleGenerate() {
    setAutoError("");
    if (autoEmployees.length < 2) {
      setAutoError("Select at least 2 employees.");
      return;
    }
    if (autoCoverEnd <= autoCoverStart) {
      setAutoError("End hour must be after start hour.");
      return;
    }
    if (!autoDays.some(Boolean)) {
      setAutoError("Select at least one day.");
      return;
    }
    const selectedMembers = members.filter((m) => autoEmployees.includes(m.id));
    const proposed = buildAutoSchedule(
      selectedMembers, weekDays, autoDays, autoCoverStart, autoCoverEnd
    );
    if (proposed.length === 0) {
      setAutoError("Not enough employees to meet the 2-per-hour requirement. Add more employees or reduce coverage hours.");
      return;
    }
    setProposedShifts(proposed);
    setAutoStep("preview");
  }

  function handleResetSchedule() {
    if (confirm(`Clear all shifts locally? You must click "Save Changes" to apply this to the database.`)) {
      setShifts([]);
    }
  }

  function handleConfirmSave() {
    // Add proposed shifts to local state
    setShifts(prev => {
      // Create a map of existing shifts for faster replacement
      const current = [...prev];
      proposedShifts.forEach(ps => {
        // Remove any existing shift for this employee on this date
        const idx = current.findIndex(s => 
          s.employee_id === ps.employee_id && 
          s.date.split('T')[0] === ps.date.split('T')[0]
        );
        const newS: Shift = {
          id: Math.random() * -1,
          date: ps.date,
          start_time: ps.start_time,
          end_time: ps.end_time,
          employee_id: ps.employee_id,
          first_name: ps.employeeName.split(' ')[0],
          last_name: ps.employeeName.split(' ')[1] || ''
        };
        if (idx > -1) current[idx] = newS;
        else current.push(newS);
      });
      return current.sort((a, b) => a.date.localeCompare(b.date));
    });
    setShowAutoModal(false);
  }

  return (
    <div className={styles.container}>
      {isDirty && (
        <div className={styles.dirtyBar}>
          <span>⚠️ You have unsaved changes</span>
          <div className={styles.dirtyActions}>
            <button className={styles.discardBtn} onClick={discardChanges} disabled={isSaving}>
              Discard
            </button>
            <button className={styles.saveBtn} onClick={persistChanges} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>Schedule</h1>

      <div className={styles.controls}>
        <select
          value={selectedTeam ?? ""}
          onChange={(e) => setSelectedTeam(Number(e.target.value))}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className={styles.weekNav}>
          <button onClick={() => changeWeek(-1)}>‹</button>
          <span>Week of {week}</span>
          <button onClick={() => changeWeek(1)}>›</button>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => { setShowForm((v) => !v); setError(""); }}
        >
          {showForm ? "Cancel" : "+ Add Shift"}
        </button>
        <button className={styles.autoBtn} onClick={openAutoModal}>
          ✦ Auto-Generate
        </button>
        <button className={styles.resetBtn} onClick={handleResetSchedule}>
          Reset Schedule
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={addShift}>
          <select
            value={form.employee_id}
            onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
            required
          >
            <option value="">Select employee</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
            required
          />
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
            required
          />
          <button type="submit">Save Shift</button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}

      <p className={styles.hint}>Hover over a cell to see who is working.</p>

      <div className={styles.gridWrapper}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.cornerCell} />
              {weekDays.map((day, i) => (
                <th key={day} className={styles.dayHeader}>
                  <div className={styles.dayName}>{DAY_NAMES[i]}</div>
                  <div className={styles.dayDate}>{day.slice(5).replace("-", "/")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className={styles.hourLabel}>{formatHour(hour)}</td>
                {weekDays.map((day) => {
                  const cellShifts = shiftsForCell(shifts, day, hour);
                  const count = cellShifts.length;
                  const densityCls =
                    count === 0 ? "" :
                    count === 1 ? styles.d1 :
                    count === 2 ? styles.d2 :
                    styles.d3;

                  return (
                    <td
                      key={day}
                      className={`${styles.cell} ${densityCls}`}
                      onMouseEnter={count > 0 ? (e) => openTooltip(e, cellShifts) : undefined}
                      onMouseLeave={count > 0 ? scheduleClose : undefined}
                    >
                      {count > 0 && (
                        <span className={styles.countBadge}>{count}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tooltip && tooltip.shifts.length > 0 && (
        <div
          className={styles.tooltip}
          style={{ top: tooltip.top, left: tooltip.left }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {tooltip.shifts.map((s) => (
            <div key={s.id} className={styles.tooltipRow}>
              <div className={styles.tooltipInfo}>
                <span className={styles.tooltipName}>{s.first_name} {s.last_name}</span>
                <span className={styles.tooltipTime}>
                  {formatTime(s.start_time)} – {formatTime(s.end_time)}
                </span>
              </div>
              <button
                className={styles.tooltipDelete}
                onClick={() => deleteShift(s.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showAutoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAutoModal(false)}>
          <div className={styles.autoModal} onClick={(e) => e.stopPropagation()}>
            {autoStep === "config" ? (
              <>
                <h2 className={styles.modalTitle}>Auto-Generate Schedule</h2>
                <p className={styles.modalSub}>
                  Shifts will be generated for the week of <strong>{week}</strong>.
                  At least 2 employees will be scheduled per hour, and no one will exceed 8 hours/day.
                </p>

                <div className={styles.autoSection}>
                  <h3>Employees</h3>
                  <div className={styles.empCheckList}>
                    {members.map((m) => (
                      <label key={m.id} className={styles.checkLabel}>
                        <input
                          type="checkbox"
                          checked={autoEmployees.includes(m.id)}
                          onChange={() => toggleAutoEmployee(m.id)}
                        />
                        {m.first_name} {m.last_name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.autoSection}>
                  <h3>Coverage Hours</h3>
                  <div className={styles.hoursRow}>
                    <label>
                      From
                      <select
                        value={autoCoverStart}
                        onChange={(e) => setAutoCoverStart(Number(e.target.value))}
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{formatHour(h)}</option>
                        ))}
                      </select>
                    </label>
                    <span>to</span>
                    <label>
                      Until
                      <select
                        value={autoCoverEnd}
                        onChange={(e) => setAutoCoverEnd(Number(e.target.value))}
                      >
                        {HOURS.filter((h) => h > autoCoverStart).map((h) => (
                          <option key={h} value={h}>{formatHour(h)}</option>
                        ))}
                        <option value={23}>11 PM</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className={styles.autoSection}>
                  <h3>Days to Cover</h3>
                  <div className={styles.dayCheckRow}>
                    {DAY_NAMES.map((name, i) => (
                      <label key={name} className={styles.dayCheckLabel}>
                        <input
                          type="checkbox"
                          checked={autoDays[i]}
                          onChange={() => toggleAutoDay(i)}
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                </div>

                {autoError && <p className={styles.autoError}>{autoError}</p>}

                <div className={styles.modalActions}>
                  <button className={styles.cancelBtn} onClick={() => setShowAutoModal(false)}>
                    Cancel
                  </button>
                  <button className={styles.generateBtn} onClick={handleGenerate}>
                    Generate Preview →
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className={styles.modalTitle}>Preview Generated Shifts</h2>
                <p className={styles.modalSub}>
                  {proposedShifts.length} shifts will be created. Review and confirm.
                </p>
                <div className={styles.previewTable}>
                  <div className={styles.previewHeader}>
                    <span>Employee</span>
                    <span>Day</span>
                    <span>Hours</span>
                  </div>
                  {proposedShifts.map((s, i) => (
                    <div key={i} className={styles.previewRow}>
                      <span>{s.employeeName}</span>
                      <span>{s.date.slice(5).replace("-", "/")}</span>
                      <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                    </div>
                  ))}
                </div>
                {autoError && <p className={styles.autoError}>{autoError}</p>}
                <div className={styles.modalActions}>
                  <button className={styles.cancelBtn} onClick={() => setAutoStep("config")}>
                    ← Back
                  </button>
                  <button
                    className={styles.generateBtn}
                    onClick={handleConfirmSave}
                    disabled={autoSaving}
                  >
                    {autoSaving ? "Saving…" : "Confirm & Save All"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
