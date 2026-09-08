import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-card px-4 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-live/50 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-signal-live text-arena-950 hover:opacity-90",
        secondary: "border border-arena-600 bg-arena-900 text-ink hover:border-signal-live/60 hover:bg-arena-800",
        ghost: "text-ink-muted hover:bg-arena-800 hover:text-ink",
        danger: "border border-signal-error/40 bg-signal-error/10 text-signal-error hover:bg-signal-error/15",
      },
      size: {
        sm: "min-h-8 px-3 text-[10px]",
        md: "min-h-10 px-4",
        lg: "min-h-11 px-5 text-xs",
        icon: "h-10 w-10 min-h-10 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
