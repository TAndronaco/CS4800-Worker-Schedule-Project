"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface PerformanceReport {
  id: number;
  date: string;
  category: string;
  notes: string;
  rating: number;
  managerName: string;
}

const MOCK_METRICS = {
  shiftsCompleted: 18,
  onTimeRate: 94,
  swapRequests: 1,
  absences: 1,
  score: 87,
  trend: "+3 pts from last month",
};

const MOCK_REPORTS: PerformanceReport[] = [
  {
    id: 1,
    date: "2026-04-05",
    category: "Performance",
    notes: "Great work this month. Reliable and communicates well with teammates.",
    rating: 4,
    managerName: "Sarah Thompson",
  },
  {
    id: 2,
    date: "2026-03-18",
    category: "Punctuality",
    notes: "A few late arrivals noted early in the month but improved significantly by end of month.",
    rating: 3,
    managerName: "Sarah Thompson",
  },
  {
    id: 3,
    date: "2026-02-28",
    category: "Teamwork",
    notes: "Excellent team player. Helped cover shifts when coworkers were absent.",
    rating: 5,
    managerName: "Sarah Thompson",
  },
];

export default function EmployeePerformancePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("there");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "employee") { router.push("/dashboard"); return; }
    setFirstName(user.first_name);
  }, [router]);

  function getScoreColor(score: number) {
    if (score >= 90) return styles.scoreHigh;
    if (score >= 75) return styles.scoreMid;
    return styles.scoreLow;
  }

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back to Dashboard
      </button>
      <h1>My Performance</h1>
      <p className={styles.subtitle}>Your performance metrics and manager feedback for this month.</p>

      <div className={styles.scoreCard}>
        <div className={styles.scoreLeft}>
          <span className={`${styles.bigScore} ${getScoreColor(MOCK_METRICS.score)}`}>
            {MOCK_METRICS.score}
          </span>
          <div>
            <p className={styles.scoreTitle}>Performance Score</p>
            <p className={styles.scoreTrend}>{MOCK_METRICS.trend}</p>
          </div>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{MOCK_METRICS.shiftsCompleted}</span>
            <span className={styles.statLabel}>Shifts Completed</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{MOCK_METRICS.onTimeRate}%</span>
            <span className={styles.statLabel}>On-Time Rate</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{MOCK_METRICS.swapRequests}</span>
            <span className={styles.statLabel}>Swap Requests</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{MOCK_METRICS.absences}</span>
            <span className={styles.statLabel}>Absences</span>
          </div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Manager Reports</h2>
      {MOCK_REPORTS.length === 0 ? (
        <p className={styles.empty}>No reports from your manager yet.</p>
      ) : (
        <div className={styles.reportsList}>
          {MOCK_REPORTS.map((report) => (
            <div key={report.id} className={styles.reportCard}>
              <div className={styles.reportTop}>
                <div>
                  <p className={styles.reportCategory}>{report.category}</p>
                  <p className={styles.reportMeta}>
                    {report.managerName} · {report.date}
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
