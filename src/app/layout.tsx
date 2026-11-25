import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/500.css";
import "@fontsource/noto-sans-arabic/600.css";
import "@fontsource/noto-sans-arabic/700.css";
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
