import pool from '../config/db';

interface WeeklyReport {
  total_hours_scheduled: number;
  number_of_shifts: number;
  coverage_gaps: string[];
  pending_requests_count: number;
  overtime_employees: Array<{ employee_id: number; first_name: string; last_name: string; hours: number }>;
}

class ReportService {
  async getWeeklySummary(teamId: string, week: string): Promise<WeeklyReport> {
    const shiftsResult = await pool.query<{
      employee_id: number;
      first_name: string;
      last_name: string;
      date: string;
      start_time: string;
      end_time: string;
      hours: string;
    }>(
      `SELECT s.employee_id, u.first_name, u.last_name, s.date, s.start_time, s.end_time,
              EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600 AS hours
       FROM shifts s
       JOIN users u ON u.id = s.employee_id
       WHERE s.team_id = $1
         AND s.date >= $2::date
         AND s.date < $2::date + interval '7 days'`,
      [teamId, week]
    );

    const shifts = shiftsResult.rows;
    const totalHours = shifts.reduce((sum, s) => sum + Number(s.hours), 0);
    const numberOfShifts = shifts.length;

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(week + 'T00:00:00');
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
    const coverageGaps = weekDays.filter((day) => !shifts.some((s) => s.date.split('T')[0] === day));

    const pendingResult = await pool.query<{ count: string }>(
      `SELECT (
         (SELECT COUNT(*) FROM shift_requests sr
          JOIN shifts s ON s.id = sr.shift_id
          WHERE s.team_id = $1 AND sr.status = 'pending')
         +
         (SELECT COUNT(*) FROM time_off_requests t
          WHERE t.team_id = $1 AND t.status = 'pending')
       )::text AS count`,
      [teamId]
    );
    const pendingRequestsCount = Number(pendingResult.rows[0]?.count ?? 0);

    const perEmployee = new Map<number, { first_name: string; last_name: string; hours: number }>();
    for (const shift of shifts) {
      const prev = perEmployee.get(shift.employee_id);
      if (prev) {
        prev.hours += Number(shift.hours);
      } else {
        perEmployee.set(shift.employee_id, {
          first_name: shift.first_name,
          last_name: shift.last_name,
          hours: Number(shift.hours),
        });
      }
    }

    const overtimeEmployees = Array.from(perEmployee.entries())
      .filter(([, value]) => value.hours > 40)
      .map(([employee_id, value]) => ({ employee_id, ...value }))
      .sort((a, b) => b.hours - a.hours);

    return {
      total_hours_scheduled: Number(totalHours.toFixed(2)),
      number_of_shifts: numberOfShifts,
      coverage_gaps: coverageGaps,
      pending_requests_count: pendingRequestsCount,
      overtime_employees: overtimeEmployees,
    };
  }
}

export const reportService = new ReportService();
