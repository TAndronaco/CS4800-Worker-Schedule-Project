"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: "manager" | "employee";
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useMemo<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className={styles.container}>
      <h1>Welcome, {user.first_name}!</h1>
      <p className={styles.role}>
        Role: <strong>{user.role}</strong>
      </p>

      {user.role === "manager" ? (
        <div className={styles.cards}>
          <div className={styles.card} onClick={() => router.push("/manager/teams")}>
            <h3>My Teams</h3>
            <p>Create and manage your teams</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/manager/schedule")}>
            <h3>Schedule</h3>
            <p>Create and publish weekly shifts</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/manager/requests")}>
            <h3>Requests</h3>
            <p>Review swap and time-off requests</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/messages")}>
            <h3>Messages</h3>
            <p>Chat with your team</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/manager/performance")}>
            <h3>Performance</h3>
            <p>View and report employee metrics</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/employee/join")}>
            <h3>Join Team</h3>
            <p>Join a team using a join code</p>
          </div>
        </div>
      ) : (
        <div className={styles.cards}>
          <div className={styles.card} onClick={() => router.push("/employee/schedule")}>
            <h3>My Schedule</h3>
            <p>View your upcoming shifts</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/employee/requests")}>
            <h3>Requests</h3>
            <p>Request shift swaps or time off</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/employee/join")}>
            <h3>Join Team</h3>
            <p>Enter a join code to join a team</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/messages")}>
            <h3>Messages</h3>
            <p>Chat with your team</p>
          </div>
          <div className={styles.card} onClick={() => router.push("/employee/performance")}>
            <h3>Performance</h3>
            <p>View your performance metrics</p>
          </div>
        </div>
      )}
    </div>
  );
}
