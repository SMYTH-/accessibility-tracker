"use client";

import { useEffect } from "react";

/**
 * After navigation to a tab URL with a hash, scroll to the target and move
 * keyboard focus to the primary control when landing on savings setup.
 */
export function FocusOnHash() {
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;

    const target = document.getElementById(id);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });

    if (id === "setup") {
      const field = document.getElementById("targetMajor");
      if (field instanceof HTMLElement) {
        field.focus({ preventScroll: true });
        return;
      }
    }

    if (target instanceof HTMLElement && target.tabIndex < 0) {
      target.tabIndex = -1;
    }
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll: true });
    }
  }, []);

  return null;
}
