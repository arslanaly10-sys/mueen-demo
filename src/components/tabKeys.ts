import type { KeyboardEvent } from "react";

/** APG tabs and radio groups: arrow keys (left/right mirrored in RTL), Home and End move to an item and select it. */
export function tabKeys<Id extends string>(e: KeyboardEvent<HTMLElement>, ids: readonly Id[], current: Id, select: (id: Id) => void) {
  const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
  const i = ids.indexOf(current);
  const next = { ArrowRight: rtl ? i - 1 : i + 1, ArrowLeft: rtl ? i + 1 : i - 1, ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: ids.length - 1 }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  const id = ids[(next + ids.length) % ids.length];
  select(id);
  e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"], [role="radio"]')[ids.indexOf(id)]?.focus();
}
