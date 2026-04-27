import pool from '../config/db';

interface CoverageGap {
  date: string;
  hour: number;
  scheduled_count: number;
}

interface OvertimeEmployee {
  employee_id: number;
  first_name: string;
  last_name: string;
  total_hours: number;
  shift_count: number;
}

interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  swaps: number;
  time_off: number;
}

interface WeeklyHours {
  date: string;
  total_hours: number;
  shift_count: number;
}

interface AnalyticsSummary {
  coverage_gaps: CoverageGap[];
  overtime_employees: OvertimeEmployee[];
  request_stats: RequestStats;
  weekly_hours: WeeklyHours[];
  headcount_by_day: { date: string; count: number }[];
}

class AnalyticsService {
  async getTeamAnalytics(teamId: string, week: string): Promise<AnalyticsSummary> {
    const [coverageGaps, overtimeEmployees, requestStats, weeklyHours, headcountByDay] =
      await Promise.all([
        this.getCoverageGaps(teamId, week),
        this.getOvertimeEmployees(teamId, week),
        this.getRequestStats(teamId),
        this.getWeeklyHours(teamId, week),
        this.getHeadcountByDay(teamId, week),
      ]);

    return { coverage_gaps: coverageGaps, overtime_employees: overtimeEmployees, request_stats: requestStats, weekly_hours: weeklyHours, headcount_by_day: headcountByDay };
  }

  private async getCoverageGaps(teamId: string, week: string): Promise<CoverageGap[]> {
    const result = await pool.query<{ date: string; hour: number; cnt: string }>(
      `WITH hours AS (SELECT generate_series(6, 22) AS hour),
            days AS (SELECT generate_series($2::date, $2::date + interval '6 days', '1 day')::date AS date)
       SELECT d.date::text, h.hour,
              COUNT(s.id)::text AS cnt
       FROM days d CROSS JOIN hours h
       LEFT JOIN shifts s ON s.team_id = $1
         AND s.date = d.date
         AND EXTRACT(HOUR FROM s.start_time::time) <= h.hour
         AND EXTRACT(HOUR FROM s.end_time::time) > h.hour
       GROUP BY d.date, h.hour
       HAVING COUNT(s.id) = 0
       ORDER BY d.date, h.hour`,
      [teamId, week]
    );
    return result.rows.map((r) => ({
      date: r.date,
      hour: r.hour,
      scheduled_count: parseInt(r.cnt, 10),
    }));
  }

  private async getOvertimeEmployees(teamId: string, week: string): Promise<OvertimeEmployee[]> {
    const result = await pool.query<{
      employee_id: number;
      first_name: string;
      last_name: string;
      total_hours: string;
      shift_count: string;
    }>(
      `SELECT s.employee_id, u.first_name, u.last_name,
              SUM(EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::text AS total_hours,
              COUNT(*)::text AS shift_count
       FROM shifts s
       JOIN users u ON s.employee_id = u.id
       WHERE s.team_id = $1 AND s.date >= $2::date AND s.date < $2::date + interval '7 days'
       GROUP BY s.employee_id, u.first_name, u.last_name
       HAVING SUM(EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600) > 40
       ORDER BY total_hours DESC`,
      [teamId, week]
    );
    return result.rows.map((r) => ({
      employee_id: r.employee_id,
      first_name: r.first_name,
      last_name: r.last_name,
      total_hours: parseFloat(r.total_hours),
      shift_count: parseInt(r.shift_count, 10),
    }));
  }

  private async getRequestStats(teamId: string): Promise<RequestStats> {
    const result = await pool.query<{
      total: string;
      pending: string;
      approved: string;
      denied: string;
      swaps: string;
      time_off: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE sr.status = 'pending')::text AS pending,
         COUNT(*) FILTER (WHERE sr.status = 'approved')::text AS approved,
         COUNT(*) FILTER (WHERE sr.status = 'denied')::text AS denied,
         COUNT(*) FILTER (WHERE sr.type = 'swap')::text AS swaps,
         COUNT(*) FILTER (WHERE sr.type = 'time_off')::text AS time_off
       FROM shift_requests sr
       JOIN shifts s ON sr.shift_id = s.id
       WHERE s.team_id = $1`,
      [teamId]
    );
    const r = result.rows[0];
    return {
      total: parseInt(r.total, 10),
      pending: parseInt(r.pending, 10),
      approved: parseInt(r.approved, 10),
      denied: parseInt(r.denied, 10),
      swaps: parseInt(r.swaps, 10),
      time_off: parseInt(r.time_off, 10),
    };
  }

  private async getWeeklyHours(teamId: string, week: string): Promise<WeeklyHours[]> {
    const result = await pool.query<{ date: string; total_hours: string; shift_count: string }>(
      `SELECT s.date::text,
              SUM(EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::text AS total_hours,
              COUNT(*)::text AS shift_count
       FROM shifts s
       WHERE s.team_id = $1 AND s.date >= $2::date AND s.date < $2::date + interval '7 days'
       GROUP BY s.date
       ORDER BY s.date`,
      [teamId, week]
    );
    return result.rows.map((r) => ({
      date: r.date,
      total_hours: parseFloat(r.total_hours),
      shift_count: parseInt(r.shift_count, 10),
    }));
  }

  private async getHeadcountByDay(teamId: string, week: string): Promise<{ date: string; count: number }[]> {
    const result = await pool.query<{ date: string; count: string }>(
      `SELECT s.date::text, COUNT(DISTINCT s.employee_id)::text AS count
       FROM shifts s
       WHERE s.team_id = $1 AND s.date >= $2::date AND s.date < $2::date + interval '7 days'
       GROUP BY s.date
       ORDER BY s.date`,
      [teamId, week]
    );
    return result.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
  }
}

export const analyticsService = new AnalyticsService();
