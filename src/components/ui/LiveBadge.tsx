type LiveBadgeProps = {
  label?: string;
  className?: string;
};

export function LiveBadge({ label = "Live", className = "" }: LiveBadgeProps) {
  return (
    <span className={`status-live animate-live-glow ${className}`.trim()}>
      <span className="live-dot animate-live-pulse" aria-hidden="true" />
      {label}
    </span>
  );
}
