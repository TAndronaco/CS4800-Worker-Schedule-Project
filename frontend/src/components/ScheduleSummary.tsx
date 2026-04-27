"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./ScheduleSummary.module.css";

interface Shift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  employee_id: number;
  first_name: string;
  last_name: string;
}

interface Team {
  id: number;
  name: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getWeekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function formatShortTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export default function ScheduleSummary({ userId }: { userId: number }) {
  const router = useRouter();
  const monday = useMemo(() => getMondayOfCurrentWeek(), []);
  const weekDays = useMemo(() => getWeekDays(monday), [monday]);
  const today = new Date().toISOString().split("T")[0];

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch("/teams")
      .then((r) => r.json())
      .then((teams: Team[]) => {
        if (teams.length === 0) {
          setLoaded(true);
          return;
        }
        // Fetch shifts for first team
        return apiFetch(`/shifts?team_id=${teams[0].id}&week=${monday}`)
          .then((r) => r.json())
          .then((data: Shift[]) => {
            setShifts(data.filter((s) => s.employee_id === userId));
            setLoaded(true);
          });
      })
      .catch(() => setLoaded(true));
  }, [monday, userId]);

  if (!loaded) return null;

  // Find today's shift
  const todayShift = shifts.find(
    (s) => s.date.split("T")[0] === today
  );

  // Upcoming shifts (today onward, sorted by date)
  const upcomingShifts = shifts
    .filter((s) => s.date.split("T")[0] >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate total hours this week
  const totalHours = shifts.reduce((sum, s) => {
    const [sh] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    return sum + (eh + em / 60 - sh);
  }, 0);

  return (
    <>
      {/* Today's shift highlight */}
      <div className={styles.todayCard}>
        <div className={styles.todayInfo}>
          <h3>{todayShift ? "You're working today" : "No shift today"}</h3>
          <p>
            {todayShift
              ? `${formatShortTime(todayShift.start_time)} – ${formatShortTime(todayShift.end_time)}`
              : "Enjoy your day off!"}
          </p>
        </div>
        <div className={styles.todayIcon}>{todayShift ? "⏰" : "☀️"}</div>
      </div>

      {/* Week strip */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            This Week · {Math.round(totalHours)}h total
          </span>
          <button
            className={styles.viewAll}
            onClick={() => router.push("/employee/schedule")}
          >
            View full schedule →
          </button>
        </div>
        <div className={styles.weekStrip}>
          {weekDays.map((day, i) => {
            const dayShift = shifts.find(
              (s) => s.date.split("T")[0] === day
            );
            const isToday = day === today;
            return (
              <div key={day} className={styles.dayColumn}>
                <span className={styles.dayName}>{DAY_NAMES[i]}</span>
                <span className={styles.dayDate}>
                  {day.slice(8)}/{day.slice(5, 7)}
                </span>
                <div
                  className={`${styles.shiftPill} ${
                    dayShift ? styles.hasShift : styles.noShift
                  } ${isToday ? styles.today : ""}`}
                >
                  {dayShift ? (
                    <span className={styles.shiftTime}>
                      {formatShortTime(dayShift.start_time)}–
                      {formatShortTime(dayShift.end_time)}
                    </span>
                  ) : (
                    <span className={styles.offLabel}>Off</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className={styles.quickActions}>
        <div
          className={styles.quickCard}
          onClick={() => router.push("/employee/requests")}
        >
          <h4>🔄 Requests</h4>
          <p>Swap shifts or request time off</p>
        </div>
        <div
          className={styles.quickCard}
          onClick={() => router.push("/employee/time-off")}
        >
          <h4>🏖️ Time Off</h4>
          <p>Request days off</p>
        </div>
        <div
          className={styles.quickCard}
          onClick={() => router.push("/employee/availability")}
        >
          <h4>📅 Availability</h4>
          <p>Set when you can work</p>
        </div>
        <div
          className={styles.quickCard}
          onClick={() => router.push("/employee/join")}
        >
          <h4>👥 Join Team</h4>
          <p>Enter a join code</p>
        </div>
      </div>

      {/* Upcoming shifts detail list */}
      {upcomingShifts.length > 0 && (
        <div className={styles.card} style={{ marginTop: "1.5rem" }}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Upcoming Shifts</span>
          </div>
          <div className={styles.upcomingList}>
            {upcomingShifts.map((s) => {
              const d = new Date(s.date + "T00:00:00");
              const dayLabel = d.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              });
              const [sh] = s.start_time.split(":").map(Number);
              const [eh, em] = s.end_time.split(":").map(Number);
              const hours = eh + em / 60 - sh;
              return (
                <div key={s.id} className={styles.upcomingItem}>
                  <div className={styles.upcomingDate}>
                    <span className={styles.upcomingDay}>
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className={styles.upcomingDateNum}>{d.getDate()}</span>
                  </div>
                  <div className={styles.upcomingDetails}>
                    <span className={styles.upcomingLabel}>{dayLabel}</span>
                    <span className={styles.upcomingTime}>
                      {formatShortTime(s.start_time)} – {formatShortTime(s.end_time)} · {hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
