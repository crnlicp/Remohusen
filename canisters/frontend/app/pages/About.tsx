import { useI18n } from "../lib/i18n";
import { useSite } from "../lib/site";
import { useSeo } from "../lib/seo";
import { PageHero, Reveal, Spinner } from "../components/Layout";
import { SmartImage } from "../components/SmartImage";
import { ServiceIcon } from "../components/Icons";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

export function AboutPage() {
  const { content } = useSite();
  const { t, tr } = useI18n();
  useSeo({ page: "about", breadcrumbs: [{ name: t("nav.about"), path: "/om-oss" }] });
  if (!content) return <Spinner label={t("common.loading")} />;
  const a = content.about;

  return (
    <>
      <PageHero eyebrow={t("nav.about")} title={tr(a.heroTitle)} text={tr(a.heroText)} image={a.heroImage} />

      <section className="py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          <Reveal>
            <h2 className="section-title">{tr(a.storyTitle)}</h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-300">
              {tr(a.storyText)
                .split(/\n{2,}/)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
            <Link to="/kontakt" className="btn btn-primary mt-8">
              {t("cta.contactUs")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          {a.storyImage && (
            <Reveal delay={0.15} className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-400/30 to-sky-500/20 blur-2xl" />
              <SmartImage
                image={a.storyImage}
                alt={tr(a.storyTitle)}
                className="aspect-[4/5] w-full rounded-[2rem] border border-white/10 object-cover"
                fallbackClassName="aspect-[4/5] w-full rounded-[2rem]"
              />
            </Reveal>
          )}
        </div>
      </section>

      {a.stats.length > 0 && (
        <section className="px-6 py-12">
          <Reveal className="glass mx-auto grid max-w-6xl grid-cols-2 rounded-3xl p-2 md:grid-cols-4">
            {a.stats.map((s, i) => (
              <div key={i} className="p-6 text-center">
                <div className="text-gradient text-4xl font-extrabold">{s.value}</div>
                <div className="mt-2 text-sm text-slate-300">{tr(s.caption)}</div>
              </div>
            ))}
          </Reveal>
        </section>
      )}

      {a.values.length > 0 && (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal className="mb-12 text-center">
              <h2 className="section-title">{t("about.values")}</h2>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {a.values.map((v, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div className="glass h-full rounded-3xl p-7">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-ink-950">
                      <ServiceIcon name={v.icon} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{tr(v.title)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{tr(v.text)}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {a.team.length > 0 && (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal className="mb-12 text-center">
              <h2 className="section-title">{t("about.team")}</h2>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {a.team.map((m, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div className="glass group overflow-hidden rounded-3xl">
                    <div className="aspect-[4/5] overflow-hidden">
                      {m.photo ? (
                        <SmartImage
                          image={m.photo}
                          alt={m.name}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          fallbackClassName="h-full w-full"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900 text-6xl font-extrabold text-brand-300/60">
                          {m.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="font-bold text-white">{m.name}</div>
                      <div className="text-sm text-brand-300">{tr(m.role)}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
