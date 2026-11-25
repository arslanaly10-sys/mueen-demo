"use client";
import { useEffect, useState } from "react";
import { CpuIcon, SparkleIcon } from "@phosphor-icons/react";
import { T } from "@/lib/i18n";
import { useT } from "./useT";

export function EngineBadge() {
  const { t } = useT();
  const [engine, setEngine] = useState<"claude" | "scripted" | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setEngine(d.engine))
      .catch(() => setEngine("scripted"));
  }, []);
  if (!engine) return null;
  const Icon = engine === "claude" ? SparkleIcon : CpuIcon;
  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs md:inline-flex border-line bg-white text-muted`}
      title={engine === "claude" ? "Requests are interpreted by Claude; decisions are made by the policy engine." : "No API key configured — using the deterministic scripted interpreter."}
    >
      <Icon size={13} aria-hidden="true" />
      {engine === "claude" ? t(T.engineClaude) : t(T.engineScripted)}
    </span>
  );
}
