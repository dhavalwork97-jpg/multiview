type LiveBadgeProps = {
  label?: string;
  className?: string;
  compact?: boolean;
};

export function LiveBadge({ label = "Live", className = "", compact = false }: LiveBadgeProps) {
  return (
    <span className={`status-live animate-live-glow ${compact ? "px-2 py-0.5 text-[9px]" : ""} ${className}`.trim()}>
      <span className="live-dot animate-live-pulse" aria-hidden="true" />
      {label}
    </span>
  );
}
