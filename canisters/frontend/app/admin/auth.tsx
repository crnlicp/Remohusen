import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, backend, nsToDate, unwrap, type AdminContent } from "../lib/api";

const TOKEN_KEY = "remohusen.admin.token";

interface Session {
  token: string;
  username: string;
  expiresAt: Date;
}

interface AdminState {
  session: Session | null;
  checking: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Runs an authenticated call; logs out automatically if the canister reports an invalid session. */
  call: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
  content: AdminContent | null;
  reloadContent: () => Promise<void>;
}

const AdminContext = createContext<AdminState | null>(null);

const isAuthError = (e: unknown) => e instanceof ApiError && /unauthori[sz]ed|log in/i.test(e.message);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [content, setContent] = useState<AdminContent | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const clear = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setSession(null);
    setContent(null);
  }, []);

  const restore = useCallback(async (token: string) => {
    const info = await backend.sessionInfo(token);
    if (!info) throw new ApiError("Session expired");
    setSession({ token, username: info.username, expiresAt: nsToDate(info.expiresAt) });
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setChecking(false);
      return;
    }
    restore(token)
      .catch(clear)
      .finally(() => setChecking(false));
  }, [restore, clear]);

  useEffect(() => {
    if (!session) return;
    const ms = session.expiresAt.getTime() - Date.now();
    const id = window.setTimeout(clear, Math.max(0, Math.min(ms, 2 ** 31 - 1)));
    return () => window.clearTimeout(id);
  }, [session, clear]);

  const login = useCallback(
    async (username: string, password: string) => {
      const token = unwrap(await backend.login(username, password));
      sessionStorage.setItem(TOKEN_KEY, token);
      await restore(token);
    },
    [restore],
  );

  const logout = useCallback(async () => {
    const token = sessionRef.current?.token;
    clear();
    if (token) await backend.logout(token).catch(() => {});
  }, [clear]);

  const call = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      const token = sessionRef.current?.token;
      if (!token) throw new ApiError("Unauthorized: please log in again");
      try {
        return await fn(token);
      } catch (e) {
        if (isAuthError(e)) clear();
        throw e;
      }
    },
    [clear],
  );

  const reloadContent = useCallback(async () => {
    setContent(await call(async (token) => unwrap(await backend.adminGetContent(token))));
  }, [call]);

  useEffect(() => {
    if (session) void reloadContent().catch(console.error);
  }, [session, reloadContent]);

  const value = useMemo<AdminState>(
    () => ({ session, checking, login, logout, call, content, reloadContent }),
    [session, checking, login, logout, call, content, reloadContent],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminState {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}
