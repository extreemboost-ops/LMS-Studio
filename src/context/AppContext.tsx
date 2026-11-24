import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Route, ModalType } from "../types/content.types";

interface AppContextValue {
  route: Route;
  navigate: (r: Route) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  mobileNav: boolean;
  setMobileNav: (v: boolean | ((prev: boolean) => boolean)) => void;
  modal: ModalType;
  setModal: (m: ModalType) => void;
  modalTargetId: string | null;
  setModalTargetId: (id: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
  toast: string;
  notify: (msg: string) => void;
  clearToast: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const navigate = (next: Route) => {
    setRoute(next);
    setMobileNav(false);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const clearToast = () => setToast("");

  return (
    <AppContext.Provider
      value={{
        route,
        navigate,
        sidebarOpen,
        setSidebarOpen,
        mobileNav,
        setMobileNav,
        modal,
        setModal,
        modalTargetId,
        setModalTargetId,
        search,
        setSearch,
        toast,
        notify,
        clearToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
