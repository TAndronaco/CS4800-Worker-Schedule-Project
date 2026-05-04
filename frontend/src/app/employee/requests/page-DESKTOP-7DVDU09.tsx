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
  employee_id: number;
  first_name: string;
  last_name: string;
}
interface ShiftRequest {
  id: number;
  type: "swap" | "time_off";
  status: "pending" | "approved" | "denied";
  swap_status: "pending" | "accepted" | "rejected";
  reason: string | null;
  created_at: string;
  requester_id: number;
  target_employee_id: number | null;
  shift_date: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  target_shift_date: string | null;
  target_shift_start_time: string | null;
  target_shift_end_time: string | null;
  first_name: string;
  last_name: string;
  target_first_name: string | null;
  target_last_name: string | null;
}

const EMPTY_FORM = { type: "time_off", shift_id: "", target_shift_id: "", reason: "" };

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

export default function EmployeeRequestsPage() {
  const router = useRouter();
  const userId = useMemo<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") return null;
    const user = JSON.parse(stored);
    return user.role === "employee" ? user.id : null;
  }, []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [teamShifts, setTeamShifts] = useState<Shift[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"outgoing" | "incoming">("outgoing");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") { router.push("/login"); return; }
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
    apiFetch(`/shifts?team_id=${selectedTeam}`)
      .then((r) => r.json())
      .then(setTeamShifts);
    apiFetch(`/requests?team_id=${selectedTeam}`)
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []));
  }, [selectedTeam, userId]);

  // Outgoing = requests I made
  const outgoingRequests = requests.filter((r) => r.requester_id === userId);
  // Incoming = swap requests where I'm the target
  const incomingSwaps = requests.filter(
    (r) => r.type === "swap" && r.target_employee_id === userId && r.swap_status === "pending"
  );

  // Coworker shifts (not mine) for swap selection
  const coworkerShifts = teamShifts.filter((s) => s.employee_id !== userId);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body: Record<string, unknown> = {
      type: form.type,
      shift_id: Number(form.shift_id),
      reason: form.reason || null,
    };

    if (form.type === "swap") {
      if (!form.target_shift_id) {
        setError("Please select a coworker's shift to swap with.");
        return;
      }
      const targetShift = coworkerShifts.find((s) => String(s.id) === form.target_shift_id);
      if (!targetShift) {
        setError("Invalid target shift.");
        return;
      }
      body.target_shift_id = Number(form.target_shift_id);
      body.target_employee_id = targetShift.employee_id;
    }

    const res = await apiFetch("/requests", {
      method: "POST",
      body: JSON.stringify(body),
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

  async function respondToSwap(requestId: number, accept: boolean) {
    const res = await apiFetch(`/requests/${requestId}/swap-respond`, {
      method: "PATCH",
      body: JSON.stringify({ accept }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, ...updated } : r))
      );
    }
  }

  function formatShift(s: Shift) {
    return `${s.date.split("T")[0]}  ${s.start_time}–${s.end_time}`;
  }

  function formatCoworkerShift(s: Shift) {
    return `${s.first_name} ${s.last_name} — ${s.date.split("T")[0]} ${s.start_time}–${s.end_time}`;
  }

  function swapStatusLabel(r: ShiftRequest): string {
    if (r.type !== "swap") return "";
    if (r.swap_status === "pending") return "Waiting for coworker";
    if (r.swap_status === "accepted" && r.status === "pending") return "Coworker accepted, waiting for manager";
    if (r.swap_status === "rejected") return "Coworker declined";
    return "";
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
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, target_shift_id: "" }))}
                >
                  <option value="time_off">Time Off</option>
                  <option value="swap">Shift Swap</option>
                </select>
              </label>

              <label>
                My Shift
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

              {form.type === "swap" && (
                <label>
                  Swap With
                  <select
                    value={form.target_shift_id}
                    onChange={(e) => setForm((f) => ({ ...f, target_shift_id: e.target.value }))}
                    required
                  >
                    <option value="">Select coworker&apos;s shift</option>
                    {coworkerShifts.map((s) => (
                      <option key={s.id} value={s.id}>{formatCoworkerShift(s)}</option>
                    ))}
                  </select>
                </label>
              )}

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

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "outgoing" ? styles.tabActive : ""}`}
              onClick={() => setTab("outgoing")}
            >
              My Requests {outgoingRequests.length > 0 && `(${outgoingRequests.length})`}
            </button>
            <button
              className={`${styles.tab} ${tab === "incoming" ? styles.tabActive : ""}`}
              onClick={() => setTab("incoming")}
            >
              Incoming Swaps {incomingSwaps.length > 0 && (
                <span className={styles.incomingBadge}>{incomingSwaps.length}</span>
              )}
            </button>
          </div>

          {tab === "outgoing" && (
            <>
              {outgoingRequests.length === 0 ? (
                <p className={styles.empty}>No requests submitted yet.</p>
              ) : (
                <div className={styles.list}>
                  {outgoingRequests.map((r) => (
                    <div key={r.id} className={styles.requestCard}>
                      <div className={styles.info}>
                        <p className={styles.type}>
                          {r.type === "time_off" ? "Time Off" : "Shift Swap"}
                        </p>
                        {r.type === "swap" && r.target_first_name && (
                          <p className={styles.swapDetails}>
                            Swap with {r.target_first_name} {r.target_last_name}
                            {r.target_shift_date && (
                              <> — {formatDate(r.target_shift_date)} {formatTime(r.target_shift_start_time)}–{formatTime(r.target_shift_end_time)}</>
                            )}
                          </p>
                        )}
                        {r.type === "swap" && (
                          <p className={styles.swapStatus}>{swapStatusLabel(r)}</p>
                        )}
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

          {tab === "incoming" && (
            <>
              {incomingSwaps.length === 0 ? (
                <p className={styles.empty}>No incoming swap requests.</p>
              ) : (
                <div className={styles.list}>
                  {incomingSwaps.map((r) => (
                    <div key={r.id} className={styles.requestCard}>
                      <div className={styles.info}>
                        <p className={styles.type}>Shift Swap from {r.first_name} {r.last_name}</p>
                        <p className={styles.swapDetails}>
                          Their shift: {formatDate(r.shift_date)} {formatTime(r.shift_start_time)}–{formatTime(r.shift_end_time)}
                        </p>
                        <p className={styles.swapDetails}>
                          Your shift: {formatDate(r.target_shift_date)} {formatTime(r.target_shift_start_time)}–{formatTime(r.target_shift_end_time)}
                        </p>
                        {r.reason && <p className={styles.reason}>{r.reason}</p>}
                      </div>
                      <div className={styles.swapActions}>
                        <button
                          className={styles.acceptBtn}
                          onClick={() => respondToSwap(r.id, true)}
                        >
                          Accept
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => respondToSwap(r.id, false)}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
