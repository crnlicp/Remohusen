import { Route, Routes } from "react-router";
import { AdminNotFound, AdminRoot } from "./AdminLayout";
import { NewsPage, ProjectsPage, ServicesPage, SlidesPage, TestimonialsPage } from "./pages/Collections";
import { AboutEditorPage, ContactEditorPage, SettingsEditorPage } from "./pages/Editors";
import { AccountPage, DashboardPage, ImagesPage, MessagesPage } from "./pages/Misc";
import { lazy, Suspense } from "react";
import { Spinner } from "../components/Layout";

const DocumentsPage = lazy(() => import("./pages/Documents"));

export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminRoot />}>
        <Route index element={<DashboardPage />} />
        <Route path="documents" element={<Suspense fallback={<Spinner />}><DocumentsPage /></Suspense>} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="slides" element={<SlidesPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="testimonials" element={<TestimonialsPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="about" element={<AboutEditorPage />} />
        <Route path="contact" element={<ContactEditorPage />} />
        <Route path="settings" element={<SettingsEditorPage />} />
        <Route path="images" element={<ImagesPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<AdminNotFound />} />
      </Route>
    </Routes>
  );
}
