import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { backend, emptyL10n, unwrap, urlRef, type AboutPage, type ContactInfo, type PageMeta, type SeoSettings, type Settings, type TeamMember } from "../../lib/api";
import { useAdmin } from "../auth";
import { ImageInput } from "../components/ImageInput";
import { Card, Field, L10nInput, PageHeader, SaveBar, TextInput, Toggle, useToast } from "../components/ui";
import { IconSelect } from "./Collections";
import { Spinner } from "../../components/Layout";

type Res = { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string };

/** Local draft of a single document with save + dirty tracking. */
function useDraft<T>(source: T | undefined, save: (token: string, value: T) => Promise<Res>, label: string) {
  const { call, reloadContent } = useAdmin();
  const toast = useToast();
  const [draft, setDraft] = useState<T | undefined>(source && structuredClone(source));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (source && !dirty) setDraft(structuredClone(source));
  }, [source, dirty]);

  const update = (v: T) => {
    setDraft(v);
    setDirty(true);
  };

  const onSave = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await call(async (t) => unwrap(await save(t, draft)));
      setDirty(false);
      await reloadContent();
      toast.ok(`${label} saved`);
    } catch (e) {
      toast.err(e);
    } finally {
      setBusy(false);
    }
  };

  return { draft, update, onSave, busy, dirty };
}

/** Editable list of rows with add / remove / reorder controls. */
function ListEditor<T>({
  items,
  onChange,
  create,
  render,
  addLabel,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  create: () => T;
  render: (item: T, set: (v: T) => void) => React.ReactNode;
  addLabel: string;
}) {
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-ink-950/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">#{i + 1}</span>
            <div className="flex gap-1">
              <button type="button" className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-30" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-md p-1.5 text-red-300 hover:bg-red-500/20" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-4">{render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}</div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost w-full border-dashed" onClick={() => onChange([...items, create()])}>
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}

export function AboutEditorPage() {
  const { content } = useAdmin();
  const { draft: a, update, onSave, busy, dirty } = useDraft<AboutPage>(content?.about, (t, v) => backend.adminSaveAbout(t, v), "About page");
  if (!a) return <Spinner />;
  return (
    <>
      <PageHeader title="About us" description="Content of the About us page. Stats are also shown on the home page." />
      <div className="space-y-6">
        <Card title="Hero">
          <div className="space-y-5">
            <L10nInput label="Heading" required value={a.heroTitle} onChange={(heroTitle) => update({ ...a, heroTitle })} />
            <L10nInput label="Intro text" multiline value={a.heroText} onChange={(heroText) => update({ ...a, heroText })} />
            <ImageInput label="Hero background image" value={a.heroImage} onChange={(heroImage) => update({ ...a, heroImage })} />
          </div>
        </Card>
        <Card title="Our story">
          <div className="space-y-5">
            <L10nInput label="Title" value={a.storyTitle} onChange={(storyTitle) => update({ ...a, storyTitle })} />
            <L10nInput label="Text" multiline rows={8} value={a.storyText} onChange={(storyText) => update({ ...a, storyText })} />
            <ImageInput label="Story image" aspect="aspect-[4/3]" value={a.storyImage} onChange={(storyImage) => update({ ...a, storyImage })} />
          </div>
        </Card>
        <Card title="Key figures">
          <ListEditor
            items={a.stats}
            onChange={(stats) => update({ ...a, stats })}
            create={() => ({ value: "", caption: emptyL10n() })}
            addLabel="Add figure"
            render={(s, set) => (
              <>
                <TextInput label="Value" placeholder="e.g. 400+" value={s.value} onChange={(value) => set({ ...s, value })} />
                <L10nInput label="Caption" value={s.caption} onChange={(caption) => set({ ...s, caption })} />
              </>
            )}
          />
        </Card>
        <Card title="Values">
          <ListEditor
            items={a.values}
            onChange={(values) => update({ ...a, values })}
            create={() => ({ icon: "shield", title: emptyL10n(), text: emptyL10n() })}
            addLabel="Add value"
            render={(v, set) => (
              <>
                <IconSelect value={v.icon} onChange={(icon) => set({ ...v, icon })} />
                <L10nInput label="Title" value={v.title} onChange={(title) => set({ ...v, title })} />
                <L10nInput label="Text" multiline rows={2} value={v.text} onChange={(text) => set({ ...v, text })} />
              </>
            )}
          />
        </Card>
        <Card title="Team">
          <ListEditor
            items={a.team}
            onChange={(team) => update({ ...a, team })}
            create={(): TeamMember => ({ name: "", role: emptyL10n() })}
            addLabel="Add team member"
            render={(m, set) => (
              <>
                <TextInput label="Name" value={m.name} onChange={(name) => set({ ...m, name })} />
                <L10nInput label="Role" value={m.role} onChange={(role) => set({ ...m, role })} />
                <ImageInput label="Photo" aspect="aspect-[4/5] max-w-48" value={m.photo} onChange={(photo) => set({ ...m, photo })} />
              </>
            )}
          />
        </Card>
      </div>
      <SaveBar busy={busy} dirty={dirty} onSave={() => void onSave()}>
        {dirty && <span className="mr-auto pl-2 text-sm text-brand-300">Unsaved changes</span>}
      </SaveBar>
    </>
  );
}

export function ContactEditorPage() {
  const { content } = useAdmin();
  const { draft: c, update, onSave, busy, dirty } = useDraft<ContactInfo>(content?.contact, (t, v) => backend.adminSaveContact(t, v), "Contact page");
  if (!c) return <Spinner />;
  return (
    <>
      <PageHeader title="Contact us" description="Contact details are shown on the Contact page, in the footer and in the header." />
      <div className="space-y-6">
        <Card title="Page">
          <div className="space-y-5">
            <L10nInput label="Heading" required value={c.title} onChange={(title) => update({ ...c, title })} />
            <L10nInput label="Intro text" multiline value={c.intro} onChange={(intro) => update({ ...c, intro })} />
            <ImageInput label="Hero background image" value={c.heroImage} onChange={(heroImage) => update({ ...c, heroImage })} />
          </div>
        </Card>
        <Card title="Contact details">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput label="Phone" value={c.phone} onChange={(phone) => update({ ...c, phone })} />
            <TextInput label="Email" type="email" value={c.email} onChange={(email) => update({ ...c, email })} />
            <TextInput label="Street address" value={c.address} onChange={(address) => update({ ...c, address })} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Postal code" value={c.postalCode} onChange={(postalCode) => update({ ...c, postalCode })} />
              <TextInput label="City" value={c.city} onChange={(city) => update({ ...c, city })} />
            </div>
          </div>
          <div className="mt-5">
            <L10nInput label="Opening hours" value={c.openingHours} onChange={(openingHours) => update({ ...c, openingHours })} />
          </div>
        </Card>
        <Card title="Map location">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput label="Latitude" placeholder="59.3293" value={c.mapLat} onChange={(mapLat) => update({ ...c, mapLat })} />
            <TextInput label="Longitude" placeholder="18.0686" value={c.mapLng} onChange={(mapLng) => update({ ...c, mapLng })} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Tip: right-click a place in OpenStreetMap or Google Maps to copy its coordinates. Leave empty to hide the map.</p>
        </Card>
      </div>
      <SaveBar busy={busy} dirty={dirty} onSave={() => void onSave()}>
        {dirty && <span className="mr-auto pl-2 text-sm text-brand-300">Unsaved changes</span>}
      </SaveBar>
    </>
  );
}

const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "GeneralContractor", label: "General contractor (byggföretag)" },
  { value: "HomeAndConstructionBusiness", label: "Home & construction business" },
  { value: "RoofingContractor", label: "Roofing contractor" },
  { value: "Electrician", label: "Electrician" },
  { value: "Plumber", label: "Plumber" },
  { value: "HousePainter", label: "House painter" },
  { value: "HVACBusiness", label: "HVAC business" },
  { value: "LocalBusiness", label: "Local business (generic)" },
];

const SEO_PAGES: { key: "home" | "about" | "news" | "contact"; label: string; path: string }[] = [
  { key: "home", label: "Home page", path: "/" },
  { key: "about", label: "About us", path: "/om-oss" },
  { key: "news", label: "News", path: "/nyheter" },
  { key: "contact", label: "Contact us", path: "/kontakt" },
];

/** Approximation of how a page appears in Google search results. */
function SearchPreview({ title, description, url }: { title: string; description: string; url: string }) {
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
  return (
    <div className="rounded-xl bg-white p-4 font-sans" aria-label="Google search result preview">
      <div className="truncate text-xs text-[#4d5156]">{url}</div>
      <div className="mt-0.5 truncate text-lg leading-snug text-[#1a0dab]">{clip(title || "(no title)", 62)}</div>
      <div className="mt-0.5 line-clamp-2 text-sm text-[#4d5156]">{clip(description || "(no description – Google will pick text from the page)", 160)}</div>
    </div>
  );
}

function SeoPageEditor({
  page,
  meta,
  onChange,
  companyName,
  baseUrl,
}: {
  page: (typeof SEO_PAGES)[number];
  meta: PageMeta;
  onChange: (m: PageMeta) => void;
  companyName: string;
  baseUrl: string;
}) {
  const fullTitle = page.key === "home" ? meta.title.sv : meta.title.sv ? `${meta.title.sv} | ${companyName}` : companyName;
  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{page.label}</h3>
        <code className="text-xs text-slate-500">{page.path}</code>
      </div>
      <L10nInput
        label="Meta title"
        counter={page.key === "home" ? 60 : 60 - companyName.length - 3}
        value={meta.title}
        onChange={(title) => onChange({ ...meta, title })}
        hint={page.key === "home" ? "Shown as-is in the browser tab and search results." : `“ | ${companyName}” is appended automatically.`}
      />
      <L10nInput
        label="Meta description"
        multiline
        rows={2}
        counter={160}
        value={meta.description}
        onChange={(description) => onChange({ ...meta, description })}
      />
      <SearchPreview title={fullTitle} description={meta.description.sv} url={`${baseUrl}${page.path === "/" ? "" : page.path}`} />
    </div>
  );
}

export function SettingsEditorPage() {
  const { content } = useAdmin();
  const general = useDraft<Settings>(content?.settings, (t, v) => backend.adminSaveSettings(t, v), "Settings");
  const seoDraft = useDraft<SeoSettings>(content?.seo, (t, v) => backend.adminSaveSeo(t, v), "SEO settings");
  const s = general.draft;
  const seo = seoDraft.draft;
  if (!s || !seo) return <Spinner />;
  const update = general.update;
  const setSeo = (patch: Partial<SeoSettings>) => seoDraft.update({ ...seo, ...patch });
  const dirty = general.dirty || seoDraft.dirty;
  const busy = general.busy || seoDraft.busy;
  const baseUrl = (seo.siteUrl.trim() || window.location.origin).replace(/\/+$/, "");

  const save = async () => {
    if (general.dirty) await general.onSave();
    if (seoDraft.dirty) await seoDraft.onSave();
  };

  return (
    <>
      <PageHeader title="Site settings" description="Company details, social links and search engine optimisation (SEO)." />
      <div className="space-y-6">
        <Card title="Company">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput label="Company name" value={s.companyName} onChange={(companyName) => update({ ...s, companyName })} />
            <TextInput label="Organisation number" value={s.orgNumber} onChange={(orgNumber) => update({ ...s, orgNumber })} />
          </div>
          <div className="mt-5 space-y-5">
            <L10nInput label="Tagline (under logo)" value={s.tagline} onChange={(tagline) => update({ ...s, tagline })} />
            <L10nInput label="Footer text" multiline value={s.footerText} onChange={(footerText) => update({ ...s, footerText })} />
            <L10nInput label="ROT deduction notice" value={s.rotNotice} onChange={(rotNotice) => update({ ...s, rotNotice })} />
          </div>
        </Card>
        <Card title="Social media">
          <div className="grid gap-5 sm:grid-cols-3">
            <TextInput label="Facebook URL" value={s.socials.facebook} onChange={(facebook) => update({ ...s, socials: { ...s.socials, facebook } })} />
            <TextInput label="Instagram URL" value={s.socials.instagram} onChange={(instagram) => update({ ...s, socials: { ...s.socials, instagram } })} />
            <TextInput label="LinkedIn URL" value={s.socials.linkedin} onChange={(linkedin) => update({ ...s, socials: { ...s.socials, linkedin } })} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Leave empty to hide an icon. These links are also used as “sameAs” profiles in the structured data for Google.</p>
        </Card>

        <Card title="SEO · Search engines">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              label="Website address (canonical URL)"
              placeholder="https://www.remohusen.se"
              value={seo.siteUrl}
              onChange={(siteUrl) => setSeo({ siteUrl })}
              hint="Your primary domain. Used for canonical links, language alternates and structured data. Leave empty to use the current address."
            />
            <div className="flex flex-col justify-center gap-1">
              <Toggle label="Allow search engines to index the site" checked={seo.allowIndexing} onChange={(allowIndexing) => setSeo({ allowIndexing })} />
              <p className="text-xs text-slate-500">
                {seo.allowIndexing ? "The site can appear in Google, Bing and others." : "A “noindex” tag is added to every page – use only while testing."}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <L10nInput
              label="Keywords"
              value={seo.keywords}
              onChange={(keywords) => setSeo({ keywords })}
              hint="Comma-separated. Used in the keywords meta tag and structured data; Google mainly ranks on page text, titles and descriptions."
            />
          </div>
        </Card>

        <Card title="SEO · Page titles & descriptions">
          <p className="mb-4 text-sm text-slate-400">
            Aim for titles under ~60 characters and descriptions of 120–160 characters. News articles automatically use their own title, excerpt and cover image.
          </p>
          <div className="grid gap-5 xl:grid-cols-2">
            {SEO_PAGES.map((p) => (
              <SeoPageEditor key={p.key} page={p} meta={seo[p.key]} onChange={(m) => setSeo({ [p.key]: m })} companyName={s.companyName} baseUrl={baseUrl} />
            ))}
          </div>
        </Card>

        <Card title="SEO · Social sharing">
          <ImageInput
            label="Default share image (Open Graph)"
            urlOnly
            aspect="aspect-[1200/630]"
            value={seo.ogImage ? urlRef(seo.ogImage) : undefined}
            onChange={(ref) => setSeo({ ogImage: ref?.__kind__ === "url" ? ref.url : "" })}
          />
          <p className="mt-2 text-xs text-slate-500">
            Shown when a page is shared on Facebook, LinkedIn, Messenger etc. Use a public https image URL, ideally 1200×630 px. If empty, the built-in Remohusen
            share image is used.
          </p>
        </Card>

        <Card title="SEO · Local business (structured data)">
          <p className="mb-4 text-sm text-slate-400">
            Published as schema.org JSON-LD together with the address, phone, e-mail and map position from the Contact page – helps Google show your business in local
            results.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Business type">
              <select className="input" value={seo.businessType} onChange={(e) => setSeo({ businessType: e.target.value })}>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.value} value={b.value} className="bg-ink-900">
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>
            <TextInput label="Area served" placeholder="Stockholm, Uppsala" value={seo.areaServed} onChange={(areaServed) => setSeo({ areaServed })} hint="Comma-separated places." />
            <TextInput label="Price range" placeholder="$$" maxLength={20} value={seo.priceRange} onChange={(priceRange) => setSeo({ priceRange })} hint="E.g. $, $$ or $$$." />
          </div>
        </Card>

        <Card title="SEO · Site verification">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              label="Google Search Console code"
              placeholder="e.g. AbC123xyz…"
              value={seo.googleVerification}
              onChange={(googleVerification) => setSeo({ googleVerification: extractVerification(googleVerification) })}
              hint="Paste the content value (or the whole <meta> tag) from the “HTML tag” method."
            />
            <TextInput
              label="Bing Webmaster Tools code"
              placeholder="e.g. 1A2B3C…"
              value={seo.bingVerification}
              onChange={(bingVerification) => setSeo({ bingVerification: extractVerification(bingVerification) })}
              hint="Paste the content value (or the whole <meta> tag) of msvalidate.01."
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Submit <code className="text-slate-300">{baseUrl}/sitemap.xml</code> in Search Console. If the meta-tag method fails, use DNS verification for your domain instead.
          </p>
        </Card>
      </div>
      <SaveBar busy={busy} dirty={dirty} onSave={() => void save()}>
        {dirty && <span className="mr-auto pl-2 text-sm text-brand-300">Unsaved changes</span>}
      </SaveBar>
    </>
  );
}

/** Accepts either a bare verification code or a pasted `<meta … content="…">` tag. */
function extractVerification(input: string): string {
  const m = input.match(/content\s*=\s*["']([^"']*)["']/i);
  return (m ? m[1] : input).trim();
}
