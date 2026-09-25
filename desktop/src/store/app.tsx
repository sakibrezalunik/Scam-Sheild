/**
 * ScamShield Desktop — App Navigation Context
 *
 * In-memory navigation state with back-stack support.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AppView } from "../types";

interface AppContextType {
  view: AppView;
  navigate: (view: AppView) => void;
  goBack: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const navStack: AppView[] = [];

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>({ kind: "home" });

  const navigate = useCallback((v: AppView) => {
    const current = view;
    if (current.kind !== v.kind || JSON.stringify(current) !== JSON.stringify(v)) {
      navStack.push(current);
    }
    setView(v);
  }, [view]);

  const goBack = useCallback(() => {
    navStack.pop();
    const prev = navStack[navStack.length - 1] ?? { kind: "home" };
    setView(prev);
  }, []);

  return (
    <AppContext.Provider value={{ view, navigate, goBack }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
