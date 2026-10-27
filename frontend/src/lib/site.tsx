import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { backend, type SiteContent } from "./api";

interface SiteState {
  content: SiteContent | null;
  error: string | null;
  reload: () => Promise<void>;
}

const SiteContext = createContext<SiteState | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setContent(await backend.getSiteContent());
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return <SiteContext.Provider value={{ content, error, reload }}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteState {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside SiteProvider");
  return ctx;
}
