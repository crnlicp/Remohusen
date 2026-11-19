import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Images, MapPin, Quote, Star } from "lucide-react";
import { useI18n, type DictKey } from "../lib/i18n";
import { useSite } from "../lib/site";
import { useSeo } from "../lib/seo";
import type { Project } from "../lib/api";
import { HeroSlideshow } from "../components/HeroSlideshow";
import { SmartImage } from "../components/SmartImage";
import { ServiceIcon } from "../components/Icons";
import { Lightbox } from "../components/Lightbox";
import { NewsCard } from "../components/NewsCard";
import { Reveal, Spinner } from "../components/Layout";

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-3xl text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="section-title">{title}</h2>
      {text && <p className="mt-4 text-lg text-slate-400">{text}</p>}
    </Reveal>
  );
}

function ProjectsSection({ projects }: { projects: Project[] }) {
  const { t, tr } = useI18n();
  const [filter, setFilter] = useState<string | null>(null);
  const [active, setActive] = useState<{ project: Project; index: number } | null>(null);

  const categories = useMemo(() => [...new Set(projects.map((p) => tr(p.category)).filter(Boolean))], [projects, tr]);
  const visible = filter ? projects.filter((p) => tr(p.category) === filter) : projects;

  if (projects.length === 0) return null;

  return (
    <section id="projekt" className="scroll-mt-28 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader eyebrow={t("home.projects.eyebrow")} title={t("home.projects.title")} text={t("home.projects.text")} />
        {categories.length > 1 && (
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "all"}
                onClick={() => setFilter(c)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === c ? "bg-gradient-to-r from-brand-400 to-brand-600 text-ink-950" : "glass text-slate-200 hover:bg-white/15"
                }`}
              >
                {c ?? t("home.projects.all")}
              </button>
            ))}
          </div>
        )}
        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((p, i) => (
              <motion.button
                layout
                key={p.id.toString()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35 }}
                onClick={() => p.images.length > 0 && setActive({ project: p, index: 0 })}
                className={`group relative overflow-hidden rounded-3xl text-left ${
                  p.featured && i === 0 && !filter ? "sm:col-span-2 sm:row-span-2" : ""
                }`}
              >
                <div className={`relative ${p.featured && i === 0 && !filter ? "aspect-square sm:aspect-auto sm:h-full" : "aspect-[4/3]"}`}>
                  <SmartImage
                    image={p.images[0]}
                    alt={tr(p.title)}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    fallbackClassName="absolute inset-0 h-full w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/30 to-transparent" />
                  <div className="absolute inset-x-3 bottom-3 rounded-2xl p-4 transition duration-300 group-hover:glass">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-300">{tr(p.category)}</span>
                    <h3 className="mt-1 text-lg font-bold text-white">{tr(p.title)}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-300">
                      {p.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {p.location}
                        </span>
                      )}
                      {p.year && <span>{p.year}</span>}
                      {p.images.length > 1 && (
                        <span className="flex items-center gap-1">
                          <Images className="h-3 w-3" /> {p.images.length}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 max-h-0 text-sm text-slate-300 opacity-0 transition-all duration-300 group-hover:max-h-12 group-hover:opacity-100">
                      {tr(p.description)}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
      <Lightbox
        images={active?.project.images ?? []}
        index={active?.index ?? null}
        title={active ? tr(active.project.title) : undefined}
        onChange={(index) => setActive((a) => (a && index !== null ? { ...a, index } : null))}
      />
    </section>
  );
}

const processSteps: { title: DictKey; text: DictKey }[] = [
  { title: "process.1.title", text: "process.1.text" },
  { title: "process.2.title", text: "process.2.text" },
  { title: "process.3.title", text: "process.3.text" },
  { title: "process.4.title", text: "process.4.text" },
];

export function HomePage() {
  const { content } = useSite();
  const { t, tr } = useI18n();
  useSeo({ page: "home" });

  if (!content) return <Spinner label={t("common.loading")} />;
  const { slides, services, projects, testimonials, latestNews, about } = content;

  return (
    <>
      <HeroSlideshow slides={slides} />

      {about.stats.length > 0 && (
        <section className="relative z-10 -mt-12 px-6">
          <Reveal className="glass mx-auto grid max-w-6xl grid-cols-2 divide-white/10 rounded-3xl p-2 md:grid-cols-4 md:divide-x">
            {about.stats.map((s, i) => (
              <div key={i} className="p-6 text-center">
                <div className="text-gradient text-4xl font-extrabold sm:text-5xl">{s.value}</div>
                <div className="mt-2 text-sm font-medium text-slate-300">{tr(s.caption)}</div>
              </div>
            ))}
          </Reveal>
        </section>
      )}

      {services.length > 0 && (
        <section id="tjanster" className="scroll-mt-28 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeader eyebrow={t("home.services.eyebrow")} title={t("home.services.title")} text={t("home.services.text")} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <Reveal key={s.id.toString()} delay={(i % 3) * 0.08}>
                  <article className="glass group relative h-full overflow-hidden rounded-3xl p-8 transition duration-300 hover:-translate-y-1 hover:border-brand-400/40">
                    {s.image && (
                      <div className="absolute inset-0 -z-10 opacity-20 transition duration-500 group-hover:opacity-35">
                        <SmartImage image={s.image} className="h-full w-full object-cover" fallbackClassName="hidden" />
                        <div className="absolute inset-0 bg-gradient-to-br from-ink-900/40 to-ink-900" />
                      </div>
                    )}
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-ink-950 shadow-lg shadow-brand-600/30 transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                      <ServiceIcon name={s.icon} className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{tr(s.title)}</h3>
                    <p className="mt-3 leading-relaxed text-slate-400">{tr(s.description)}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <ProjectsSection projects={projects} />

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader eyebrow={t("home.process.eyebrow")} title={t("home.process.title")} />
          <div className="relative grid gap-6 md:grid-cols-4">
            <div className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent md:block" />
            {processSteps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.1}>
                <div className="glass relative h-full rounded-3xl p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-brand-400/40 bg-ink-900 text-lg font-extrabold text-brand-300">
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-white">{t(step.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{t(step.text)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeader eyebrow={t("home.testimonials.eyebrow")} title={t("home.testimonials.title")} />
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((tm, i) => (
                <Reveal key={tm.id.toString()} delay={i * 0.1}>
                  <figure className="glass relative flex h-full flex-col rounded-3xl p-8">
                    <Quote className="absolute right-6 top-6 h-10 w-10 text-brand-400/20" />
                    <div className="flex gap-1 text-brand-400">
                      {Array.from({ length: 5 }, (_, k) => (
                        <Star key={k} className={`h-4 w-4 ${k < Number(tm.rating) ? "fill-current" : "opacity-30"}`} />
                      ))}
                    </div>
                    <blockquote className="mt-5 flex-1 leading-relaxed text-slate-200">“{tr(tm.quote)}”</blockquote>
                    <figcaption className="mt-6 flex items-center gap-3">
                      {tm.avatar ? (
                        <SmartImage image={tm.avatar} alt={tm.name} className="h-12 w-12 rounded-full object-cover" fallbackClassName="h-12 w-12 rounded-full" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-ink-950">
                          {tm.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white">{tm.name}</div>
                        <div className="text-sm text-slate-400">{tr(tm.role)}</div>
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {latestNews.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <Reveal>
                <span className="eyebrow">{t("home.news.eyebrow")}</span>
                <h2 className="section-title">{t("home.news.title")}</h2>
              </Reveal>
              <Link to="/nyheter" className="btn btn-ghost">
                {t("cta.allNews")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {latestNews.map((p, i) => (
                <Reveal key={p.id.toString()} delay={i * 0.1}>
                  <NewsCard post={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-16">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 p-10 text-center sm:p-16">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-500/30 via-brand-700/20 to-sky-500/20" />
          <div className="absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl" />
          <h2 className="section-title">{t("home.cta.title")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-200">{t("home.cta.text")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/kontakt" className="btn btn-primary px-7 py-3 text-base">
              {t("cta.quote")} <ArrowRight className="h-4 w-4" />
            </Link>
            {content.contact.phone && (
              <a href={`tel:${content.contact.phone.replace(/\s/g, "")}`} className="btn btn-ghost px-7 py-3 text-base">
                {content.contact.phone}
              </a>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
}
