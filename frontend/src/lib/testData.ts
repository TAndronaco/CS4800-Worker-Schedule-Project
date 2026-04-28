// Test users and mock data for demo/testing purposes
// Each user has unique data across all features

export interface TestUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: "manager" | "employee";
  avatar_url?: string | null;
}

export const TEST_USERS: TestUser[] = [
  // Managers
  { id: 101, email: "sarah.chen@test.com", first_name: "Sarah", last_name: "Chen", role: "manager" },
  { id: 102, email: "marcus.jones@test.com", first_name: "Marcus", last_name: "Jones", role: "manager" },
  { id: 103, email: "priya.patel@test.com", first_name: "Priya", last_name: "Patel", role: "manager" },
  // Employees
  { id: 201, email: "jake.miller@test.com", first_name: "Jake", last_name: "Miller", role: "employee" },
  { id: 202, email: "emily.nguyen@test.com", first_name: "Emily", last_name: "Nguyen", role: "employee" },
  { id: 203, email: "carlos.rivera@test.com", first_name: "Carlos", last_name: "Rivera", role: "employee" },
];

// --- Helper to generate dates relative to current week ---
function getMondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const MONDAY = getMondayOfCurrentWeek();

// --- Teams ---
interface TestTeam {
  id: number;
  name: string;
  join_code: string;
  manager_id: number;
}

const TEAMS: TestTeam[] = [
  { id: 1, name: "Morning Crew", join_code: "MORN2024", manager_id: 101 },
  { id: 2, name: "Evening Squad", join_code: "EVE2024", manager_id: 102 },
  { id: 3, name: "Weekend Warriors", join_code: "WKND2024", manager_id: 103 },
];

// Which employees are on which teams
const TEAM_MEMBERS: Record<number, number[]> = {
  1: [201, 202],       // Jake & Emily on Morning Crew
  2: [202, 203],       // Emily & Carlos on Evening Squad
  3: [201, 203],       // Jake & Carlos on Weekend Warriors
};

// --- Shifts (this week) ---
interface TestShift {
  id: number;
  team_id: number;
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  first_name: string;
  last_name: string;
}

const SHIFTS: TestShift[] = [
  // Morning Crew (team 1) shifts
  { id: 1, team_id: 1, employee_id: 201, date: offsetDate(MONDAY, 0), start_time: "06:00", end_time: "12:00", first_name: "Jake", last_name: "Miller" },
  { id: 2, team_id: 1, employee_id: 202, date: offsetDate(MONDAY, 0), start_time: "07:00", end_time: "13:00", first_name: "Emily", last_name: "Nguyen" },
  { id: 3, team_id: 1, employee_id: 201, date: offsetDate(MONDAY, 2), start_time: "06:00", end_time: "11:00", first_name: "Jake", last_name: "Miller" },
  { id: 4, team_id: 1, employee_id: 202, date: offsetDate(MONDAY, 2), start_time: "08:00", end_time: "14:00", first_name: "Emily", last_name: "Nguyen" },
  { id: 5, team_id: 1, employee_id: 201, date: offsetDate(MONDAY, 4), start_time: "06:00", end_time: "12:00", first_name: "Jake", last_name: "Miller" },
  { id: 6, team_id: 1, employee_id: 202, date: offsetDate(MONDAY, 4), start_time: "06:00", end_time: "12:00", first_name: "Emily", last_name: "Nguyen" },

  // Evening Squad (team 2) shifts
  { id: 7, team_id: 2, employee_id: 202, date: offsetDate(MONDAY, 1), start_time: "14:00", end_time: "20:00", first_name: "Emily", last_name: "Nguyen" },
  { id: 8, team_id: 2, employee_id: 203, date: offsetDate(MONDAY, 1), start_time: "15:00", end_time: "21:00", first_name: "Carlos", last_name: "Rivera" },
  { id: 9, team_id: 2, employee_id: 202, date: offsetDate(MONDAY, 3), start_time: "14:00", end_time: "20:00", first_name: "Emily", last_name: "Nguyen" },
  { id: 10, team_id: 2, employee_id: 203, date: offsetDate(MONDAY, 3), start_time: "16:00", end_time: "22:00", first_name: "Carlos", last_name: "Rivera" },
  { id: 11, team_id: 2, employee_id: 203, date: offsetDate(MONDAY, 5), start_time: "12:00", end_time: "18:00", first_name: "Carlos", last_name: "Rivera" },

  // Weekend Warriors (team 3) shifts
  { id: 12, team_id: 3, employee_id: 201, date: offsetDate(MONDAY, 5), start_time: "08:00", end_time: "16:00", first_name: "Jake", last_name: "Miller" },
  { id: 13, team_id: 3, employee_id: 203, date: offsetDate(MONDAY, 5), start_time: "10:00", end_time: "18:00", first_name: "Carlos", last_name: "Rivera" },
  { id: 14, team_id: 3, employee_id: 201, date: offsetDate(MONDAY, 6), start_time: "09:00", end_time: "15:00", first_name: "Jake", last_name: "Miller" },
  { id: 15, team_id: 3, employee_id: 203, date: offsetDate(MONDAY, 6), start_time: "09:00", end_time: "17:00", first_name: "Carlos", last_name: "Rivera" },
];

// --- Shift Requests ---
interface TestRequest {
  id: number;
  type: "swap" | "time_off";
  status: "pending" | "approved" | "denied";
  swap_status: "pending" | "accepted" | "rejected";
  reason: string | null;
  requester_id: number;
  shift_id: number;
  target_shift_id?: number | null;
  target_employee_id?: number | null;
  first_name: string;
  last_name: string;
  target_first_name?: string | null;
  target_last_name?: string | null;
  team_id: number;
  shift_date?: string | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  target_shift_date?: string | null;
  target_shift_start_time?: string | null;
  target_shift_end_time?: string | null;
  created_at: string;
}

const REQUESTS: TestRequest[] = [
  // Jake's requests
  { id: 1, type: "time_off", status: "pending", swap_status: "pending", reason: "Doctor appointment on Wednesday", requester_id: 201, shift_id: 3, first_name: "Jake", last_name: "Miller", team_id: 1, shift_date: offsetDate(MONDAY, 2), shift_start_time: "06:00", shift_end_time: "11:00", created_at: new Date().toISOString() },
  { id: 2, type: "swap", status: "approved", swap_status: "accepted", reason: "Need to swap Friday shift with Emily", requester_id: 201, shift_id: 5, target_shift_id: 6, target_employee_id: 202, first_name: "Jake", last_name: "Miller", target_first_name: "Emily", target_last_name: "Nguyen", team_id: 1, shift_date: offsetDate(MONDAY, 4), shift_start_time: "06:00", shift_end_time: "12:00", target_shift_date: offsetDate(MONDAY, 4), target_shift_start_time: "06:00", target_shift_end_time: "12:00", created_at: new Date(Date.now() - 86400000 * 2).toISOString() },

  // Emily's requests
  { id: 3, type: "time_off", status: "pending", swap_status: "pending", reason: "Family event on Thursday", requester_id: 202, shift_id: 9, first_name: "Emily", last_name: "Nguyen", team_id: 2, shift_date: offsetDate(MONDAY, 3), shift_start_time: "14:00", shift_end_time: "20:00", created_at: new Date().toISOString() },
  { id: 4, type: "swap", status: "denied", swap_status: "rejected", reason: "Wanted to switch Tuesday shift", requester_id: 202, shift_id: 7, target_shift_id: 8, target_employee_id: 203, first_name: "Emily", last_name: "Nguyen", target_first_name: "Carlos", target_last_name: "Rivera", team_id: 2, shift_date: offsetDate(MONDAY, 1), shift_start_time: "14:00", shift_end_time: "20:00", target_shift_date: offsetDate(MONDAY, 1), target_shift_start_time: "15:00", target_shift_end_time: "21:00", created_at: new Date(Date.now() - 86400000 * 3).toISOString() },

  // Carlos's requests
  { id: 5, type: "time_off", status: "pending", swap_status: "pending", reason: "Car maintenance Saturday morning", requester_id: 203, shift_id: 13, first_name: "Carlos", last_name: "Rivera", team_id: 3, shift_date: offsetDate(MONDAY, 5), shift_start_time: "10:00", shift_end_time: "18:00", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 6, type: "swap", status: "approved", swap_status: "accepted", reason: "Prefer earlier shift on Thursday", requester_id: 203, shift_id: 10, target_shift_id: 9, target_employee_id: 202, first_name: "Carlos", last_name: "Rivera", target_first_name: "Emily", target_last_name: "Nguyen", team_id: 2, shift_date: offsetDate(MONDAY, 3), shift_start_time: "16:00", shift_end_time: "22:00", target_shift_date: offsetDate(MONDAY, 3), target_shift_start_time: "14:00", target_shift_end_time: "20:00", created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
];

// --- Members for each team ---
interface TestMember {
  id: number;
  first_name: string;
  last_name: string;
}

function getMembersForTeam(teamId: number): TestMember[] {
  const memberIds = TEAM_MEMBERS[teamId] || [];
  return memberIds.map((id) => {
    const user = TEST_USERS.find((u) => u.id === id)!;
    return { id: user.id, first_name: user.first_name, last_name: user.last_name };
  });
}

// --- Conversations & Messages ---
interface TestConversation {
  id: number;
  type: "dm" | "group";
  name: string | null;
  created_by: number;
  team_id: number | null;
  created_at: string;
  member_ids: number[];
}

interface TestConvMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

const CONVERSATIONS: TestConversation[] = [
  { id: 1, type: "dm", name: null, created_by: 201, team_id: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), member_ids: [201, 202] },
  { id: 2, type: "dm", name: null, created_by: 203, team_id: null, created_at: new Date(Date.now() - 86400000).toISOString(), member_ids: [201, 203] },
  { id: 3, type: "dm", name: null, created_by: 101, team_id: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), member_ids: [101, 201] },
  { id: 4, type: "dm", name: null, created_by: 102, team_id: null, created_at: new Date(Date.now() - 86400000).toISOString(), member_ids: [102, 203] },
  { id: 5, type: "group", name: "Morning Crew Chat", created_by: 101, team_id: 1, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), member_ids: [101, 201, 202] },
  { id: 6, type: "group", name: "Weekend Planning", created_by: 103, team_id: 3, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), member_ids: [103, 201, 203] },
];

const CONV_MESSAGES: TestConvMessage[] = [
  { id: 1, conversation_id: 1, sender_id: 201, content: "Hey Emily, can you cover my Monday shift?", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), first_name: "Jake", last_name: "Miller" },
  { id: 2, conversation_id: 1, sender_id: 202, content: "Sure! What time is it?", created_at: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(), first_name: "Emily", last_name: "Nguyen" },
  { id: 3, conversation_id: 1, sender_id: 201, content: "6 AM to noon. Thanks so much!", created_at: new Date(Date.now() - 86400000 * 2 + 7200000).toISOString(), first_name: "Jake", last_name: "Miller" },
  { id: 4, conversation_id: 2, sender_id: 203, content: "Jake, are we both on Saturday for Weekend Warriors?", created_at: new Date(Date.now() - 86400000).toISOString(), first_name: "Carlos", last_name: "Rivera" },
  { id: 5, conversation_id: 2, sender_id: 201, content: "Yeah I think so! See you there", created_at: new Date(Date.now() - 86400000 + 1800000).toISOString(), first_name: "Jake", last_name: "Miller" },
  { id: 6, conversation_id: 3, sender_id: 101, content: "Jake, great work last week. Keep it up!", created_at: new Date(Date.now() - 86400000 * 3).toISOString(), first_name: "Sarah", last_name: "Chen" },
  { id: 7, conversation_id: 4, sender_id: 102, content: "Carlos, reminder: your evening shift starts at 4 PM Thursday", created_at: new Date(Date.now() - 86400000).toISOString(), first_name: "Marcus", last_name: "Jones" },
  { id: 8, conversation_id: 4, sender_id: 203, content: "Got it, thanks Marcus!", created_at: new Date(Date.now() - 86400000 + 600000).toISOString(), first_name: "Carlos", last_name: "Rivera" },
  { id: 9, conversation_id: 5, sender_id: 101, content: "Team, schedule for this week is posted!", created_at: new Date(Date.now() - 86400000 * 4).toISOString(), first_name: "Sarah", last_name: "Chen" },
  { id: 10, conversation_id: 5, sender_id: 202, content: "Thanks Sarah, looks good!", created_at: new Date(Date.now() - 86400000 * 4 + 3600000).toISOString(), first_name: "Emily", last_name: "Nguyen" },
  { id: 11, conversation_id: 5, sender_id: 201, content: "Got it, see everyone Monday", created_at: new Date(Date.now() - 86400000 * 4 + 7200000).toISOString(), first_name: "Jake", last_name: "Miller" },
  { id: 12, conversation_id: 6, sender_id: 103, content: "Weekend shift assignments are up. Any conflicts?", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), first_name: "Priya", last_name: "Patel" },
  { id: 13, conversation_id: 6, sender_id: 201, content: "All good on my end!", created_at: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(), first_name: "Jake", last_name: "Miller" },
  { id: 14, conversation_id: 6, sender_id: 203, content: "Same here, thanks Priya", created_at: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(), first_name: "Carlos", last_name: "Rivera" },
];

// Legacy direct messages (old API)
interface TestMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

const MESSAGES: TestMessage[] = [];

// --- Time-Off Requests ---
interface TestTimeOff {
  id: number;
  user_id: number;
  team_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  reviewed_by: number | null;
  created_at: string;
  first_name: string;
  last_name: string;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
}

const TIME_OFF_REQUESTS: TestTimeOff[] = [
  { id: 1, user_id: 201, team_id: 1, start_date: offsetDate(MONDAY, 7), end_date: offsetDate(MONDAY, 9), reason: "Family vacation", status: "pending", reviewed_by: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), first_name: "Jake", last_name: "Miller" },
  { id: 2, user_id: 202, team_id: 1, start_date: offsetDate(MONDAY, 14), end_date: offsetDate(MONDAY, 14), reason: "Doctor appointment", status: "approved", reviewed_by: 101, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), first_name: "Emily", last_name: "Nguyen", reviewer_first_name: "Sarah", reviewer_last_name: "Chen" },
  { id: 3, user_id: 203, team_id: 2, start_date: offsetDate(MONDAY, 10), end_date: offsetDate(MONDAY, 12), reason: "Moving to a new apartment", status: "pending", reviewed_by: null, created_at: new Date(Date.now() - 86400000).toISOString(), first_name: "Carlos", last_name: "Rivera" },
  { id: 4, user_id: 201, team_id: 3, start_date: offsetDate(MONDAY, -3), end_date: offsetDate(MONDAY, -2), reason: "Personal day", status: "denied", reviewed_by: 103, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), first_name: "Jake", last_name: "Miller", reviewer_first_name: "Priya", reviewer_last_name: "Patel" },
];

// --- Availability ---
interface TestAvailability {
  id: number;
  user_id: number;
  team_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  first_name: string;
  last_name: string;
}

const AVAILABILITY: TestAvailability[] = [
  { id: 1, user_id: 201, team_id: 1, day_of_week: 0, start_time: "06:00", end_time: "14:00", first_name: "Jake", last_name: "Miller" },
  { id: 2, user_id: 201, team_id: 1, day_of_week: 2, start_time: "06:00", end_time: "14:00", first_name: "Jake", last_name: "Miller" },
  { id: 3, user_id: 201, team_id: 1, day_of_week: 4, start_time: "06:00", end_time: "14:00", first_name: "Jake", last_name: "Miller" },
  { id: 4, user_id: 202, team_id: 1, day_of_week: 0, start_time: "07:00", end_time: "15:00", first_name: "Emily", last_name: "Nguyen" },
  { id: 5, user_id: 202, team_id: 1, day_of_week: 1, start_time: "08:00", end_time: "16:00", first_name: "Emily", last_name: "Nguyen" },
  { id: 6, user_id: 202, team_id: 1, day_of_week: 2, start_time: "08:00", end_time: "16:00", first_name: "Emily", last_name: "Nguyen" },
  { id: 7, user_id: 202, team_id: 1, day_of_week: 4, start_time: "06:00", end_time: "14:00", first_name: "Emily", last_name: "Nguyen" },
  { id: 8, user_id: 203, team_id: 2, day_of_week: 1, start_time: "14:00", end_time: "22:00", first_name: "Carlos", last_name: "Rivera" },
  { id: 9, user_id: 203, team_id: 2, day_of_week: 3, start_time: "14:00", end_time: "22:00", first_name: "Carlos", last_name: "Rivera" },
  { id: 10, user_id: 203, team_id: 2, day_of_week: 5, start_time: "10:00", end_time: "20:00", first_name: "Carlos", last_name: "Rivera" },
];

// --- Notifications ---
interface TestNotification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  read: boolean;
  related_id: number | null;
  created_at: string;
}

const NOTIFICATIONS: TestNotification[] = [
  { id: 1, user_id: 201, type: "shift_assigned", message: "You've been assigned a shift on Monday (06:00–12:00).", read: false, related_id: 1, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 2, user_id: 201, type: "pto_denied", message: "Your time-off request (personal day) was denied.", read: false, related_id: 4, created_at: new Date(Date.now() - 86400000 * 9).toISOString() },
  { id: 3, user_id: 201, type: "swap_proposed", message: "Emily Nguyen wants to swap shifts with you.", read: true, related_id: 2, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 4, user_id: 202, type: "shift_assigned", message: "You've been assigned a shift on Monday (07:00–13:00).", read: true, related_id: 2, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 5, user_id: 202, type: "pto_approved", message: "Your time-off request was approved.", read: false, related_id: 2, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 6, user_id: 203, type: "shift_assigned", message: "You've been assigned a shift on Tuesday (15:00–21:00).", read: false, related_id: 8, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 7, user_id: 203, type: "request_approved", message: "Your shift swap request was approved.", read: true, related_id: 6, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
];

// --- Schedule Templates ---
interface TestTemplate {
  id: number;
  team_id: number;
  name: string;
  created_by: number;
  template_data: { day_of_week: number; employee_id: number; start_time: string; end_time: string }[];
  created_at: string;
}

const TEMPLATES: TestTemplate[] = [
  {
    id: 1, team_id: 1, name: "Standard Morning Week", created_by: 101,
    template_data: [
      { day_of_week: 1, employee_id: 201, start_time: "06:00", end_time: "12:00" },
      { day_of_week: 1, employee_id: 202, start_time: "07:00", end_time: "13:00" },
      { day_of_week: 3, employee_id: 201, start_time: "06:00", end_time: "11:00" },
      { day_of_week: 3, employee_id: 202, start_time: "08:00", end_time: "14:00" },
      { day_of_week: 5, employee_id: 201, start_time: "06:00", end_time: "12:00" },
      { day_of_week: 5, employee_id: 202, start_time: "06:00", end_time: "12:00" },
    ],
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

// --- Request persistence (survives page reloads within the same browser session) ---

let _requestsLoaded = false;

function loadPersistedRequests(): void {
  if (_requestsLoaded || typeof window === "undefined") return;
  _requestsLoaded = true;
  try {
    const data = sessionStorage.getItem("shiftsync_test_requests");
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        REQUESTS.splice(0, REQUESTS.length, ...parsed);
      }
    }
  } catch {}
}

function persistRequests(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("shiftsync_test_requests", JSON.stringify(REQUESTS));
  } catch {}
}

// --- Mock API response resolver ---

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function isTestMode(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("user");
  if (!stored || stored === "undefined" || stored === "null") return false;
  const user = JSON.parse(stored);
  return user.isTestUser === true;
}

export function resolveTestRequest(endpoint: string, options: RequestInit = {}): Response | null {
  if (!isTestMode()) return null;

  const stored = localStorage.getItem("user");
  if (!stored || stored === "undefined" || stored === "null") return null;
  const currentUser: TestUser & { isTestUser: boolean } = JSON.parse(stored);
  const method = (options.method || "GET").toUpperCase();

  // Restore any requests saved from a previous page load in this browser session
  loadPersistedRequests();

  // Parse URL params
  const [path, queryString] = endpoint.split("?");
  const params = new URLSearchParams(queryString || "");

  // GET /teams
  if (path === "/teams" && method === "GET") {
    if (currentUser.role === "manager") {
      return jsonResponse(TEAMS.filter((t) => t.manager_id === currentUser.id));
    } else {
      // Return teams this employee belongs to
      const teamIds = Object.entries(TEAM_MEMBERS)
        .filter(([, members]) => members.includes(currentUser.id))
        .map(([teamId]) => Number(teamId));
      return jsonResponse(TEAMS.filter((t) => teamIds.includes(t.id)));
    }
  }

  // POST /teams (manager creates team)
  if (path === "/teams" && method === "POST") {
    const body = JSON.parse(options.body as string);
    const newTeam = {
      id: Date.now(),
      name: body.name,
      join_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      manager_id: currentUser.id,
    };
    TEAMS.push(newTeam);
    return jsonResponse(newTeam);
  }

  // POST /teams/join
  if (path === "/teams/join" && method === "POST") {
    const body = JSON.parse(options.body as string);
    const team = TEAMS.find((t) => t.join_code === body.join_code);
    if (!team) {
      return new Response(JSON.stringify({ error: "Invalid join code." }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    if (!TEAM_MEMBERS[team.id]) TEAM_MEMBERS[team.id] = [];
    if (!TEAM_MEMBERS[team.id].includes(currentUser.id)) {
      TEAM_MEMBERS[team.id].push(currentUser.id);
    }
    return jsonResponse({ message: "Joined successfully" });
  }

  // GET /teams/:id/members
  const membersMatch = path.match(/^\/teams\/(\d+)\/members$/);
  if (membersMatch && method === "GET") {
    return jsonResponse(getMembersForTeam(Number(membersMatch[1])));
  }

  // GET /shifts
  if (path === "/shifts" && method === "GET") {
    const teamId = params.get("team_id") ? Number(params.get("team_id")) : null;
    const employeeId = params.get("employee_id") ? Number(params.get("employee_id")) : null;
    let filtered = SHIFTS;
    if (teamId) filtered = filtered.filter((s) => s.team_id === teamId);
    if (employeeId) filtered = filtered.filter((s) => s.employee_id === employeeId);
    return jsonResponse(filtered);
  }

  // POST /shifts (manager adds shift)
  if (path === "/shifts" && method === "POST") {
    const body = JSON.parse(options.body as string);
    const employee = TEST_USERS.find((u) => u.id === Number(body.employee_id));
    const newShift: TestShift = {
      id: Date.now(),
      team_id: body.team_id,
      employee_id: Number(body.employee_id),
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      first_name: employee?.first_name || "Unknown",
      last_name: employee?.last_name || "User",
    };
    SHIFTS.push(newShift);
    return jsonResponse(newShift);
  }

  // DELETE /shifts/:id
  const deleteShiftMatch = path.match(/^\/shifts\/(\d+)$/);
  if (deleteShiftMatch && method === "DELETE") {
    const id = Number(deleteShiftMatch[1]);
    const idx = SHIFTS.findIndex((s) => s.id === id);
    if (idx !== -1) SHIFTS.splice(idx, 1);
    return jsonResponse({ message: "Deleted" });
  }

  // GET /requests
  if (path === "/requests" && method === "GET") {
    const teamId = params.get("team_id") ? Number(params.get("team_id")) : null;
    let filtered = REQUESTS;
    if (teamId) filtered = filtered.filter((r) => r.team_id === teamId);
    return jsonResponse(filtered);
  }

  // POST /requests
  if (path === "/requests" && method === "POST") {
    const body = JSON.parse(options.body as string);
    const shift = SHIFTS.find((s) => s.id === Number(body.shift_id));
    const targetShift = body.target_shift_id ? SHIFTS.find((s) => s.id === Number(body.target_shift_id)) : null;
    const targetEmployee = body.target_employee_id ? TEST_USERS.find((u) => u.id === Number(body.target_employee_id)) : null;
    const newReq: TestRequest = {
      id: Date.now(),
      type: body.type,
      status: "pending",
      swap_status: "pending",
      reason: body.reason || null,
      requester_id: currentUser.id,
      shift_id: body.shift_id,
      target_shift_id: body.target_shift_id || null,
      target_employee_id: body.target_employee_id || null,
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
      target_first_name: targetEmployee?.first_name || null,
      target_last_name: targetEmployee?.last_name || null,
      team_id: shift?.team_id ?? 0,
      shift_date: shift?.date || null,
      shift_start_time: shift?.start_time || null,
      shift_end_time: shift?.end_time || null,
      target_shift_date: targetShift?.date || null,
      target_shift_start_time: targetShift?.start_time || null,
      target_shift_end_time: targetShift?.end_time || null,
      created_at: new Date().toISOString(),
    };
    REQUESTS.push(newReq);
    persistRequests();
    return jsonResponse(newReq);
  }

  // PATCH /requests/:id/swap-respond
  const swapRespondMatch = path.match(/^\/requests\/(\d+)\/swap-respond$/);
  if (swapRespondMatch && method === "PATCH") {
    const id = Number(swapRespondMatch[1]);
    const body = JSON.parse(options.body as string);
    const req = REQUESTS.find((r) => r.id === id);
    if (!req) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    req.swap_status = body.accept ? "accepted" : "rejected";
    if (!body.accept) req.status = "denied";
    persistRequests();
    return jsonResponse(req);
  }

  // PATCH /requests/:id
  const patchRequestMatch = path.match(/^\/requests\/(\d+)$/);
  if (patchRequestMatch && method === "PATCH") {
    const id = Number(patchRequestMatch[1]);
    const body = JSON.parse(options.body as string);
    const req = REQUESTS.find((r) => r.id === id);
    if (req) {
      req.status = body.status;
      persistRequests();
      return jsonResponse(req);
    }
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  // GET /messages/contacts/list
  if (path === "/messages/contacts/list" && method === "GET") {
    // Return all users that are on the same teams as the current user, plus managers of those teams
    const userTeamIds = currentUser.role === "manager"
      ? TEAMS.filter((t) => t.manager_id === currentUser.id).map((t) => t.id)
      : Object.entries(TEAM_MEMBERS)
          .filter(([, members]) => members.includes(currentUser.id))
          .map(([teamId]) => Number(teamId));

    const contactIds = new Set<number>();
    for (const teamId of userTeamIds) {
      // Add team members
      const members = TEAM_MEMBERS[teamId] || [];
      members.forEach((id) => contactIds.add(id));
      // Add team manager
      const team = TEAMS.find((t) => t.id === teamId);
      if (team) contactIds.add(team.manager_id);
    }
    contactIds.delete(currentUser.id);

    const contacts = [...contactIds].map((id) => {
      const u = TEST_USERS.find((u) => u.id === id)!;
      return { id: u.id, first_name: u.first_name, last_name: u.last_name, role: u.role };
    });
    return jsonResponse(contacts);
  }

  // GET /messages/conversations
  if (path === "/messages/conversations" && method === "GET") {
    const userConvs = CONVERSATIONS.filter((c) => c.member_ids.includes(currentUser.id));
    userConvs.sort((a, b) => {
      const lastA = CONV_MESSAGES.filter((m) => m.conversation_id === a.id).pop();
      const lastB = CONV_MESSAGES.filter((m) => m.conversation_id === b.id).pop();
      const tA = lastA ? new Date(lastA.created_at).getTime() : new Date(a.created_at).getTime();
      const tB = lastB ? new Date(lastB.created_at).getTime() : new Date(b.created_at).getTime();
      return tB - tA;
    });
    const result = userConvs.map((c) => {
      const msgs = CONV_MESSAGES.filter((m) => m.conversation_id === c.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const lastMsg = msgs[0] || null;
      const otherNames = c.member_ids
        .filter((id) => id !== currentUser.id)
        .map((id) => {
          const u = TEST_USERS.find((u) => u.id === id);
          return u ? `${u.first_name} ${u.last_name}` : "";
        })
        .join(", ");
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        created_by: c.created_by,
        team_id: c.team_id,
        last_message: lastMsg?.content || null,
        last_message_at: lastMsg?.created_at || null,
        last_sender_name: lastMsg ? `${lastMsg.first_name} ${lastMsg.last_name}` : null,
        member_names: otherNames,
      };
    });
    return jsonResponse(result);
  }

  // POST /messages/conversations/dm
  if (path === "/messages/conversations/dm" && method === "POST") {
    const body = JSON.parse(options.body as string);
    const otherId = Number(body.other_user_id);
    const existing = CONVERSATIONS.find(
      (c) =>
        c.type === "dm" &&
        c.member_ids.length === 2 &&
        c.member_ids.includes(currentUser.id) &&
        c.member_ids.includes(otherId)
    );
    if (existing) return jsonResponse({ conversation_id: existing.id });
    const newConv: TestConversation = {
      id: Date.now(),
      type: "dm",
      name: null,
      created_by: currentUser.id,
      team_id: null,
      created_at: new Date().toISOString(),
      member_ids: [currentUser.id, otherId],
    };
    CONVERSATIONS.push(newConv);
    return jsonResponse({ conversation_id: newConv.id });
  }

  // POST /messages/conversations/group
  if (path === "/messages/conversations/group" && method === "POST") {
    const body = JSON.parse(options.body as string);
    if (!body.name?.trim()) {
      return new Response(JSON.stringify({ error: "Group name is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const memberIds: number[] = body.member_ids || [];
    if (memberIds.length < 1) {
      return new Response(JSON.stringify({ error: "At least one other member is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const allMembers = [currentUser.id, ...memberIds.filter((id) => id !== currentUser.id)];
    const newConv: TestConversation = {
      id: Date.now(),
      type: "group",
      name: body.name.trim(),
      created_by: currentUser.id,
      team_id: body.team_id || null,
      created_at: new Date().toISOString(),
      member_ids: allMembers,
    };
    CONVERSATIONS.push(newConv);
    return jsonResponse(newConv);
  }

  // GET + POST /messages/conversations/:id/messages
  const convMessagesMatch = path.match(/^\/messages\/conversations\/(\d+)\/messages$/);
  if (convMessagesMatch && method === "GET") {
    const convId = Number(convMessagesMatch[1]);
    const msgs = CONV_MESSAGES
      .filter((m) => m.conversation_id === convId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return jsonResponse(msgs);
  }
  if (convMessagesMatch && method === "POST") {
    const convId = Number(convMessagesMatch[1]);
    const body = JSON.parse(options.body as string);
    const newMsg: TestConvMessage = {
      id: Date.now(),
      conversation_id: convId,
      sender_id: currentUser.id,
      content: body.content,
      created_at: new Date().toISOString(),
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
    };
    CONV_MESSAGES.push(newMsg);
    return jsonResponse(newMsg);
  }

  // GET /messages/:contactId
  const messagesMatch = path.match(/^\/messages\/(\d+)$/);
  if (messagesMatch && method === "GET") {
    const contactId = Number(messagesMatch[1]);
    const filtered = MESSAGES.filter(
      (m) =>
        (m.sender_id === currentUser.id && m.receiver_id === contactId) ||
        (m.sender_id === contactId && m.receiver_id === currentUser.id)
    );
    return jsonResponse(filtered);
  }

  // POST /messages
  if (path === "/messages" && method === "POST") {
    const body = JSON.parse(options.body as string);
    const newMsg: TestMessage = {
      id: Date.now(),
      sender_id: body.sender_id,
      receiver_id: body.receiver_id,
      content: body.content,
      created_at: new Date().toISOString(),
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
    };
    MESSAGES.push(newMsg);
    return jsonResponse(newMsg);
  }

  // GET /users/:id/avatar
  const getAvatarMatch = path.match(/^\/users\/(\d+)\/avatar$/);
  if (getAvatarMatch && method === "GET") {
    const userId = Number(getAvatarMatch[1]);
    const user = TEST_USERS.find((u) => u.id === userId);
    return jsonResponse({ avatar_url: user?.avatar_url || null });
  }

  // PUT /users/:id/avatar
  if (getAvatarMatch && method === "PUT") {
    const userId = Number(getAvatarMatch[1]);
    const body = JSON.parse(options.body as string);
    const user = TEST_USERS.find((u) => u.id === userId);
    if (user) {
      user.avatar_url = body.avatar_url;
      // Also update localStorage
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined" && stored !== "null") {
        const current = JSON.parse(stored);
        if (current.id === userId) {
          current.avatar_url = body.avatar_url;
          localStorage.setItem("user", JSON.stringify(current));
        }
      }
    }
    return jsonResponse({ id: userId, avatar_url: body.avatar_url });
  }

  // DELETE /users/:id/avatar
  if (getAvatarMatch && method === "DELETE") {
    const userId = Number(getAvatarMatch[1]);
    const user = TEST_USERS.find((u) => u.id === userId);
    if (user) user.avatar_url = null;
    return jsonResponse({ success: true });
  }

  // GET /health
  if (path === "/health") {
    return jsonResponse({ status: "ok", mode: "test" });
  }

  // Fallback - unhandled endpoint
  return jsonResponse([]);
}
