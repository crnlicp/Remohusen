import { useState, type FormEvent } from "react";
import { CheckCircle2, Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { backend, unwrap } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useSite } from "../lib/site";
import { useSeo } from "../lib/seo";
import { PageHero, Reveal, Spinner } from "../components/Layout";

const emptyForm = { name: "", email: "", phone: "", subject: "", body: "" };

export function ContactPage() {
  const { content } = useSite();
  const { t, tr } = useI18n();
  useSeo({ page: "contact", breadcrumbs: [{ name: t("nav.contact"), path: "/kontakt" }] });
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!content) return <Spinner label={t("common.loading")} />;
  const c = content.contact;

  const lat = parseFloat(c.mapLat);
  const lng = parseFloat(c.mapLng);
  const hasMap = Number.isFinite(lat) && Number.isFinite(lng);
  const d = 0.012;
  const mapSrc = hasMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d * 2},${lat - d},${lng + d * 2},${lat + d}&layer=mapnik&marker=${lat},${lng}`
    : "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      unwrap(await backend.submitMessage(form));
      setStatus("sent");
      setForm(emptyForm);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const info = [
    { Icon: MapPin, title: t("contact.address"), body: `${c.address}, ${c.postalCode} ${c.city}` },
    { Icon: Phone, title: t("contact.phone"), body: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    { Icon: Mail, title: t("contact.email"), body: c.email, href: `mailto:${c.email}` },
    { Icon: Clock, title: t("contact.hours"), body: tr(c.openingHours) },
  ];

  return (
    <>
      <PageHero eyebrow={t("nav.contact")} title={tr(c.title)} text={tr(c.intro)} image={c.heroImage} />
      <section className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {info.map(({ Icon, title, body, href }, i) => (
            <Reveal key={title} delay={i * 0.06}>
              <div className="glass flex items-start gap-4 rounded-2xl p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-ink-950">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
                  {href ? (
                    <a href={href} className="mt-1 block font-semibold text-white hover:text-brand-300">{body}</a>
                  ) : (
                    <div className="mt-1 font-semibold text-white">{body}</div>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
          {hasMap && (
            <Reveal delay={0.3}>
              <div className="glass overflow-hidden rounded-2xl p-1.5">
                <iframe
                  title="Map"
                  src={mapSrc}
                  className="h-64 w-full rounded-xl border-0 grayscale-[30%] invert-[90%] hue-rotate-180"
                  loading="lazy"
                />
              </div>
            </Reveal>
          )}
        </div>

        <Reveal className="lg:col-span-3" delay={0.1}>
          <form onSubmit={onSubmit} className="glass rounded-3xl p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-white">{t("contact.form.title")}</h2>
            {status === "sent" ? (
              <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-300" />
                <p className="text-lg text-emerald-100">{t("contact.sent")}</p>
                <button type="button" className="btn btn-ghost" onClick={() => setStatus("idle")}>
                  {t("contact.form.title")}
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="c-name">{t("contact.name")} *</label>
                  <input id="c-name" className="input" required maxLength={100} autoComplete="name" {...field("name")} />
                </div>
                <div>
                  <label className="label" htmlFor="c-email">{t("contact.email")} *</label>
                  <input id="c-email" type="email" className="input" required maxLength={200} autoComplete="email" {...field("email")} />
                </div>
                <div>
                  <label className="label" htmlFor="c-phone">{t("contact.phone")}</label>
                  <input id="c-phone" type="tel" className="input" maxLength={40} autoComplete="tel" {...field("phone")} />
                </div>
                <div>
                  <label className="label" htmlFor="c-subject">{t("contact.subject")}</label>
                  <input id="c-subject" className="input" maxLength={200} {...field("subject")} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="c-body">{t("contact.message")} *</label>
                  <textarea id="c-body" className="input min-h-40" required maxLength={5000} {...field("body")} />
                </div>
                {error && <p className="text-sm text-red-300 sm:col-span-2">{error}</p>}
                <div className="sm:col-span-2">
                  <button type="submit" className="btn btn-primary w-full py-3 text-base sm:w-auto" disabled={status === "sending"}>
                    <Send className="h-4 w-4" />
                    {status === "sending" ? t("contact.sending") : t("contact.send")}
                  </button>
                </div>
              </div>
            )}
          </form>
        </Reveal>
      </section>
    </>
  );
}
