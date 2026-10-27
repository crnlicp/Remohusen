import { useEffect, useState } from "react";
import { backend, unwrap, type ImageInfo, type ImageRef } from "./api";

const cache = new Map<string, Promise<string>>();

async function fetchStored(id: bigint): Promise<string> {
  const info = await backend.getImageInfo(id);
  if (!info) throw new Error(`Image #${id} not found`);
  const chunks = await Promise.all(
    Array.from({ length: Number(info.chunkCount) }, async (_, i) => {
      const chunk = await backend.getImageChunk(id, BigInt(i));
      if (!chunk) throw new Error(`Missing chunk ${i} of image #${id}`);
      return chunk;
    }),
  );
  const blob = new Blob(chunks as BlobPart[], { type: info.mime });
  return URL.createObjectURL(blob);
}

/** Resolves a stored image id to an object URL; results are cached for the session. */
export function loadStoredImage(id: bigint): Promise<string> {
  const key = id.toString();
  let p = cache.get(key);
  if (!p) {
    p = fetchStored(id);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export function forgetStoredImage(id: bigint) {
  const key = id.toString();
  const p = cache.get(key);
  cache.delete(key);
  p?.then((u) => URL.revokeObjectURL(u)).catch(() => {});
}

/** Returns a renderable src for an ImageRef: URL refs pass through; stored refs load from the canister. */
export function useImageSrc(ref: ImageRef | null | undefined): { src: string | undefined; error: boolean } {
  const direct = ref?.__kind__ === "url" ? ref.url : undefined;
  const storedId = ref?.__kind__ === "stored" ? ref.stored : undefined;
  const [state, setState] = useState<{ key?: string; src?: string; error: boolean }>({ error: false });

  useEffect(() => {
    if (storedId === undefined) return;
    let alive = true;
    const key = storedId.toString();
    loadStoredImage(storedId).then(
      (src) => alive && setState({ key, src, error: false }),
      () => alive && setState({ key, error: true }),
    );
    return () => {
      alive = false;
    };
  }, [storedId]);

  if (direct !== undefined) return { src: direct, error: false };
  if (storedId !== undefined && state.key === storedId.toString()) return { src: state.src, error: state.error };
  return { src: undefined, error: false };
}

export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const CHUNK_SIZE = 1_800_000;
const MAX_DIMENSION = 1920;

/** Downscales large raster images in the browser so uploads stay small. GIFs are kept as-is to preserve animation. */
export async function prepareImage(file: File): Promise<{ data: Uint8Array; mime: string; name: string }> {
  if (!ACCEPTED_MIME.includes(file.type)) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, GIF or AVIF.");
  }
  const original = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/gif") return { data: original, mime: file.type, name: file.name };

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return { data: original, mime: file.type, name: file.name };
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.85));
    if (!blob || blob.size >= file.size) return { data: original, mime: file.type, name: file.name };
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return { data: new Uint8Array(await blob.arrayBuffer()), mime: "image/webp", name };
  } catch {
    return { data: original, mime: file.type, name: file.name };
  }
}

export async function uploadImage(
  token: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ImageInfo> {
  const { data, mime, name } = await prepareImage(file);
  if (data.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is larger than 10 MB.");
  const uploadId = unwrap(await backend.adminBeginUpload(token, name.slice(0, 200), mime, BigInt(data.byteLength)));
  const total = Math.max(1, Math.ceil(data.byteLength / CHUNK_SIZE));
  for (let i = 0; i < total; i++) {
    const slice = data.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    unwrap(await backend.adminUploadChunk(token, uploadId, BigInt(i), slice));
    onProgress?.((i + 1) / total);
  }
  return unwrap(await backend.adminFinishUpload(token, uploadId));
}

/** Mirrors the canister's URL validation so admins get instant feedback. */
export function validateImageUrl(url: string): string | null {
  const u = url.trim();
  if (!u) return "Enter an image URL";
  if (u.length > 2048) return "URL is too long";
  if (/[\s"<>]/.test(u)) return "URL contains invalid characters";
  if (u.startsWith("https://") && u.length > 8) return null;
  if (/^http:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(u)) return null;
  return "URL must start with https://";
}
