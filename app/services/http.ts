// Central place to resolve the API origin.
//
// In local dev the frontend is served by Vite on :3000 and talks to the API
// through Vite's `/api` proxy (see vite.config.ts), so the default empty base
// keeps every request same-origin and relative.
//
// For any deployment where the built `app/dist` is served separately from the
// API (static host, preview server, container without the proxy), set
// `VITE_API_URL` to the API origin, e.g. `https://fox-api.example.com`.
const API_BASE = String((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
