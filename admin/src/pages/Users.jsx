import { Lock, Search, Shield, ShieldOff, Trash2, Unlock, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Badge, ConfirmDialog, EmptyState, ErrorState, PageHeader, PageLoader, Pagination } from "../components/ui";
import { useAdmin } from "../context/AuthContext";
import { useAsync, useDebounce } from "../hooks/useAsync";
import { adminApi } from "../services/api";
import { fmtDate, initials, money } from "../utils/format";

export default function Users() {
  const { admin } = useAdmin();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const { data, loading, error, reload } = useAsync(() => adminApi.users({ search: q || undefined, role: role || undefined, page, limit: 20 }), [q, role, page]);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { type, user } = action;
      const res =
        type === "delete" ? await adminApi.deleteUser(user._id)
          : type === "block" ? await adminApi.updateUser(user._id, { isBlocked: !user.isBlocked })
            : await adminApi.updateUser(user._id, { role: user.role === "admin" ? "user" : "admin" });
      toast.success(res.message);
      setAction(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const msg = () => {
    if (!action) return "";
    const { type, user } = action;
    if (type === "delete") return `Permanently delete ${user.name}'s account? This is refused if they have upcoming confirmed bookings.`;
    if (type === "block") return user.isBlocked ? `Unblock ${user.name}? They will be able to log in again.` : `Block ${user.name}? They will be logged out and unable to book.`;
    return user.role === "admin" ? `Remove admin access from ${user.name}?` : `Give ${user.name} full admin access to this panel?`;
  };

  return (
    <>
      <PageHeader title="Users" subtitle={data ? `${data.total} accounts` : " "} />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="input pl-10" placeholder="Search name, email or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="input sm:w-40" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Filter by role">
            <option value="">All roles</option><option value="user">Customers</option><option value="admin">Admins</option>
          </select>
        </div>
        {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? (
          <EmptyState icon={UsersIcon} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Spent</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.items.map((u) => {
                  const self = u._id === admin?._id;
                  return (
                    <tr key={u._id} className="transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-brand-600 text-xs font-bold text-white">{initials(u.name)}</span>
                          <div className="min-w-0"><p className="font-medium text-white">{u.name} {self && <span className="text-xs text-slate-500">(you)</span>}</p><p className="text-xs text-slate-500">{u.email}{u.phone && ` · ${u.phone}`}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><Badge value={u.role === "admin" ? "upcoming" : "scheduled"} label={u.role} />{u.isBlocked && <Badge value="failed" label="Blocked" />}</div></td>
                      <td className="px-4 py-3 text-slate-300">{u.city || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{u.bookings}</td>
                      <td className="px-4 py-3 text-slate-300">{money(u.spent)}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        {!self && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setAction({ type: "role", user: u })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-violet-500/10 hover:text-violet-300" title={u.role === "admin" ? "Remove admin" : "Make admin"} aria-label="Toggle admin role">{u.role === "admin" ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}</button>
                            <button onClick={() => setAction({ type: "block", user: u })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-amber-500/10 hover:text-amber-300" title={u.isBlocked ? "Unblock" : "Block"} aria-label="Toggle block">{u.isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</button>
                            <button onClick={() => setAction({ type: "delete", user: u })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Delete" aria-label="Delete user"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
      <ConfirmDialog open={Boolean(action)} danger={action?.type !== "role"} title="Are you sure?" message={msg()} confirmLabel="Yes, continue" busy={busy} onConfirm={run} onClose={() => setAction(null)} />
    </>
  );
}
