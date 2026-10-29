/**
 * High-performance API Client with fail-fast timeouts and resilience helpers.
 * Prevents UI freezes on offline localhost backends and speeds up network fallbacks.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Safe fetch wrapper that enforces an AbortController timeout.
 * Prevents TCP SYN delays on Windows when the local backend server is not running.
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs = 450
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Safely parse JSON from a response, returning null on error.
 */
export async function safeJson<T = any>(res: Response | null): Promise<T | null> {
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
