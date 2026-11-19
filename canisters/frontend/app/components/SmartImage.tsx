import { useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import type { ImageRef } from "../lib/api";
import { useImageSrc } from "../lib/images";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  image: ImageRef | null | undefined;
  /** Classes for the placeholder shown while loading / on error. */
  fallbackClassName?: string;
};

/** Renders an ImageRef: external URLs load directly, uploaded images stream from the backend canister. */
export function SmartImage({ image, className = "", fallbackClassName, alt = "", ...rest }: Props) {
  const { src, error } = useImageSrc(image);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const broken = error || (src !== undefined && failedSrc === src);

  if (!image || broken) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900 text-slate-500 ${fallbackClassName ?? className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="h-8 w-8 opacity-60" />
      </div>
    );
  }
  if (!src) {
    return <div className={`animate-pulse bg-white/5 ${fallbackClassName ?? className}`} aria-busy="true" />;
  }
  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      loading={rest.loading ?? "lazy"}
      onError={() => setFailedSrc(src)}
      onLoad={() => setLoadedSrc(src)}
      className={`${className} transition-opacity duration-500 ${loadedSrc === src ? "opacity-100" : "opacity-0"}`}
    />
  );
}
