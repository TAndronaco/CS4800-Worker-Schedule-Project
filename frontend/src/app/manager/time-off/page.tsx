"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team {
  id: number;
  name: string;
}

interface TimeOffRequest {
  id: number;
  user_id: number;
  team_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  reviewed_by: number | null;
  created_at: string;
  first_name: string;
  last_name: string;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ManagerTimeOffPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all");

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

  function loadRequests() {
    if (!selectedTeam) return;
    apiFetch(`/time-off?team_id=${selectedTeam}`)
      .then((r) => r.json())
      .then(setRequests)
      .catch(() => {});
  }

  useEffect(() => {
    if (!selectedTeam) return;
    loadRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam]);

  async function handleAction(id: number, status: "approved" | "denied") {
    try {
      await apiFetch(`/time-off/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      loadRequests();
    } catch {
      alert("Failed to update request.");
    }
  }

  function badgeClass(status: string) {
    if (status === "approved") return styles.badgeApproved;
    if (status === "denied") return styles.badgeDenied;
    return styles.badgePending;
  }

  const filtered = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>Time-Off Requests {pendingCount > 0 && `(${pendingCount} pending)`}</h1>

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
        <div className={styles.filterBtns}>
          {(["all", "pending", "approved", "denied"] as const).map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          {filter === "all"
            ? "No time-off requests for this team."
            : `No ${filter} requests.`}
        </div>
      ) : (
        filtered.map((req) => (
          <div key={req.id} className={styles.requestCard}>
            <div className={styles.requestHeader}>
              <span className={styles.requestName}>
                {req.first_name} {req.last_name}
              </span>
              <span className={`${styles.badge} ${badgeClass(req.status)}`}>
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </span>
            </div>
            <p className={styles.requestDates}>
              {formatDate(req.start_date)} – {formatDate(req.end_date)}
            </p>
            {req.reason && (
              <p className={styles.requestReason}>{req.reason}</p>
            )}
            {req.status === "pending" && (
              <div className={styles.requestActions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleAction(req.id, "approved")}
                >
                  Approve
                </button>
                <button
                  className={styles.denyBtn}
                  onClick={() => handleAction(req.id, "denied")}
                >
                  Deny
                </button>
              </div>
            )}
            <div className={styles.requestMeta}>
              Submitted{" "}
              {new Date(req.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {req.reviewer_first_name &&
                ` · Reviewed by ${req.reviewer_first_name} ${req.reviewer_last_name}`}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
