import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { FrontendAuthService, type UserSummary, type OrganizationSummary } from "../services/auth.service";
import { ApiClient } from "../services/api-client";
import { currentUserProfile } from "../mocks/team.mock";

interface AuthContextValue {
  user: UserSummary | null;
  organization: OrganizationSummary | null;
  organizations: OrganizationSummary[];
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; organizationName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>({
    id: currentUserProfile.id,
    email: currentUserProfile.email,
    firstName: currentUserProfile.firstName,
    lastName: currentUserProfile.lastName,
    isEmailVerified: true,
    role: "OWNER",
  });
  const [organization, setOrganization] = useState<OrganizationSummary | null>({
    id: "org-default-acme",
    name: "Acme Learning",
    slug: "acme-learning",
    plan: "Business plan",
    role: "OWNER",
  });
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([
    {
      id: "org-default-acme",
      name: "Acme Learning",
      slug: "acme-learning",
      plan: "Business plan",
      role: "OWNER",
    },
  ]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Attempt session restoration on mount if access token exists
  useEffect(() => {
    const token = ApiClient.getToken();
    if (token) {
      setIsLoading(true);
      FrontendAuthService.getMe()
        .then((res) => {
          if (res.data) {
            setUser(res.data);
            setIsAuthenticated(true);
          }
        })
        .catch(() => {
          // Token expired or invalid, keep default browsing state
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  const openAuthModal = (mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => setAuthModalOpen(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await FrontendAuthService.login({ email, password });
      if (res.data) {
        setUser(res.data.user);
        if (res.data.organization) {
          setOrganization(res.data.organization);
          setOrganizations([res.data.organization]);
        }
        setIsAuthenticated(true);
        closeAuthModal();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await FrontendAuthService.register(data);
      if (res.data) {
        setUser(res.data.user);
        if (res.data.organization) {
          setOrganization(res.data.organization);
          setOrganizations([res.data.organization]);
        }
        setIsAuthenticated(true);
        closeAuthModal();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await FrontendAuthService.logout();
      setUser(null);
      setOrganization(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    setIsLoading(true);
    try {
      const res = await FrontendAuthService.switchOrganization(orgId);
      if (res.data?.organization) {
        setOrganization(res.data.organization);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        organizations,
        isAuthenticated,
        isLoading,
        authModalOpen,
        openAuthModal,
        closeAuthModal,
        authMode,
        setAuthMode,
        login,
        register,
        logout,
        switchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
