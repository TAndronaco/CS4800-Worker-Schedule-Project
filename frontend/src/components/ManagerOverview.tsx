"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Avatar from "./Avatar";
import styles from "./ManagerOverview.module.css";

interface Team {
  id: number;
  name: string;
  join_code: string;
}

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string | null;
}

interface Shift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  employee_id: number;
  first_name: string;
  last_name: string;
}

interface ShiftRequest {
  id: number;
  type: string;
  status: string;
  requester_id: number;
  first_name: string;
  last_name: string;
  reason: string;
  created_at: string;
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

export default function ManagerOverview() {
  const router = useRouter();
  const monday = useMemo(() => getMondayOfCurrentWeek(), []);
  const weekDays = useMemo(() => getWeekDays(monday), [monday]);
  const today = new Date().toISOString().split("T")[0];

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ShiftRequest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch("/teams")
      .then((r) => r.json())
      .then(async (data: Team[]) => {
        setTeams(data);
        if (data.length === 0) {
          setLoaded(true);
          return;
        }

        // Fetch members, shifts, and requests for all teams
        const memberPromises = data.map((t) =>
          apiFetch(`/teams/${t.id}/members`)
            .then((r) => r.json())
            .catch(() => [])
        );
        const shiftPromises = data.map((t) =>
          apiFetch(`/shifts?team_id=${t.id}&week=${monday}`)
            .then((r) => r.json())
            .catch(() => [])
        );
        const requestPromises = data.map((t) =>
          apiFetch(`/requests?team_id=${t.id}`)
            .then((r) => r.json())
            .catch(() => [])
        );

        const [memberResults, shiftResults, requestResults] = await Promise.all([
          Promise.all(memberPromises),
          Promise.all(shiftPromises),
          Promise.all(requestPromises),
        ]);

        // Deduplicate members by id
        const allMembers: Member[] = [];
        const seenIds = new Set<number>();
        memberResults.flat().forEach((m: Member) => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            allMembers.push(m);
          }
        });

        setMembers(allMembers);
        setShifts(shiftResults.flat());
        setPendingRequests(
          requestResults
            .flat()
            .filter((r: ShiftRequest) => r.status === "pending")
        );
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [monday]);

  if (!loaded) return null;

  // Calculate stats
  const totalShiftsThisWeek = shifts.length;
  const totalHours = shifts.reduce((sum, s) => {
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    return sum + (eh + em / 60 - (sh + sm / 60));
  }, 0);
  const employeesScheduled = new Set(shifts.map((s) => s.employee_id)).size;
  const employeeCount = members.filter((m) => m.role === "employee").length;

  // Shifts per day for the coverage strip
  const shiftsPerDay = weekDays.map(
    (day) => shifts.filter((s) => s.date.split("T")[0] === day).length
  );

  // Today's active employees
  const todayShifts = shifts.filter((s) => s.date.split("T")[0] === today);

  return (
    <>
      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{teams.length}</span>
          <span className={styles.statLabel}>Teams</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{employeeCount}</span>
          <span className={styles.statLabel}>Employees</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalShiftsThisWeek}</span>
          <span className={styles.statLabel}>Shifts This Week</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{Math.round(totalHours)}h</span>
          <span className={styles.statLabel}>Total Hours</span>
        </div>
      </div>

      {/* Today's coverage */}
      <div className={styles.todayCard}>
        <div className={styles.todayInfo}>
          <h3>
            {todayShifts.length > 0
              ? `${todayShifts.length} employee${todayShifts.length !== 1 ? "s" : ""} working today`
              : "No shifts scheduled today"}
          </h3>
          <p>
            {todayShifts.length > 0
              ? todayShifts.map((s) => s.first_name).join(", ")
              : "Everyone has the day off"}
          </p>
        </div>
        <div className={styles.todayIcon}>
          {todayShifts.length > 0 ? "👷" : "☀️"}
        </div>
      </div>

      {/* Weekly coverage strip */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            Weekly Coverage · {employeesScheduled}/{employeeCount} employees
            scheduled
          </span>
          <button
            className={styles.viewAll}
            onClick={() => router.push("/manager/schedule")}
          >
            Manage schedule →
          </button>
        </div>
        <div className={styles.weekStrip}>
          {weekDays.map((day, i) => {
            const count = shiftsPerDay[i];
            const isToday = day === today;
            return (
              <div key={day} className={styles.dayColumn}>
                <span className={styles.dayName}>{DAY_NAMES[i]}</span>
                <span className={styles.dayDate}>
                  {day.slice(8)}/{day.slice(5, 7)}
                </span>
                <div
                  className={`${styles.coveragePill} ${
                    count === 0
                      ? styles.noCoverage
                      : count <= 2
                        ? styles.lowCoverage
                        : styles.goodCoverage
                  } ${isToday ? styles.today : ""}`}
                >
                  <span className={styles.coverageCount}>{count}</span>
                  <span className={styles.coverageLabel}>
                    shift{count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending requests + Quick actions row */}
      <div className={styles.bottomRow}>
        {/* Pending requests */}
        <div className={styles.card} style={{ flex: 1 }}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              Pending Requests
              {pendingRequests.length > 0 && (
                <span className={styles.badge}>{pendingRequests.length}</span>
              )}
            </span>
            <button
              className={styles.viewAll}
              onClick={() => router.push("/manager/requests")}
            >
              View all →
            </button>
          </div>
          {pendingRequests.length === 0 ? (
            <div className={styles.emptyState}>No pending requests</div>
          ) : (
            <div className={styles.requestList}>
              {pendingRequests.slice(0, 4).map((req) => (
                <div key={req.id} className={styles.requestItem}>
                  <Avatar
                    firstName={req.first_name}
                    lastName={req.last_name}
                    size="sm"
                  />
                  <div className={styles.requestDetails}>
                    <span className={styles.requestName}>
                      {req.first_name} {req.last_name}
                    </span>
                    <span className={styles.requestType}>
                      {req.type === "swap" ? "Shift Swap" : "Time Off"}
                    </span>
                  </div>
                  <span className={styles.requestTime}>
                    {new Date(req.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className={styles.quickActions}>
          <div
            className={styles.quickCard}
            onClick={() => router.push("/manager/teams")}
          >
            <h4>👥 My Teams</h4>
            <p>Create and manage teams</p>
          </div>
          <div
            className={styles.quickCard}
            onClick={() => router.push("/manager/schedule")}
          >
            <h4>📅 Schedule</h4>
            <p>Build and publish shifts</p>
          </div>
          <div
            className={styles.quickCard}
            onClick={() => router.push("/manager/performance")}
          >
            <h4>📊 Performance</h4>
            <p>Track employee metrics</p>
          </div>
        </div>
      </div>

      {/* Team roster */}
      {members.length > 0 && (
        <div className={styles.card} style={{ marginTop: "1.5rem" }}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Team Roster</span>
          </div>
          <div className={styles.rosterGrid}>
            {members
              .filter((m) => m.role === "employee")
              .map((m) => {
                const memberShifts = shifts.filter(
                  (s) => s.employee_id === m.id
                );
                const memberHours = memberShifts.reduce((sum, s) => {
                  const [sh, sm] = s.start_time.split(":").map(Number);
                  const [eh, em] = s.end_time.split(":").map(Number);
                  return sum + (eh + em / 60 - (sh + sm / 60));
                }, 0);
                const isWorkingToday = todayShifts.some(
                  (s) => s.employee_id === m.id
                );
                return (
                  <div key={m.id} className={styles.rosterItem}>
                    <Avatar
                      firstName={m.first_name}
                      lastName={m.last_name}
                      avatarUrl={m.avatar_url}
                      size="md"
                    />
                    <div className={styles.rosterInfo}>
                      <span className={styles.rosterName}>
                        {m.first_name} {m.last_name}
                      </span>
                      <span className={styles.rosterStats}>
                        {memberShifts.length} shifts · {Math.round(memberHours)}h
                      </span>
                    </div>
                    <span
                      className={`${styles.rosterStatus} ${isWorkingToday ? styles.active : styles.off}`}
                    >
                      {isWorkingToday ? "On Shift" : "Off"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </>
  );
}
