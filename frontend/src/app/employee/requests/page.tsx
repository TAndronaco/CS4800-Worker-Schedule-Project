"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }
interface Shift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
}
interface ShiftRequest {
  id: number;
  type: "swap" | "time_off";
  status: "pending" | "approved" | "denied";
  reason: string | null;
  created_at: string;
  requester_id: number;
}

const EMPTY_FORM = { type: "time_off", shift_id: "", reason: "" };

export default function EmployeeRequestsPage() {
  const router = useRouter();
  const userId = useMemo<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.role === "employee" ? user.id : null;
  }, []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "employee") { router.push("/dashboard"); return; }

    apiFetch("/teams")
      .then((r) => r.json())
      .then((data: Team[]) => {
        setTeams(data);
        if (data.length > 0) setSelectedTeam(data[0].id);
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!selectedTeam || !userId) return;
    apiFetch(`/shifts?team_id=${selectedTeam}&employee_id=${userId}`)
      .then((r) => r.json())
      .then(setMyShifts);
    apiFetch(`/requests?team_id=${selectedTeam}`)
      .then((r) => r.json())
      .then((data: ShiftRequest[]) =>
        setRequests(data.filter((r) => r.requester_id === userId))
      );
  }, [selectedTeam, userId]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await apiFetch("/requests", {
      method: "POST",
      body: JSON.stringify({
        type: form.type,
        shift_id: Number(form.shift_id),
        reason: form.reason || null,
      }),
    });
    if (res.ok) {
      const newReq = await res.json();
      setRequests((prev) => [newReq, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit request.");
    }
  }

  function formatShift(s: Shift) {
    return `${s.date.split("T")[0]}  ${s.start_time}–${s.end_time}`;
  }

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>My Requests</h1>

      {teams.length === 0 ? (
        <p className={styles.empty}>
          You haven&apos;t joined a team yet.{" "}
          <button className={styles.link} onClick={() => router.push("/employee/join")}>
            Join one now
          </button>
        </p>
      ) : (
        <>
          <div className={styles.controls}>
            <select
              value={selectedTeam ?? ""}
              onChange={(e) => setSelectedTeam(Number(e.target.value))}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              className={styles.addBtn}
              onClick={() => { setShowForm((v) => !v); setError(""); }}
            >
              {showForm ? "Cancel" : "+ New Request"}
            </button>
          </div>

          {showForm && (
            <form className={styles.form} onSubmit={submitRequest}>
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="time_off">Time Off</option>
                  <option value="swap">Shift Swap</option>
                </select>
              </label>

              <label>
                Shift
                <select
                  value={form.shift_id}
                  onChange={(e) => setForm((f) => ({ ...f, shift_id: e.target.value }))}
                  required
                >
                  <option value="">Select a shift</option>
                  {myShifts.map((s) => (
                    <option key={s.id} value={s.id}>{formatShift(s)}</option>
                  ))}
                </select>
              </label>

              <label>
                Reason (optional)
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  placeholder="Explain your request..."
                />
              </label>

              <button type="submit">Submit Request</button>
              {error && <p className={styles.error}>{error}</p>}
            </form>
          )}

          {requests.length === 0 ? (
            <p className={styles.empty}>No requests submitted yet.</p>
          ) : (
            <div className={styles.list}>
              {requests.map((r) => (
                <div key={r.id} className={styles.requestCard}>
                  <div className={styles.info}>
                    <p className={styles.type}>
                      {r.type === "time_off" ? "Time Off" : "Shift Swap"}
                    </p>
                    {r.reason && <p className={styles.reason}>{r.reason}</p>}
                    <p className={styles.date}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`${styles.badge} ${styles[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
