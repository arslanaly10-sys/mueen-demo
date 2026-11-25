import { NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";
import { scriptedInterpret } from "@/lib/agent/fallback";
import { claudeInterpret, llmEnabled } from "@/lib/agent/llm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { text?: string; personaId?: string };
  const text = (body.text ?? "").toString().slice(0, 2000);
  const persona = body.personaId ? getPersona(body.personaId) : undefined;
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
