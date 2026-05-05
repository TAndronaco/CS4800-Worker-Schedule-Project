"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }
interface ClockEntry {
  id: number;
  clock_in: string;
  clock_out: string | null;
  shift_id: number | null;
}

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

export default function ClockPage() {
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
  const [clockedIn, setClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<ClockEntry | null>(null);
  const [history, setHistory] = useState<ClockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!userId) { router.push("/login"); return; }
    apiFetch("/teams").then((r) => r.json()).then((data: Team[]) => {
      setTeams(data);
      if (data.length > 0) setSelectedTeam(data[0].id);
      setLoading(false);
    });
  }, [userId, router]);

  useEffect(() => {
    if (!selectedTeam) return;
    apiFetch(`/clock/status?team_id=${selectedTeam}`).then((r) => r.json()).then((data) => {
      setClockedIn(data.clocked_in);
      setCurrentEntry(data.entry);
    });
    apiFetch(`/clock/history?team_id=${selectedTeam}`).then((r) => r.json()).then(setHistory);
  }, [selectedTeam]);

  useEffect(() => {
    const tick = () => {
      if (!clockedIn || !currentEntry) {
        setElapsed("");
        return;
      }

      const ms = Math.max(0, Date.now() - new Date(currentEntry.clock_in).getTime());
      const hrs = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setElapsed(`${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };
    tick();
    if (!clockedIn || !currentEntry) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clockedIn, currentEntry]);

  async function handleClockIn() {
    setActionLoading(true);
    const res = await apiFetch("/clock/in", { method: "POST", body: JSON.stringify({ team_id: selectedTeam }) });
    if (res.ok) {
      const entry = await res.json();
      setClockedIn(true);
      setCurrentEntry(entry);
    }
    setActionLoading(false);
  }

  async function handleClockOut() {
    setActionLoading(true);
    const res = await apiFetch("/clock/out", { method: "POST", body: JSON.stringify({ team_id: selectedTeam }) });
    if (res.ok) {
      const entry = await res.json();
      setClockedIn(false);
      setCurrentEntry(null);
      setHistory((prev) => [entry, ...prev]);
    }
    setActionLoading(false);
  }

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>Clock In / Out</h1>

      {teams.length === 0 ? (
        <p className={styles.empty}>Join a team first to start clocking in.</p>
      ) : (
        <>
          <div className={styles.controls}>
            <select value={selectedTeam ?? ""} onChange={(e) => setSelectedTeam(Number(e.target.value))}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className={styles.clockCard}>
            <div className={`${styles.statusIndicator} ${clockedIn ? styles.active : styles.inactive}`} />
            <p className={styles.statusText}>{clockedIn ? "Currently Clocked In" : "Not Clocked In"}</p>
            {clockedIn && elapsed && <p className={styles.elapsed}>{elapsed}</p>}
            <button
              className={clockedIn ? styles.clockOutBtn : styles.clockInBtn}
              onClick={clockedIn ? handleClockOut : handleClockIn}
              disabled={actionLoading}
            >
              {actionLoading ? "..." : clockedIn ? "Clock Out" : "Clock In"}
            </button>
          </div>

          <h2 className={styles.historyTitle}>Recent History</h2>
          {history.length === 0 ? (
            <p className={styles.empty}>No clock entries yet.</p>
          ) : (
            <div className={styles.historyList}>
              {history.slice(0, 20).map((entry) => (
                <div key={entry.id} className={styles.historyItem}>
                  <div>
                    <p className={styles.historyDate}>{formatDateTime(entry.clock_in)}</p>
                    {entry.clock_out && (
                      <p className={styles.historyOut}>Out: {formatDateTime(entry.clock_out)}</p>
                    )}
                  </div>
                  <span className={styles.historyDuration}>
                    {entry.clock_out ? formatDuration(entry.clock_in, entry.clock_out) : "In progress"}
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
