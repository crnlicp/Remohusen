import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router";
import {
  ExternalLink,
  House,
  Images,
  Info,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  Newspaper,
  PanelsTopLeft,
  Settings,
  Wrench,
  X,
  FileText,
} from "lucide-react";
import { backend } from "../lib/api";
import { Logo, LogoMark } from "../components/Logo";
import { Backdrop, Spinner } from "../components/Layout";
import { AdminProvider, useAdmin } from "./auth";
import { ToastProvider } from "./components/ui";
import { AdminLanguageProvider, AdminLanguageToggle, useAdminLanguage } from "./language";

const nav = [
  { group: "Overview", items: [{ to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true }, { to: "/admin/messages", label: "Inbox", Icon: MessageSquare }] },
  { group: "Business", items: [{ to: "/admin/documents", label: "Documents", Icon: FileText }] },
  {
    group: "Home page",
    items: [
      { to: "/admin/slides", label: "Slideshow", Icon: PanelsTopLeft },
      { to: "/admin/services", label: "Services", Icon: Wrench },
      { to: "/admin/projects", label: "Projects", Icon: House },
      { to: "/admin/testimonials", label: "Testimonials", Icon: MessageSquareQuote },
    ],
  },
  {
    group: "Pages",
    items: [
      { to: "/admin/news", label: "News", Icon: Newspaper },
      { to: "/admin/about", label: "About us", Icon: Info },
      { to: "/admin/contact", label: "Contact us", Icon: Mail },
    ],
  },
  {
    group: "System",
    items: [
      { to: "/admin/images", label: "Image library", Icon: Images },
      { to: "/admin/settings", label: "Site settings", Icon: Settings },
      { to: "/admin/account", label: "Account", Icon: KeyRound },
    ],
  },
];

function LoginScreen() {
  const { t: adminText } = useAdminLanguage();
  const { login } = useAdmin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    backend.isAdminConfigured().then(setConfigured, () => setConfigured(null));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Backdrop />
      <form onSubmit={submit} className="glass w-full max-w-sm rounded-3xl p-8">
        <div className="mb-5 flex justify-end"><AdminLanguageToggle /></div>
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-16 w-16" />
          <h1 className="mt-4 text-2xl font-extrabold text-white">{adminText("Remohusen Admin")}</h1>
          <p className="mt-1 text-sm text-slate-400">{adminText("Sign in to manage the website")}</p>
        </div>
        {configured === false && (
          <div className="mb-5 rounded-xl border border-brand-400/30 bg-brand-400/10 p-3 text-xs text-brand-200">{adminText("No admin account exists yet. A canister controller must create one with")}<code className="mt-1 block rounded bg-black/30 p-1.5 text-[11px]">icp canister call backend bootstrapAdmin '("admin", "password")'</code>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="u">{adminText("Username")}</label>
            <input id="u" className="input" placeholder={adminText("Username")} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="p">{adminText("Password")}</label>
            <input id="p" className="input" type="password" placeholder={adminText("Password")} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="rounded-lg bg-red-500/15 p-2.5 text-sm text-red-200">{adminText(error)}</p>}
          <button className="btn btn-primary w-full py-3" disabled={busy}>
            <Lock className="h-4 w-4" /> {busy ? adminText("Signing in…") : adminText("Sign in")}
          </button>
        </div>
        <Link to="/" className="mt-6 block text-center text-xs text-slate-500 hover:text-slate-300">{adminText("← Back to website")}</Link>
      </form>
    </div>
  );
}

function Shell() {
  const { t: adminText } = useAdminLanguage();
  const { session, checking, logout } = useAdmin();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  if (checking) return <Spinner label={adminText("Checking session…")} />;
  if (!session) return <LoginScreen />;

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo name="Remohusen" tagline="Admin" />
        <div className="mt-4"><AdminLanguageToggle /></div>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {nav.map((g) => (
          <div key={g.group}>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{adminText(g.group)}</div>
            {g.items.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? "bg-gradient-to-r from-brand-400/25 to-brand-600/10 text-white ring-1 ring-brand-400/30" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" /> {adminText(label)}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-white/10 p-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-4 w-4" />{adminText("View website")}</a>
        <button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-200">
          <LogOut className="h-4 w-4" />{" "}{adminText("Sign out (")}{session.username})
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen">
      <Backdrop />
      <aside className="glass-strong fixed inset-y-3 left-3 z-40 hidden w-64 rounded-2xl lg:block">{sidebar}</aside>
      <header className="glass-strong sticky top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden">
        <LogoMark className="h-9 w-9" />
        <AdminLanguageToggle />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10" aria-label={adminText("Open menu")}>
          <Menu className="h-6 w-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="glass-strong absolute inset-y-0 left-0 w-72">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 rounded-lg p-1.5 hover:bg-white/10" aria-label={adminText("Close menu")}>
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="px-4 py-8 sm:px-8 lg:ml-72 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AdminRoot() {
  return (
    <AdminLanguageProvider>
    <ToastProvider>
      <AdminProvider>
        <Shell />
      </AdminProvider>
    </ToastProvider>
    </AdminLanguageProvider>
  );
}

export function AdminNotFound() {
  return <Navigate to="/admin" replace />;
}
