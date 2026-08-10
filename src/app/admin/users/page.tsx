import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserRoleManager } from "@/components/admin/UserRoleManager";

// ADMIN-only (not ORGANIZER) — this page is the entry point for granting
// ORGANIZER/ADMIN access itself, so it's gated a level above the rest of
// /admin. middleware.ts already keeps non-organizers out of /admin(.*)
// entirely; this tightens it further to ADMIN for this one page.
export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-arena-950 px-6 py-8">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Admin</p>
        <h1 className="font-display text-3xl uppercase tracking-wide">User roles</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Promote a user to ORGANIZER to give them tournament/station management access, or
          to ADMIN for full access including this page. Changes apply immediately in both
          the database and Clerk.
        </p>
      </header>

      <UserRoleManager currentUserId={user.id} />
    </main>
  );
}
