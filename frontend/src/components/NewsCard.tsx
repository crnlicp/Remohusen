import { Link } from "react-router";
import { ArrowRight, Calendar } from "lucide-react";
import type { NewsPost } from "../lib/api";
import { nsToDate } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { SmartImage } from "./SmartImage";

export function NewsCard({ post }: { post: NewsPost }) {
  const { tr, t, formatDate } = useI18n();
  return (
    <Link
      to={`/nyheter/${post.id}`}
      className="glass group flex h-full flex-col overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:border-brand-400/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <SmartImage
          image={post.cover}
          alt={tr(post.title)}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          fallbackClassName="h-full w-full"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <span className="flex items-center gap-2 text-xs font-medium text-brand-300">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(nsToDate(post.publishedAt))}
        </span>
        <h3 className="mt-3 text-xl font-bold leading-snug text-white">{tr(post.title)}</h3>
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">{tr(post.excerpt)}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-300 transition group-hover:gap-3">
          {t("cta.readMore")} <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
