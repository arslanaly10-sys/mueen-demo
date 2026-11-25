import "server-only";

// shortcut: per-instance memory, so limits are approximate across serverless instances; use the
// government API gateway's rate limiting (or a shared store) before any pilot.
const hits = new Map<string, number[]>();

/** Sliding-window limit per caller and route. Returns seconds to wait, or 0 when allowed. */
export function rateLimit(req: Request, route: string, max: number, windowMs = 60_000): number {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const key = `${route}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return Math.ceil((windowMs - (now - recent[0])) / 1000);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear(); // bound memory under abuse
  return 0;
}
