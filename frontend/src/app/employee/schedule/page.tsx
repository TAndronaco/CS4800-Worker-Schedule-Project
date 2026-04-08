"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }
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

export default function EmployeeSchedulePage() {
  const router = useRouter();
  const userId = useMemo<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.role === "employee" ? user.id : null;
  }, []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [week, setWeek] = useState(getMondayOf(new Date()));
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "employee") { router.push("/dashboard"); return; }
    apiFetch("/teams")
      .then((r) => r.json())
      .then((data: Team[]) => {
        setTeams(data);
        if (data.length > 0) setSelectedTeam(data[0].id);
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!selectedTeam) return;
    // Fetch ALL team shifts so coworkers are visible
    apiFetch(`/shifts?team_id=${selectedTeam}&week=${week}`)
      .then((r) => r.json())
      .then(setShifts);
  }, [selectedTeam, week]);

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

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>My Schedule</h1>

      {teams.length === 0 ? (
        <p className={styles.empty}>
          You haven&apos;t joined a team yet.{" "}
          <button className={styles.link} onClick={() => router.push("/employee/join")}>
            Join one now
          </button>
        </p>
      ) : (
        <>
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
          </div>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendSwatch} ${styles.swatchOwn}`} />
              <span>My shift</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendSwatch} ${styles.swatchCoworker}`} />
              <span>Coworker</span>
            </div>
          </div>

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
                      const myShifts = cellShifts.filter((s) => s.employee_id === userId);
                      const coworkerShifts = cellShifts.filter((s) => s.employee_id !== userId);
                      const hasOwn = myShifts.length > 0;
                      const hasCoworker = coworkerShifts.length > 0;
                      const count = cellShifts.length;

                      let cellCls = styles.cell;
                      if (hasOwn) cellCls += ` ${styles.ownCell}`;
                      else if (hasCoworker) cellCls += ` ${styles.coworkerCell}`;
                      
                      if (count > 0) cellCls += ` ${styles.activeCell}`;

                      return (
                        <td
                          key={day}
                          className={cellCls}
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
                    <span className={styles.tooltipName}>
                      {s.employee_id === userId ? "Me" : `${s.first_name} ${s.last_name}`}
                    </span>
                    <span className={styles.tooltipTime}>
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
