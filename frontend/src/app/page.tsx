"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface User {
  first_name: string;
  last_name: string;
  role: string;
}

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("user");
  if (stored && stored !== "undefined" && stored !== "null") {
    return JSON.parse(stored);
  }
  return null;
}

export default function Home() {
  const router = useRouter();
  const [modal, setModal] = useState<"login" | "register" | null>(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(getStoredUser);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "employee" as "manager" | "employee",
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  const closeModal = () => {
    setModal(null);
    setError("");
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed."); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(regData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed."); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const updateReg = (field: string, value: string) =>
    setRegData((prev) => ({ ...prev, [field]: value }));

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
        {user ? (
          <>
            <h1 className={styles.welcome}>Welcome back, {user.first_name}!</h1>
            <p className={styles.subtitle}>
              Ready to manage your schedule? Head to your dashboard to get started.
            </p>
            <div className={styles.ctas}>
              <button
                className={styles.primary}
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </button>
              <button
                className={styles.secondary}
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.welcome}>Welcome!</h1>
            <p className={styles.subtitle}>
              Stop losing shifts to last-minute texts. Build schedules in minutes,
              not hours — and keep your whole team in sync.
            </p>
            <div className={styles.ctas}>
              <button
                className={styles.primary}
                onClick={() => { setModal("register"); setError(""); }}
              >
                Get Started
              </button>
              <button
                className={styles.secondary}
                onClick={() => { setModal("login"); setError(""); }}
              >
                Sign In
              </button>
            </div>
          </>
        )}
      </main>

      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>
              &times;
            </button>

            {modal === "login" ? (
              <form onSubmit={handleLogin} className={styles.form}>
                <h2>Sign In</h2>
                {error && <p className={styles.error}>{error}</p>}
                <label>
                  Email
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </label>
                <button type="submit" className={styles.submitBtn}>Sign In</button>
                <p className={styles.switchText}>
                  Don&apos;t have an account?{" "}
                  <span className={styles.switchLink} onClick={() => { setModal("register"); setError(""); }}>
                    Sign Up
                  </span>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className={styles.form}>
                <h2>Create Account</h2>
                {error && <p className={styles.error}>{error}</p>}
                <label>
                  First Name
                  <input type="text" value={regData.first_name} onChange={(e) => updateReg("first_name", e.target.value)} required />
                </label>
                <label>
                  Last Name
                  <input type="text" value={regData.last_name} onChange={(e) => updateReg("last_name", e.target.value)} required />
                </label>
                <label>
                  Email
                  <input type="email" value={regData.email} onChange={(e) => updateReg("email", e.target.value)} required />
                </label>
                <label>
                  Password
                  <input type="password" value={regData.password} onChange={(e) => updateReg("password", e.target.value)} required minLength={6} />
                </label>
                <label>
                  Role
                  <select value={regData.role} onChange={(e) => updateReg("role", e.target.value)}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </label>
                <button type="submit" className={styles.submitBtn}>Sign Up</button>
                <p className={styles.switchText}>
                  Already have an account?{" "}
                  <span className={styles.switchLink} onClick={() => { setModal("login"); setError(""); }}>
                    Sign In
                  </span>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
