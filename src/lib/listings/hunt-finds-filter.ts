import type { AlertScope, MatchQualityLevel } from "@/lib/listings/types";
import type { Hunt } from "@/lib/hunts/types";

export function toggleArrayValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function toggleAllHuntIds(
  activeHuntIds: string[],
  selectedHuntIds: string[]
): string[] {
  if (activeHuntIds.length === 0) return [];
  const allSelected = activeHuntIds.every((id) => selectedHuntIds.includes(id));
  return allSelected ? [] : [...activeHuntIds];
}

export function migrateSelectedHuntIds(
  hunts: Hunt[],
  raw?: {
    selectedHuntIds?: string[];
    alertScope?: AlertScope;
  }
): string[] {
  if (raw?.selectedHuntIds?.length) return raw.selectedHuntIds;
  const scope = raw?.alertScope;
  if (!scope || scope === "all") return [];
  if (scope === "watchlist") {
    return hunts.filter((h) => h.saved && !h.archived).map((h) => h.id);
  }
  if (scope.startsWith("hunt:")) return [scope.slice(5)];
  return [];
}

export function migrateSelectedMatchQualities(raw?: {
  selectedMatchQualities?: MatchQualityLevel[];
  matchQualityFilter?: string;
}): MatchQualityLevel[] {
  if (raw?.selectedMatchQualities?.length) return raw.selectedMatchQualities;
  const legacy = raw?.matchQualityFilter;
  if (legacy === "perfect" || legacy === "close" || legacy === "loose") {
    return [legacy];
  }
  return [];
}

export function hasHuntFindsFilters(
  selectedHuntIds: string[],
  selectedMatchQualities: MatchQualityLevel[]
): boolean {
  return selectedHuntIds.length > 0 || selectedMatchQualities.length > 0;
}
