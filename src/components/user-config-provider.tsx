"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { settingsApi, type UserConfigData } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────

export interface PlatformOption {
  id: string;
  label: string;
}

/** All known platforms with display labels. */
const ALL_PLATFORMS: PlatformOption[] = [
  { id: "instagram", label: "Instagram" },
  { id: "twitter", label: "Twitter / X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
];

/** Maps sidebar nav feature keys to UserConfig.features keys. */
export type FeatureKey = keyof UserConfigData["features"];

// ─── Context ───────────────────────────────────────────────────────

interface UserConfigContextType {
  config: UserConfigData | null;
  loading: boolean;
  /** Re-fetch config (e.g. after admin updates). */
  refresh: () => Promise<void>;
  /** Returns only the platforms enabled for this user. */
  enabledPlatforms: PlatformOption[];
  /** Check if a specific feature module is enabled. */
  isFeatureEnabled: (key: FeatureKey) => boolean;
  /** Check if a specific platform is enabled. */
  isPlatformEnabled: (id: string) => boolean;
}

const UserConfigContext = createContext<UserConfigContextType | undefined>(
  undefined
);

// ─── Provider ──────────────────────────────────────────────────────

export function UserConfigProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [config, setConfig] = useState<UserConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!token) {
      setConfig(null);
      setLoading(false);
      return;
    }
    try {
      const res = await settingsApi.getMyConfig();
      setConfig(res.data ?? null);
    } catch {
      console.error("Failed to load user config");
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchConfig();
    } else {
      setConfig(null);
      setLoading(false);
    }
  }, [user, token, fetchConfig]);

  const enabledPlatforms = config
    ? ALL_PLATFORMS.filter(
        (p) => config.platforms[p.id as keyof UserConfigData["platforms"]]
      )
    : ALL_PLATFORMS; // fallback: show all if config not loaded

  const isFeatureEnabled = useCallback(
    (key: FeatureKey): boolean => {
      if (!config) return true; // fallback: show all if no config
      return config.features[key] !== false;
    },
    [config]
  );

  const isPlatformEnabled = useCallback(
    (id: string): boolean => {
      if (!config) return true; // fallback
      return (
        config.platforms[id as keyof UserConfigData["platforms"]] !== false
      );
    },
    [config]
  );

  return (
    <UserConfigContext.Provider
      value={{
        config,
        loading,
        refresh: fetchConfig,
        enabledPlatforms,
        isFeatureEnabled,
        isPlatformEnabled,
      }}
    >
      {children}
    </UserConfigContext.Provider>
  );
}

// ─── Hooks ─────────────────────────────────────────────────────────

export function useUserConfig() {
  const ctx = useContext(UserConfigContext);
  if (!ctx)
    throw new Error("useUserConfig must be used within UserConfigProvider");
  return ctx;
}
