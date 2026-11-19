import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "../lib/i18n";
import { swedish } from "./swedish";

type Values = Record<string, string | number | bigint | null | undefined>;
export function translateAdmin(language: Lang, english: string, values: Values = {}) {
  const template = language === "sv" ? swedish[english] ?? english : english;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => Object.hasOwn(values, key) ? String(values[key] ?? "") : match);
}
const LanguageContext = createContext<{
  language: Lang;
  setLanguage: (language: Lang) => void;
  t: (english: string, values?: Values) => string;
} | null>(null);

export function AdminLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Lang>(() => localStorage.getItem("remohusen.admin.lang") === "en" ? "en" : "sv");
  useEffect(() => {
    localStorage.setItem("remohusen.admin.lang", language);
    const previous = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = previous; };
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (english: string, values?: Values) => translateAdmin(language, english, values) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useAdminLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("Admin language provider is missing");
  return value;
}
export function AdminLanguageToggle() {
  const { language, setLanguage } = useAdminLanguage();
  return <div role="group" aria-label="Admin language / Administrationsspråk" className="inline-flex shrink-0 rounded-xl border border-white/15 p-1">
    {(["sv", "en"] as const).map((lang) => <button key={lang} type="button" lang={lang} aria-pressed={language === lang}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${language === lang ? "bg-brand-400 text-ink-950" : "text-slate-300 hover:bg-white/10"}`}
      onClick={() => setLanguage(lang)}>{lang === "sv" ? "Svenska" : "English"}</button>)}
  </div>;
}
