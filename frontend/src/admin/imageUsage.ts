import type { AdminContent, ImageRef } from "../lib/api";

export interface ImageUsage {
  ref: ImageRef;
  where: string;
}

/** Every image reference in the site content, with a human-readable location. */
export function collectImageRefs(c: AdminContent): ImageUsage[] {
  const out: ImageUsage[] = [];
  const add = (ref: ImageRef | undefined, where: string) => {
    if (!ref || (ref.__kind__ === "url" && !ref.url.trim())) return;
    out.push({ ref, where });
  };
  c.slides.forEach((s) => add(s.image, `Slide “${s.title.sv}”`));
  c.services.forEach((s) => add(s.image, `Service “${s.title.sv}”`));
  c.projects.forEach((p) => p.images.forEach((r) => add(r, `Project “${p.title.sv}”`)));
  c.testimonials.forEach((t) => add(t.avatar, `Testimonial “${t.name}”`));
  c.news.forEach((n) => add(n.cover, `News “${n.title.sv}”`));
  add(c.about.heroImage, "About hero");
  add(c.about.storyImage, "About story");
  c.about.team.forEach((m) => add(m.photo, `Team “${m.name}”`));
  add(c.contact.heroImage, "Contact hero");
  if (c.seo.ogImage) add({ __kind__: "url", url: c.seo.ogImage }, "SEO share image");
  return out;
}

export interface UsedUrl {
  url: string;
  where: string[];
}

/** Distinct external image URLs used anywhere on the site, most used first. */
export function collectUsedUrls(c: AdminContent | null): UsedUrl[] {
  if (!c) return [];
  const map = new Map<string, string[]>();
  for (const { ref, where } of collectImageRefs(c)) {
    if (ref.__kind__ !== "url") continue;
    const url = ref.url.trim();
    const list = map.get(url) ?? [];
    if (!list.includes(where)) list.push(where);
    map.set(url, list);
  }
  return [...map.entries()].map(([url, where]) => ({ url, where })).sort((a, b) => b.where.length - a.where.length);
}
