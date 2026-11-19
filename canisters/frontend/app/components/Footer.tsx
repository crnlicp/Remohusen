import { Link } from "react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./Logo";
import { FacebookIcon, InstagramIcon, LinkedinIcon } from "./BrandIcons";
import { useI18n } from "../lib/i18n";
import { useSite } from "../lib/site";

export function Footer() {
  const { t, tr } = useI18n();
  const { content } = useSite();
  const s = content?.settings;
  const c = content?.contact;
  const socials = [
    { href: s?.socials.facebook, Icon: FacebookIcon, label: "Facebook" },
    { href: s?.socials.instagram, Icon: InstagramIcon, label: "Instagram" },
    { href: s?.socials.linkedin, Icon: LinkedinIcon, label: "LinkedIn" },
  ].filter((x) => x.href);

  return (
    <footer className="relative mt-24 border-t border-white/10 bg-ink-950/60 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo name={s?.companyName || "Remohusen"} tagline={tr(s?.tagline)} />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">{tr(s?.footerText)}</p>
          {s && tr(s.rotNotice) && (
            <p className="mt-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {tr(s.rotNotice)}
            </p>
          )}
          {socials.length > 0 && (
            <div className="mt-6 flex gap-3">
              {socials.map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="glass flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:-translate-y-0.5 hover:text-brand-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">{t("footer.quickLinks")}</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li><Link className="hover:text-brand-300" to="/#tjanster">{t("nav.services")}</Link></li>
            <li><Link className="hover:text-brand-300" to="/#projekt">{t("nav.projects")}</Link></li>
            <li><Link className="hover:text-brand-300" to="/om-oss">{t("nav.about")}</Link></li>
            <li><Link className="hover:text-brand-300" to="/nyheter">{t("nav.news")}</Link></li>
            <li><Link className="hover:text-brand-300" to="/kontakt">{t("nav.contact")}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">{t("footer.contact")}</h3>
          {c && (
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{c.address}<br />{c.postalCode} {c.city}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="hover:text-brand-300">{c.phone}</a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <a href={`mailto:${c.email}`} className="hover:text-brand-300">{c.email}</a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{tr(c.openingHours)}</span>
              </li>
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {s?.companyName || "Remohusen"}. {t("footer.rights")}
          </span>
          <span className="flex items-center gap-4">
            {s?.orgNumber && <span>{t("footer.org")} {s.orgNumber}</span>}
            <Link to="/admin" className="hover:text-slate-300">Admin</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
