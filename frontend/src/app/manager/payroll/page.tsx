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
  hourly_rate: number;
}

interface EditState {
  employeeId: number | null;
  newRate: string;
  firstName: string;
  lastName: string;
}

export default function ManagerPayrollPage() {
  const router = useRouter();
  const userRole = useMemo<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") return null;
    const user = JSON.parse(stored);
    return user.role;
  }, []);

  const [teamId, setTeamId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<EditState>({
    employeeId: null,
    newRate: "",
    firstName: "",
    lastName: "",
  });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(
    null
  );

  useEffect(() => {
    if (userRole !== "manager") {
      router.push("/dashboard");
      return;
    }

    // Get manager's team
    apiFetch("/teams")
      .then((res) => res.json())
      .then((teams: { id: number; name: string }[]) => {
        if (teams.length > 0) {
          setTeamId(teams[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [userRole, router]);

  useEffect(() => {
    if (!teamId) return;

    let cancelled = false;

    // Try payroll endpoint first, fall back to team members list
    apiFetch(`/payroll/team-rates?team_id=${teamId}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch team rates");
      })
      .then((data) => {
        if (!cancelled) {
          setEmployees(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: fetch team members directly
        apiFetch(`/teams/${teamId}/members`)
          .then((res) => res.json())
          .then((members: { id: number; first_name: string; last_name: string; email: string; hourly_rate?: number }[]) => {
            if (!cancelled) {
              setEmployees(
                members
                  .filter((m) => m.id !== undefined)
                  .map((m) => ({
                    id: m.id,
                    first_name: m.first_name,
                    last_name: m.last_name,
                    email: m.email || "",
                    hourly_rate: m.hourly_rate ?? 0,
                  }))
              );
              setLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) setLoading(false);
          });
      });
    return () => { cancelled = true; };
  }, [teamId]);

  const handleEditClick = (employee: Employee) => {
    setEditState({
      employeeId: employee.id,
      newRate: employee.hourly_rate.toString(),
      firstName: employee.first_name,
      lastName: employee.last_name,
    });
  };

  const handleSaveRate = async () => {
    if (!editState.employeeId) return;

    const rate = parseFloat(editState.newRate);
    if (isNaN(rate) || rate < 0) {
      setMessage({ type: "error", text: "Please enter a valid hourly rate" });
      return;
    }

    try {
      const res = await apiFetch("/payroll/set-rate", {
        method: "PUT",
        body: JSON.stringify({
          employee_id: editState.employeeId,
          hourly_rate: rate,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Hourly rate updated successfully" });
        // Update local state
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === editState.employeeId
              ? { ...emp, hourly_rate: rate }
              : emp
          )
        );
        setEditState({
          employeeId: null,
          newRate: "",
          firstName: "",
          lastName: "",
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: "Failed to update hourly rate" });
      }
    } catch {
      setMessage({ type: "error", text: "Error updating hourly rate" });
    }
  };

  if (!userRole) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Team Payroll</h1>
      <p className={styles.subtitle}>Manage employee hourly rates and compensation.</p>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p className={styles.loadingText}>Loading team members...</p>
      ) : employees.length === 0 ? (
        <p className={styles.emptyState}>
          No team members found. Add employees to your team to manage their rates.
        </p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Email</th>
                <th>Hourly Rate</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className={styles.nameCell}>
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td>{emp.email}</td>
                  <td className={styles.rateCell}>
                    <span className={styles.rateAmount}>
                      ${emp.hourly_rate.toFixed(2)}/hr
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.editBtn}
                      onClick={() => handleEditClick(emp)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editState.employeeId && (
        <div className={styles.modal} onClick={() => setEditState({ ...editState, employeeId: null })}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Hourly Rate</h2>
            <p className={styles.employeeName}>
              {editState.firstName} {editState.lastName}
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="rate-input">Hourly Rate ($)</label>
              <input
                id="rate-input"
                type="number"
                min="0"
                step="0.01"
                value={editState.newRate}
                onChange={(e) =>
                  setEditState({
                    ...editState,
                    newRate: e.target.value,
                  })
                }
                placeholder="e.g., 15.50"
                className={styles.rateInput}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setEditState({ ...editState, employeeId: null })}
              >
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSaveRate}>
                Save Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
