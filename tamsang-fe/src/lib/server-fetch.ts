import { API_CONFIG } from "./constants";

/**
 * Server-side fetch utility for Server Components.
 * Fetches directly from the backend (bypasses BFF/axios client).
 * Only use in Server Components, generateMetadata, or API routes.
 */
export async function serverFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_CONFIG.BACKEND_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`Server fetch failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
