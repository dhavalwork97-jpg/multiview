import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        live: "border-signal-live/30 bg-signal-live/10 text-signal-live",
        neutral: "border-arena-600 bg-arena-800 text-ink-muted",
        warning: "border-signal-warn/30 bg-signal-warn/10 text-signal-warn",
        danger: "border-signal-error/30 bg-signal-error/10 text-signal-error",
        p1: "border-corner-p1/30 bg-corner-p1/10 text-corner-p1",
        p2: "border-corner-p2/30 bg-corner-p2/10 text-corner-p2",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props}>{children}</span>;
}

export { badgeVariants };
