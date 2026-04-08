"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface EmployeeMetrics {
  id: number;
  name: string;
  team: string;
  shiftsCompleted: number;
  onTimeRate: number;
  swapRequests: number;
  absences: number;
  score: number;
}

interface PerformanceReport {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  category: string;
  notes: string;
  rating: number;
}

const MOCK_EMPLOYEES: EmployeeMetrics[] = [
  { id: 1, name: "Alice Johnson", team: "Morning Crew", shiftsCompleted: 18, onTimeRate: 97, swapRequests: 1, absences: 0, score: 95 },
  { id: 2, name: "Bob Martinez", team: "Evening Crew", shiftsCompleted: 15, onTimeRate: 88, swapRequests: 3, absences: 2, score: 78 },
  { id: 3, name: "Carol Lee", team: "Morning Crew", shiftsCompleted: 20, onTimeRate: 100, swapRequests: 0, absences: 0, score: 99 },
  { id: 4, name: "David Kim", team: "Weekend Team", shiftsCompleted: 12, onTimeRate: 83, swapRequests: 2, absences: 1, score: 74 },
  { id: 5, name: "Emma Wilson", team: "Evening Crew", shiftsCompleted: 16, onTimeRate: 94, swapRequests: 1, absences: 1, score: 87 },
];

const MOCK_REPORTS: PerformanceReport[] = [
  { id: 1, employeeId: 1, employeeName: "Alice Johnson", date: "2026-04-01", category: "Punctuality", notes: "Consistently arrives early and sets a great example for the team.", rating: 5 },
  { id: 2, employeeId: 2, employeeName: "Bob Martinez", date: "2026-03-20", category: "Teamwork", notes: "Needs to communicate more proactively when requesting shift swaps.", rating: 3 },
  { id: 3, employeeId: 3, employeeName: "Carol Lee", date: "2026-04-05", category: "Performance", notes: "Exceptional work this month. Zero absences and perfect attendance.", rating: 5 },
];

export default function ManagerPerformancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"metrics" | "reports">("metrics");
  const [reports, setReports] = useState<PerformanceReport[]>(MOCK_REPORTS);
  const [showAddReport, setShowAddReport] = useState(false);
  const [form, setForm] = useState({ employeeId: "", category: "Performance", notes: "", rating: "4" });
  const [filterEmployee, setFilterEmployee] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "manager") { router.push("/dashboard"); return; }
  }, [router]);

  function getScoreColor(score: number) {
    if (score >= 90) return styles.scoreHigh;
    if (score >= 75) return styles.scoreMid;
    return styles.scoreLow;
  }

  function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    const emp = MOCK_EMPLOYEES.find((e) => e.id === Number(form.employeeId));
    if (!emp) return;
    const newReport: PerformanceReport = {
      id: reports.length + 1,
      employeeId: emp.id,
      employeeName: emp.name,
      date: new Date().toISOString().split("T")[0],
      category: form.category,
      notes: form.notes,
      rating: Number(form.rating),
    };
    setReports((prev) => [newReport, ...prev]);
    setForm({ employeeId: "", category: "Performance", notes: "", rating: "4" });
    setShowAddReport(false);
    setActiveTab("reports");
  }

  const filteredReports = filterEmployee
    ? reports.filter((r) => r.employeeId === filterEmployee)
    : reports;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back to Dashboard
      </button>
      <h1>Employee Performance</h1>
      <p className={styles.subtitle}>Monitor your team&apos;s performance metrics and add reports.</p>

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
                  {MOCK_EMPLOYEES.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
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
          <div className={styles.metricsGrid}>
            {MOCK_EMPLOYEES.map((emp) => (
              <div key={emp.id} className={styles.metricCard}>
                <div className={styles.empHeader}>
                  <div className={styles.avatar}>
                    {emp.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className={styles.empName}>{emp.name}</p>
                    <p className={styles.empTeam}>{emp.team}</p>
                  </div>
                  <span className={`${styles.scoreBadge} ${getScoreColor(emp.score)}`}>
                    {emp.score}
                  </span>
                </div>
                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{emp.shiftsCompleted}</span>
                    <span className={styles.statLabel}>Shifts</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{emp.onTimeRate}%</span>
                    <span className={styles.statLabel}>On-Time</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{emp.swapRequests}</span>
                    <span className={styles.statLabel}>Swaps</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{emp.absences}</span>
                    <span className={styles.statLabel}>Absences</span>
                  </div>
                </div>
                <button
                  className={styles.viewReportsBtn}
                  onClick={() => { setFilterEmployee(emp.id); setActiveTab("reports"); }}
                >
                  View Reports
                </button>
              </div>
            ))}
          </div>
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
              {MOCK_EMPLOYEES.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
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
                      <p className={styles.reportEmployee}>{report.employeeName}</p>
                      <p className={styles.reportMeta}>{report.category} · {report.date}</p>
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
