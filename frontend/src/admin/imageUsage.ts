import type { AdminContent, ImageRef } from "../lib/api";

export interface ImageUsage {
  ref: ImageRef;
  where: string;
}

/** Every image reference in the site content, with a human-readable location. */
export function collectImageRefs(c: AdminContent, text: (value: string) => string = (value) => value): ImageUsage[] {
  const out: ImageUsage[] = [];
  const add = (ref: ImageRef | undefined, where: string) => {
    if (!ref || (ref.__kind__ === "url" && !ref.url.trim())) return;
    out.push({ ref, where });
  };
  c.slides.forEach((s) => add(s.image, `${text("Slide")} “${s.title.sv}”`));
  c.services.forEach((s) => add(s.image, `${text("Service")} “${s.title.sv}”`));
  c.projects.forEach((p) => p.images.forEach((r) => add(r, `${text("Project")} “${p.title.sv}”`)));
  c.testimonials.forEach((t) => add(t.avatar, `${text("Testimonial")} “${t.name}”`));
  c.news.forEach((n) => add(n.cover, `${text("News")} “${n.title.sv}”`));
  add(c.about.heroImage, text("About hero"));
  add(c.about.storyImage, text("About story"));
  c.about.team.forEach((m) => add(m.photo, `${text("Team")} “${m.name}”`));
  add(c.contact.heroImage, text("Contact hero"));
  if (c.seo.ogImage) add({ __kind__: "url", url: c.seo.ogImage }, text("SEO share image"));
  return out;
}

export interface UsedUrl {
  url: string;
  where: string[];
}

/** Distinct external image URLs used anywhere on the site, most used first. */
export function collectUsedUrls(c: AdminContent | null, text?: (value: string) => string): UsedUrl[] {
  if (!c) return [];
  const map = new Map<string, string[]>();
  for (const { ref, where } of collectImageRefs(c, text)) {
    if (ref.__kind__ !== "url") continue;
    const url = ref.url.trim();
    const list = map.get(url) ?? [];
    if (!list.includes(where)) list.push(where);
    map.set(url, list);
  }
  return [...map.entries()].map(([url, where]) => ({ url, where })).sort((a, b) => b.where.length - a.where.length);
}
