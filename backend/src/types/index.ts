export interface User {
  id: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'manager' | 'employee';
  created_at: Date;
}

export interface Team {
  id: number;
  name: string;
  join_code: string;
  manager_id: number;
  created_at: Date;
}

export interface Shift {
  id: number;
  team_id: number;
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  created_at: Date;
}

export interface ShiftRequest {
  id: number;
  type: 'swap' | 'time_off';
  requester_id: number;
  shift_id: number;
  target_shift_id?: number;
  status: 'pending' | 'approved' | 'denied';
  reason?: string;
  created_at: Date;
}

export interface AuthPayload {
  userId: number;
  email: string;
  role: 'manager' | 'employee';
}
