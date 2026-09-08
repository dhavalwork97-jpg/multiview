import * as React from "react";
import { cn } from "@/lib/cn";

export function Surface({ className, interactive = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div className={cn("surface-card", interactive && "surface-card-interactive", className)} {...props} />;
}

export function SurfaceHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4 border-b border-arena-700 px-4 py-3 sm:px-5", className)} {...props} />;
}

export function SurfaceBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-4 sm:px-5", className)} {...props} />;
}

export function SurfaceTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg font-semibold uppercase tracking-[0.04em] text-ink", className)} {...props} />;
}
