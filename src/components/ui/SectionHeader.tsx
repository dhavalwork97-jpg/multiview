import Link from "next/link";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  actionLabel = "View all",
}: SectionHeaderProps) {
  const heading = (
    <div className="min-w-0">
      {eyebrow && <p className="section-label">{eyebrow}</p>}
      <h2 className="section-heading mt-1">{title}</h2>
      {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{description}</p>}
    </div>
  );

  return (
    <div className="flex items-end justify-between gap-4 border-b border-arena-700/80 pb-3">
      {heading}
      {href && (
        <Link href={href} className="action-ghost shrink-0">
          {actionLabel}
          <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      )}
    </div>
  );
}
