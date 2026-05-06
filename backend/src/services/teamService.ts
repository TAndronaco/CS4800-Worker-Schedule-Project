import crypto from 'crypto';
import pool from '../config/db';
import { HttpError } from '../errors/HttpError';
import { activityService } from './activityService';

interface Team {
  id: number;
  name: string;
  join_code: string;
  manager_id: number;
  created_at: string;
}

interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  hourly_rate: number;
}

class TeamService {
  async createTeam(name: string, managerId: number): Promise<Team> {
    const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const result = await pool.query<Team>(
      'INSERT INTO teams (name, join_code, manager_id) VALUES ($1, $2, $3) RETURNING *',
      [name, joinCode, managerId]
    );

    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [result.rows[0].id, managerId]
    );

    activityService.log({
      team_id: result.rows[0].id,
      user_id: managerId,
      type: 'team_created',
      message: `Team "${name}" created.`,
      related_id: result.rows[0].id,
    }).catch(() => {});

    return result.rows[0];
  }

  async joinTeam(joinCode: string, userId: number): Promise<{ message: string; team: Team }> {
    const teamResult = await pool.query<Team>('SELECT * FROM teams WHERE join_code = $1', [joinCode]);
    if (teamResult.rows.length === 0) {
      throw new HttpError(404, 'Invalid join code.');
    }

    const team = teamResult.rows[0];
    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [team.id, userId]
    );

    activityService.log({
      team_id: team.id,
      user_id: userId,
      type: 'member_joined',
      message: 'A member joined the team.',
      related_id: userId,
    }).catch(() => {});

    return {
      message: 'Joined team successfully.',
      team,
    };
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const result = await pool.query<TeamMember>(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.hourly_rate
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [teamId]
    );

    return result.rows.map(row => ({
      ...row,
      hourly_rate: parseFloat(String(row.hourly_rate)) || 0,
    }));
  }

  async removeMember(teamId: string, memberId: number, managerId: number): Promise<void> {
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

    await pool.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, memberId]
    );
  }

  async getUserTeams(userId: number): Promise<Team[]> {
    const result = await pool.query<Team>(
      `SELECT DISTINCT t.* FROM teams t
       LEFT JOIN team_members tm ON t.id = tm.team_id
       WHERE t.manager_id = $1 OR tm.user_id = $1`,
      [userId]
    );

    return result.rows;
  }
}

export const teamService = new TeamService();
