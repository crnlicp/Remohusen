import { safeGetCanisterEnv } from "@icp-sdk/core/agent/canister-env";
import { createActor } from "../bindings/backend";
import type { ImageRef, L10n } from "../bindings/backend";

export type * from "../bindings/backend";

interface CanisterEnv {
  readonly "PUBLIC_CANISTER_ID:backend": string;
}

const canisterEnv = safeGetCanisterEnv<CanisterEnv>();

if (!canisterEnv?.["PUBLIC_CANISTER_ID:backend"]) {
  console.error("Missing ic_env cookie: backend canister id is unknown. Serve the app from the asset canister or `npm run dev`.");
}

export const backend = createActor(canisterEnv?.["PUBLIC_CANISTER_ID:backend"] ?? "", {
  agentOptions: { rootKey: canisterEnv?.IC_ROOT_KEY },
});

type AnyResult<T> = { __kind__: "ok"; ok: T } | { __kind__: "err"; err: string };

export class ApiError extends Error {}

/** Unwraps a candid Result variant, throwing an ApiError with the canister's message on `err`. */
export function unwrap<T>(result: AnyResult<T>): T {
  if (result.__kind__ === "err") throw new ApiError(result.err);
  return result.ok;
}

export const emptyL10n = (): L10n => ({ sv: "", en: "" });

export const urlRef = (url: string): ImageRef => ({ __kind__: "url", url });
export const storedRef = (id: bigint): ImageRef => ({ __kind__: "stored", stored: id });

/** Nanoseconds (canister Time) to JS Date. */
export const nsToDate = (ns: bigint): Date => new Date(Number(ns / 1_000_000n));
