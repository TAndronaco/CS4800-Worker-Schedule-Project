"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url: string | null;
}

interface NotificationPreferences {
  shift_assigned: boolean;
  swap_proposed: boolean;
  swap_accepted: boolean;
  swap_rejected: boolean;
  request_approved: boolean;
  request_denied: boolean;
  time_off_update: boolean;
}

const PREF_LABELS: Record<keyof NotificationPreferences, string> = {
  shift_assigned: "Shift assignments",
  swap_proposed: "Incoming swap requests",
  swap_accepted: "Swap accepted by coworker",
  swap_rejected: "Swap declined by coworker",
  request_approved: "Request approved by manager",
  request_denied: "Request denied by manager",
  time_off_update: "Time-off request updates",
};

type Tab = "profile" | "notifications";

export default function SettingsPage() {
  const router = useRouter();
  const userId = useMemo<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") return null;
    return JSON.parse(stored).id;
  }, []);

  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!userId) { router.push("/login"); return; }
    apiFetch("/users/me").then((r) => r.json()).then((data: UserProfile) => {
      setProfile(data);
      setForm({ first_name: data.first_name, last_name: data.last_name, email: data.email });
    });
    apiFetch("/users/me/notification-preferences").then((r) => r.json()).then(setPrefs);
  }, [userId, router]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setSaving(true);
    const res = await apiFetch("/users/me", { method: "PUT", body: JSON.stringify(form) });
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        localStorage.setItem("user", JSON.stringify({ ...user, ...updated }));
      }
      setProfileMsg({ type: "success", text: "Profile updated." });
    } else {
      const data = await res.json();
      setProfileMsg({ type: "error", text: data.error || "Failed to update profile." });
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    setPwSaving(true);
    const res = await apiFetch("/users/me/password", {
      method: "PUT",
      body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
    });
    if (res.ok) {
      setPwMsg({ type: "success", text: "Password changed." });
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } else {
      const data = await res.json();
      setPwMsg({ type: "error", text: data.error || "Failed to change password." });
    }
    setPwSaving(false);
  }

  async function handlePrefToggle(key: keyof NotificationPreferences) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setPrefsSaving(true);
    setPrefsMsg(null);
    const res = await apiFetch("/users/me/notification-preferences", {
      method: "PUT",
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      const data = await res.json();
      setPrefs(data);
      setPrefsMsg({ type: "success", text: "Preferences saved." });
    } else {
      setPrefs(prefs);
      setPrefsMsg({ type: "error", text: "Failed to save preferences." });
    }
    setPrefsSaving(false);
  }

  if (!profile) return null;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>Settings</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "profile" ? styles.tabActive : ""}`}
          onClick={() => setTab("profile")}
        >
          Profile
        </button>
        <button
          className={`${styles.tab} ${tab === "notifications" ? styles.tabActive : ""}`}
          onClick={() => setTab("notifications")}
        >
          Notifications
        </button>
      </div>

      {tab === "profile" && (
        <div className={styles.section}>
          <h2>Profile Information</h2>
          <form className={styles.form} onSubmit={handleProfileSave}>
            <label>
              First Name
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                required
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <div className={styles.roleDisplay}>
              <span className={styles.roleLabel}>Role:</span>
              <span className={styles.roleBadge}>{profile.role}</span>
            </div>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {profileMsg && (
              <p className={profileMsg.type === "success" ? styles.success : styles.error}>
                {profileMsg.text}
              </p>
            )}
          </form>

          <h2 className={styles.sectionTitle}>Change Password</h2>
          <form className={styles.form} onSubmit={handlePasswordChange}>
            <label>
              Current Password
              <input
                type="password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                required
              />
            </label>
            <label>
              New Password
              <input
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                required
              />
            </label>
            <label>
              Confirm New Password
              <input
                type="password"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
                required
              />
            </label>
            <button type="submit" className={styles.saveBtn} disabled={pwSaving}>
              {pwSaving ? "Changing..." : "Change Password"}
            </button>
            {pwMsg && (
              <p className={pwMsg.type === "success" ? styles.success : styles.error}>
                {pwMsg.text}
              </p>
            )}
          </form>
        </div>
      )}

      {tab === "notifications" && (
        <div className={styles.section}>
          <h2>Notification Preferences</h2>
          <p className={styles.subtitle}>Choose which notifications you receive.</p>
          {prefs && (
            <div className={styles.prefsList}>
              {(Object.keys(PREF_LABELS) as Array<keyof NotificationPreferences>).map((key) => (
                <label key={key} className={styles.prefItem}>
                  <span>{PREF_LABELS[key]}</span>
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => handlePrefToggle(key)}
                    disabled={prefsSaving}
                    className={styles.toggle}
                  />
                </label>
              ))}
            </div>
          )}
          {prefsMsg && (
            <p className={prefsMsg.type === "success" ? styles.success : styles.error}>
              {prefsMsg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
