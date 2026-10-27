import { useEffect } from "react";
import { useLocation } from "react-router";
import type { ImageRef, SiteContent } from "./api";
import { useI18n } from "./i18n";
import { useSite } from "./site";

type JsonLd = Record<string, unknown>;

export interface PageSeo {
  /** Which SEO settings entry provides the default title/description. */
  page?: "home" | "about" | "news" | "contact";
  title?: string;
  description?: string;
  /** Absolute image URL (overrides the default share image). */
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  /** Breadcrumb trail after "Home", e.g. [{ name: "News", path: "/nyheter" }]. */
  breadcrumbs?: { name: string; path: string }[];
  jsonLd?: JsonLd[];
}

/** Absolute URL for an image ref, or undefined for canister-stored images (not crawlable over HTTP). */
export const absoluteImageUrl = (ref: ImageRef | undefined | null): string | undefined =>
  ref?.__kind__ === "url" && ref.url ? ref.url : undefined;

export function siteBaseUrl(content: SiteContent | null): string {
  return (content?.seo.siteUrl.trim() || window.location.origin).replace(/\/+$/, "");
}

/* ---------- DOM helpers (all managed nodes are tagged with data-seo) ---------- */

function upsert(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void, keep: boolean) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!keep) {
    el?.remove();
    return;
  }
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  apply(el);
}

function setMeta(attr: "name" | "property", key: string, value: string | undefined) {
  upsert(
    `meta[${attr}="${key}"]`,
    () => {
      const m = document.createElement("meta");
      m.setAttribute(attr, key);
      return m;
    },
    (m) => m.setAttribute("content", value ?? ""),
    !!value,
  );
}

function setLink(rel: string, href: string | undefined, hreflang?: string) {
  const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  upsert(
    sel,
    () => {
      const l = document.createElement("link");
      l.rel = rel;
      if (hreflang) l.hreflang = hreflang;
      return l;
    },
    (l) => ((l as HTMLLinkElement).href = href ?? ""),
    !!href,
  );
}

function setJsonLd(id: string, data: JsonLd[] | undefined) {
  upsert(
    `script#${id}`,
    () => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = id;
      return s;
    },
    (s) => (s.textContent = JSON.stringify(data!.length === 1 ? data![0] : data)),
    !!data?.length,
  );
}

const clean = (o: JsonLd): JsonLd =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)));

/** schema.org LocalBusiness/WebSite data built from contact info, settings and SEO settings. */
function siteJsonLd(c: SiteContent, base: string, lang: "sv" | "en"): JsonLd[] {
  const { seo, contact, settings } = c;
  const sameAs = [settings.socials.facebook, settings.socials.instagram, settings.socials.linkedin].filter((u) => /^https?:\/\//.test(u));
  const lat = parseFloat(contact.mapLat);
  const lng = parseFloat(contact.mapLng);
  const business = clean({
    "@context": "https://schema.org",
    "@type": seo.businessType || "GeneralContractor",
    "@id": `${base}/#business`,
    name: settings.companyName,
    description: seo.home.description[lang] || seo.home.description.sv,
    url: `${base}/`,
    logo: `${base}/logo.png`,
    image: seo.ogImage || `${base}/og-image.png`,
    telephone: contact.phone,
    email: contact.email,
    priceRange: seo.priceRange,
    address: clean({
      "@type": "PostalAddress",
      streetAddress: contact.address,
      postalCode: contact.postalCode,
      addressLocality: contact.city,
      addressCountry: "SE",
    }),
    geo: Number.isFinite(lat) && Number.isFinite(lng) ? { "@type": "GeoCoordinates", latitude: lat, longitude: lng } : undefined,
    areaServed: seo.areaServed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ "@type": "Place", name })),
    taxID: settings.orgNumber,
    sameAs,
    knowsAbout: c.services.map((s) => s.title[lang] || s.title.sv),
  });
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: `${base}/`,
    name: settings.companyName,
    inLanguage: ["sv-SE", "en"],
    publisher: { "@id": `${base}/#business` },
  };
  return [business, website];
}

/**
 * Keeps <head> in sync with the current page: title, description, canonical, hreflang,
 * robots, Open Graph / Twitter cards, verification tags and JSON-LD structured data.
 */
export function useSeo(page: PageSeo) {
  const { content } = useSite();
  const { lang, t } = useI18n();
  const { pathname } = useLocation();
  const key = JSON.stringify(page);

  useEffect(() => {
    if (!content) return;
    const { seo, settings } = content;
    const base = siteBaseUrl(content);
    const meta = page.page ? seo[page.page] : undefined;
    const pick = (v?: { sv: string; en: string }) => (v ? v[lang] || v.sv : "");
    const name = settings.companyName || "Remohusen";

    const pageTitle = page.title ?? pick(meta?.title);
    const title = page.page === "home" && !page.title ? pageTitle || name : pageTitle ? `${pageTitle} | ${name}` : name;
    const description = (page.description || pick(meta?.description) || pick(seo.home.description)).replace(/\s+/g, " ").trim().slice(0, 300);
    const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
    const svUrl = `${base}${path}`;
    const enUrl = `${svUrl}?lang=en`;
    const canonical = lang === "en" ? enUrl : svUrl;
    const image = page.image || seo.ogImage || `${base}/og-image.png`;
    const noindex = page.noindex || !seo.allowIndexing;

    document.title = title;
    document.documentElement.lang = lang;
    setMeta("name", "description", description);
    setMeta("name", "keywords", pick(seo.keywords));
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    setMeta("name", "google-site-verification", seo.googleVerification);
    setMeta("name", "msvalidate.01", seo.bingVerification);

    setLink("canonical", noindex ? undefined : canonical);
    setLink("alternate", noindex ? undefined : svUrl, "sv");
    setLink("alternate", noindex ? undefined : enUrl, "en");
    setLink("alternate", noindex ? undefined : svUrl, "x-default");

    setMeta("property", "og:type", page.type ?? "website");
    setMeta("property", "og:site_name", name);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", image);
    setMeta("property", "og:image:alt", title);
    setMeta("property", "og:locale", lang === "en" ? "en_GB" : "sv_SE");
    setMeta("property", "og:locale:alternate", lang === "en" ? "sv_SE" : "en_GB");
    setMeta("property", "article:published_time", page.publishedTime);
    setMeta("property", "article:modified_time", page.modifiedTime);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    setJsonLd("ld-site", siteJsonLd(content, base, lang));
    const crumbs = page.breadcrumbs?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [{ name: t("nav.home"), path: "/" }, ...page.breadcrumbs].map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: b.name,
              item: `${base}${b.path === "/" ? "/" : b.path}`,
            })),
          },
        ]
      : [];
    setJsonLd("ld-page", noindex ? undefined : [...crumbs, ...(page.jsonLd ?? [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, lang, pathname, key, t]);
}
