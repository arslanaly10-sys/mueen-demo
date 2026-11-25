import type { Metadata } from "next";
// The pairing taste-skill dealt for the landing page (start.mjs: host), plus an Arabic face; self-hosted.
import "@fontsource-variable/host-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
import { LangSync } from "@/components/LangSync";

export const metadata: Metadata = {
  title: "MUEEN · مُعين — Concept demo",
  description: "Concept for discussion: a Saudi-governed AI service agent demonstrator. Synthetic data and mock services only.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="min-h-dvh">
        <LangSync />
        {children}
      </body>
    </html>
  );
}
