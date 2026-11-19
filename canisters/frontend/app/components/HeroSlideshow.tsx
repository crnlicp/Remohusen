import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Slide } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { SmartImage } from "./SmartImage";

const INTERVAL = 7000;

/** Internal paths use the router; anything else opens as a normal link. */
export function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  if (to.startsWith("/")) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function HeroSlideshow({ slides }: { slides: Slide[] }) {
  const { tr, t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setTimeout(() => go(1), INTERVAL);
    return () => window.clearTimeout(id);
  }, [index, count, paused, go]);

  if (count === 0) {
    return <section className="h-[60vh]" />;
  }
  const slide = slides[Math.min(index, count - 1)];

  return (
    <section
      className="relative isolate flex min-h-[100svh] items-end overflow-hidden pb-24 pt-32 sm:items-center sm:pb-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.id.toString()}
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.1 }, scale: { duration: 8, ease: "linear" } }}
        >
          <SmartImage
            image={slide.image}
            alt={tr(slide.title)}
            loading="eager"
            fetchPriority={index === 0 ? "high" : "auto"}
            className="h-full w-full object-cover"
            fallbackClassName="h-full w-full"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950/90 via-ink-950/55 to-ink-950/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-ink-900 to-transparent" />

      <div className="mx-auto w-full max-w-7xl px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id.toString()}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="glass max-w-2xl rounded-3xl p-8 sm:p-10"
          >
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {tr(slide.title)}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-200">{tr(slide.subtitle)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {slide.ctaLink && tr(slide.ctaText) && (
                <SmartLink to={slide.ctaLink} className="btn btn-primary px-6 py-3 text-base">
                  {tr(slide.ctaText)} <ArrowRight className="h-4 w-4" />
                </SmartLink>
              )}
              <Link to="/#projekt" className="btn btn-ghost px-6 py-3 text-base">
                {t("cta.viewProjects")}
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <div className="mt-8 flex items-center gap-4">
            <button onClick={() => go(-1)} className="glass rounded-full p-2.5 text-white hover:bg-white/20" aria-label="Previous slide">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id.toString()}
                  onClick={() => setIndex(i)}
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === index}
                  className={`relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-all ${i === index ? "w-12" : "w-6 hover:bg-white/40"}`}
                >
                  {i === index && (
                    <motion.span
                      key={`${index}-${paused}`}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-brand-600"
                      initial={{ width: paused ? "100%" : "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: paused ? 0 : INTERVAL / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => go(1)} className="glass rounded-full p-2.5 text-white hover:bg-white/20" aria-label="Next slide">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
