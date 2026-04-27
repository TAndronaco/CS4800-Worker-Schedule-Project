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
  target_employee_id?: number;
  status: 'pending' | 'approved' | 'denied';
  swap_status: 'pending' | 'accepted' | 'rejected';
  reason?: string;
  created_at: Date;
}

export interface Availability {
  id: number;
  user_id: number;
  team_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  read: boolean;
  related_id?: number;
  created_at: Date;
}

export interface TimeOffRequest {
  id: number;
  user_id: number;
  team_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by?: number;
  created_at: Date;
}

export interface ScheduleTemplate {
  id: number;
  team_id: number;
  name: string;
  created_by: number;
  template_data: TemplateShift[];
  created_at: Date;
}

export interface TemplateShift {
  day_of_week: number;
  employee_id: number;
  start_time: string;
  end_time: string;
}

export interface AuthPayload {
  userId: number;
  email: string;
  role: 'manager' | 'employee';
}
