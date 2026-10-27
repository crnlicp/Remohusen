import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Calendar } from "lucide-react";
import { backend, nsToDate, type NewsPost } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useSite } from "../lib/site";
import { absoluteImageUrl, siteBaseUrl, useSeo, type PageSeo } from "../lib/seo";
import { PageHero, Reveal, Spinner } from "../components/Layout";
import { NewsCard } from "../components/NewsCard";
import { SmartImage } from "../components/SmartImage";

export function NewsListPage() {
  const { t } = useI18n();
  useSeo({ page: "news", breadcrumbs: [{ name: t("nav.news"), path: "/nyheter" }] });
  const [posts, setPosts] = useState<NewsPost[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    backend.listNews().then(setPosts, () => setError(true));
  }, []);

  return (
    <>
      <PageHero eyebrow={t("home.news.eyebrow")} title={t("news.title")} text={t("news.subtitle")} />
      <section className="mx-auto max-w-7xl px-6">
        {error ? (
          <p className="text-center text-slate-400">{t("common.error")}</p>
        ) : !posts ? (
          <Spinner />
        ) : posts.length === 0 ? (
          <p className="glass mx-auto max-w-md rounded-3xl p-8 text-center text-slate-400">{t("news.empty")}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <Reveal key={p.id.toString()} delay={(i % 3) * 0.08}>
                <NewsCard post={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function NewsDetailPage() {
  const { id } = useParams();
  const { t, tr, formatDate } = useI18n();
  const { content } = useSite();
  const [post, setPost] = useState<NewsPost | null | undefined>(undefined);

  useEffect(() => {
    setPost(undefined);
    let parsed: bigint;
    try {
      parsed = BigInt(id ?? "");
    } catch {
      setPost(null);
      return;
    }
    backend.getNewsPost(parsed).then(setPost, () => setPost(null));
  }, [id]);

  useSeo(newsPostSeo(post, id, t("nav.news"), tr, siteBaseUrl(content), content?.settings.companyName ?? "Remohusen"));

  if (post === undefined) return <div className="pt-32"><Spinner label={t("common.loading")} /></div>;
  if (post === null) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-40 text-center">
        <p className="glass rounded-3xl p-8 text-slate-300">{t("news.notFound")}</p>
        <Link to="/nyheter" className="btn btn-ghost mt-6">
          <ArrowLeft className="h-4 w-4" /> {t("news.back")}
        </Link>
      </div>
    );
  }

  return (
    <article className="pb-8">
      <PageHero title={tr(post.title)} image={post.cover} />
      <div className="mx-auto -mt-6 max-w-3xl px-6">
        <Reveal className="glass rounded-3xl p-8 sm:p-12">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link to="/nyheter" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-300 hover:text-brand-200">
              <ArrowLeft className="h-4 w-4" /> {t("news.back")}
            </Link>
            <span className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="h-4 w-4" /> {formatDate(nsToDate(post.publishedAt))}
            </span>
          </div>
          {tr(post.excerpt) && <p className="mb-8 text-xl font-medium leading-relaxed text-slate-200">{tr(post.excerpt)}</p>}
          {post.cover && (
            <SmartImage
              image={post.cover}
              alt={tr(post.title)}
              className="mb-8 w-full rounded-2xl object-cover"
              fallbackClassName="mb-8 aspect-video w-full rounded-2xl"
            />
          )}
          <div className="prose-news text-lg text-slate-300">
            {tr(post.body)
              .split(/\n{2,}/)
              .map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
          </div>
        </Reveal>
      </div>
    </article>
  );
}

function newsPostSeo(
  post: NewsPost | null | undefined,
  id: string | undefined,
  newsLabel: string,
  tr: (v: NewsPost["title"]) => string,
  base: string,
  company: string,
): PageSeo {
  if (post === undefined) return { page: "news" };
  if (post === null) return { title: newsLabel, noindex: true };
  const title = tr(post.title);
  const body = tr(post.body);
  const description = tr(post.excerpt) || body.slice(0, 200);
  const image = absoluteImageUrl(post.cover);
  const published = nsToDate(post.publishedAt).toISOString();
  const modified = nsToDate(post.updatedAt).toISOString();
  const path = `/nyheter/${id}`;
  return {
    title,
    description,
    image,
    type: "article",
    publishedTime: published,
    modifiedTime: modified,
    breadcrumbs: [
      { name: newsLabel, path: "/nyheter" },
      { name: title, path },
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title.slice(0, 110),
        description,
        image: image ? [image] : [`${base}/og-image.png`],
        datePublished: published,
        dateModified: modified,
        mainEntityOfPage: `${base}${path}`,
        author: { "@type": "Organization", name: company, url: `${base}/` },
        publisher: { "@id": `${base}/#business` },
      },
    ],
  };
}
