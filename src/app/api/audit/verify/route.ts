import { NextResponse } from "next/server";
import { verifyChain } from "@/lib/engine/crypto";
import type { AuditEvent } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { events?: AuditEvent[] } | null;
  return NextResponse.json(verifyChain(body?.events ?? []));
}
