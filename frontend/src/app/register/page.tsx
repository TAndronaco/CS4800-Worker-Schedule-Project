"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "../login/page.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "employee" as "manager" | "employee",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Create Account</h2>
        {error && <p className={styles.error}>{error}</p>}
        <label>
          First Name
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            required
          />
        </label>
        <label>
          Last Name
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={formData.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={formData.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={6}
          />
        </label>
        <label>
          Role
          <select
            value={formData.role}
            onChange={(e) => update("role", e.target.value)}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </label>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}
