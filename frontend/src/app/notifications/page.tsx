"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  related_id: number | null;
  created_at: string;
}

type FilterTab = "all" | "unread" | "shifts" | "requests" | "swaps";

const TYPE_ICONS: Record<string, string> = {
  shift_assigned: "📅",
  request_approved: "✅",
  request_denied: "❌",
  swap_proposed: "🔄",
  swap_accepted: "🤝",
  swap_rejected: "🚫",
};

const TYPE_LABELS: Record<string, string> = {
  shift_assigned: "Shift",
  request_approved: "Approved",
  request_denied: "Denied",
  swap_proposed: "Swap",
  swap_accepted: "Swap Accepted",
  swap_rejected: "Swap Declined",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function matchesFilter(n: Notification, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !n.read;
  if (filter === "shifts") return n.type === "shift_assigned";
  if (filter === "requests") return n.type === "request_approved" || n.type === "request_denied";
  if (filter === "swaps") return n.type.startsWith("swap");
  return true;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    apiFetch("/notifications")
      .then((r) => r.json())
      .then((data: Notification[]) => {
        setNotifications(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, router]);

  const filtered = notifications.filter((n) => matchesFilter(n, filter));
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    await apiFetch("/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleClick(notif: Notification) {
    if (!notif.read) {
      await apiFetch(`/notifications/${notif.id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }

    // Navigate to relevant page
    if (notif.type.startsWith("swap") || notif.type.startsWith("request")) {
      if (user?.role === "manager") {
        router.push("/manager/requests");
      } else {
        router.push("/employee/requests");
      }
    } else if (notif.type === "shift_assigned") {
      if (user?.role === "manager") {
        router.push("/manager/schedule");
      } else {
        router.push("/employee/schedule");
      }
    }
  }

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>

      <div className={styles.header}>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllRead}>
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        {(["all", "unread", "shifts", "requests", "swaps"] as FilterTab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${filter === t ? styles.tabActive : ""}`}
            onClick={() => setFilter(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {filter === "all" ? "No notifications yet." : `No ${filter} notifications.`}
        </p>
      ) : (
        <div className={styles.list}>
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`${styles.notifCard} ${n.read ? styles.read : styles.unread}`}
              onClick={() => handleClick(n)}
            >
              <span className={styles.icon}>{TYPE_ICONS[n.type] || "📌"}</span>
              <div className={styles.content}>
                <p className={styles.message}>{n.message}</p>
                <div className={styles.meta}>
                  <span className={styles.time}>{timeAgo(n.created_at)}</span>
                  <span className={styles.typeBadge}>
                    {TYPE_LABELS[n.type] || n.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
