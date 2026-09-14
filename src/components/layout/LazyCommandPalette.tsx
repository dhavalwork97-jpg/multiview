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

    const requestIdle = window.requestIdleCallback;
    if (typeof requestIdle === "function") {
      const id = requestIdle(load, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = setTimeout(load, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return CommandPalette ? <CommandPalette /> : null;
}
