import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryOrganizationMembership } from "@/lib/organization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrganizerModerationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getPrimaryOrganizationMembership(user.id);
  const allowed = user.role === "ADMIN" || user.role === "ORGANIZER" || membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!allowed) redirect("/dashboard");

  const organizationId = membership?.organizationId;
  const incidents = organizationId
    ? await db.tournamentIncident.findMany({
        where: { organizationId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 60,
        select: {
          id: true,
          tournamentId: true,
          title: true,
          details: true,
          severity: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          tournament: { select: { id: true, name: true } },
        },
      })
    : [];

  const open = incidents.filter((incident) => incident.status !== "RESOLVED");
  const critical = open.filter((incident) => String(incident.severity).toUpperCase() === "CRITICAL").length;
  const resolved = incidents.filter((incident) => incident.status === "RESOLVED").length;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">V32 / operations</p>
          <h1 className="page-title mt-2">Moderator center</h1>
          <p className="page-subtitle">A focused incident queue for organizers using the existing tournament incident workflow.</p>
        </div>
        <Link href="/organizer" className="action-secondary self-start">← Command deck</Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Open" value={open.length} detail="needs triage" />
        <Metric label="Critical" value={critical} detail="highest severity" />
        <Metric label="Resolved" value={resolved} detail="in latest 60" />
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-arena-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Incident queue</p>
            <p className="mt-1 text-xs text-ink-faint">Open incidents stay at the top; resolved history remains available below.</p>
          </div>
          <span className="metric-label">{incidents.length} records</span>
        </div>

        {incidents.length ? (
          <div className="divide-y divide-arena-800">
            {incidents.map((incident) => (
              <article key={incident.id} className={`px-5 py-5 ${incident.status === "RESOLVED" ? "opacity-70" : ""}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Severity severity={String(incident.severity)} />
                      <Status status={String(incident.status)} />
                      <span className="metric-label">{incident.tournament.name}</span>
                    </div>
                    <h2 className="mt-2 font-semibold text-ink">{incident.title}</h2>
                    {incident.details && <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{incident.details}</p>}
                    <div className="mt-3 flex flex-wrap gap-4 font-mono text-[9px] uppercase tracking-widest text-ink-faint">
                      <time dateTime={new Date(incident.createdAt).toISOString()}>Opened {new Date(incident.createdAt).toLocaleString()}</time>
                      {incident.resolvedAt && <time dateTime={new Date(incident.resolvedAt).toISOString()}>Resolved {new Date(incident.resolvedAt).toLocaleString()}</time>}
                    </div>
                  </div>
                  <Link href={`/admin/tournaments/${incident.tournamentId}/ops`} className="action-secondary shrink-0">Open station ops →</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state m-4">
            <p className="section-heading">Clear channel</p>
            <p className="mt-2 text-sm text-ink-faint">No tournament incidents are currently visible to this organization.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="surface-card p-5"><p className="section-label">{label}</p><p className="score-value mt-2">{value}</p><p className="mt-1 text-xs text-ink-faint">{detail}</p></div>;
}

function Severity({ severity }: { severity: string }) {
  const critical = severity.toUpperCase() === "CRITICAL";
  return <span className={`font-mono text-[9px] uppercase tracking-widest ${critical ? "text-signal-error" : "text-ink-muted"}`}>{severity}</span>;
}

function Status({ status }: { status: string }) {
  return <span className="status-neutral">{status.replaceAll("_", " ")}</span>;
}
