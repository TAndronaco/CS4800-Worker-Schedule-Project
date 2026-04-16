import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { HttpError } from '../errors/HttpError';
import { AuthPayload } from '../types';

type UserRole = 'manager' | 'employee';

interface RegisterInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_url: string | null;
}

interface LoginUserRow extends AuthUser {
  password: string;
}

interface AuthResult {
  token: string;
  user: AuthUser;
}

class AuthService {
  private signToken(payload: AuthPayload): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured.');
    }

    return jwt.sign(payload, secret, { expiresIn: '24h' });
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, first_name, last_name, role } = input;

    const existingUser = await pool.query<{ id: number }>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new HttpError(400, 'User already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query<AuthUser>(
      'INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, avatar_url',
      [email, hashedPassword, first_name, last_name, role || 'employee']
    );

    const user = result.rows[0];
    const token = this.signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    const result = await pool.query<LoginUserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new HttpError(400, 'Invalid credentials.');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new HttpError(400, 'Invalid credentials.');
    }

    const token = this.signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    };
  }
}

export const authService = new AuthService();
