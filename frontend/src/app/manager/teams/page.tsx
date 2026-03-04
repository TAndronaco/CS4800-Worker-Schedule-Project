"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team {
  id: number;
  name: string;
  join_code: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "manager") { router.push("/dashboard"); return; }
    fetchTeams();
  }, [router]);

  async function fetchTeams() {
    const res = await apiFetch("/teams");
    if (res.ok) setTeams(await res.json());
    setLoading(false);
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await apiFetch("/teams", {
      method: "POST",
      body: JSON.stringify({ name: newTeamName }),
    });
    if (res.ok) {
      setNewTeamName("");
      fetchTeams();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create team.");
    }
  }

  if (loading) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>My Teams</h1>

      <form className={styles.form} onSubmit={createTeam}>
        <input
          placeholder="Team name"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          required
        />
        <button type="submit">Create Team</button>
        {error && <p className={styles.error}>{error}</p>}
      </form>

      {teams.length === 0 ? (
        <p className={styles.empty}>No teams yet. Create one above.</p>
      ) : (
        <div className={styles.list}>
          {teams.map((team) => (
            <div key={team.id} className={styles.teamCard}>
              <div>
                <h3>{team.name}</h3>
                <p className={styles.code}>
                  Join Code: <strong>{team.join_code}</strong>
                </p>
              </div>
              <button
                className={styles.copyBtn}
                onClick={() => navigator.clipboard.writeText(team.join_code)}
              >
                Copy Code
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
