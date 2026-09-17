const CONFIGURED_API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "";

/** Base URL for the backend, or null when it can't be reached (deployed host, no
 *  VITE_API_URL) so callers can degrade gracefully instead of firing doomed requests. */
export function resolveApiUrl(): string | null {
  if (CONFIGURED_API_URL) return CONFIGURED_API_URL.replace(/\/+$/, "");
  if (
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  ) {
    return "http://localhost:4000";
  }
  return null;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const base = resolveApiUrl();
  if (!base) throw new Error("Backend is not reachable");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data as T;
}

/** Sends a 6-digit verification code to the given email. */
export function requestLoginCode(email: string): Promise<void> {
  return postJson<{ sent: true }>("/api/auth/request-code", { email }).then(() => undefined);
}

/** Verifies a 6-digit code previously sent via requestLoginCode. Throws on mismatch/expiry. */
export function verifyLoginCode(email: string, code: string): Promise<void> {
  return postJson<{ verified: true }>("/api/auth/verify-code", { email, code }).then(() => undefined);
}
