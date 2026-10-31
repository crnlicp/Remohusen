import { useAdminLanguage } from "../language";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Images, Mail, MailOpen, MessageSquare, Newspaper, PanelsTopLeft, Phone, Trash2, Wrench, House, MessageSquareQuote } from "lucide-react";
import { backend, nsToDate, storedRef, unwrap, urlRef, type DashboardStats, type Message } from "../../lib/api";
import { forgetStoredImage } from "../../lib/images";
import { useAdmin } from "../auth";
import { collectImageRefs, collectUsedUrls } from "../imageUsage";
import { ImagePicker, useImageLibrary } from "../components/ImageInput";
import { Badge, Card, PageHeader, TextInput, useToast } from "../components/ui";
import { SmartImage } from "../../components/SmartImage";
import { Spinner } from "../../components/Layout";

/* ---------- Dashboard ---------- */

export function DashboardPage() {
  const { t: adminText } = useAdminLanguage();
  const { call, session } = useAdmin();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    call(async (t) => unwrap(await backend.adminDashboard(t))).then(setStats, toast.err);
  }, [call, toast]);

  const tiles = stats
    ? [
        { to: "/admin/messages", label: adminText("Unread messages"), value: stats.unreadMessages, sub: adminText("{0} total", { "0": stats.messages }), Icon: MessageSquare, hot: stats.unreadMessages > 0n },
        { to: "/admin/news", label: adminText("News posts"), value: stats.news, sub: adminText("{0} published", { "0": stats.publishedNews }), Icon: Newspaper },
        { to: "/admin/slides", label: adminText("Slides"), value: stats.slides, Icon: PanelsTopLeft },
        { to: "/admin/projects", label: adminText("Projects"), value: stats.projects, Icon: House },
        { to: "/admin/services", label: adminText("Services"), value: stats.services, Icon: Wrench },
        { to: "/admin/testimonials", label: adminText("Testimonials"), value: stats.testimonials, Icon: MessageSquareQuote },
        { to: "/admin/images", label: adminText("Uploaded images"), value: stats.images, Icon: Images },
      ]
    : [];

  return (
    <>
      <PageHeader title={adminText("Welcome back, {0}", { "0": session?.username ?? "" })} description={adminText("Overview of your website content.")} />
      {!stats ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map(({ to, label, value, sub, Icon, hot }) => (
            <Link key={to} to={to} className={`glass group rounded-2xl p-5 transition hover:-translate-y-0.5 ${hot ? "border-brand-400/50" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{label}</span>
                <Icon className={`h-5 w-5 ${hot ? "text-brand-300" : "text-slate-500"} group-hover:text-brand-300`} />
              </div>
              <div className={`mt-3 text-4xl font-extrabold ${hot ? "text-gradient" : "text-white"}`}>{value.toString()}</div>
              {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
            </Link>
          ))}
        </div>
      )}
      <Card className="mt-6" title={adminText("Quick actions")}>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/news" className="btn btn-primary">{adminText("Write news")}</Link>
          <Link to="/admin/slides" className="btn btn-ghost">{adminText("Edit slideshow")}</Link>
          <Link to="/admin/about" className="btn btn-ghost">{adminText("Edit About us")}</Link>
          <Link to="/admin/contact" className="btn btn-ghost">{adminText("Edit contact details")}</Link>
          <a href="/" target="_blank" rel="noreferrer" className="btn btn-ghost">{adminText("View site ↗")}</a>
        </div>
      </Card>
    </>
  );
}

/* ---------- Inbox ---------- */

export function MessagesPage() {
  const { language, t: adminText } = useAdminLanguage();
  const fmtDateTime = new Intl.DateTimeFormat(language === "sv" ? "sv-SE" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const { call } = useAdmin();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [selected, setSelected] = useState<bigint | null>(null);

  const load = async () => setMessages(await call(async (t) => unwrap(await backend.adminListMessages(t))));
  useEffect(() => {
    load().catch(toast.err);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => [...(messages ?? [])].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), [messages]);
  const current = sorted.find((m) => m.id === selected);

  async function setRead(m: Message, read: boolean) {
    try {
      await call(async (t) => unwrap(await backend.adminSetMessageRead(t, m.id, read)));
      setMessages((ms) => ms?.map((x) => (x.id === m.id ? { ...x, read } : x)) ?? null);
    } catch (e) {
      toast.err(e);
    }
  }

  async function open(m: Message) {
    setSelected(m.id);
    if (!m.read) await setRead(m, true);
  }

  async function remove(m: Message) {
    if (!window.confirm(adminText("Delete this message?"))) return;
    try {
      await call(async (t) => unwrap(await backend.adminDeleteMessage(t, m.id)));
      setMessages((ms) => ms?.filter((x) => x.id !== m.id) ?? null);
      setSelected(null);
      toast.ok(adminText("Message deleted"));
    } catch (e) {
      toast.err(e);
    }
  }

  if (!messages) return <Spinner />;
  const unread = messages.filter((m) => !m.read).length;

  return (
    <>
      <PageHeader title={adminText("Inbox")} description={adminText("Messages from the contact form · {0} unread", { "0": unread })} />
      {messages.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-slate-400">{adminText("No messages yet.")}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <ul className="glass max-h-[70vh] divide-y divide-white/5 overflow-y-auto rounded-2xl lg:col-span-2 scrollbar-thin">
            {sorted.map((m) => (
              <li key={m.id.toString()}>
                <button
                  onClick={() => void open(m)}
                  className={`w-full p-4 text-left transition hover:bg-white/5 ${selected === m.id ? "bg-white/10" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate ${m.read ? "text-slate-300" : "font-bold text-white"}`}>
                      {!m.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-400" />}
                      {m.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{fmtDateTime.format(nsToDate(m.createdAt))}</span>
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-400">{m.subject || m.body}</div>
                </button>
              </li>
            ))}
          </ul>
          <div className="lg:col-span-3">
            {current ? (
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">{current.subject || adminText("(no subject)")}</h2>
                    <p className="mt-1 text-sm text-slate-400">{fmtDateTime.format(nsToDate(current.createdAt))}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost px-3" onClick={() => void setRead(current, !current.read)} title={current.read ? adminText("Mark as unread") : adminText("Mark as read")}>
                      {current.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                    </button>
                    <button className="btn btn-danger px-3" onClick={() => void remove(current)} aria-label={adminText("Delete")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <Badge>{current.name}</Badge>
                  <a href={`mailto:${current.email}?subject=${encodeURIComponent("Re: " + current.subject)}`} className="inline-flex items-center gap-1.5 text-brand-300 hover:underline">
                    <Mail className="h-4 w-4" /> {current.email}
                  </a>
                  {current.phone && (
                    <a href={`tel:${current.phone}`} className="inline-flex items-center gap-1.5 text-brand-300 hover:underline">
                      <Phone className="h-4 w-4" /> {current.phone}
                    </a>
                  )}
                </div>
                <p className="mt-6 whitespace-pre-wrap leading-relaxed text-slate-200">{current.body}</p>
              </Card>
            ) : (
              <div className="glass flex h-full min-h-40 items-center justify-center rounded-2xl text-slate-500">{adminText("Select a message")}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Image library ---------- */

export function ImagesPage() {
  const { t: adminText } = useAdminLanguage();
  const { call, content } = useAdmin();
  const toast = useToast();
  const { images, reload } = useImageLibrary();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    reload().catch(toast.err);
  }, [reload, toast]);

  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!content) return map;
    for (const { ref, where } of collectImageRefs(content, adminText)) {
      if (ref.__kind__ !== "stored") continue;
      const k = ref.stored.toString();
      map.set(k, [...(map.get(k) ?? []), where]);
    }
    return map;
  }, [content, adminText]);
  const usedUrls = useMemo(() => collectUsedUrls(content, adminText), [content, adminText]);

  async function remove(id: bigint) {
    const used = usage.get(id.toString());
    const msg = used?.length
      ? adminText("This image is used in:\n• {0}\n\nDelete anyway? Those places will show a placeholder.", { "0": used.join("\n• ") })
      : adminText("Delete this image?");
    if (!window.confirm(msg)) return;
    try {
      await call(async (t) => unwrap(await backend.adminDeleteImage(t, id)));
      forgetStoredImage(id);
      await reload();
      toast.ok(adminText("Image deleted"));
    } catch (e) {
      toast.err(e);
    }
  }

  const totalBytes = images?.reduce((s, i) => s + Number(i.size), 0) ?? 0;

  return (
    <>
      <PageHeader
        title={adminText("Image library")}
        description={adminText("Images uploaded to the canister · {0} files · {1} MB. External URL images are referenced directly and not stored here.", { "0": images?.length ?? 0, "1": (totalBytes / 1024 / 1024).toFixed(1) })}
        actions={
          <button className="btn btn-primary" onClick={() => setUploading((u) => !u)}>
            {uploading ? adminText("Close") : adminText("Upload image")}
          </button>
        }
      />
      {uploading && (
        <div className="mb-6">
          <ImagePicker
            onPick={() => {
              setUploading(false);
              void reload();
            }}
            onCancel={() => setUploading(false)}
          />
        </div>
      )}
      {!images ? (
        <Spinner />
      ) : images.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-slate-400">{adminText("No uploaded images yet.")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...images].reverse().map((img) => {
            const used = usage.get(img.id.toString()) ?? [];
            return (
              <div key={img.id.toString()} className="glass overflow-hidden rounded-2xl">
                <SmartImage image={storedRef(img.id)} alt={img.name} className="aspect-[4/3] w-full object-cover" fallbackClassName="aspect-[4/3] w-full" />
                <div className="p-4">
                  <div className="truncate text-sm font-semibold text-white" title={img.name}>{img.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    #{img.id.toString()} · {img.mime.replace("image/", "")} · {(Number(img.size) / 1024).toFixed(0)} KB
                  </div>
                  <div className="mt-2" title={used.join("\n")}>
                    {used.length > 0 ? <Badge tone="green">{adminText("Used in {count} places", { count: used.length })}</Badge> : <Badge>{adminText("Unused")}</Badge>}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button className="btn btn-danger px-3 py-1.5 text-xs" onClick={() => void remove(img.id)}>
                      <Trash2 className="h-3.5 w-3.5" />{adminText("Delete")}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-1 mt-10 text-lg font-bold text-white">{adminText("Image URLs used on the site (")}{usedUrls.length})</h2>
      <p className="mb-4 text-sm text-slate-400">{adminText("External images loaded directly by visitors' browsers. Pick them again from the “From URL” tab in any image field.")}</p>
      {usedUrls.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-slate-400">{adminText("No external image URLs are in use.")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {usedUrls.map(({ url, where }) => (
            <div key={url} className="glass overflow-hidden rounded-2xl">
              <SmartImage image={urlRef(url)} alt="" className="aspect-[4/3] w-full object-cover" fallbackClassName="aspect-[4/3] w-full" />
              <div className="p-4">
                <a href={url} target="_blank" rel="noreferrer noopener" className="block truncate text-xs text-brand-300 hover:underline" title={url}>
                  {url}
                </a>
                <div className="mt-2" title={where.join("\n")}>
                  <Badge tone="green">{adminText("Used in {count} places", { count: where.length })}</Badge>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
                  {where.slice(0, 3).map((w) => (
                    <li key={w} className="truncate">{w}</li>
                  ))}
                  {where.length > 3 && <li>+{where.length - 3}{" "}{adminText("more")}</li>}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- Account ---------- */

export function AccountPage() {
  const { language, t: adminText } = useAdminLanguage();
  const fmtDateTime = new Intl.DateTimeFormat(language === "sv" ? "sv-SE" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const { call, session, logout } = useAdmin();
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) return toast.err(new Error(adminText("The new passwords do not match")));
    setBusy(true);
    try {
      await call(async (t) => unwrap(await backend.changePassword(t, form.current, form.next)));
      toast.ok(adminText("Password changed. Please log in again."));
      await logout();
    } catch (err) {
      toast.err(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={adminText("Account")} description={adminText("Signed in as {0} · session expires {1}", { "0": session?.username, "1": session ? fmtDateTime.format(session.expiresAt) : "" })} />
      <Card title={adminText("Change password")} className="max-w-xl">
        <form className="space-y-4" onSubmit={submit}>
          <TextInput label={adminText("Current password")} type="password" value={form.current} onChange={(current) => setForm({ ...form, current })} />
          <TextInput label={adminText("New password")} type="password" hint={adminText("At least 8 characters")} value={form.next} onChange={(next) => setForm({ ...form, next })} />
          <TextInput label={adminText("Confirm new password")} type="password" value={form.confirm} onChange={(confirm) => setForm({ ...form, confirm })} />
          <button className="btn btn-primary" disabled={busy || !form.current || !form.next}>
            {busy ? adminText("Saving…") : adminText("Change password")}
          </button>
        </form>
      </Card>
    </>
  );
}
