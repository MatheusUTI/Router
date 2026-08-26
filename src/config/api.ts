export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

/**
 * Helper to build full backend URLs.
 * In development, VITE_API_BASE_URL might be http://localhost:3000.
 * In production, it might be https://router-api.onrender.com.
 * If not set, it defaults to the same origin (empty string, causing relative fetch).
 */
export function getApiUrl(path: string): string {
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If API_BASE_URL is empty, it will do a relative fetch (e.g. "/api/health")
  return `${API_BASE_URL}${normalizedPath}`;
}
