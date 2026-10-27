import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { unwrap, type ImageRef } from "../../lib/api";
import { SmartImage } from "../../components/SmartImage";
import { useAdmin } from "../auth";
import { Badge, PageHeader, useToast } from "./ui";

type Res<T> = { __kind__: "ok"; ok: T } | { __kind__: "err"; err: string };

export interface Summary {
  title: string;
  subtitle?: string;
  image?: ImageRef;
  icon?: ReactNode;
  badges?: { text: string; tone?: "slate" | "green" | "amber" | "red" }[];
}

interface Props<T extends { id: bigint }> {
  title: string;
  description?: string;
  itemName: string;
  items: T[];
  create: () => T;
  summary: (item: T) => Summary;
  editor: (value: T, onChange: (v: T) => void) => ReactNode;
  save: (token: string, item: T) => Promise<Res<bigint>>;
  remove: (token: string, id: bigint) => Promise<Res<null>>;
}

export function CollectionManager<T extends { id: bigint }>({ title, description, itemName, items, create, summary, editor, save, remove }: Props<T>) {
  const { call, reloadContent } = useAdmin();
  const toast = useToast();
  const [editing, setEditing] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    if (!editing) return;
    setBusy(true);
    try {
      await call(async (t) => unwrap(await save(t, editing)));
      await reloadContent();
      toast.ok(`${itemName} saved`);
      setEditing(null);
    } catch (e) {
      toast.err(e);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(item: T) {
    if (!window.confirm(`Delete this ${itemName.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await call(async (t) => unwrap(await remove(t, item.id)));
      await reloadContent();
      toast.ok(`${itemName} deleted`);
    } catch (e) {
      toast.err(e);
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <button className="btn btn-primary" onClick={() => setEditing(create())}>
            <Plus className="h-4 w-4" /> New {itemName.toLowerCase()}
          </button>
        }
      />
      {items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-slate-400">No items yet. Create the first one.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const s = summary(item);
            return (
              <li key={item.id.toString()} className="glass flex items-center gap-4 rounded-2xl p-3 pr-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {s.image ? (
                    <SmartImage image={s.image} className="h-full w-full object-cover" fallbackClassName="h-full w-full" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-300">{s.icon}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-white">{s.title || "(untitled)"}</span>
                    {s.badges?.map((b) => (
                      <Badge key={b.text} tone={b.tone}>
                        {b.text}
                      </Badge>
                    ))}
                  </div>
                  {s.subtitle && <p className="mt-0.5 truncate text-sm text-slate-400">{s.subtitle}</p>}
                </div>
                <button className="btn btn-ghost px-3" onClick={() => setEditing(structuredClone(item))} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="btn btn-danger px-3" onClick={() => void onDelete(item)} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {createPortal(
        <AnimatePresence>
          {editing && (
            <motion.div className="fixed inset-0 z-[90] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => !busy && setEditing(null)} />
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }}
                className="glass-strong relative flex h-full w-full max-w-3xl flex-col"
                role="dialog"
                aria-modal="true"
                aria-label={`Edit ${itemName}`}
              >
                <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <h2 className="text-lg font-bold text-white">
                    {editing.id === 0n ? `New ${itemName.toLowerCase()}` : `Edit ${itemName.toLowerCase()}`}
                  </h2>
                  <button onClick={() => setEditing(null)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close">
                    <X className="h-5 w-5" />
                  </button>
                </header>
                <div className="flex-1 space-y-5 overflow-y-auto p-6 scrollbar-thin">{editor(editing, setEditing)}</div>
                <footer className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
                  <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={busy}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={() => void onSave()} disabled={busy}>
                    {busy ? "Saving…" : "Save"}
                  </button>
                </footer>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/** Small helper for numeric order fields. */
export function OrderInput({ value, onChange }: { value: bigint; onChange: (v: bigint) => void }) {
  return (
    <div>
      <span className="label">Sort order</span>
      <input
        type="number"
        min={0}
        className="input"
        value={Number(value)}
        onChange={(e) => onChange(BigInt(Math.max(0, Math.floor(Number(e.target.value) || 0))))}
      />
      <p className="mt-1 text-xs text-slate-500">Lower numbers are shown first.</p>
    </div>
  );
}
