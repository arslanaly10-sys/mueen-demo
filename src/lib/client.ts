"use client";
import type { EngineRequest, EngineResponse } from "./engine/engine";
import type { Interpretation } from "./types";
import { useStore } from "./store";

/** Calls the stateless backend engine and merges the result into the local store. */
export async function engine(req: Omit<EngineRequest, "auditHead" | "config">): Promise<EngineResponse> {
  const s = useStore.getState();
  const last = s.audit[s.audit.length - 1];
  const res = await fetch("/api/tx", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...req, auditHead: last ? { seq: last.seq, hash: last.hash } : null, config: s.config }),
  });
  if (!res.ok) throw new Error("engine_http_" + res.status);
  const data = (await res.json()) as EngineResponse;
  const st = useStore.getState();
  if (data.events?.length) st.appendAudit(data.events);
  if (data.tx) st.upsertTx(data.tx);
  if (data.mandate) st.upsertMandate(data.mandate);
  return data;
}

export async function interpret(text: string, personaId: string): Promise<Interpretation> {
  const res = await fetch("/api/interpret", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, personaId }),
  });
  if (!res.ok) throw new Error("interpret_http_" + res.status);
  return res.json();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
