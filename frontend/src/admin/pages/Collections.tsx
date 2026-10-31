import { useAdminLanguage } from "../language";
import { House, MessageSquareQuote } from "lucide-react";
import { backend, emptyL10n, nsToDate, urlRef, type ImageRef, type NewsPost, type Project, type Service, type Slide, type Testimonial } from "../../lib/api";
import { ICONS, ServiceIcon } from "../../components/Icons";
import { useAdmin } from "../auth";
import { CollectionManager, OrderInput } from "../components/CollectionManager";
import { ImageInput, MultiImageInput } from "../components/ImageInput";
import { L10nInput, TextInput, Toggle } from "../components/ui";
import { Spinner } from "../../components/Layout";

const byOrder = <T extends { order: bigint }>(a: T, b: T) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0);
const nextOrder = (items: { order: bigint }[]) => items.reduce((m, i) => (i.order > m ? i.order : m), 0n) + 1n;

/** Treats an empty URL placeholder (used for new required images) as "no image". */
const requiredImage = (ref: ImageRef) => (ref.__kind__ === "url" && !ref.url ? undefined : ref);

export function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t: adminText } = useAdminLanguage();
  return (
    <div>
      <span className="label">{adminText("Icon")}</span>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        {Object.entries(ICONS).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            title={adminText(label)}
            aria-label={adminText(label)}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`flex aspect-square items-center justify-center rounded-xl border transition ${
              value === key ? "border-brand-400 bg-brand-400/20 text-brand-200" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <ServiceIcon name={key} className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function SlidesPage() {
  const { t: adminText } = useAdminLanguage();
  const { content } = useAdmin();
  if (!content) return <Spinner />;
  const items = [...content.slides].sort(byOrder);
  return (
    <CollectionManager<Slide>
      title={adminText("Hero slideshow")}
      description={adminText("Full-screen slides at the top of the home page. They rotate automatically every 7 seconds.")}
      itemName={adminText("Slide")}
      items={items}
      create={() => ({
        id: 0n,
        title: emptyL10n(),
        subtitle: emptyL10n(),
        ctaText: { sv: "Begär offert", en: "Get a quote" },
        ctaLink: "/kontakt",
        image: urlRef(""),
        order: nextOrder(items),
        active: true,
      })}
      summary={(s) => ({
        title: s.title.sv,
        subtitle: s.subtitle.sv,
        image: requiredImage(s.image),
        badges: [{ text: s.active ? adminText("Active") : adminText("Hidden"), tone: s.active ? "green" : "slate" }, { text: `#${s.order}` }],
      })}
      editor={(s, set) => (
        <>
          <ImageInput label={adminText("Background image")} optional={false} value={requiredImage(s.image)} onChange={(image) => set({ ...s, image: image ?? urlRef("") })} />
          <L10nInput label={adminText("Title")} required value={s.title} onChange={(title) => set({ ...s, title })} />
          <L10nInput label={adminText("Subtitle")} multiline rows={2} value={s.subtitle} onChange={(subtitle) => set({ ...s, subtitle })} />
          <L10nInput label={adminText("Button text")} value={s.ctaText} onChange={(ctaText) => set({ ...s, ctaText })} />
          <TextInput label={adminText("Button link")} hint={adminText("Internal path like /kontakt or /#tjanster, or a full https:// URL")} value={s.ctaLink} onChange={(ctaLink) => set({ ...s, ctaLink })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <OrderInput value={s.order} onChange={(order) => set({ ...s, order })} />
            <div className="pt-6"><Toggle label={adminText("Visible on site")} checked={s.active} onChange={(active) => set({ ...s, active })} /></div>
          </div>
        </>
      )}
      save={(t, s) => backend.adminSaveSlide(t, s)}
      remove={(t, id) => backend.adminDeleteSlide(t, id)}
    />
  );
}

export function ServicesPage() {
  const { t: adminText } = useAdminLanguage();
  const { content } = useAdmin();
  if (!content) return <Spinner />;
  const items = [...content.services].sort(byOrder);
  return (
    <CollectionManager<Service>
      title={adminText("Services")}
      description={adminText("The service cards shown on the home page.")}
      itemName={adminText("Service")}
      items={items}
      create={() => ({ id: 0n, icon: "house", title: emptyL10n(), description: emptyL10n(), order: nextOrder(items), active: true })}
      summary={(s) => ({
        title: s.title.sv,
        subtitle: s.description.sv,
        image: s.image,
        icon: <ServiceIcon name={s.icon} className="h-7 w-7" />,
        badges: [{ text: s.active ? adminText("Active") : adminText("Hidden"), tone: s.active ? "green" : "slate" }, { text: `#${s.order}` }],
      })}
      editor={(s, set) => (
        <>
          <IconSelect value={s.icon} onChange={(icon) => set({ ...s, icon })} />
          <L10nInput label={adminText("Title")} required value={s.title} onChange={(title) => set({ ...s, title })} />
          <L10nInput label={adminText("Description")} multiline value={s.description} onChange={(description) => set({ ...s, description })} />
          <ImageInput label={adminText("Background image (optional)")} value={s.image} onChange={(image) => set({ ...s, image })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <OrderInput value={s.order} onChange={(order) => set({ ...s, order })} />
            <div className="pt-6"><Toggle label={adminText("Visible on site")} checked={s.active} onChange={(active) => set({ ...s, active })} /></div>
          </div>
        </>
      )}
      save={(t, s) => backend.adminSaveService(t, s)}
      remove={(t, id) => backend.adminDeleteService(t, id)}
    />
  );
}

export function ProjectsPage() {
  const { t: adminText } = useAdminLanguage();
  const { content } = useAdmin();
  if (!content) return <Spinner />;
  const items = [...content.projects].sort(byOrder);
  return (
    <CollectionManager<Project>
      title={adminText("Projects")}
      description={adminText("Reference projects shown in the gallery. The first image is used as cover; visitors can browse all images in a lightbox.")}
      itemName={adminText("Project")}
      items={items}
      create={() => ({
        id: 0n,
        title: emptyL10n(),
        description: emptyL10n(),
        category: { sv: "Renovering", en: "Renovation" },
        location: "",
        year: new Date().getFullYear().toString(),
        images: [],
        featured: false,
        order: nextOrder(items),
      })}
      summary={(p) => ({
        title: p.title.sv,
        subtitle: [p.category.sv, p.location, p.year].filter(Boolean).join(" · "),
        image: p.images[0],
        icon: <House className="h-7 w-7" />,
        badges: [
          ...(p.featured ? [{ text: adminText("Featured"), tone: "amber" as const }] : []),
          { text: adminText("{0} images", { "0": p.images.length }) },
          { text: `#${p.order}` },
        ],
      })}
      editor={(p, set) => (
        <>
          <L10nInput label={adminText("Title")} required value={p.title} onChange={(title) => set({ ...p, title })} />
          <L10nInput label={adminText("Category")} value={p.category} onChange={(category) => set({ ...p, category })} />
          <L10nInput label={adminText("Description")} multiline value={p.description} onChange={(description) => set({ ...p, description })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label={adminText("Location")} value={p.location} onChange={(location) => set({ ...p, location })} />
            <TextInput label={adminText("Year")} value={p.year} onChange={(year) => set({ ...p, year })} />
          </div>
          <MultiImageInput label={adminText("Images")} value={p.images} onChange={(images) => set({ ...p, images })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <OrderInput value={p.order} onChange={(order) => set({ ...p, order })} />
            <div className="pt-6"><Toggle label={adminText("Featured (large tile)")} checked={p.featured} onChange={(featured) => set({ ...p, featured })} /></div>
          </div>
        </>
      )}
      save={(t, p) => backend.adminSaveProject(t, p)}
      remove={(t, id) => backend.adminDeleteProject(t, id)}
    />
  );
}

export function TestimonialsPage() {
  const { t: adminText } = useAdminLanguage();
  const { content } = useAdmin();
  if (!content) return <Spinner />;
  const items = [...content.testimonials].sort(byOrder);
  return (
    <CollectionManager<Testimonial>
      title={adminText("Testimonials")}
      description={adminText("Customer quotes shown on the home page.")}
      itemName={adminText("Testimonial")}
      items={items}
      create={() => ({ id: 0n, name: "", role: emptyL10n(), quote: emptyL10n(), rating: 5n, order: nextOrder(items), active: true })}
      summary={(t) => ({
        title: t.name,
        subtitle: t.quote.sv,
        image: t.avatar,
        icon: <MessageSquareQuote className="h-7 w-7" />,
        badges: [{ text: t.active ? adminText("Active") : adminText("Hidden"), tone: t.active ? "green" : "slate" }, { text: "★".repeat(Number(t.rating)) }],
      })}
      editor={(t, set) => (
        <>
          <TextInput label={adminText("Name")} value={t.name} onChange={(name) => set({ ...t, name })} />
          <L10nInput label={adminText("Role / location")} value={t.role} onChange={(role) => set({ ...t, role })} />
          <L10nInput label={adminText("Quote")} required multiline rows={4} value={t.quote} onChange={(quote) => set({ ...t, quote })} />
          <div>
            <span className="label">{adminText("Rating")}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set({ ...t, rating: BigInt(n) })}
                  className={`text-2xl ${n <= Number(t.rating) ? "text-brand-400" : "text-slate-600"}`}
                  aria-label={adminText("{0} stars", { "0": n })}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <ImageInput label={adminText("Photo (optional)")} aspect="aspect-square max-w-40" value={t.avatar} onChange={(avatar) => set({ ...t, avatar })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <OrderInput value={t.order} onChange={(order) => set({ ...t, order })} />
            <div className="pt-6"><Toggle label={adminText("Visible on site")} checked={t.active} onChange={(active) => set({ ...t, active })} /></div>
          </div>
        </>
      )}
      save={(tk, t) => backend.adminSaveTestimonial(tk, t)}
      remove={(tk, id) => backend.adminDeleteTestimonial(tk, id)}
    />
  );
}

export function NewsPage() {
  const { language, t: adminText } = useAdminLanguage();
  const { content } = useAdmin();
  if (!content) return <Spinner />;
  const items = [...content.news].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  const fmt = new Intl.DateTimeFormat(language === "sv" ? "sv-SE" : "en-GB", { dateStyle: "medium" });
  return (
    <CollectionManager<NewsPost>
      title={adminText("News")}
      description={adminText("Articles shown on the news page. The three latest published posts also appear on the home page.")}
      itemName={adminText("News post")}
      items={items}
      create={() => ({
        id: 0n,
        title: emptyL10n(),
        excerpt: emptyL10n(),
        body: emptyL10n(),
        published: true,
        createdAt: 0n,
        updatedAt: 0n,
        publishedAt: 0n,
      })}
      summary={(n) => ({
        title: n.title.sv,
        subtitle: n.published && n.publishedAt > 0n ? adminText("Published {0}", { "0": fmt.format(nsToDate(n.publishedAt)) }) : adminText("Not published"),
        image: n.cover,
        badges: [{ text: n.published ? adminText("Published") : adminText("Draft"), tone: n.published ? "green" : "amber" }],
      })}
      editor={(n, set) => (
        <>
          <ImageInput label={adminText("Cover image")} value={n.cover} onChange={(cover) => set({ ...n, cover })} />
          <L10nInput label={adminText("Title")} required value={n.title} onChange={(title) => set({ ...n, title })} />
          <L10nInput label={adminText("Excerpt")} multiline rows={2} value={n.excerpt} onChange={(excerpt) => set({ ...n, excerpt })} />
          <L10nInput label={adminText("Body")} multiline rows={12} value={n.body} onChange={(body) => set({ ...n, body })} />
          <p className="-mt-3 text-xs text-slate-500">{adminText("Separate paragraphs with an empty line.")}</p>
          <Toggle label={adminText("Published")} checked={n.published} onChange={(published) => set({ ...n, published })} />
        </>
      )}
      save={(t, n) => backend.adminSaveNews(t, n)}
      remove={(t, id) => backend.adminDeleteNews(t, id)}
    />
  );
}
