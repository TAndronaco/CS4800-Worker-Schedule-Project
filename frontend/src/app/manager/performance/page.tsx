"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }
interface Member { id: number; first_name: string; last_name: string; }

interface EmployeeMetrics {
  user_id: number;
  first_name: string;
  last_name: string;
  shifts_completed: number;
  on_time_rate: number;
  swap_requests: number;
  absences: number;
  score: number;
}

interface PerformanceReport {
  id: number;
  employee_id: number;
  employee_first_name: string;
  employee_last_name: string;
  category: string;
  notes: string;
  rating: number;
  created_at: string;
}

export default function ManagerPerformancePage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [metrics, setMetrics] = useState<EmployeeMetrics[]>([]);
  const [reports, setReports] = useState<PerformanceReport[]>([]);
  const [activeTab, setActiveTab] = useState<"metrics" | "reports">("metrics");
  const [showAddReport, setShowAddReport] = useState(false);
  const [form, setForm] = useState({ employeeId: "", category: "Performance", notes: "", rating: "4" });
  const [filterEmployee, setFilterEmployee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "manager") { router.push("/dashboard"); return; }
<<<<<<< Updated upstream
    apiFetch("/teams").then((r) => (r.ok ? r.json() : [])).then((raw) => {
      const data: Team[] = Array.isArray(raw) ? raw : [];
      setTeams(data);
      if (data.length > 0) setSelectedTeam(data[0].id);
=======
    apiFetch("/teams").then((r) => r.json()).then((data: Team[]) => {
      const arr = Array.isArray(data) ? data : [];
      setTeams(arr);
      if (arr.length > 0) setSelectedTeam(arr[0].id);
>>>>>>> Stashed changes
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedTeam) return;
<<<<<<< Updated upstream
    apiFetch(`/teams/${selectedTeam}/members`).then((r) => (r.ok ? r.json() : [])).then((d) => setMembers(Array.isArray(d) ? d : [])).catch(() => setMembers([]));
=======
    apiFetch(`/teams/${selectedTeam}/members`).then((r) => r.json()).then((data) => setMembers(Array.isArray(data) ? data : [])).catch(() => setMembers([]));
>>>>>>> Stashed changes
    apiFetch(`/performance/team?team_id=${selectedTeam}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMetrics(Array.isArray(data) ? data : []))
      .catch(() => setMetrics([]));
    apiFetch(`/performance/reports/team?team_id=${selectedTeam}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]));
  }, [selectedTeam]);

  function getScoreColor(score: number) {
    if (score >= 90) return styles.scoreHigh;
    if (score >= 75) return styles.scoreMid;
    return styles.scoreLow;
  }

  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/performance/reports", {
      method: "POST",
      body: JSON.stringify({
        employee_id: Number(form.employeeId),
        team_id: selectedTeam,
        category: form.category,
        rating: Number(form.rating),
        notes: form.notes,
      }),
    });
    if (res.ok) {
      const newReport = await res.json();
      const emp = members.find((m) => m.id === Number(form.employeeId));
      setReports((prev) => [{
        ...newReport,
        employee_first_name: emp?.first_name || "",
        employee_last_name: emp?.last_name || "",
      }, ...prev]);
      setForm({ employeeId: "", category: "Performance", notes: "", rating: "4" });
      setShowAddReport(false);
      setActiveTab("reports");
    }
  }

  const filteredReports = filterEmployee
    ? reports.filter((r) => r.employee_id === filterEmployee)
    : reports;

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back to Dashboard
      </button>
      <h1>Employee Performance</h1>
      <p className={styles.subtitle}>Monitor your team&apos;s performance metrics and add reports.</p>

      {teams.length > 1 && (
        <select
          value={selectedTeam ?? ""}
          onChange={(e) => setSelectedTeam(Number(e.target.value))}
          style={{ marginBottom: "1rem", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
        >
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}

      <div className={styles.tabs}>
        <button
          className={activeTab === "metrics" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("metrics")}
        >
          Metrics Overview
        </button>
        <button
          className={activeTab === "reports" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("reports")}
        >
          Reports ({reports.length})
        </button>
        <button className={styles.addReportBtn} onClick={() => setShowAddReport(true)}>
          + Add Report
        </button>
      </div>

      {showAddReport && (
        <div className={styles.modalOverlay} onClick={() => setShowAddReport(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Add Performance Report</h2>
            <form onSubmit={handleAddReport} className={styles.form}>
              <label>
                Employee
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select an employee...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option>Performance</option>
                  <option>Punctuality</option>
                  <option>Teamwork</option>
                  <option>Communication</option>
                  <option>Attendance</option>
                </select>
              </label>
              <label>
                Rating (1–5)
                <select
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                >
                  <option value="1">1 – Needs Improvement</option>
                  <option value="2">2 – Below Average</option>
                  <option value="3">3 – Meets Expectations</option>
                  <option value="4">4 – Above Average</option>
                  <option value="5">5 – Exceptional</option>
                </select>
              </label>
              <label>
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Write your performance notes here..."
                  rows={4}
                  required
                />
              </label>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddReport(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Save Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "metrics" && (
        <div className={styles.metricsSection}>
          {metrics.length === 0 ? (
            <p className={styles.empty}>No employee data yet. Metrics appear once employees clock in.</p>
          ) : (
            <div className={styles.metricsGrid}>
              {metrics.map((emp) => (
                <div key={emp.user_id} className={styles.metricCard}>
                  <div className={styles.empHeader}>
                    <div className={styles.avatar}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div>
                      <p className={styles.empName}>{emp.first_name} {emp.last_name}</p>
                    </div>
                    <span className={`${styles.scoreBadge} ${getScoreColor(emp.score)}`}>
                      {emp.score}
                    </span>
                  </div>
                  <div className={styles.statsRow}>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>{emp.shifts_completed}</span>
                      <span className={styles.statLabel}>Shifts</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>{emp.on_time_rate}%</span>
                      <span className={styles.statLabel}>On-Time</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>{emp.swap_requests}</span>
                      <span className={styles.statLabel}>Swaps</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>{emp.absences}</span>
                      <span className={styles.statLabel}>Absences</span>
                    </div>
                  </div>
                  <button
                    className={styles.viewReportsBtn}
                    onClick={() => { setFilterEmployee(emp.user_id); setActiveTab("reports"); }}
                  >
                    View Reports
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div className={styles.reportsSection}>
          <div className={styles.reportsFilter}>
            <label>Filter by employee:</label>
            <select
              value={filterEmployee ?? ""}
              onChange={(e) => setFilterEmployee(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All employees</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </select>
          </div>
          {filteredReports.length === 0 ? (
            <p className={styles.empty}>No reports found.</p>
          ) : (
            <div className={styles.reportsList}>
              {filteredReports.map((report) => (
                <div key={report.id} className={styles.reportCard}>
                  <div className={styles.reportTop}>
                    <div>
                      <p className={styles.reportEmployee}>{report.employee_first_name} {report.employee_last_name}</p>
                      <p className={styles.reportMeta}>{report.category} · {new Date(report.created_at).toLocaleDateString()}</p>
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
      )}
    </div>
  );
}
