import { NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";
import { verifySession } from "@/lib/engine/crypto";
import { rateLimit } from "@/lib/rateLimit";
import { scriptedInterpret } from "@/lib/agent/fallback";
import { claudeInterpret, llmEnabled } from "@/lib/agent/llm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const wait = rateLimit(req, "interpret", 20);
  if (wait) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(wait) } });
  const body = (await req.json().catch(() => ({}))) as { text?: string; personaId?: string; session?: string };
  const text = (body.text ?? "").toString().slice(0, 2000);
  const who = verifySession(body.session);
  if (!who) return NextResponse.json({ error: "session_required" }, { status: 401 });
  const persona = getPersona(who);
  if (!text.trim() || !persona) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (llmEnabled()) {
    try {
      return NextResponse.json(await claudeInterpret(text, persona));
    } catch (err) {
      console.error("[interpret] Claude call failed, using scripted fallback:", err instanceof Error ? err.message : err);
      return NextResponse.json({ ...scriptedInterpret(text, persona), fallbackReason: "model_error" });
    }
  }
  return NextResponse.json(scriptedInterpret(text, persona));
}
