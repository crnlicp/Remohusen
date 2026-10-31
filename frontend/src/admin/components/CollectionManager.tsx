import { useAdminLanguage } from "../language";
import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { unwrap } from "../../lib/api";
import { useAdmin } from "../auth";
import { PageHeader, useToast } from "./ui";
import { CollectionDrawer, CollectionRow, type CollectionSummary } from "./CollectionLayout";

type Res<T> = { __kind__: "ok"; ok: T } | { __kind__: "err"; err: string };

export type Summary = CollectionSummary;

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
  const { t: adminText } = useAdminLanguage();
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
      toast.ok(adminText("{0} saved", { "0": itemName }));
      setEditing(null);
    } catch (e) {
      toast.err(e);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(item: T) {
    if (!window.confirm(adminText("Delete this {0}? This cannot be undone.", { "0": itemName.toLowerCase() }))) return;
    try {
      await call(async (t) => unwrap(await remove(t, item.id)));
      await reloadContent();
      toast.ok(adminText("{0} deleted", { "0": itemName }));
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
            <Plus className="h-4 w-4" />{" "}{adminText("New")}{" "}{itemName.toLowerCase()}
          </button>
        }
      />
      {items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-slate-400">{adminText("No items yet. Create the first one.")}</div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => <CollectionRow key={item.id.toString()} summary={summary(item)} actions={<>
                <button className="btn btn-ghost px-3" onClick={() => setEditing(structuredClone(item))} aria-label={adminText("Edit")} title={adminText("Edit")}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="btn btn-danger px-3" onClick={() => void onDelete(item)} aria-label={adminText("Delete")} title={adminText("Delete")}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </>} />)}
        </ul>
      )}

      <CollectionDrawer open={!!editing} title={editing?.id === 0n ? adminText("New {0}", { "0": itemName.toLowerCase() }) : adminText("Edit {0}", { "0": itemName.toLowerCase() })}
        busy={busy} onClose={() => setEditing(null)} footer={<>
                  <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={busy}>{adminText("Cancel")}</button>
                  <button className="btn btn-primary" onClick={() => void onSave()} disabled={busy}>
                    {busy ? adminText("Saving…") : adminText("Save")}
                  </button>
                </>}>
        {editing && editor(editing, setEditing)}
      </CollectionDrawer>
    </>
  );
}

/** Small helper for numeric order fields. */
export function OrderInput({ value, onChange }: { value: bigint; onChange: (v: bigint) => void }) {
  const { t: adminText } = useAdminLanguage();
  return (
    <div>
      <span className="label">{adminText("Sort order")}</span>
      <input
        type="number"
        min={0}
        className="input"
        value={Number(value)}
        onChange={(e) => onChange(BigInt(Math.max(0, Math.floor(Number(e.target.value) || 0))))}
      />
      <p className="mt-1 text-xs text-slate-500">{adminText("Lower numbers are shown first.")}</p>
    </div>
  );
}
