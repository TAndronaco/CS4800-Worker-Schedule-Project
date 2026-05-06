"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }
interface WeeklyReport {
  total_hours_scheduled: number;
  number_of_shifts: number;
  coverage_gaps: string[];
  pending_requests_count: number;
  overtime_employees: Array<{ employee_id: number; first_name: string; last_name: string; hours: number }>;
}

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function ManagerReportsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [week, setWeek] = useState(getMondayOf(new Date()));
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    apiFetch("/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Team[]) => {
        const arr = Array.isArray(data) ? data : [];
        setTeams(arr);
        if (arr.length > 0) setSelectedTeam(arr[0].id);
      })
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    if (!selectedTeam) return;
    apiFetch(`/reports/weekly?team_id=${selectedTeam}&week=${week}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.coverage_gaps) setReport(data);
        else setReport(null);
      })
      .catch(() => setReport(null));
  }, [selectedTeam, week]);

  return (
    <div className={styles.container}>
      <h1>Weekly Summary Report</h1>
      <div className={styles.controls}>
        <select value={selectedTeam ?? ""} onChange={(e) => setSelectedTeam(Number(e.target.value))}>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} />
      </div>
      {report && (
        <div className={styles.cards}>
          <div className={styles.card}><h3>Total Hours Scheduled</h3><p>{report.total_hours_scheduled}</p></div>
          <div className={styles.card}><h3>Number of Shifts</h3><p>{report.number_of_shifts}</p></div>
          <div className={styles.card}><h3>Coverage Gaps</h3><p>{report.coverage_gaps.length === 0 ? "None" : report.coverage_gaps.join(", ")}</p></div>
          <div className={styles.card}><h3>Pending Requests</h3><p>{report.pending_requests_count}</p></div>
          <div className={styles.card}>
            <h3>Overtime Employees</h3>
            <p>{report.overtime_employees.length === 0 ? "None" : report.overtime_employees.map((e) => `${e.first_name} ${e.last_name} (${e.hours.toFixed(1)}h)`).join(", ")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
