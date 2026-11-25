import { NextResponse } from "next/server";
import { runEngine, type EngineRequest } from "@/lib/engine/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as EngineRequest | null;
  if (!body?.action || !body.config) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  return NextResponse.json(runEngine(body));
}
