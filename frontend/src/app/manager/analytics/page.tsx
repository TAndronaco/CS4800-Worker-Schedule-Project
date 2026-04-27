"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team {
  id: number;
  name: string;
}

interface CoverageGap {
  date: string;
  hour: number;
  scheduled_count: number;
}

interface OvertimeEmployee {
  employee_id: number;
  first_name: string;
  last_name: string;
  total_hours: number;
  shift_count: number;
}

interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  swaps: number;
  time_off: number;
}

interface WeeklyHours {
  date: string;
  total_hours: number;
  shift_count: number;
}

interface Analytics {
  coverage_gaps: CoverageGap[];
  overtime_employees: OvertimeEmployee[];
  request_stats: RequestStats;
  weekly_hours: WeeklyHours[];
  headcount_by_day: { date: string; count: number }[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function getWeekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

export default function ManagerAnalyticsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [week, setWeek] = useState(getMondayOf(new Date()));
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const weekDays = useMemo(() => getWeekDays(week), [week]);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") {
      router.push("/login");
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== "manager") {
      router.push("/dashboard");
      return;
    }
    apiFetch("/teams")
      .then((r) => r.json())
      .then((data: Team[]) => {
        setTeams(data);
        if (data.length > 0) setSelectedTeam(data[0].id);
      });
  }, [router]);

  useEffect(() => {
    if (!selectedTeam) return;
    let cancelled = false;
    apiFetch(`/analytics?team_id=${selectedTeam}&week=${week}`)
      .then((r) => r.json())
      .then((data: Analytics) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedTeam, week]);

  function changeWeek(dir: number) {
    const d = new Date(week);
    d.setDate(d.getDate() + dir * 7);
    setWeek(d.toISOString().split("T")[0]);
  }

  const maxHours = analytics
    ? Math.max(...analytics.weekly_hours.map((w) => w.total_hours), 1)
    : 1;

  const gapsByDay = analytics
    ? weekDays.map((day) => analytics.coverage_gaps.filter((g) => g.date === day))
    : [];

  const totalGaps = analytics ? analytics.coverage_gaps.length : 0;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>Analytics</h1>

      <div className={styles.controls}>
        <select
          value={selectedTeam ?? ""}
          onChange={(e) => setSelectedTeam(Number(e.target.value))}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className={styles.weekNav}>
          <button onClick={() => changeWeek(-1)}>‹</button>
          <span>Week of {week}</span>
          <button onClick={() => changeWeek(1)}>›</button>
        </div>
      </div>

      {!analytics && selectedTeam && <p>Loading analytics...</p>}

      {analytics && (
        <>
          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {analytics.weekly_hours.reduce((s, w) => s + w.shift_count, 0)}
              </span>
              <span className={styles.statLabel}>Total Shifts</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {Math.round(
                  analytics.weekly_hours.reduce((s, w) => s + w.total_hours, 0)
                )}
                h
              </span>
              <span className={styles.statLabel}>Total Hours</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalGaps}</span>
              <span className={styles.statLabel}>Coverage Gaps</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {analytics.overtime_employees.length}
              </span>
              <span className={styles.statLabel}>Overtime Employees</span>
            </div>
          </div>

          {/* Hours bar chart */}
          <div className={styles.card}>
            <span className={styles.cardTitle}>Hours by Day</span>
            <div className={styles.barChart}>
              {weekDays.map((day, i) => {
                const wh = analytics.weekly_hours.find((w) => w.date === day);
                const hours = wh ? wh.total_hours : 0;
                const heightPct = (hours / maxHours) * 100;
                return (
                  <div key={day} className={styles.barColumn}>
                    <span className={styles.barValue}>
                      {hours > 0 ? `${Math.round(hours)}h` : ""}
                    </span>
                    <div
                      className={styles.bar}
                      style={{ height: `${Math.max(heightPct, 3)}%` }}
                    />
                    <span className={styles.barLabel}>{DAY_NAMES[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.sectionGrid}>
            {/* Coverage gaps */}
            <div className={styles.card}>
              <span className={styles.cardTitle}>
                Coverage Gaps ({totalGaps})
              </span>
              {totalGaps === 0 ? (
                <p className={styles.noGaps}>No coverage gaps this week</p>
              ) : (
                <div className={styles.gapList}>
                  {gapsByDay.map((gaps, dayIdx) =>
                    gaps.length > 0 ? (
                      <div key={weekDays[dayIdx]}>
                        <div className={styles.gapItem}>
                          <span className={styles.gapDate}>
                            {DAY_NAMES[dayIdx]} ({weekDays[dayIdx].slice(5).replace("-", "/")})
                          </span>
                          <span className={styles.gapHour}>
                            {gaps.length} gap{gaps.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {gaps.map((g) => (
                          <div
                            key={`${g.date}-${g.hour}`}
                            className={styles.gapItem}
                            style={{ paddingLeft: "1.5rem" }}
                          >
                            <span className={styles.gapHour}>
                              {formatHour(g.hour)} – {formatHour(g.hour + 1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>

            {/* Overtime employees */}
            <div className={styles.card}>
              <span className={styles.cardTitle}>
                Overtime (&gt;40h/week)
              </span>
              {analytics.overtime_employees.length === 0 ? (
                <p className={styles.noOvertime}>
                  No employees over 40 hours
                </p>
              ) : (
                <div>
                  {analytics.overtime_employees.map((emp) => (
                    <div key={emp.employee_id} className={styles.overtimeItem}>
                      <span className={styles.overtimeName}>
                        {emp.first_name} {emp.last_name}
                      </span>
                      <span className={styles.overtimeHours}>
                        {Math.round(emp.total_hours)}h ({emp.shift_count} shifts)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Request stats */}
          <div className={styles.card}>
            <span className={styles.cardTitle}>Request Statistics</span>
            <div className={styles.requestGrid}>
              <div className={styles.reqStat}>
                <span className={styles.reqStatValue}>
                  {analytics.request_stats.total}
                </span>
                <span className={styles.reqStatLabel}>Total</span>
              </div>
              <div className={styles.reqStat}>
                <span
                  className={`${styles.reqStatValue} ${styles.pendingValue}`}
                >
                  {analytics.request_stats.pending}
                </span>
                <span className={styles.reqStatLabel}>Pending</span>
              </div>
              <div className={styles.reqStat}>
                <span
                  className={`${styles.reqStatValue} ${styles.approvedValue}`}
                >
                  {analytics.request_stats.approved}
                </span>
                <span className={styles.reqStatLabel}>Approved</span>
              </div>
              <div className={styles.reqStat}>
                <span
                  className={`${styles.reqStatValue} ${styles.deniedValue}`}
                >
                  {analytics.request_stats.denied}
                </span>
                <span className={styles.reqStatLabel}>Denied</span>
              </div>
              <div className={styles.reqStat}>
                <span className={styles.reqStatValue}>
                  {analytics.request_stats.swaps}
                </span>
                <span className={styles.reqStatLabel}>Swaps</span>
              </div>
              <div className={styles.reqStat}>
                <span className={styles.reqStatValue}>
                  {analytics.request_stats.time_off}
                </span>
                <span className={styles.reqStatLabel}>Time Off</span>
              </div>
            </div>
          </div>
        </>
      )}

      {!analytics && !selectedTeam && (
        <div className={styles.emptyState}>
          Select a team and week to view analytics.
        </div>
      )}
    </div>
  );
}
