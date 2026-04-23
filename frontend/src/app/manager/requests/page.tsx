"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }
interface ShiftRequest {
  id: number;
  type: "swap" | "time_off";
  status: "pending" | "approved" | "denied";
  swap_status: "pending" | "accepted" | "rejected";
  reason: string | null;
  first_name: string;
  last_name: string;
  target_first_name: string | null;
  target_last_name: string | null;
  shift_date: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  target_shift_date: string | null;
  target_shift_start_time: string | null;
  target_shift_end_time: string | null;
  created_at: string;
}

function formatDate(d: string | null) {
  if (!d) return "";
  return d.split("T")[0];
}

function formatTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export default function RequestsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "manager") { router.push("/dashboard"); return; }

    apiFetch("/teams")
      .then((r) => r.json())
      .then((data: Team[]) => {
        setTeams(data);
        if (data.length > 0) setSelectedTeam(data[0].id);
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!selectedTeam) return;
    apiFetch(`/requests?team_id=${selectedTeam}`)
      .then((r) => r.json())
      .then(setRequests);
  }, [selectedTeam]);

  async function respond(id: number, status: "approved" | "denied") {
    const res = await apiFetch(`/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    }
  }

  // Manager can only act on swap requests after target employee accepted
  function canManagerAct(r: ShiftRequest): boolean {
    if (r.status !== "pending") return false;
    if (r.type === "swap") return r.swap_status === "accepted";
    return true;
  }

  function swapStatusLabel(r: ShiftRequest): string {
    if (r.type !== "swap") return "";
    if (r.swap_status === "pending") return "Waiting for employee response";
    if (r.swap_status === "accepted") return "Both employees agreed";
    if (r.swap_status === "rejected") return "Declined by target employee";
    return "";
  }

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>Requests</h1>

      <div className={styles.controls}>
        <select
          value={selectedTeam ?? ""}
          onChange={(e) => setSelectedTeam(Number(e.target.value))}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {requests.length === 0 ? (
        <p className={styles.empty}>No requests for this team.</p>
      ) : (
        <div className={styles.list}>
          {requests.map((r) => (
            <div key={r.id} className={styles.requestCard}>
              <div className={styles.info}>
                <p className={styles.name}>
                  {r.first_name} {r.last_name}
                  <span className={styles.type}>
                    {r.type === "time_off" ? "Time Off" : "Shift Swap"}
                  </span>
                </p>
                {r.shift_date && (
                  <p className={styles.shiftInfo}>
                    Shift: {formatDate(r.shift_date)} {formatTime(r.shift_start_time)}–{formatTime(r.shift_end_time)}
                  </p>
                )}
                {r.type === "swap" && r.target_first_name && (
                  <>
                    <p className={styles.shiftInfo}>
                      Swap with: {r.target_first_name} {r.target_last_name}
                      {r.target_shift_date && (
                        <> — {formatDate(r.target_shift_date)} {formatTime(r.target_shift_start_time)}–{formatTime(r.target_shift_end_time)}</>
                      )}
                    </p>
                    <p className={styles.swapStatus}>{swapStatusLabel(r)}</p>
                  </>
                )}
                {r.reason && <p className={styles.reason}>{r.reason}</p>}
                <p className={styles.date}>
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className={styles.actions}>
                <span className={`${styles.badge} ${styles[r.status]}`}>
                  {r.status}
                </span>
                {canManagerAct(r) && (
                  <>
                    <button
                      className={styles.approveBtn}
                      onClick={() => respond(r.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className={styles.denyBtn}
                      onClick={() => respond(r.id, "denied")}
                    >
                      Deny
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
