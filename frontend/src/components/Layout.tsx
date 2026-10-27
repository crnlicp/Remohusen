import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { SmartImage } from "./SmartImage";
import type { ImageRef } from "../lib/api";
import { useSite } from "../lib/site";
import { useI18n } from "../lib/i18n";

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1b2640_0%,_#0b1220_55%,_#070b14_100%)]" />
      <div className="animate-float absolute -left-40 top-20 h-[34rem] w-[34rem] rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="animate-float-slow absolute -right-40 top-1/3 h-[38rem] w-[38rem] rounded-full bg-sky-500/15 blur-[130px]" />
      <div className="animate-float absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth" }));
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

export function PublicLayout() {
  const { content, error, reload } = useSite();
  const { t } = useI18n();
  return (
    <>
      <Backdrop />
      <ScrollManager />
      <Navbar />
      <main>
        {error && !content ? (
          <div className="flex min-h-[70vh] items-center justify-center px-6">
            <div className="glass max-w-md rounded-3xl p-8 text-center">
              <p className="text-slate-200">{t("common.error")}</p>
              <button className="btn btn-primary mt-5" onClick={() => void reload()}>
                {t("common.retry")}
              </button>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <Footer />
    </>
  );
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PageHero({
  title,
  text,
  image,
  eyebrow,
}: {
  title: string;
  text?: string;
  image?: ImageRef;
  eyebrow?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden pb-16 pt-40 sm:pb-24 sm:pt-48">
      {image && (
        <div className="absolute inset-0 -z-10">
          <SmartImage image={image} className="h-full w-full object-cover" fallbackClassName="h-full w-full" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/80 to-ink-900" />
        </div>
      )}
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">{title}</h1>
          {text && <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">{text}</p>}
        </Reveal>
      </div>
    </section>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-slate-400" role="status">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-brand-400" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
