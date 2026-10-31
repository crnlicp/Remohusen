import { execSync } from "child_process";
import type { Plugin } from "vite";

const PAGES = ["/", "/om-oss", "/nyheter", "/kontakt"];

/** Best-effort list of published news posts (id + last update) read from the deployed backend. */
function fetchNews(environment: string): { id: string; lastmod: string }[] {
  try {
    const out = execSync(`icp canister call backend listNews '()' --identity anonymous -e ${environment}`, {
      encoding: "utf-8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const posts: { id: string; lastmod: string }[] = [];
    for (const block of out.split(/\n\s{4}record \{/).slice(1)) {
      const id = block.match(/\bid = ([\d_]+) : nat/)?.[1]?.replace(/_/g, "");
      const ns = block.match(/\bupdatedAt = ([\d_]+) : int/)?.[1]?.replace(/_/g, "");
      if (id) posts.push({ id, lastmod: ns ? new Date(Number(BigInt(ns) / 1_000_000n)).toISOString() : "" });
    }
    return posts;
  } catch {
    console.warn("[seo] Could not read news posts from the backend; sitemap will contain the main pages only.");
    return [];
  }
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Generates robots.txt and sitemap.xml at build time and replaces %SITE_URL% in index.html.
 * The public address comes from SITE_URL (see frontend/.env).
 */
export function seoFiles(siteUrl: string, environment: string): Plugin {
  const base = siteUrl.replace(/\/+$/, "");
  return {
    name: "remohusen-seo-files",
    apply: "build",
    transformIndexHtml(html) {
      return html.replaceAll("%SITE_URL%", base);
    },
    generateBundle: { order: "post", handler(_, bundle) {
      const shell = bundle["index.html"];
      if (!shell || shell.type !== "asset" || typeof shell.source !== "string") {
        this.error("Cannot build the isolated document page: index.html is missing.");
      }
      const documentShell = shell.source
        .replace(/<title>[\s\S]*?<\/title>/, "<title>Document / Dokument</title>")
        .replace(/<meta\s+name="robots"[^>]*\/?>/, '<meta name="robots" content="noindex, nofollow, noarchive" />')
        .replace(/<link\s+rel="(?:canonical|alternate)"[^>]*\/?>/g, "")
        .replace("</head>", '<meta name="referrer" content="no-referrer" /></head>');
      this.emitFile({ type: "asset", fileName: "documents.html", source: documentShell });
      const today = new Date().toISOString();
      const url = (path: string, lastmod: string, priority: string) => {
        const loc = `${base}${path}`;
        const en = `${loc}${loc.includes("?") ? "&" : "?"}lang=en`;
        return [
          "  <url>",
          `    <loc>${xmlEscape(loc)}</loc>`,
          `    <xhtml:link rel="alternate" hreflang="sv" href="${xmlEscape(loc)}"/>`,
          `    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(en)}"/>`,
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(loc)}"/>`,
          lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
          `    <priority>${priority}</priority>`,
          "  </url>",
        ]
          .filter(Boolean)
          .join("\n");
      };
      const entries = [
        ...PAGES.map((p) => url(p, today, p === "/" ? "1.0" : "0.8")),
        ...fetchNews(environment).map((n) => url(`/nyheter/${n.id}`, n.lastmod, "0.6")),
      ];
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
      const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /documents

Sitemap: ${base}/sitemap.xml
`;
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots });
    } },
  };
}
