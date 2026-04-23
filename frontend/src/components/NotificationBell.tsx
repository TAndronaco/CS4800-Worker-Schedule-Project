"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./NotificationBell.module.css";

interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  related_id: number | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  shift_assigned: "📅",
  request_approved: "✅",
  request_denied: "❌",
  swap_proposed: "🔄",
  swap_accepted: "🤝",
  swap_rejected: "🚫",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(() => {
    apiFetch("/notifications/unread-count")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Fetch recent notifications when dropdown opens
  useEffect(() => {
    if (!open) return;
    apiFetch("/notifications")
      .then((r) => r.json())
      .then((data: Notification[]) => setNotifications(data.slice(0, 5)))
      .catch(() => {});
  }, [open]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAllRead() {
    await apiFetch("/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function markRead(notif: Notification) {
    if (!notif.read) {
      await apiFetch(`/notifications/${notif.id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);

    // Navigate based on type
    if (notif.type.startsWith("swap") || notif.type.startsWith("request")) {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      if (user?.role === "manager") {
        router.push("/manager/requests");
      } else {
        router.push("/employee/requests");
      }
    } else if (notif.type === "shift_assigned") {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      if (user?.role === "manager") {
        router.push("/manager/schedule");
      } else {
        router.push("/employee/schedule");
      }
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.bellBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className={styles.emptyDropdown}>No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`${styles.notifItem} ${!n.read ? styles.unread : ""}`}
                onClick={() => markRead(n)}
              >
                <span className={styles.notifIcon}>
                  {TYPE_ICONS[n.type] || "📌"}
                </span>
                <div className={styles.notifContent}>
                  <p className={styles.notifMessage}>{n.message}</p>
                  <p className={styles.notifTime}>{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))
          )}

          <a
            className={styles.viewAll}
            href="/notifications"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              router.push("/notifications");
            }}
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
}
