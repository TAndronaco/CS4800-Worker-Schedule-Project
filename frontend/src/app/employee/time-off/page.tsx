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

export default function EmployeeTimeOffPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") {
      router.push("/login");
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== "employee") {
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
    apiFetch("/time-off")
      .then((r) => r.json())
      .then((data: TimeOffRequest[]) => {
        if (selectedTeam) {
          setRequests(data.filter((r) => r.team_id === selectedTeam));
        } else {
          setRequests(data);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedTeam) {
      setError("Please select a team.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("End date must be on or after start date.");
      return;
    }

    try {
      const res = await apiFetch("/time-off", {
        method: "POST",
        body: JSON.stringify({
          team_id: selectedTeam,
          start_date: startDate,
          end_date: endDate,
          reason: reason || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit request.");
        return;
      }

      setShowForm(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      loadRequests();
    } catch {
      setError("Failed to submit request.");
    }
  }

  async function cancelRequest(id: number) {
    if (!confirm("Cancel this time-off request?")) return;
    try {
      await apiFetch(`/time-off/${id}`, { method: "DELETE" });
      loadRequests();
    } catch {
      alert("Failed to cancel request.");
    }
  }

  function badgeClass(status: string) {
    if (status === "approved") return styles.badgeApproved;
    if (status === "denied") return styles.badgeDenied;
    return styles.badgePending;
  }

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>Time Off</h1>

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
        <button
          className={styles.addBtn}
          onClick={() => {
            setShowForm((v) => !v);
            setError("");
          }}
        >
          {showForm ? "Cancel" : "+ Request Time Off"}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.dateRow}>
            <label>
              Start Date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label>
              End Date
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>
          <textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Submit Request
            </button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <div className={styles.emptyState}>
          No time-off requests yet. Click &quot;+ Request Time Off&quot; to
          submit one.
        </div>
      ) : (
        requests.map((req) => (
          <div key={req.id} className={styles.requestCard}>
            <div className={styles.requestHeader}>
              <span className={styles.requestDates}>
                {formatDate(req.start_date)} – {formatDate(req.end_date)}
              </span>
              <span className={`${styles.badge} ${badgeClass(req.status)}`}>
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </span>
            </div>
            {req.reason && (
              <p className={styles.requestReason}>{req.reason}</p>
            )}
            <div className={styles.requestMeta}>
              <span>
                Submitted{" "}
                {new Date(req.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {req.status === "pending" && (
                <button
                  className={styles.cancelRequestBtn}
                  onClick={() => cancelRequest(req.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
