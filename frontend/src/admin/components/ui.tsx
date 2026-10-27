import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";
import type { L10n } from "../../lib/api";

/* ---------- Toasts ---------- */

type Toast = { id: number; kind: "ok" | "err"; text: string };
const ToastContext = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 7000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className={`glass-strong flex items-start gap-3 rounded-xl p-4 text-sm ${
                t.kind === "ok" ? "border-emerald-400/30" : "border-red-400/40"
              }`}
            >
              {t.kind === "ok" ? (
                <CircleCheck className="h-5 w-5 shrink-0 text-emerald-300" />
              ) : (
                <TriangleAlert className="h-5 w-5 shrink-0 text-red-300" />
              )}
              <span className="flex-1 text-slate-100">{t.text}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  return useMemo(
    () => ({
      ok: (text: string) => push("ok", text),
      err: (e: unknown) => push("err", e instanceof Error ? e.message : String(e)),
    }),
    [push],
  );
}

/* ---------- Layout primitives ---------- */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-2xl p-6 ${className}`}>
      {title && <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-brand-300">{title}</h2>}
      {children}
    </section>
  );
}

/* ---------- Form fields ---------- */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  hint,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** Side-by-side Swedish / English inputs for a localized value. */
export function L10nInput({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  required = false,
  counter,
  hint,
}: {
  label: string;
  value: L10n;
  onChange: (v: L10n) => void;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  /** Recommended max length; shows a live character counter. */
  counter?: number;
  hint?: string;
}) {
  const langs = [
    { key: "sv" as const, flag: "🇸🇪", name: "Svenska" },
    { key: "en" as const, flag: "🇬🇧", name: "English" },
  ];
  return (
    <div>
      <span className="label">
        {label}
        {required && <span className="text-brand-400"> *</span>}
      </span>
      <div className="grid gap-3 md:grid-cols-2">
        {langs.map((l) => (
          <div key={l.key} className="relative">
            <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-500" title={l.name}>
              {l.flag} {l.key.toUpperCase()}
            </span>
            {multiline ? (
              <textarea
                className="input pr-16"
                rows={rows}
                value={value[l.key]}
                onChange={(e) => onChange({ ...value, [l.key]: e.target.value })}
                aria-label={`${label} (${l.name})`}
              />
            ) : (
              <input
                className="input pr-16"
                value={value[l.key]}
                onChange={(e) => onChange({ ...value, [l.key]: e.target.value })}
                aria-label={`${label} (${l.name})`}
              />
            )}
            {counter !== undefined && (
              <span className={`mt-1 block text-right text-[11px] ${value[l.key].length > counter ? "text-amber-300" : "text-slate-500"}`}>
                {value[l.key].length}/{counter}
              </span>
            )}
          </div>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-gradient-to-r from-brand-400 to-brand-600" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <span className="text-sm font-medium text-slate-200">{label}</span>
    </label>
  );
}

export function SaveBar({ busy, onSave, dirty = true, children }: { busy: boolean; onSave: () => void; dirty?: boolean; children?: ReactNode }) {
  return (
    <div className="glass-strong sticky bottom-4 z-20 mt-6 flex items-center justify-end gap-3 rounded-2xl p-3">
      {children}
      <button className="btn btn-primary" onClick={onSave} disabled={busy || !dirty}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

export function Badge({ tone = "slate", children }: { tone?: "slate" | "green" | "amber" | "red"; children: ReactNode }) {
  const tones = {
    slate: "bg-white/10 text-slate-300",
    green: "bg-emerald-400/15 text-emerald-300",
    amber: "bg-brand-400/15 text-brand-300",
    red: "bg-red-400/15 text-red-300",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
