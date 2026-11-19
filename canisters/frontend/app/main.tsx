import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import { I18nProvider } from "./lib/i18n";
import { SiteProvider } from "./lib/site";
import { PublicLayout, Spinner } from "./components/Layout";
import { HomePage } from "./pages/Home";
import { AboutPage } from "./pages/About";
import { NewsDetailPage, NewsListPage } from "./pages/News";
import { ContactPage } from "./pages/Contact";
import { NotFoundPage } from "./pages/NotFound";

const AdminApp = lazy(() => import("./admin/AdminApp"));
const SharedDocumentPage = lazy(() => import("./pages/SharedDocument"));

if (["/documents", "/documents.html"].includes(window.location.pathname)) {
  document.title = "Document / Dokument";
  for (const [name, content] of [["robots", "noindex, nofollow, noarchive"], ["referrer", "no-referrer"]]) {
    const meta = document.createElement("meta");
    meta.name = name; meta.content = content; document.head.append(meta);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/documents" element={<Suspense fallback={<Spinner />}><SharedDocumentPage /></Suspense>} />
        <Route path="/documents.html" element={<Suspense fallback={<Spinner />}><SharedDocumentPage /></Suspense>} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<Spinner />}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route
          element={
            <I18nProvider>
              <SiteProvider>
                <PublicLayout />
              </SiteProvider>
            </I18nProvider>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="om-oss" element={<AboutPage />} />
          <Route path="nyheter" element={<NewsListPage />} />
          <Route path="nyheter/:id" element={<NewsDetailPage />} />
          <Route path="kontakt" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
