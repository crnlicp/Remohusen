import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { L10n } from "./api";

export type Lang = "sv" | "en";

const dict = {
  sv: {
    "nav.home": "Hem",
    "nav.services": "Tjänster",
    "nav.projects": "Projekt",
    "nav.about": "Om oss",
    "nav.news": "Nyheter",
    "nav.contact": "Kontakt",
    "cta.quote": "Begär offert",
    "cta.readMore": "Läs mer",
    "cta.allNews": "Alla nyheter",
    "cta.contactUs": "Kontakta oss",
    "cta.viewProjects": "Se våra projekt",
    "home.services.eyebrow": "Vad vi gör",
    "home.services.title": "Allt inom bygg – under ett tak",
    "home.services.text": "Från första skiss till nyckelfärdigt hem. Vi tar helhetsansvar för ditt projekt.",
    "home.projects.eyebrow": "Referenser",
    "home.projects.title": "Utvalda projekt",
    "home.projects.text": "Ett urval av hem vi har byggt, byggt om och byggt till.",
    "home.projects.all": "Alla",
    "home.testimonials.eyebrow": "Kundröster",
    "home.testimonials.title": "Vad våra kunder säger",
    "home.news.eyebrow": "Aktuellt",
    "home.news.title": "Senaste nytt",
    "home.process.eyebrow": "Så jobbar vi",
    "home.process.title": "Trygg process från start till mål",
    "process.1.title": "Kostnadsfritt möte",
    "process.1.text": "Vi besöker dig, lyssnar på dina idéer och går igenom förutsättningarna.",
    "process.2.title": "Fast offert",
    "process.2.text": "Du får en tydlig offert med tidsplan – inga dolda kostnader.",
    "process.3.title": "Byggstart",
    "process.3.text": "Ett dedikerat team och en projektledare som håller dig uppdaterad.",
    "process.4.title": "Slutbesiktning",
    "process.4.text": "Vi lämnar över ett färdigt resultat med garanti och dokumentation.",
    "home.cta.title": "Redo att bygga ditt drömhem?",
    "home.cta.text": "Berätta om ditt projekt så återkommer vi inom en arbetsdag med nästa steg.",
    "about.values": "Våra värderingar",
    "about.team": "Möt teamet",
    "news.title": "Nyheter",
    "news.subtitle": "Nyheter, projektuppdateringar och tips från Remohusen.",
    "news.empty": "Inga nyheter ännu.",
    "news.back": "Tillbaka till nyheter",
    "news.notFound": "Nyheten kunde inte hittas.",
    "contact.form.title": "Skicka ett meddelande",
    "contact.name": "Namn",
    "contact.email": "E-post",
    "contact.phone": "Telefon",
    "contact.subject": "Ämne",
    "contact.message": "Meddelande",
    "contact.send": "Skicka meddelande",
    "contact.sending": "Skickar…",
    "contact.sent": "Tack! Vi har tagit emot ditt meddelande och återkommer snart.",
    "contact.address": "Adress",
    "contact.hours": "Öppettider",
    "common.loading": "Laddar…",
    "common.error": "Något gick fel. Försök igen.",
    "common.retry": "Försök igen",
    "footer.quickLinks": "Snabblänkar",
    "footer.contact": "Kontakt",
    "footer.rights": "Alla rättigheter förbehållna.",
    "footer.org": "Org.nr",
    "notFound.title": "Sidan finns inte",
    "notFound.text": "Sidan du letar efter har flyttats eller finns inte.",
    "notFound.back": "Till startsidan",
  },
  en: {
    "nav.home": "Home",
    "nav.services": "Services",
    "nav.projects": "Projects",
    "nav.about": "About us",
    "nav.news": "News",
    "nav.contact": "Contact",
    "cta.quote": "Get a quote",
    "cta.readMore": "Read more",
    "cta.allNews": "All news",
    "cta.contactUs": "Contact us",
    "cta.viewProjects": "View our projects",
    "home.services.eyebrow": "What we do",
    "home.services.title": "Everything in construction – under one roof",
    "home.services.text": "From the first sketch to a turnkey home. We take full responsibility for your project.",
    "home.projects.eyebrow": "References",
    "home.projects.title": "Featured projects",
    "home.projects.text": "A selection of homes we have built, rebuilt and extended.",
    "home.projects.all": "All",
    "home.testimonials.eyebrow": "Testimonials",
    "home.testimonials.title": "What our clients say",
    "home.news.eyebrow": "Updates",
    "home.news.title": "Latest news",
    "home.process.eyebrow": "How we work",
    "home.process.title": "A safe process from start to finish",
    "process.1.title": "Free consultation",
    "process.1.text": "We visit you, listen to your ideas and review the conditions.",
    "process.2.title": "Fixed quote",
    "process.2.text": "You get a clear quote with a schedule – no hidden costs.",
    "process.3.title": "Construction",
    "process.3.text": "A dedicated team and a project manager who keeps you updated.",
    "process.4.title": "Final inspection",
    "process.4.text": "We hand over a finished result with warranty and documentation.",
    "home.cta.title": "Ready to build your dream home?",
    "home.cta.text": "Tell us about your project and we will get back to you within one business day.",
    "about.values": "Our values",
    "about.team": "Meet the team",
    "news.title": "News",
    "news.subtitle": "News, project updates and tips from Remohusen.",
    "news.empty": "No news yet.",
    "news.back": "Back to news",
    "news.notFound": "The news post could not be found.",
    "contact.form.title": "Send a message",
    "contact.name": "Name",
    "contact.email": "Email",
    "contact.phone": "Phone",
    "contact.subject": "Subject",
    "contact.message": "Message",
    "contact.send": "Send message",
    "contact.sending": "Sending…",
    "contact.sent": "Thank you! We have received your message and will get back to you soon.",
    "contact.address": "Address",
    "contact.hours": "Opening hours",
    "common.loading": "Loading…",
    "common.error": "Something went wrong. Please try again.",
    "common.retry": "Try again",
    "footer.quickLinks": "Quick links",
    "footer.contact": "Contact",
    "footer.rights": "All rights reserved.",
    "footer.org": "Org. no.",
    "notFound.title": "Page not found",
    "notFound.text": "The page you are looking for has moved or does not exist.",
    "notFound.back": "Back to home",
  },
} as const;

export type DictKey = keyof (typeof dict)["sv"];

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
  /** Pick the current language from backend content, falling back to the other language. */
  tr: (value: L10n | undefined | null) => string;
  formatDate: (date: Date) => string;
}

const I18nContext = createContext<I18n | null>(null);
const STORAGE_KEY = "remohusen.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    // ?lang=en|sv gives each language a crawlable URL (used by hreflang alternates).
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (fromUrl === "en" || fromUrl === "sv") {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "sv";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next);
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", next);
      window.history.replaceState(window.history.state, "", url);
    }
    setLangState(next);
  }, []);

  const value = useMemo<I18n>(() => {
    const other: Lang = lang === "sv" ? "en" : "sv";
    const fmt = new Intl.DateTimeFormat(lang === "sv" ? "sv-SE" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return {
      lang,
      setLang,
      t: (key) => dict[lang][key],
      tr: (v) => (v ? v[lang] || v[other] : ""),
      formatDate: (d) => fmt.format(d),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
