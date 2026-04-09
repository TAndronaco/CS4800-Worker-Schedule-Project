"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ScheduleSummary from "@/components/ScheduleSummary";
import ManagerOverview from "@/components/ManagerOverview";
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
    return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null;

  if (user.role === "employee") {
    return (
      <div className={styles.container}>
        <h1>Welcome back, {user.first_name}!</h1>
        <ScheduleSummary userId={user.id} />
      </div>
    );
  }

  if (user.role === "manager") {
    return (
      <div className={styles.container}>
        <h1>Welcome, {user.first_name}!</h1>
        <ManagerOverview />
      </div>
    );
  }

  return null;
}
