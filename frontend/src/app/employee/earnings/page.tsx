"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface EarningsSummary {
  hourly_rate: number;
  today: number;
  week: number;
  month: number;
  total: number;
}

interface DailyEarnings {
  date: string;
  hours: number;
  earnings: number;
}

export default function EmployeeEarningsPage() {
  const router = useRouter();
  const userId = useMemo<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") return null;
    const user = JSON.parse(stored);
    return user.role === "employee" ? user.id : null;
  }, []);

  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarnings[]>([]);
  const [timeFrame, setTimeFrame] = useState<"day" | "week" | "month">("month");
  const [loading, setLoading] = useState(true);
  const [showCashoutModal, setShowCashoutModal] = useState(false);

  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }
    loadEarningsData();
  }, [userId, router]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      const summaryRes = await apiFetch("/payroll/earnings");
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      const dailyRes = await apiFetch(`/payroll/daily-earnings?timeframe=${timeFrame}`);
      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyEarnings(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarningsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFrame]);

  const cashoutAmount = summary ? summary.month : 0;
  const fee = cashoutAmount * 0.03;
  const afterFee = cashoutAmount - fee;

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Loading earnings...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back to Dashboard
      </button>
      <h1 className={styles.pageTitle}>My Earnings</h1>
      <p className={styles.subtitle}>Track your hourly pay and earnings history.</p>

      {/* Earnings Summary */}
      {summary && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.label}>Hourly Rate</span>
            <span className={styles.value}>${summary.hourly_rate.toFixed(2)}</span>
            <span className={styles.sublabel}>/hr</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.label}>Today</span>
            <span className={styles.value}>${summary.today.toFixed(2)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.label}>This Week</span>
            <span className={styles.value}>${summary.week.toFixed(2)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.label}>This Month</span>
            <span className={styles.value}>${summary.month.toFixed(2)}</span>
          </div>
          <div className={`${styles.summaryCard} ${styles.totalCard}`}>
            <span className={styles.label}>Total Earned</span>
            <span className={styles.valueHighlight}>${summary.total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Cashout Section */}
      <div className={styles.cashoutSection}>
        <div className={styles.cashoutCard}>
          <h2>Ready to Cash Out?</h2>
          <div className={styles.cashoutBreakdown}>
            <div className={styles.breakdownRow}>
              <span>Month's Earnings</span>
              <span>${cashoutAmount.toFixed(2)}</span>
            </div>
            <div className={styles.breakdownRow}>
              <span>Processing Fee (3%)</span>
              <span className={styles.feeAmount}>-${fee.toFixed(2)}</span>
            </div>
            <div className={`${styles.breakdownRow} ${styles.totalRow}`}>
              <span>You'll Receive</span>
              <span>${afterFee.toFixed(2)}</span>
            </div>
          </div>
          <button
            className={styles.cashoutBtn}
            onClick={() => setShowCashoutModal(true)}
          >
            Request Cashout
          </button>
          <p className={styles.cashoutNote}>
            Cashouts are processed within 3-5 business days to your registered
            payment method.
          </p>
        </div>
      </div>

      {/* Daily Earnings History */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <h2>Earnings History</h2>
          <div className={styles.timeframeButtons}>
            <button
              className={`${styles.timeBtn} ${timeFrame === "day" ? styles.active : ""}`}
              onClick={() => setTimeFrame("day")}
            >
              Day
            </button>
            <button
              className={`${styles.timeBtn} ${timeFrame === "week" ? styles.active : ""}`}
              onClick={() => setTimeFrame("week")}
            >
              Week
            </button>
            <button
              className={`${styles.timeBtn} ${timeFrame === "month" ? styles.active : ""}`}
              onClick={() => setTimeFrame("month")}
            >
              Month
            </button>
          </div>
        </div>

        {dailyEarnings.length === 0 ? (
          <p className={styles.emptyState}>
            No earnings recorded yet. Clock in to start tracking!
          </p>
        ) : (
          <div className={styles.earningsTable}>
            <div className={styles.tableHeader}>
              <div className={styles.tableCol}>Date</div>
              <div className={styles.tableCol}>Hours</div>
              <div className={styles.tableCol}>Earnings</div>
            </div>
            {dailyEarnings.map((earning, idx) => (
              <div key={idx} className={styles.tableRow}>
                <div className={styles.tableCol}>
                  {new Date(earning.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className={styles.tableCol}>{earning.hours.toFixed(1)}h</div>
                <div className={styles.tableCol}>
                  <strong>${earning.earnings.toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cashout Modal */}
      {showCashoutModal && (
        <div className={styles.modal} onClick={() => setShowCashoutModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Request Cashout</h2>
            <p className={styles.modalInfo}>
              Amount: <strong>${cashoutAmount.toFixed(2)}</strong>
            </p>
            <p className={styles.modalInfo}>
              After 3% fee: <strong>${afterFee.toFixed(2)}</strong>
            </p>
            <p className={styles.modalNote}>
              This is a placeholder. Cashout functionality is not yet active. Contact
              your manager for payment inquiries.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowCashoutModal(false)}
              >
                Close
              </button>
              <button className={styles.confirmBtn} disabled>
                Request Cashout (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
