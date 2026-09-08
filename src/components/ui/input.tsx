import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "field-input min-h-10",
        "focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("field-label", className)} {...props} />;
}
