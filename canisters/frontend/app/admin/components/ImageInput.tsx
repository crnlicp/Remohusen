import { useAdminLanguage } from "../language";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, Check, Link2, Library, Plus, Search, Trash2, Upload } from "lucide-react";
import { backend, storedRef, unwrap, urlRef, type ImageInfo, type ImageRef } from "../../lib/api";
import { ACCEPTED_MIME, uploadImage, useImageSrc, validateImageUrl } from "../../lib/images";
import { SmartImage } from "../../components/SmartImage";
import { useAdmin } from "../auth";
import { collectUsedUrls } from "../imageUsage";
import { useToast } from "./ui";

type Tab = "upload" | "url" | "library";

export const describeRef = (ref: ImageRef) =>
  ref.__kind__ === "url" ? (() => { try { return new URL(ref.url).hostname; } catch { return "URL"; } })() : `Uploaded #${ref.stored}`;

/** Hook for the uploaded image library, shared by all pickers on a page. */
export function useImageLibrary() {
  const { call } = useAdmin();
  const [images, setImages] = useState<ImageInfo[] | null>(null);
  const reload = useCallback(async () => {
    setImages(await call(async (t) => unwrap(await backend.adminListImages(t))));
  }, [call]);
  return { images, reload };
}

function UrlPreview({ url }: { url: string }) {
  const { t: adminText } = useAdminLanguage();
  const { src } = useImageSrc(url ? urlRef(url) : undefined);
  const [state, setState] = useState<"loading" | "ok" | "err">("loading");
  useEffect(() => setState("loading"), [src]);
  if (!src) return null;
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-white/10 bg-ink-950/40">
      <img src={src} alt="" className="max-h-48 w-full object-contain" onLoad={() => setState("ok")} onError={() => setState("err")} />
      <span
        className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
          state === "ok" ? "bg-emerald-500/80 text-white" : state === "err" ? "bg-red-500/80 text-white" : "bg-black/50 text-slate-200"
        }`}
      >
        {state === "ok" ? adminText("Preview OK") : state === "err" ? adminText("Could not load image") : adminText("Loading preview…")}
      </span>
    </div>
  );
}

/** Grid of external image URLs already used somewhere on the site, for quick reuse. */
function UsedUrlList({ selected, exclude = [], onSelect }: { selected: string; exclude?: string[]; onSelect: (url: string) => void }) {
  const { t: adminText } = useAdminLanguage();
  const { content } = useAdmin();
  const [query, setQuery] = useState("");
  const all = useMemo(() => collectUsedUrls(content, adminText), [content, adminText]);
  const q = query.trim().toLowerCase();
  const list = q ? all.filter((u) => u.url.toLowerCase().includes(q) || u.where.some((w) => w.toLowerCase().includes(q))) : all;
  if (all.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{adminText("Already used on the site (")}{all.length})</span>
        {all.length > 6 && (
          <label className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              className="w-40 rounded-md border border-white/10 bg-ink-950/50 py-1 pl-7 pr-2 text-xs text-white placeholder:text-slate-500 focus:border-brand-400/60 focus:outline-none"
              placeholder={adminText("Filter…")}
              aria-label={adminText("Filter used image URLs")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
      </div>
      <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-4">
        {list.map(({ url, where }) => {
          const isSelected = url === selected.trim();
          const isExcluded = exclude.includes(url);
          return (
            <button
              key={url}
              type="button"
              onClick={() => onSelect(url)}
              title={adminText("{0}\n\nUsed in:\n• {1}", { "0": url, "1": where.join("\n• ") })}
              aria-label={adminText("Use image {0}", { "0": url })}
              aria-pressed={isSelected}
              className={`group relative aspect-square overflow-hidden rounded-lg border transition ${
                isSelected ? "border-brand-400 ring-2 ring-brand-400/40" : "border-white/10 hover:border-brand-400"
              }`}
            >
              <SmartImage image={urlRef(url)} className="h-full w-full object-cover" fallbackClassName="h-full w-full" />
              {isSelected && (
                <span className="absolute right-1 top-1 rounded-full bg-brand-500 p-0.5 text-ink-950">
                  <Check className="h-3 w-3" />
                </span>
              )}
              {isExcluded && !isSelected && (
                <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-slate-200">{adminText("Added")}</span>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-[10px] text-slate-200">
                {where.length > 1 ? adminText("{0} places", { "0": where.length }) : where[0]}
              </span>
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-full py-3 text-center text-xs text-slate-500">{adminText("No matches.")}</p>}
      </div>
    </div>
  );
}

/** Picker panel: upload a file, paste a URL, or choose from the uploaded library. */
export function ImagePicker({
  onPick,
  onCancel,
  current,
  exclude,
  urlOnly = false,
}: {
  onPick: (ref: ImageRef) => void;
  onCancel?: () => void;
  /** The image currently set on the field; a URL image pre-fills the URL tab. */
  current?: ImageRef;
  /** URLs already present in the field (e.g. a gallery), marked in the used-URL list. */
  exclude?: string[];
  /** Only allow external URLs (for places crawlers must reach, like the social share image). */
  urlOnly?: boolean;
}) {
  const { t: adminText } = useAdminLanguage();
  const { call } = useAdmin();
  const toast = useToast();
  const currentUrl = current?.__kind__ === "url" ? current.url : "";
  const [tab, setTab] = useState<Tab>(urlOnly || currentUrl ? "url" : "upload");
  const [url, setUrl] = useState(currentUrl);
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const library = useImageLibrary();
  const requested = useRef(false);
  const { reload: reloadLibrary } = library;
  const toastErr = toast.err;

  useEffect(() => {
    if (tab !== "library" || requested.current) return;
    requested.current = true;
    reloadLibrary().catch((e) => {
      requested.current = false;
      toastErr(e);
    });
  }, [tab, reloadLibrary, toastErr]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setProgress(0);
    try {
      const info = await call((t) => uploadImage(t, file, setProgress));
      toast.ok(adminText("Uploaded {0}", { "0": info.name }));
      onPick(storedRef(info.id));
    } catch (e) {
      toast.err(e);
    } finally {
      setProgress(null);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void handleFile(e.dataTransfer.files[0]);
  };

  const urlError = url ? validateImageUrl(url) : null;
  const tabs: { id: Tab; label: string; Icon: typeof Upload }[] = [
    { id: "upload" as Tab, label: adminText("Upload"), Icon: Upload },
    { id: "url" as Tab, label: adminText("From URL"), Icon: Link2 },
    { id: "library" as Tab, label: adminText("Library"), Icon: Library },
  ].filter((t) => !urlOnly || t.id === "url");

  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/40 p-3">
      {tabs.length > 1 && (
      <div className="mb-3 flex gap-1 rounded-lg bg-white/5 p-1" role="tablist">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
              tab === id ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      )}

      {tab === "upload" && (
        <div
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => progress === null && fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition ${
            drag ? "border-brand-400 bg-brand-400/10" : "border-white/15 hover:border-white/30"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_MIME.join(",")}
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {progress === null ? (
            <>
              <Upload className="h-6 w-6 text-brand-300" />
              <span className="text-slate-200">{adminText("Drop an image here or click to choose")}</span>
              <span className="text-xs text-slate-500">{adminText("JPEG, PNG, WebP, GIF, AVIF · large images are resized to 1920px")}</span>
            </>
          ) : (
            <div className="w-full">
              <div className="mb-2 text-slate-300">{adminText("Uploading…")}{" "}{Math.round(progress * 100)}%</div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "url" && (
        <div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="https://example.com/photo.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !validateImageUrl(url)) {
                  e.preventDefault();
                  onPick(urlRef(url.trim()));
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary shrink-0"
              disabled={!url || !!urlError || (!!currentUrl && url.trim() === currentUrl)}
              onClick={() => onPick(urlRef(url.trim()))}
            >{adminText("Use URL")}</button>
          </div>
          {currentUrl && url.trim() === currentUrl && <p className="mt-2 text-xs text-brand-300">{adminText("This is the URL currently used by this field.")}</p>}
          {urlError && <p className="mt-2 text-xs text-red-300">{urlError}</p>}
          {!urlError && url && <UrlPreview url={url.trim()} />}
          <p className="mt-2 text-xs text-slate-500">{adminText("The image is loaded directly from this address in visitors' browsers.")}</p>
          <UsedUrlList selected={url} exclude={exclude} onSelect={(u) => (u === currentUrl ? setUrl(u) : onPick(urlRef(u)))} />
        </div>
      )}

      {tab === "library" && (
        <div className="max-h-64 overflow-y-auto scrollbar-thin">
          {!library.images ? (
            <p className="p-4 text-center text-sm text-slate-400">{adminText("Loading…")}</p>
          ) : library.images.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-400">{adminText("No uploaded images yet.")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {library.images.map((img) => (
                <button
                  key={img.id.toString()}
                  type="button"
                  onClick={() => onPick(storedRef(img.id))}
                  title={img.name}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 hover:border-brand-400"
                >
                  <SmartImage image={storedRef(img.id)} className="h-full w-full object-cover" fallbackClassName="h-full w-full" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100">
                    {img.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {onCancel && (
        <div className="mt-3 text-right">
          <button type="button" className="text-xs font-semibold text-slate-400 hover:text-white" onClick={onCancel}>{adminText("Cancel")}</button>
        </div>
      )}
    </div>
  );
}

/** Single image field supporting upload, external URL and library selection. */
export function ImageInput({
  label,
  value,
  onChange,
  optional = true,
  aspect = "aspect-video",
  urlOnly = false,
}: {
  label: string;
  value: ImageRef | undefined;
  onChange: (ref: ImageRef | undefined) => void;
  optional?: boolean;
  aspect?: string;
  urlOnly?: boolean;
}) {
  const { t: adminText } = useAdminLanguage();
  const [picking, setPicking] = useState(!value);
  useEffect(() => {
    if (!value) setPicking(true);
  }, [value]);

  return (
    <div>
      <span className="label">
        {label}
        {!optional && <span className="text-brand-400"> *</span>}
      </span>
      {value && (
        <div className="group relative mb-2 overflow-hidden rounded-xl border border-white/10">
          <SmartImage image={value} className={`${aspect} w-full object-cover`} fallbackClassName={`${aspect} w-full`} />
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-slate-100 backdrop-blur">
            {value.__kind__ === "url" ? "🔗 " : "📁 "}
            {describeRef(value)}
          </span>
          <div className="absolute right-2 top-2 flex gap-1">
            <button type="button" className="btn btn-ghost px-2.5 py-1 text-xs" onClick={() => setPicking((p) => !p)}>{adminText("Change")}</button>
            {optional && (
              <button type="button" className="btn btn-danger px-2 py-1 text-xs" onClick={() => onChange(undefined)} aria-label={adminText("Remove image")}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
      {picking && (
        <ImagePicker
          onPick={(ref) => {
            onChange(ref);
            setPicking(false);
          }}
          onCancel={value ? () => setPicking(false) : undefined}
          current={value}
          urlOnly={urlOnly}
        />
      )}
    </div>
  );
}

/** Ordered list of images (e.g. a project gallery). */
export function MultiImageInput({ label, value, onChange }: { label: string; value: ImageRef[]; onChange: (v: ImageRef[]) => void }) {
  const { t: adminText } = useAdminLanguage();
  const [adding, setAdding] = useState(value.length === 0);
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div>
      <span className="label">{label} ({value.length})</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {value.map((ref, i) => (
          <div key={i} className="group relative overflow-hidden rounded-xl border border-white/10">
            <SmartImage image={ref} className="aspect-[4/3] w-full object-cover" fallbackClassName="aspect-[4/3] w-full" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-ink-950">{adminText("Cover")}</span>}
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-[10px] text-slate-200">{describeRef(ref)}</span>
            <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md bg-black/60 p-1 text-white disabled:opacity-30" aria-label={adminText("Move earlier")}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="rounded-md bg-black/60 p-1 text-white disabled:opacity-30" aria-label={adminText("Move later")}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded-md bg-red-600/80 p-1 text-white" aria-label={adminText("Remove")}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/15 text-sm text-slate-400 hover:border-brand-400 hover:text-brand-300"
          >
            <Plus className="h-6 w-6" />{adminText("Add image")}</button>
        )}
      </div>
      {adding && (
        <div className="mt-3">
          <ImagePicker
            onPick={(ref) => {
              onChange([...value, ref]);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
            exclude={value.flatMap((r) => (r.__kind__ === "url" ? [r.url] : []))}
          />
        </div>
      )}
    </div>
  );
}
