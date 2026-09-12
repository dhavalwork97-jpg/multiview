"use client";

import { useEffect } from "react";

export default function BroadcastOverlayLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const body = document.body;
    body.classList.add("fgc-broadcast-output");
    return () => body.classList.remove("fgc-broadcast-output");
  }, []);

  return (
    <>
      <style jsx global>{`
        html:has(.fgc-overlay-root),
        body.fgc-broadcast-output,
        body.fgc-broadcast-output #__next {
          background: transparent !important;
          min-width: 0 !important;
          width: 100% !important;
          min-height: 100% !important;
          overflow: hidden !important;
        }
        body.fgc-broadcast-output header,
        body.fgc-broadcast-output nav,
        body.fgc-broadcast-output footer {
          display: none !important;
        }
        body.fgc-broadcast-output > div {
          width: 100% !important;
          min-height: 100vh !important;
        }
      `}</style>
      {children}
    </>
  );
}
