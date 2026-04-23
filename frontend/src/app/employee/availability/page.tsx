"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface Team {
  id: number;
  name: string;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM – 10 PM

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function AvailabilityPage() {
  const router = useRouter();
  const userId = useMemo<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") return null;
    const user = JSON.parse(stored);
    return user.role === "employee" ? user.id : null;
  }, []);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Grid state: Set of "day-hour" keys representing selected cells
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") {
      router.push("/login");
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== "employee") {
      router.push("/dashboard");
      return;
    }

    apiFetch("/teams")
      .then((r) => r.json())
      .then((data: Team[]) => {
        setTeams(data);
        if (data.length > 0) setSelectedTeam(data[0].id);
        setLoading(false);
      });
  }, [router]);

  // Load existing availability when team changes
  useEffect(() => {
    if (!selectedTeam || !userId) return;
    apiFetch(`/availability?team_id=${selectedTeam}`)
      .then((r) => r.json())
      .then((slots: AvailabilitySlot[]) => {
        const newSelected = new Set<string>();
        for (const slot of slots) {
          const startH = parseInt(slot.start_time.split(":")[0], 10);
          const endH = parseInt(slot.end_time.split(":")[0], 10);
          for (let h = startH; h < endH; h++) {
            newSelected.add(`${slot.day_of_week}-${h}`);
          }
        }
        setSelected(newSelected);
        setMessage(null);
      });
  }, [selectedTeam, userId]);

  const handleMouseDown = useCallback(
    (key: string) => {
      setIsDragging(true);
      const willAdd = !selected.has(key);
      setDragMode(willAdd ? "add" : "remove");
      setSelected((prev) => {
        const next = new Set(prev);
        if (willAdd) next.add(key);
        else next.delete(key);
        return next;
      });
    },
    [selected]
  );

  const handleMouseEnter = useCallback(
    (key: string) => {
      if (!isDragging) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (dragMode === "add") next.add(key);
        else next.delete(key);
        return next;
      });
    },
    [isDragging, dragMode]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Convert selected cells to contiguous slots
  function selectedToSlots(): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    for (let day = 0; day < 7; day++) {
      const dayHours = HOURS.filter((h) => selected.has(`${day}-${h}`)).sort(
        (a, b) => a - b
      );
      if (dayHours.length === 0) continue;

      let start = dayHours[0];
      let prev = dayHours[0];
      for (let i = 1; i <= dayHours.length; i++) {
        if (i < dayHours.length && dayHours[i] === prev + 1) {
          prev = dayHours[i];
        } else {
          slots.push({
            day_of_week: day,
            start_time: `${pad2(start)}:00`,
            end_time: `${pad2(prev + 1)}:00`,
          });
          if (i < dayHours.length) {
            start = dayHours[i];
            prev = dayHours[i];
          }
        }
      }
    }
    return slots;
  }

  async function save() {
    if (!selectedTeam) return;
    setSaving(true);
    setMessage(null);
    const slots = selectedToSlots();
    const res = await apiFetch("/availability", {
      method: "PUT",
      body: JSON.stringify({ team_id: selectedTeam, slots }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Availability saved!" });
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to save." });
    }
  }

  function clearAll() {
    setSelected(new Set());
    setMessage(null);
  }

  if (loading) return null;

  return (
    <div className={styles.container} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <button className={styles.back} onClick={() => router.push("/dashboard")}>
        ← Back
      </button>
      <h1>My Availability</h1>

      {teams.length === 0 ? (
        <p className={styles.empty}>
          You haven&apos;t joined a team yet.{" "}
          <button className={styles.link} onClick={() => router.push("/employee/join")}>
            Join one now
          </button>
        </p>
      ) : (
        <>
          <div className={styles.controls}>
            <select
              value={selectedTeam ?? ""}
              onChange={(e) => setSelectedTeam(Number(e.target.value))}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <p className={styles.hint}>
            Click and drag to select hours you&apos;re available. Your manager will see this when building schedules.
          </p>

          <div className={styles.gridWithLabels}>
            <div className={styles.headerRow}>
              {DAY_NAMES.map((day) => (
                <div key={day} className={styles.headerCell}>
                  {day}
                </div>
              ))}
            </div>
            {HOURS.map((hour) => (
              <div key={hour} className={styles.timeRow}>
                <div className={styles.hourLabel}>{formatHour(hour)}</div>
                {DAY_NAMES.map((_, dayIdx) => {
                  const key = `${dayIdx}-${hour}`;
                  const isActive = selected.has(key);
                  return (
                    <div
                      key={key}
                      className={`${styles.cellInRow} ${isActive ? styles.cellActive : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleMouseDown(key);
                      }}
                      onMouseEnter={() => handleMouseEnter(key)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button className={styles.saveBtn} onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Availability"}
            </button>
            <button className={styles.clearBtn} onClick={clearAll}>
              Clear All
            </button>
          </div>

          {message && (
            <p className={message.type === "success" ? styles.success : styles.error}>
              {message.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}
