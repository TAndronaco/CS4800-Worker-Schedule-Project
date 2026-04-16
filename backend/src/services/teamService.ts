import crypto from 'crypto';
import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

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

    return {
      message: 'Joined team successfully.',
      team,
    };
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const result = await pool.query<TeamMember>(
      `SELECT u.id, u.first_name, u.last_name, u.email
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [teamId]
    );

    return result.rows;
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
