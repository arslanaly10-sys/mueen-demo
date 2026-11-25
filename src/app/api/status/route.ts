import { NextResponse } from "next/server";
import { llmEnabled, MODEL } from "@/lib/agent/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ engine: llmEnabled() ? "claude" : "scripted", model: llmEnabled() ? MODEL : null });
}
