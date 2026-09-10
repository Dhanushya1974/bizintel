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
