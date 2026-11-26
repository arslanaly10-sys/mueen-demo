"use client";
import { IconContext } from "@phosphor-icons/react";
import { MotionConfig } from "motion/react";

/** App-wide client defaults: every Phosphor icon is duotone, and every motion animation honours reduced motion. */
export function IconWeight({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <IconContext.Provider value={{ weight: "duotone" }}>{children}</IconContext.Provider>
    </MotionConfig>
  );
}

/** The one easing curve the app's motion uses (a quick start, a soft landing). */
export const EASE = [0.22, 1, 0.36, 1] as const;
