import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Menu, Phone, X } from "lucide-react";
import { Logo } from "./Logo";
import { useI18n, type DictKey } from "../lib/i18n";
import { useSite } from "../lib/site";

const links: { to: string; key: DictKey }[] = [
  { to: "/", key: "nav.home" },
  { to: "/#tjanster", key: "nav.services" },
  { to: "/#projekt", key: "nav.projects" },
  { to: "/om-oss", key: "nav.about" },
  { to: "/nyheter", key: "nav.news" },
  { to: "/kontakt", key: "nav.contact" },
];

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex rounded-full border border-white/15 bg-white/5 p-0.5 text-xs font-bold">
      {(["sv", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            lang === l ? "bg-gradient-to-r from-brand-400 to-brand-600 text-ink-950" : "text-slate-300 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const { t, tr } = useI18n();
  const { content } = useSite();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  const isActive = (to: string) =>
    to.includes("#") ? false : to === "/" ? location.pathname === "/" && !location.hash : location.pathname.startsWith(to);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <nav
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3 transition-all duration-300 sm:px-6 ${
          scrolled || open ? "glass-strong" : "border border-transparent"
        }`}
      >
        <Link to="/" aria-label="Remohusen">
          <Logo name={content?.settings.companyName || "Remohusen"} tagline={tr(content?.settings.tagline)} />
        </Link>

        <ul className="hidden items-center gap-1 xl:flex">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(l.to) ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t(l.key)}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <LangToggle />
          {content?.contact.phone && (
            <a
              href={`tel:${content.contact.phone.replace(/\s/g, "")}`}
              className="hidden items-center gap-2 whitespace-nowrap text-sm font-semibold text-slate-200 hover:text-white 2xl:flex"
            >
              <Phone className="h-4 w-4 text-brand-400" />
              {content.contact.phone}
            </a>
          )}
          <Link to="/kontakt" className="btn btn-primary hidden sm:inline-flex">
            {t("cta.quote")}
          </Link>
          <button
            className="rounded-lg p-2 text-white hover:bg-white/10 xl:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-strong bg-ink-950/90! mx-auto mt-2 max-w-7xl rounded-2xl p-3 xl:hidden"
          >
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block rounded-lg px-4 py-3 font-medium text-slate-200 hover:bg-white/10 hover:text-white"
              >
                {t(l.key)}
              </Link>
            ))}
            <Link to="/kontakt" className="btn btn-primary mt-2 w-full">
              {t("cta.quote")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
