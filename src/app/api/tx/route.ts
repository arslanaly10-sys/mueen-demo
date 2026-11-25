import { NextResponse } from "next/server";
import { runEngine, type EngineRequest } from "@/lib/engine/engine";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const wait = rateLimit(req, "tx", 120);
  if (wait) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(wait) } });
  const body = (await req.json().catch(() => null)) as EngineRequest | null;
  if (!body?.action || !body.config) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  return NextResponse.json(runEngine(body));
}
