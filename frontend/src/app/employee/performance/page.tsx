"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }

interface Metrics {
  shifts_completed: number;
  on_time_rate: number;
  swap_requests: number;
  absences: number;
  score: number;
}

interface PerformanceReport {
  id: number;
  category: string;
  notes: string;
  rating: number;
  created_at: string;
  manager_first_name: string;
  manager_last_name: string;
}

export default function EmployeePerformancePage() {
  const router = useRouter();
  const userId = useMemo<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") return null;
    const user = JSON.parse(stored);
    return user.role === "employee" ? user.id : null;
  }, []);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [reports, setReports] = useState<PerformanceReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { router.push("/login"); return; }
    apiFetch("/teams").then((r) => (r.ok ? r.json() : [])).then((raw) => {
      const data: Team[] = Array.isArray(raw) ? raw : [];
      setTeams(data);
      if (data.length > 0) setSelectedTeam(data[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId, router]);

  useEffect(() => {
    if (!selectedTeam) return;
    apiFetch(`/performance/me?team_id=${selectedTeam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMetrics(d && typeof d === 'object' && !Array.isArray(d) ? d : null))
      .catch(() => setMetrics(null));
    apiFetch(`/performance/reports?team_id=${selectedTeam}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]));
  }, [selectedTeam]);

  function getScoreColor(score: number) {
    if (score >= 90) return styles.scoreHigh;
    if (score >= 75) return styles.scoreMid;
    return styles.scoreLow;
  }

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back to Dashboard
      </button>
      <h1>My Performance</h1>
      <p className={styles.subtitle}>Your performance metrics and manager feedback.</p>

      {teams.length > 1 && (
        <select
          value={selectedTeam ?? ""}
          onChange={(e) => setSelectedTeam(Number(e.target.value))}
          style={{ marginBottom: "1.5rem", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
        >
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}

      {metrics && (
        <div className={styles.scoreCard}>
          <div className={styles.scoreLeft}>
            <span className={`${styles.bigScore} ${getScoreColor(metrics.score)}`}>
              {metrics.score}
            </span>
            <div>
              <p className={styles.scoreTitle}>Performance Score</p>
              <p className={styles.scoreTrend}>Last 30 days</p>
            </div>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{metrics.shifts_completed}</span>
              <span className={styles.statLabel}>Shifts Completed</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{metrics.on_time_rate}%</span>
              <span className={styles.statLabel}>On-Time Rate</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{metrics.swap_requests}</span>
              <span className={styles.statLabel}>Swap Requests</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{metrics.absences}</span>
              <span className={styles.statLabel}>Absences</span>
            </div>
          </div>
        </div>
      )}

      <h2 className={styles.sectionTitle}>Manager Reports</h2>
      {reports.length === 0 ? (
        <p className={styles.empty}>No reports from your manager yet.</p>
      ) : (
        <div className={styles.reportsList}>
          {reports.map((report) => (
            <div key={report.id} className={styles.reportCard}>
              <div className={styles.reportTop}>
                <div>
                  <p className={styles.reportCategory}>{report.category}</p>
                  <p className={styles.reportMeta}>
                    {report.manager_first_name} {report.manager_last_name} · {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className={styles.stars}>
                  {"★".repeat(report.rating)}{"☆".repeat(5 - report.rating)}
                </div>
              </div>
              <p className={styles.reportNotes}>{report.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
