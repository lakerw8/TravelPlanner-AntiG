import { supabase } from "@/src/lib/supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isJsonContentType(contentType: string | null): boolean {
  return Boolean(contentType && contentType.toLowerCase().includes("application/json"));
}

async function getAuthHeader(): Promise<string | null> {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) return null;
  return `Bearer ${session.access_token}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(init.headers ?? {});
  headers.set("Accept", "application/json");

  const authHeader = await getAuthHeader();
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

  const contentType = response.headers.get("content-type");
  let payload: unknown = null;

  if (isJsonContentType(contentType)) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: unknown }).error)
        : response.statusText || "Request failed";

    throw new ApiError(response.status, message);
  }

  return payload as T;
}

export function withJson(body: unknown): { body: string; headers: Record<string, string> } {
  return {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  };
}
