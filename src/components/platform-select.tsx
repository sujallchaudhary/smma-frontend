"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserConfig } from "@/components/user-config-provider";

/**
 * All known platforms with display labels.
 * Pages may optionally supply `extraPlatforms` for non-social entries
 * (e.g. "youtube", "whatsapp", "threads") that are not gated by UserConfig.
 */
const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  threads: "Threads",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
};

interface PlatformSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Additional platform ids to always show (not gated by config). */
  extraPlatforms?: string[];
  /** When true, adds an "All Platforms" option with value "all". */
  showAll?: boolean;
}

export function PlatformSelect({
  value,
  onValueChange,
  extraPlatforms = [],
  showAll = false,
}: PlatformSelectProps) {
  const { enabledPlatforms } = useUserConfig();

  // Build options: enabled platforms + any extra ungated ones
  const ids = new Set(enabledPlatforms.map((p) => p.id));
  for (const ep of extraPlatforms) {
    ids.add(ep);
  }

  const options = Array.from(ids).map((id) => ({
    id,
    label: PLATFORM_LABELS[id] || id,
  }));

  // If current value is no longer in the list, auto-select first
  const validValue =
    value === "all" && showAll
      ? "all"
      : options.find((o) => o.id === value)
        ? value
        : options[0]?.id || "";

  if (validValue !== value) {
    // Schedule a value change on next tick to avoid setState during render
    setTimeout(() => onValueChange(validValue), 0);
  }

  return (
    <Select value={validValue} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="all">All Platforms</SelectItem>}
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Hook to get only the enabled platform ids.
 * Useful for autopilot page PlatformToggle which doesn't use a Select.
 */
export function useEnabledPlatformIds(): Set<string> {
  const { enabledPlatforms } = useUserConfig();
  return new Set(enabledPlatforms.map((p) => p.id));
}
