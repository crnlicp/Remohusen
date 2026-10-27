import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ImageRef } from "../lib/api";
import { SmartImage } from "./SmartImage";

interface Props {
  images: ImageRef[];
  index: number | null;
  title?: string;
  onChange: (index: number | null) => void;
}

export function Lightbox({ images, index, title, onChange }: Props) {
  const open = index !== null && images.length > 0;
  const go = useCallback(
    (d: number) => index !== null && onChange((index + d + images.length) % images.length),
    [index, images.length, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChange(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, go, onChange]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-950/90 p-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onChange(null)}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10" aria-label="Close">
            <X className="h-7 w-7" />
          </button>
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-h-[80vh] max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SmartImage
              image={images[index]}
              alt={title}
              loading="eager"
              className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl"
              fallbackClassName="h-[60vh] w-[80vw] rounded-2xl"
            />
          </motion.div>
          <div className="mt-4 text-sm text-slate-300" onClick={(e) => e.stopPropagation()}>
            {title && <span className="font-semibold text-white">{title} · </span>}
            {index + 1} / {images.length}
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => (e.stopPropagation(), go(-1))}
                className="glass absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-3 text-white"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => (e.stopPropagation(), go(1))}
                className="glass absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-3 text-white"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
