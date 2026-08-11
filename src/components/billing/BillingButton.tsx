export function BillingButton({ isPremium }: { isPremium: boolean }) {
  return (
    <span className="rounded border border-arena-600 px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-ink-faint">
      {isPremium ? "Free trial active" : "Paid billing coming soon"}
    </span>
  );
}
