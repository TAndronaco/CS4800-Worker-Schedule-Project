"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team { id: number; name: string; join_code: string; }

export default function JoinTeamPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "employee") { router.push("/dashboard"); return; }
    apiFetch("/teams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Team[]) => { setTeams(data); setLoading(false); });
  }, [router]);

  function fetchTeams() {
    apiFetch("/teams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Team[]) => setTeams(data));
  }

  async function joinTeam(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await apiFetch("/teams/join", {
      method: "POST",
      body: JSON.stringify({ join_code: joinCode.trim().toUpperCase() }),
    });
    if (res.ok) {
      setJoinCode("");
      setMessage("Successfully joined the team!");
      fetchTeams();
    } else {
      const data = await res.json();
      setError(data.error || "Invalid join code.");
    }
  }

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>Join a Team</h1>

      <form className={styles.form} onSubmit={joinTeam}>
        <input
          placeholder="Enter join code (e.g. A1B2C3D4)"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          required
        />
        <button type="submit">Join Team</button>
      </form>
      {message && <p className={styles.success}>{message}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <h2 className={styles.sectionTitle}>My Teams</h2>
      {teams.length === 0 ? (
        <p className={styles.empty}>You haven&apos;t joined any teams yet.</p>
      ) : (
        <div className={styles.list}>
          {teams.map((team) => (
            <div key={team.id} className={styles.teamCard}>
              <span>{team.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
