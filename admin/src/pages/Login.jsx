import { Lock, Mail } from "lucide-react";
import { LogoMark, Wordmark } from "../components/Wordmark";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Spinner } from "../components/ui";
import { useAdmin } from "../context/AuthContext";

export default function Login() {
  const { admin, login } = useAdmin();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (admin) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 text-center">
          <LogoMark className="mx-auto h-16 w-auto" />
          <h1 className="mt-4 flex items-baseline justify-center gap-2"><Wordmark className="text-3xl" /><span className="font-display text-lg font-bold text-slate-300">Admin</span></h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with an administrator account</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input id="email" type="email" required autoComplete="email" className="input pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@cinephile.com" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input id="password" type="password" required autoComplete="current-password" className="input pl-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={loading}>{loading && <Spinner />} Sign in</button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">Seeded admin: admin@cinephile.com · Admin@123</p>
      </div>
    </div>
  );
}
