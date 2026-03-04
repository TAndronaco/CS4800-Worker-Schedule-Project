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

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM – 10 PM
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EMPTY_FORM = { employee_id: "", date: "", start_time: "", end_time: "" };

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
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [week, setWeek] = useState(getMondayOf(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
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
    apiFetch(`/shifts?team_id=${selectedTeam}&week=${week}`).then((r) => r.json()).then(setShifts);
  }, [selectedTeam, week]);

  async function addShift(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await apiFetch("/shifts", {
      method: "POST",
      body: JSON.stringify({ team_id: selectedTeam, ...form }),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      apiFetch(`/shifts?team_id=${selectedTeam}&week=${week}`).then((r) => r.json()).then(setShifts);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add shift.");
    }
  }

  async function deleteShift(id: number) {
    await apiFetch(`/shifts/${id}`, { method: "DELETE" });
    setShifts((prev) => prev.filter((s) => s.id !== id));
    setTooltip((prev) =>
      prev ? { ...prev, shifts: prev.shifts.filter((s) => s.id !== id) } : null
    );
  }

  function changeWeek(dir: number) {
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

  return (
    <div className={styles.container}>
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
    </div>
  );
}
