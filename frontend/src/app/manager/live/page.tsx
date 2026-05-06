"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; }
interface Member { id: number; first_name: string; last_name: string; }
interface ActiveEntry { user_id: number; first_name: string; last_name: string; clock_in: string; elapsed_minutes?: number; }

export default function ManagerLivePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [active, setActive] = useState<ActiveEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Team[]) => {
        const arr = Array.isArray(data) ? data : [];
        setTeams(arr);
        if (arr.length > 0) setSelectedTeam(arr[0].id);
      })
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    if (!selectedTeam) return;
    const load = () => {
      apiFetch(`/teams/${selectedTeam}/members`).then((r) => (r.ok ? r.json() : [])).then((d) => setMembers(Array.isArray(d) ? d : [])).catch(() => setMembers([]));
      apiFetch(`/clock/team?team_id=${selectedTeam}`).then((r) => (r.ok ? r.json() : [])).then((data) => {
        const rows: ActiveEntry[] = Array.isArray(data) ? data : [];
        const withElapsed = rows.map((row) => ({
          ...row,
          elapsed_minutes: Math.max(0, Math.floor((Date.now() - new Date(row.clock_in).getTime()) / 60000)),
        }));
        setActive(withElapsed);
      }).catch(() => setActive([]));
    };
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [selectedTeam]);

  const activeMap = new Map(active.map((e) => [e.user_id, e]));

  return (
    <div className={styles.container}>
      <h1>Live Team Status</h1>
      <div className={styles.controls}>
        <select value={selectedTeam ?? ""} onChange={(e) => setSelectedTeam(Number(e.target.value))}>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className={styles.grid}>
        {members.map((member) => {
          const entry = activeMap.get(member.id);
          const isOn = Boolean(entry);
          const elapsedMinutesTotal = entry?.elapsed_minutes ?? 0;
          const elapsedHours = Math.floor(elapsedMinutesTotal / 60);
          const elapsedMinutes = elapsedMinutesTotal % 60;
          return (
            <div key={member.id} className={styles.card}>
              <span className={`${styles.dot} ${isOn ? styles.on : styles.off}`} />
              <div>
                <div className={styles.name}>{member.first_name} {member.last_name}</div>
                {isOn ? (
                  <div className={styles.meta}>
                    In since {new Date(entry!.clock_in).toLocaleTimeString()} · {elapsedHours}h {elapsedMinutes}m
                  </div>
                ) : (
                  <div className={styles.meta}>Not working</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
