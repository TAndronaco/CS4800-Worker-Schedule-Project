import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

interface PerformanceReport {
  id: number;
  employee_id: number;
  team_id: number;
  manager_id: number;
  category: string;
  rating: number;
  notes: string;
  created_at: string;
}

interface EmployeeMetrics {
  user_id: number;
  first_name: string;
  last_name: string;
  shifts_completed: number;
  on_time_rate: number;
  swap_requests: number;
  absences: number;
  score: number;
}

class PerformanceService {
  async getEmployeeMetrics(userId: number, teamId: string): Promise<EmployeeMetrics> {
    const user = await pool.query<{ first_name: string; last_name: string }>(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    if (user.rows.length === 0) throw new HttpError(404, 'User not found.');

    // Shifts completed (with clock_out in last 30 days)
    const shiftsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM clock_entries
       WHERE user_id = $1 AND team_id = $2 AND clock_out IS NOT NULL
       AND clock_in > NOW() - INTERVAL '30 days'`,
      [userId, teamId]
    );
    const shiftsCompleted = parseInt(shiftsResult.rows[0].count, 10);

    // On-time rate: clock_in within 5 minutes of shift start_time
    const onTimeResult = await pool.query<{ total: string; on_time: string }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (
          WHERE ce.clock_in::time <= (s.start_time + interval '5 minutes')
        ) as on_time
       FROM clock_entries ce
       JOIN shifts s ON ce.shift_id = s.id
       WHERE ce.user_id = $1 AND ce.team_id = $2 AND ce.clock_out IS NOT NULL
       AND ce.clock_in > NOW() - INTERVAL '30 days'`,
      [userId, teamId]
    );
    const total = parseInt(onTimeResult.rows[0].total, 10);
    const onTime = parseInt(onTimeResult.rows[0].on_time, 10);
    const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 100;

    // Swap requests made in last 30 days
    const swapsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM shift_requests
       WHERE requester_id = $1 AND type = 'swap'
       AND created_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );
    const swapRequests = parseInt(swapsResult.rows[0].count, 10);

    // Absences: shifts with no corresponding clock entry in last 30 days
    const absencesResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM shifts s
       WHERE s.employee_id = $1 AND s.team_id = $2
       AND s.date > CURRENT_DATE - 30 AND s.date < CURRENT_DATE
       AND NOT EXISTS (
         SELECT 1 FROM clock_entries ce
         WHERE ce.shift_id = s.id AND ce.user_id = $1
       )`,
      [userId, teamId]
    );
    const absences = parseInt(absencesResult.rows[0].count, 10);

    // Score: weighted formula
    const score = Math.max(0, Math.min(100, Math.round(
      onTimeRate * 0.4 +
      Math.min(shiftsCompleted * 3, 30) +
      Math.max(30 - absences * 10, 0) -
      swapRequests * 2
    )));

    return {
      user_id: userId,
      first_name: user.rows[0].first_name,
      last_name: user.rows[0].last_name,
      shifts_completed: shiftsCompleted,
      on_time_rate: onTimeRate,
      swap_requests: swapRequests,
      absences,
      score,
    };
  }

  async getTeamMetrics(teamId: string): Promise<EmployeeMetrics[]> {
    const members = await pool.query<{ user_id: number }>(
      'SELECT user_id FROM team_members WHERE team_id = $1',
      [teamId]
    );

    const metrics: EmployeeMetrics[] = [];
    for (const member of members.rows) {
      const m = await this.getEmployeeMetrics(member.user_id, teamId);
      metrics.push(m);
    }
    return metrics.sort((a, b) => b.score - a.score);
  }

  async createReport(managerId: number, input: { employee_id: number; team_id: number; category: string; rating: number; notes: string }): Promise<PerformanceReport> {
    if (input.rating < 1 || input.rating > 5) {
      throw new HttpError(400, 'Rating must be between 1 and 5.');
    }

    const result = await pool.query<PerformanceReport>(
      `INSERT INTO performance_reports (employee_id, team_id, manager_id, category, rating, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.employee_id, input.team_id, managerId, input.category, input.rating, input.notes]
    );
    return result.rows[0];
  }

  async getReportsForEmployee(employeeId: number, teamId?: string): Promise<(PerformanceReport & { manager_first_name: string; manager_last_name: string })[]> {
    let query = `SELECT pr.*, u.first_name as manager_first_name, u.last_name as manager_last_name
                 FROM performance_reports pr
                 JOIN users u ON pr.manager_id = u.id
                 WHERE pr.employee_id = $1`;
    const params: (number | string)[] = [employeeId];

    if (teamId) {
      params.push(teamId);
      query += ` AND pr.team_id = $${params.length}`;
    }

    query += ' ORDER BY pr.created_at DESC';
    const result = await pool.query<PerformanceReport & { manager_first_name: string; manager_last_name: string }>(query, params);
    return result.rows;
  }

  async getReportsForTeam(teamId: string): Promise<(PerformanceReport & { employee_first_name: string; employee_last_name: string; manager_first_name: string; manager_last_name: string })[]> {
    const result = await pool.query<PerformanceReport & { employee_first_name: string; employee_last_name: string; manager_first_name: string; manager_last_name: string }>(
      `SELECT pr.*,
              e.first_name as employee_first_name, e.last_name as employee_last_name,
              m.first_name as manager_first_name, m.last_name as manager_last_name
       FROM performance_reports pr
       JOIN users e ON pr.employee_id = e.id
       JOIN users m ON pr.manager_id = m.id
       WHERE pr.team_id = $1
       ORDER BY pr.created_at DESC`,
      [teamId]
    );
    return result.rows;
  }
}

export const performanceService = new PerformanceService();
