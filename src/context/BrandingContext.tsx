import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiClient } from "../services/api-client";

export interface WhiteLabelBrandingDto {
  isWhiteLabeled: boolean;
  distributorId: string | null;
  appName: string;
  appSubtitle: string;
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  supportEmail: string;
  hidePoweredBy: boolean;
  customDomain: string | null;
}

const DEFAULT_BRANDING: WhiteLabelBrandingDto = {
  isWhiteLabeled: false,
  distributorId: null,
  appName: "SCORM & H5P",
  appSubtitle: "STUDIO",
  primaryColor: "#2563eb",
  logoUrl: null,
  faviconUrl: null,
  supportEmail: "support@scorm-h5p-studio.local",
  hidePoweredBy: false,
  customDomain: null,
};

interface BrandingContextValue {
  branding: WhiteLabelBrandingDto;
  refreshBranding: (slugOrDomain?: { slug?: string; domain?: string }) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<WhiteLabelBrandingDto>(DEFAULT_BRANDING);

  const applyBrandingToDom = (next: WhiteLabelBrandingDto) => {
    if (!next.isWhiteLabeled) return;
    document.title = `${next.appName} — ${next.appSubtitle}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(next.primaryColor)) {
      document.documentElement.style.setProperty("--accent", next.primaryColor);
    }
  };

  const refreshBranding = async (opts?: { slug?: string; domain?: string }) => {
    try {
      const params = new URLSearchParams();
      if (opts?.slug) {
        params.set("slug", opts.slug);
      } else if (opts?.domain) {
        params.set("domain", opts.domain);
      } else if (typeof window !== "undefined") {
        const urlSlug = new URLSearchParams(window.location.search).get("partner");
        if (urlSlug) params.set("slug", urlSlug);
        else params.set("domain", window.location.hostname);
      }

      const res = await fetch(`${ApiClient.getBaseUrl()}/public/branding?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success && json.data?.branding) {
        setBranding(json.data.branding);
        applyBrandingToDom(json.data.branding);
      }
    } catch {
      // Offline / fallback keeps DEFAULT_BRANDING
    }
  };

  useEffect(() => {
    void refreshBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}
