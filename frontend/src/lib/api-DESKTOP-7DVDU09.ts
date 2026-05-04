import { resolveTestRequest, isTestMode } from "./testData";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // In test mode, return mock data instead of hitting the real API
  if (isTestMode()) {
    const mockResponse = resolveTestRequest(endpoint, options);
    if (mockResponse) return mockResponse;
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
