import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPrimaryOrganizationMembership } from "@/lib/organization";
import { CreateTournamentForm } from "@/components/admin/CreateTournamentForm";

export default async function NewTournamentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const membership = await getPrimaryOrganizationMembership(user.id);
  if (user.role !== "ADMIN" && (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER"))) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Admin · Tournament setup</p>
          <h1 className="font-display text-3xl uppercase tracking-wide">Create tournament</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Create a real tournament from the dashboard. No seed command or manual database setup is required.
          </p>
        </div>
        <Link href="/dashboard" className="rounded-card border border-arena-600 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-muted hover:border-signal-live hover:text-signal-live">
          Back to dashboard
        </Link>
      </header>

      <CreateTournamentForm />
    </main>
  );
}
