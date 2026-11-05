import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { movieApi } from "../services/api";
import { imageUrl } from "../utils/format";

function AuthShell({ title, subtitle, children }) {
  const posters = useAsync(() => movieApi.list({ limit: 9, sort: "rating" }).then((r) => r.items), []);
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 grid -rotate-6 scale-125 grid-cols-3 gap-4 opacity-60">
          {(posters.data || []).map((m) => <img key={m._id} src={imageUrl(m.poster)} alt="" aria-hidden className="aspect-[2/3] w-full rounded-xl object-cover" />)}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900/40 via-ink-900/70 to-ink-900" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-ink-900/60" />
        <div className="absolute bottom-16 left-12 max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-white">Every great story deserves the big screen.</h2>
          <p className="mt-3 text-slate-300">Book tickets for the latest releases at cinemas across India.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <Logo className="mb-8" />
          <h1 className="font-display text-3xl font-extrabold text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, error, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = props.type === "password";
  return (
    <div>
      <label className="label" htmlFor={props.name}>{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input id={props.name} {...props} type={isPassword && show ? "text" : props.type} className={`input pl-10 ${isPassword ? "pr-10" : ""} ${error ? "border-red-500/60" : ""}`} />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to book tickets and manage your bookings.">
      <form onSubmit={submit} className="space-y-4">
        <Field icon={Mail} label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        <Field icon={Lock} label="Password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={loading}>{loading && <Spinner className="h-4 w-4" />} Log in</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">New to Cinephile? <Link to="/register" state={location.state} className="font-semibold text-brand-400 hover:text-brand-300">Create an account</Link></p>
      <div className="mt-8 rounded-xl border border-white/5 bg-white/[0.03] p-4 text-xs text-slate-400">
        <p className="mb-1 font-semibold text-slate-300">Demo account (from seed data)</p>
        <p>user@cinephile.com · User@123</p>
        <button type="button" onClick={() => setForm({ email: "user@cinephile.com", password: "User@123" })} className="mt-2 font-semibold text-brand-400 hover:text-brand-300">Fill demo credentials</button>
      </div>
    </AuthShell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.phone && !/^[+\d][\d\s-]{6,16}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    if (form.password.length < 6) e.password = "At least 6 characters";
    if (form.confirm !== form.password) e.confirm = "Passwords don't match";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <AuthShell title="Create your account" subtitle="Join Cinephile to book faster and keep a watchlist.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field icon={User} label="Full name" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} placeholder="Your name" />
        <Field icon={Mail} label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="you@example.com" />
        <Field icon={Phone} label="Phone (optional)" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={errors.phone} placeholder="98xxxxxxxx" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field icon={Lock} label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} placeholder="Min 6 characters" />
          <Field icon={Lock} label="Confirm" name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} placeholder="Repeat password" />
        </div>
        {serverError && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{serverError}</p>}
        <button className="btn-primary w-full py-3" disabled={loading}>{loading && <Spinner className="h-4 w-4" />} Create account</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">Already have an account? <Link to="/login" state={location.state} className="font-semibold text-brand-400 hover:text-brand-300">Log in</Link></p>
    </AuthShell>
  );
}
