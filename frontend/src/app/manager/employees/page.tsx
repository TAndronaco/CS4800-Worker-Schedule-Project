"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  hourly_rate: number;
}

interface ClockEntry {
  id: number;
  user_id: number;
  team_id: number;
  clock_in: string;
  clock_out: string | null;
}

export default function ManagerEmployeesPage() {
  const router = useRouter();
  const userRole = useMemo<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") return null;
    return JSON.parse(stored).role;
  }, []);

  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [editingRateValue, setEditingRateValue] = useState("");
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [hoursEmployee, setHoursEmployee] = useState<Employee | null>(null);
  const [clockEntries, setClockEntries] = useState<ClockEntry[]>([]);
  const [hoursLoading, setHoursLoading] = useState(false);

  useEffect(() => {
    if (userRole !== "manager") {
      router.push("/dashboard");
      return;
    }

    apiFetch("/teams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const teams: { id: number; name: string }[] = Array.isArray(data) ? data : [];
        if (teams.length > 0) {
          setTeamId(teams[0].id);
          setTeamName(teams[0].name);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [userRole, router]);

  useEffect(() => {
    if (!teamId) return;
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const loadEmployees = async () => {
    if (!teamId) return;
    try {
      const res = await apiFetch(`/teams/${teamId}/members`);
      if (!res.ok) { setEmployees([]); return; }
      const members = await res.json();
      if (!Array.isArray(members)) { setEmployees([]); return; }
      setEmployees(
        members
          .filter((m: Employee) => m.role === "employee")
          .map((m: Employee) => ({
            ...m,
            hourly_rate: parseFloat(String(m.hourly_rate)) || 0,
          }))
      );
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const startEditRate = (emp: Employee) => {
    setEditingRateId(emp.id);
    setEditingRateValue(emp.hourly_rate.toString());
  };

  const saveRate = async (emp: Employee) => {
    const rate = parseFloat(editingRateValue);
    if (isNaN(rate) || rate < 0) {
      setMessage({ type: "error", text: "Please enter a valid hourly rate." });
      return;
    }

    try {
      const rateRes = await apiFetch("/payroll/set-rate", {
        method: "PUT",
        body: JSON.stringify({ employee_id: emp.id, hourly_rate: rate }),
      });

      if (!rateRes.ok) {
        const err = await rateRes.json();
        setMessage({ type: "error", text: err.error || "Failed to update rate." });
        return;
      }

      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, hourly_rate: rate } : e))
      );
      setMessage({ type: "success", text: `Updated ${emp.first_name}'s hourly rate.` });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setEditingRateId(null);
    }
  };

  const handleRemove = async (emp: Employee) => {
    if (!teamId) return;
    if (!confirm(`Remove ${emp.first_name} ${emp.last_name} from the team?`)) return;

    try {
      const res = await apiFetch(`/teams/${teamId}/members/${emp.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
        setMessage({ type: "success", text: `${emp.first_name} removed from team.` });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: "Failed to remove employee." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    }
  };

  const openHours = async (emp: Employee) => {
    if (!teamId) return;
    setHoursEmployee(emp);
    setHoursLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
        .toISOString().split("T")[0];
      const end = now.toISOString().split("T")[0];
      const res = await apiFetch(
        `/clock/team?team_id=${teamId}&start=${start}&end=${end}`
      );
      const data = await res.json();
      const entries = (Array.isArray(data) ? data : []).filter(
        (e: ClockEntry) => e.user_id === emp.id
      );
      setClockEntries(entries);
    } catch {
      setClockEntries([]);
    } finally {
      setHoursLoading(false);
    }
  };

  const handleEditEntry = async (entry: ClockEntry, clockIn: string, clockOut: string | null) => {
    try {
      const res = await apiFetch(`/clock/entry/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ clock_in: clockIn, clock_out: clockOut }),
      });
      if (res.ok) {
        const updated = await res.json();
        setClockEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? updated : e))
        );
        setMessage({ type: "success", text: "Clock entry updated." });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to update entry." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!confirm("Delete this clock entry?")) return;
    try {
      const res = await apiFetch(`/clock/entry/${entryId}`, { method: "DELETE" });
      if (res.ok) {
        setClockEntries((prev) => prev.filter((e) => e.id !== entryId));
        setMessage({ type: "success", text: "Clock entry deleted." });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    }
  };

  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(q) ||
      emp.last_name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q)
    );
  });

  if (!userRole) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Employees</h1>
      <p className={styles.subtitle}>
        Manage your team members{teamName ? ` — ${teamName}` : ""}.
      </p>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p className={styles.loadingText}>Loading employees...</p>
      ) : employees.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No employees on your team yet.</p>
          <p className={styles.emptyHint}>
            Share your team join code so employees can join.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <span className={styles.count}>{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <div className={styles.grid}>
            {filtered.map((emp) => (
              <div key={emp.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    {emp.first_name[0]}
                    {emp.last_name[0]}
                  </div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.empName}>
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p className={styles.empEmail}>{emp.email}</p>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Hourly Rate</span>
                    {editingRateId === emp.id ? (
                      <span className={styles.inlineEdit}>
                        <span className={styles.dollarSign}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={styles.rateInput}
                          value={editingRateValue}
                          onChange={(e) => setEditingRateValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRate(emp);
                            if (e.key === "Escape") setEditingRateId(null);
                          }}
                          onBlur={() => saveRate(emp)}
                          autoFocus
                        />
                      </span>
                    ) : (
                      <span
                        className={`${styles.statValue} ${styles.editable}`}
                        onClick={() => startEditRate(emp)}
                        title="Click to edit"
                      >
                        ${emp.hourly_rate.toFixed(2)}/hr
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.hoursBtn}
                    onClick={() => openHours(emp)}
                  >
                    Hours
                  </button>
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemove(emp)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hours Modal */}
      {hoursEmployee && (
        <div className={styles.overlay} onClick={() => setHoursEmployee(null)}>
          <div className={`${styles.modal} ${styles.hoursModal}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Hours</h2>
            <p className={styles.modalSubtitle}>
              {hoursEmployee.first_name} {hoursEmployee.last_name} — Last 30 days
            </p>

            {hoursLoading ? (
              <p className={styles.loadingText}>Loading entries...</p>
            ) : clockEntries.length === 0 ? (
              <p className={styles.emptyHint}>No clock entries found for this period.</p>
            ) : (
              <div className={styles.entriesList}>
                {clockEntries.map((entry) => (
                  <ClockEntryRow
                    key={entry.id}
                    entry={entry}
                    onSave={handleEditEntry}
                    onDelete={handleDeleteEntry}
                  />
                ))}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setHoursEmployee(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClockEntryRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: ClockEntry;
  onSave: (entry: ClockEntry, clockIn: string, clockOut: string | null) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [clockIn, setClockIn] = useState(
    entry.clock_in ? new Date(entry.clock_in).toISOString().slice(0, 16) : ""
  );
  const [clockOut, setClockOut] = useState(
    entry.clock_out ? new Date(entry.clock_out).toISOString().slice(0, 16) : ""
  );

  const formatDisplay = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getHours = () => {
    if (!entry.clock_in || !entry.clock_out) return null;
    const diff =
      (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) /
      3600000;
    return diff.toFixed(1);
  };

  if (editing) {
    return (
      <div className={styles.entryRow}>
        <div className={styles.entryInputs}>
          <div className={styles.entryField}>
            <label>In</label>
            <input
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
            />
          </div>
          <div className={styles.entryField}>
            <label>Out</label>
            <input
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.entryActions}>
          <button
            className={styles.saveSmBtn}
            onClick={() => {
              onSave(
                entry,
                new Date(clockIn).toISOString(),
                clockOut ? new Date(clockOut).toISOString() : null
              );
              setEditing(false);
            }}
          >
            Save
          </button>
          <button className={styles.cancelSmBtn} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.entryRow}>
      <div className={styles.entryInfo}>
        <span className={styles.entryTime}>
          {formatDisplay(entry.clock_in)}
        </span>
        <span className={styles.entryArrow}>→</span>
        <span className={styles.entryTime}>
          {entry.clock_out ? formatDisplay(entry.clock_out) : "Active"}
        </span>
        {getHours() && (
          <span className={styles.entryHours}>{getHours()}h</span>
        )}
      </div>
      <div className={styles.entryActions}>
        <button className={styles.editSmBtn} onClick={() => setEditing(true)}>
          ✏��
        </button>
        <button className={styles.deleteSmBtn} onClick={() => onDelete(entry.id)}>
          🗑️
        </button>
      </div>
    </div>
  );
}
