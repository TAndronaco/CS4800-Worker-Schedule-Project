import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

interface TemplateShift {
  day_of_week: number;
  employee_id: number;
  start_time: string;
  end_time: string;
}

interface TemplateRow {
  id: number;
  team_id: number;
  name: string;
  created_by: number;
  template_data: TemplateShift[];
  created_at: string;
}

interface CreateTemplateInput {
  team_id: number | string;
  name: string;
  template_data: TemplateShift[];
}

class TemplateService {
  async create(input: CreateTemplateInput, userId: number): Promise<TemplateRow> {
    const { team_id, name, template_data } = input;

    if (!name || !template_data || template_data.length === 0) {
      throw new HttpError(400, 'Template name and at least one shift are required.');
    }

    const result = await pool.query<TemplateRow>(
      `INSERT INTO schedule_templates (team_id, name, created_by, template_data)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [team_id, name, userId, JSON.stringify(template_data)]
    );

    return result.rows[0];
  }

  async getForTeam(teamId: string): Promise<TemplateRow[]> {
    const result = await pool.query<TemplateRow>(
      `SELECT * FROM schedule_templates WHERE team_id = $1 ORDER BY created_at DESC`,
      [teamId]
    );
    return result.rows;
  }

  async getById(templateId: string): Promise<TemplateRow> {
    const result = await pool.query<TemplateRow>(
      'SELECT * FROM schedule_templates WHERE id = $1',
      [templateId]
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'Template not found.');
    }
    return result.rows[0];
  }

  async deleteTemplate(templateId: string, userId: number): Promise<void> {
    const existing = await pool.query<TemplateRow>(
      'SELECT * FROM schedule_templates WHERE id = $1',
      [templateId]
    );

    if (existing.rows.length === 0) {
      throw new HttpError(404, 'Template not found.');
    }

    await pool.query('DELETE FROM schedule_templates WHERE id = $1', [templateId]);
  }
}

export const templateService = new TemplateService();
