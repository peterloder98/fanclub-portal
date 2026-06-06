"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TopbarMeta = {
  title: string;
  subtitle?: string;
  className?: string;
};

type TopbarContextValue = {
  meta: TopbarMeta;
  setMeta: (meta: TopbarMeta) => void;
};

const TopbarContext = createContext<TopbarContextValue | null>(null);

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<TopbarMeta>({ title: "" });

  const setMeta = useCallback((next: TopbarMeta) => {
    setMetaState(next);
  }, []);

  const value = useMemo(() => ({ meta, setMeta }), [meta, setMeta]);

  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}

export function useTopbarMeta() {
  const ctx = useContext(TopbarContext);
  if (!ctx) {
    throw new Error("useTopbarMeta must be used within TopbarProvider");
  }
  return ctx;
}
