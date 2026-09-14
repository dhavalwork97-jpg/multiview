"use client";

import { useEffect, useState } from "react";

export function LazyCommandPalette() {
  const [CommandPalette, setCommandPalette] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void import("./CommandPalette").then((module) => {
        if (!cancelled) setCommandPalette(() => module.CommandPalette);
      });
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(load, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = window.setTimeout(load, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return CommandPalette ? <CommandPalette /> : null;
}
