import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ImageRef } from "../../lib/api";
import { SmartImage } from "../../components/SmartImage";
import { useAdminLanguage } from "../language";
import { Badge } from "./ui";

let openDrawers = 0;
let originalOverflow = "";

export interface CollectionSummary {
  title: string;
  subtitle?: string;
  image?: ImageRef;
  icon?: ReactNode;
  badges?: { text: string; tone?: "slate" | "green" | "amber" | "red" }[];
}

export function CollectionRow({ summary, actions, onOpen }: { summary: CollectionSummary; actions: ReactNode; onOpen?: () => void }) {
  const { t } = useAdminLanguage();
  return <li className="glass flex flex-wrap items-center gap-4 rounded-2xl p-3 pr-4 sm:flex-nowrap">
    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-white/5">
      {summary.image ? <SmartImage image={summary.image} className="h-full w-full object-cover" fallbackClassName="h-full w-full" /> :
        <div className="flex h-full w-full items-center justify-center text-brand-300">{summary.icon}</div>}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        {onOpen ? <button type="button" className="truncate text-left font-semibold text-white hover:text-brand-200" onClick={onOpen}>{summary.title || t("(untitled)")}</button> :
          <span className="truncate font-semibold text-white">{summary.title || t("(untitled)")}</span>}
        {summary.badges?.map((badge) => <Badge key={badge.text} tone={badge.tone}>{badge.text}</Badge>)}
      </div>
      {summary.subtitle && <p className="mt-0.5 truncate text-sm text-slate-400">{summary.subtitle}</p>}
    </div>
    <div className="flex w-full shrink-0 flex-wrap justify-end gap-2 sm:w-auto sm:max-w-xs">{actions}</div>
  </li>;
}

export function CollectionDrawer({ open, title, busy = false, active = true, onClose, children, footer, initialFocus }: {
  open: boolean; title: string; busy?: boolean; active?: boolean; onClose: () => void;
  children: ReactNode; footer: ReactNode; initialFocus?: RefObject<HTMLElement | null>;
}) {
  const { t } = useAdminLanguage();
  const panel = useRef<HTMLElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const latest = useRef({ busy, active, onClose, initialFocus });
  latest.current = { busy, active, onClose, initialFocus };
  useEffect(() => {
    if (!open) {
      // Remember the trigger before asynchronous actions disable it.
      const rememberFocus = (event: FocusEvent) => {
        if (event.target instanceof HTMLElement && event.target !== document.body) restoreFocus.current = event.target;
      };
      document.addEventListener("focusin", rememberFocus);
      return () => document.removeEventListener("focusin", rememberFocus);
    }
    const previousFocus = restoreFocus.current ?? document.activeElement;
    if (openDrawers === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDrawers += 1;
    const frame = requestAnimationFrame(() => {
      const target = latest.current.initialFocus?.current;
      if (target) target.scrollIntoView({ block: "start" });
      (target && !target.matches(":disabled") ? target : panel.current)?.focus({ preventScroll: true });
    });
    function keydown(event: KeyboardEvent) {
      if (!latest.current.active) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!latest.current.busy) latest.current.onClose();
      } else if (event.key === "Tab" && panel.current) {
        const controls = [...panel.current.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], iframe, [tabindex]")].
          filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (!first) { event.preventDefault(); panel.current.focus(); }
        else if (!panel.current.contains(document.activeElement)) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
          event.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keydown);
      openDrawers -= 1;
      if (openDrawers === 0) document.body.style.overflow = originalOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  return createPortal(<AnimatePresence>{open && <motion.div className="fixed inset-0 z-[90] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} inert={!active} aria-hidden={!active || undefined}>
    <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => { if (!busy) onClose(); }} />
    <motion.aside ref={panel} tabIndex={-1} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 260 }} className="glass-strong relative flex h-full w-full max-w-3xl flex-col"
      role="dialog" aria-modal="true" aria-label={title}>
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <h2 className="min-w-0 truncate text-lg font-bold text-white">{title}</h2>
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-50" aria-label={t("Close")}>
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 scrollbar-thin">{children}</div>
      <footer className="flex flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-4">{footer}</footer>
    </motion.aside>
  </motion.div>}</AnimatePresence>, document.body);
}
