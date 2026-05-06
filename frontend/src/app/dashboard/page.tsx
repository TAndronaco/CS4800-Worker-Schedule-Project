"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ScheduleSummary from "@/components/ScheduleSummary";
import ManagerOverview from "@/components/ManagerOverview";
import styles from "./page.module.css";
import { apiFetch } from "@/lib/api";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: "manager" | "employee";
}

export default function DashboardPage() {
  const router = useRouter();
  const [teamsCount, setTeamsCount] = useState<number | null>(null);
  const [skipOnboarding, setSkipOnboarding] = useState(
    typeof window !== "undefined" && localStorage.getItem("onboarding_complete") === "true"
  );

  const user = useMemo<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch("/teams").then((r) => r.json()).then((teams: Array<{ id: number }>) => {
      setTeamsCount(teams.length);
      if (teams.length > 0) {
        localStorage.setItem("onboarding_complete", "true");
      }
    }).catch(() => setTeamsCount(0));
  }, [user]);

  if (!user) return null;

  if (user.role === "employee") {
    return (
      <div className={styles.container}>
        <h1>Welcome back, {user.first_name}!</h1>
        {!skipOnboarding && teamsCount === 0 && (
          <div className={styles.onboarding}>
            <h3>Getting Started</h3>
            <p>1. Join a team</p>
            <p>2. Set availability</p>
            <p>3. View your schedule</p>
            <button onClick={() => { localStorage.setItem("onboarding_complete", "true"); setSkipOnboarding(true); }}>Skip</button>
          </div>
        )}
        <ScheduleSummary userId={user.id} />
      </div>
    );
  }

  if (user.role === "manager") {
    return (
      <div className={styles.container}>
        <h1>Welcome, {user.first_name}!</h1>
        {!skipOnboarding && teamsCount === 0 && (
          <div className={styles.onboarding}>
            <h3>Getting Started</h3>
            <p>1. Create your first team</p>
            <p>2. Invite employees</p>
            <p>3. Build a schedule</p>
            <button onClick={() => { localStorage.setItem("onboarding_complete", "true"); setSkipOnboarding(true); }}>Skip</button>
          </div>
        )}
        <ManagerOverview />
      </div>
    );
  }

  return null;
}
