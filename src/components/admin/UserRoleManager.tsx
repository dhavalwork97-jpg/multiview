"use client";

import { useEffect, useState } from "react";

type Role = "VIEWER" | "PLAYER" | "ORGANIZER" | "ADMIN";

type ManagedUser = {
  id: string;
  clerkId: string;
  email: string;
  username: string;
  displayName: string | null;
  role: Role;
};

const ROLES: Role[] = ["VIEWER", "PLAYER", "ORGANIZER", "ADMIN"];

export function UserRoleManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError("Couldn't load users. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input rather than firing a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => refresh(query), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function changeRole(user: ManagedUser, role: Role) {
    if (role === user.role) return;
    setSavingId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update role");
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search by email, username, or name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-card border border-arena-600 bg-arena-900 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-signal-live focus:outline-none"
      />

      {error && (
        <p className="mb-4 rounded-card border border-signal-error/50 bg-signal-error/10 px-3 py-2 text-sm text-signal-error">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-ink-faint">No users found.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-arena-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-arena-900 font-mono text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-arena-700">
                  <td className="px-4 py-2 text-ink">
                    {user.displayName || user.username}
                    {user.id === currentUserId && (
                      <span className="ml-2 font-mono text-xs text-ink-faint">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-muted">{user.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={user.role}
                      disabled={savingId === user.id || (user.id === currentUserId)}
                      onChange={(e) => changeRole(user, e.target.value as Role)}
                      className="rounded-card border border-arena-600 bg-arena-900 px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {savingId === user.id && (
                      <span className="ml-2 text-xs text-ink-faint">Saving…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
