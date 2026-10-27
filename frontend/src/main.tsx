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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
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
