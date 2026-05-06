"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [modal, setModal] = useState<"login" | "register" | null>(null);
  const [error, setError] = useState("");

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "employee" as "manager" | "employee",
  });

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
        <p className={styles.subtitle}>
          Employee shift scheduling made simple. Create schedules, manage swaps,
          and keep your team in sync.
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
