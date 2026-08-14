"use client";

import { useMemo } from "react";
import { buildEventSetupChecklist } from "@/lib/event-setup";
import { canManageEvent, canManageTeam, type OrganizerRole } from "@/lib/organization-rbac";

export default function TournamentOperationsPage() {
  const steps = useMemo(() => buildEventSetupChecklist(), []);
  const role: OrganizerRole = "ADMIN";

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Operations</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Event Operations</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-faint">
          Run the event from one place: setup, staffing, incidents and recovery.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-line p-5">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Your role</p>
          <p className="mt-2 text-xl font-semibold text-ink">{role}</p>
          <p className="mt-2 text-sm text-ink-faint">
            Event control: {canManageEvent(role) ? "enabled" : "read only"}
          </p>
        </div>
        <div className="rounded-xl border border-line p-5">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Team management</p>
          <p className="mt-2 text-xl font-semibold text-ink">{canManageTeam(role) ? "enabled" : "restricted"}</p>
        </div>
        <div className="rounded-xl border border-line p-5">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Streaming principle</p>
          <p className="mt-2 text-sm text-ink">Each station may carry a different match.</p>
        </div>
      </section>

      <section className="rounded-xl border border-line p-6">
        <h2 className="text-lg font-semibold text-ink">Event setup</h2>
        <div className="mt-5 space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-4 rounded-lg border border-line p-4">
              <span className="mt-0.5 rounded-full border border-line px-2 py-0.5 text-[10px] font-mono uppercase text-ink-faint">
                {step.status}
              </span>
              <div>
                <p className="font-medium text-ink">{step.title}</p>
                <p className="mt-1 text-sm text-ink-faint">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
