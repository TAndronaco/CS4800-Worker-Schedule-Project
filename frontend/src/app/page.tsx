"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Image from "next/image";
import Link from "next/link";
import { TEST_USERS } from "@/lib/testData";

const managers = TEST_USERS.filter((u) => u.role === "manager");
const employees = TEST_USERS.filter((u) => u.role === "employee");

export default function Home() {
  const router = useRouter();
  const [selectedManager, setSelectedManager] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  function loginAsTestUser(userId: string) {
    const user = TEST_USERS.find((u) => u.id === Number(userId));
    if (!user) return;
    localStorage.setItem("user", JSON.stringify({ ...user, isTestUser: true }));
    localStorage.setItem("token", "test-token");
    router.push("/dashboard");
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          src="/logo.png"
          alt="ShiftSync - Simple Scheduling Made Easy"
          width={500}
          height={273}
          className={styles.logo}
          priority
        />
        <p className={styles.subtitle}>
          Employee shift scheduling made simple. Create schedules, manage swaps,
          and keep your team in sync.
        </p>
        <div className={styles.ctas}>
          <Link href="/register" className={styles.primary}>
            Get Started
          </Link>
          <Link href="/login" className={styles.secondary}>
            Sign In
          </Link>
        </div>
        <div className={styles.testButtons}>
          <p className={styles.testLabel}>Quick Test Access</p>
          <div className={styles.testRow}>
            <div className={styles.testGroup}>
              <label className={styles.testGroupLabel}>Manager</label>
              <select
                className={styles.testSelect}
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
              >
                <option value="">Select a manager...</option>
                {managers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
              <button
                className={styles.testBtn}
                disabled={!selectedManager}
                onClick={() => loginAsTestUser(selectedManager)}
              >
                Enter as Manager
              </button>
            </div>
            <div className={styles.testGroup}>
              <label className={styles.testGroupLabel}>Employee</label>
              <select
                className={styles.testSelect}
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">Select an employee...</option>
                {employees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
              <button
                className={styles.testBtn}
                disabled={!selectedEmployee}
                onClick={() => loginAsTestUser(selectedEmployee)}
              >
                Enter as Employee
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
