import { Link } from "react-router";
import { useI18n } from "../lib/i18n";
import { useSeo } from "../lib/seo";

export function NotFoundPage() {
  const { t } = useI18n();
  useSeo({ title: t("notFound.title"), noindex: true });
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6 pt-24">
      <div className="glass max-w-lg rounded-3xl p-10 text-center">
        <div className="text-gradient text-8xl font-extrabold">404</div>
        <h1 className="mt-4 text-2xl font-bold text-white">{t("notFound.title")}</h1>
        <p className="mt-3 text-slate-400">{t("notFound.text")}</p>
        <Link to="/" className="btn btn-primary mt-8">
          {t("notFound.back")}
        </Link>
      </div>
    </div>
  );
}
