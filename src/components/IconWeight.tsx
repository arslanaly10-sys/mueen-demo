"use client";
import { IconContext } from "@phosphor-icons/react";

/** Every Phosphor icon in the app uses the duotone weight. */
export function IconWeight({ children }: { children: React.ReactNode }) {
  return <IconContext.Provider value={{ weight: "duotone" }}>{children}</IconContext.Provider>;
}
