import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

interface EmployeeWithRate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  hourly_rate: number;
}

interface EarningsSummary {
  hourly_rate: number;
  today: number;
  week: number;
  month: number;
  total: number;
}

interface DailyEarnings {
  date: string;
  hours: number;
  earnings: number;
}

class PayrollService {
  // Get all team members with their hourly rates
  async getTeamRates(teamId: number, managerId: number): Promise<EmployeeWithRate[]> {
    // Verify manager owns this team
    const teamResult = await pool.query<{ manager_id: number }>(
      'SELECT manager_id FROM teams WHERE id = $1',
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      throw new HttpError(404, 'Team not found');
    }

    if (teamResult.rows[0].manager_id !== managerId) {
      throw new HttpError(403, 'Not authorized to manage this team');
    }

    const result = await pool.query<EmployeeWithRate>(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.hourly_rate
       FROM users u
       INNER JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id = $1 AND u.role = 'employee'
       ORDER BY u.first_name, u.last_name`,
      [teamId]
    );

    return result.rows.map(row => ({
      ...row,
      hourly_rate: parseFloat(String(row.hourly_rate))
    }));
  }

  // Set hourly rate for an employee
  async setEmployeeRate(
    employeeId: number,
    managerId: number,
    hourlyRate: number
  ): Promise<{ hourly_rate: number }> {
    if (hourlyRate < 0) {
      throw new HttpError(400, 'Hourly rate cannot be negative');
    }

    // Verify employee exists
    const empResult = await pool.query<{ id: number }>(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [employeeId, 'employee']
    );

    if (empResult.rows.length === 0) {
      throw new HttpError(404, 'Employee not found');
    }

    // Verify manager has access to this employee's team
    const accessResult = await pool.query<{ id: number }>(
      `SELECT t.id FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id
       WHERE t.manager_id = $1 AND tm.user_id = $2`,
      [managerId, employeeId]
    );

    if (accessResult.rows.length === 0) {
      throw new HttpError(403, 'Not authorized to set this employee\'s rate');
    }

    const result = await pool.query<{ hourly_rate: string }>(
      'UPDATE users SET hourly_rate = $1 WHERE id = $2 RETURNING hourly_rate',
      [hourlyRate, employeeId]
    );

    return {
      hourly_rate: parseFloat(result.rows[0].hourly_rate)
    };
  }

  // Get employee's earnings summary
  async getEmployeeEarnings(employeeId: number): Promise<EarningsSummary> {
    // Get hourly rate
    const userResult = await pool.query<{ hourly_rate: string }>(
      'SELECT hourly_rate FROM users WHERE id = $1',
      [employeeId]
    );

    if (userResult.rows.length === 0) {
      throw new HttpError(404, 'User not found');
    }

    const hourlyRate = parseFloat(userResult.rows[0].hourly_rate);

    // Calculate earnings from clock entries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Query for clock entries
    const earningsResult = await pool.query<{
      period: string;
      hours: string;
    }>(
      `SELECT 
         CASE 
           WHEN DATE(clock_in) = $1::DATE THEN 'today'
           WHEN DATE(clock_in) >= $2::DATE AND DATE(clock_in) <= $3::DATE THEN 'week'
           WHEN DATE(clock_in) >= $4::DATE AND DATE(clock_in) <= $5::DATE THEN 'month'
           ELSE 'total'
         END as period,
         SUM(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600) as hours
       FROM clock_entries
       WHERE user_id = $6 AND clock_out IS NOT NULL
       GROUP BY period`,
      [
        todayStart.toISOString().split('T')[0],
        weekStart.toISOString().split('T')[0],
        todayStart.toISOString().split('T')[0],
        monthStart.toISOString().split('T')[0],
        now.toISOString().split('T')[0],
        employeeId,
      ]
    );

    const earnings = {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
    };

    earningsResult.rows.forEach(row => {
      const hours = parseFloat(row.hours) || 0;
      const amount = hours * hourlyRate;
      if (row.period === 'today') earnings.today = amount;
      else if (row.period === 'week') earnings.week = amount;
      else if (row.period === 'month') earnings.month = amount;
      else if (row.period === 'total') earnings.total = amount;
    });

    // Also add total for all time
    const totalResult = await pool.query<{ hours: string }>(
      `SELECT SUM(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600) as hours
       FROM clock_entries
       WHERE user_id = $1 AND clock_out IS NOT NULL`,
      [employeeId]
    );

    if (totalResult.rows[0]?.hours) {
      earnings.total = parseFloat(totalResult.rows[0].hours) * hourlyRate;
    }

    return {
      hourly_rate: hourlyRate,
      ...earnings,
    };
  }

  // Get daily earnings breakdown
  async getDailyEarnings(
    employeeId: number,
    timeframe: 'day' | 'week' | 'month' = 'month'
  ): Promise<DailyEarnings[]> {
    // Get hourly rate
    const userResult = await pool.query<{ hourly_rate: string }>(
      'SELECT hourly_rate FROM users WHERE id = $1',
      [employeeId]
    );

    if (userResult.rows.length === 0) {
      throw new HttpError(404, 'User not found');
    }

    const hourlyRate = parseFloat(userResult.rows[0].hourly_rate);

    let dateFilter = '';
    const now = new Date();

    if (timeframe === 'day') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = `AND DATE(clock_in) = '${today.toISOString().split('T')[0]}'::DATE`;
    } else if (timeframe === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(now);
      dateFilter = `AND DATE(clock_in) >= '${weekStart.toISOString().split('T')[0]}'::DATE 
                   AND DATE(clock_in) <= '${weekEnd.toISOString().split('T')[0]}'::DATE`;
    } else if (timeframe === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now);
      dateFilter = `AND DATE(clock_in) >= '${monthStart.toISOString().split('T')[0]}'::DATE 
                   AND DATE(clock_in) <= '${monthEnd.toISOString().split('T')[0]}'::DATE`;
    }

    const result = await pool.query<{
      date: string;
      hours: string;
    }>(
      `SELECT 
         DATE(clock_in)::TEXT as date,
         SUM(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600) as hours
       FROM clock_entries
       WHERE user_id = $1 AND clock_out IS NOT NULL ${dateFilter}
       GROUP BY DATE(clock_in)
       ORDER BY DATE(clock_in) DESC`,
      [employeeId]
    );

    return result.rows.map(row => ({
      date: row.date,
      hours: parseFloat(row.hours) || 0,
      earnings: (parseFloat(row.hours) || 0) * hourlyRate,
    }));
  }
}

export const payrollService = new PayrollService();
