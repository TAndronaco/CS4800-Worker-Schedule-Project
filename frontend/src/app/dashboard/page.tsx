"use client";

import { useEffect, useState } from "react";
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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  if (!user) return null;

  return (
    <div className={styles.container}>
      <h1>Welcome, {user.first_name}!</h1>
      <p className={styles.role}>
        Role: <strong>{user.role}</strong>
      </p>

      {user.role === "manager" ? (
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>My Teams</h3>
            <p>Create and manage your teams</p>
          </div>
          <div className={styles.card}>
            <h3>Schedule</h3>
            <p>Create and publish weekly shifts</p>
          </div>
          <div className={styles.card}>
            <h3>Requests</h3>
            <p>Review swap and time-off requests</p>
          </div>
        </div>
      ) : (
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>My Schedule</h3>
            <p>View your upcoming shifts</p>
          </div>
          <div className={styles.card}>
            <h3>Requests</h3>
            <p>Request shift swaps or time off</p>
          </div>
          <div className={styles.card}>
            <h3>Join Team</h3>
            <p>Enter a join code to join a team</p>
          </div>
        </div>
      )}
    </div>
  );
}
