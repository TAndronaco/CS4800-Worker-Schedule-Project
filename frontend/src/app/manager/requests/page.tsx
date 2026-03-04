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
  reason: string | null;
  first_name: string;
  last_name: string;
  created_at: string;
}

export default function RequestsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
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
                {r.reason && <p className={styles.reason}>{r.reason}</p>}
                <p className={styles.date}>
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className={styles.actions}>
                <span className={`${styles.badge} ${styles[r.status]}`}>
                  {r.status}
                </span>
                {r.status === "pending" && (
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
