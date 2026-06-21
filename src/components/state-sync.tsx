"use client";

import { useEffect, useRef } from "react";
import type { AlertScope } from "@/lib/listings/types";
import type { Hunt, PurchasedWatch } from "@/lib/hunts/types";
import { normalizeHunt, emptyHuntAttributes } from "@/lib/hunts/types";
import { withInferredHuntCriteria } from "@/lib/hunts/domain-terms";
import { normalizePurchasedWatch, mergeDefaultPurchasedWatches } from "@/lib/hunts/purchased-watch";
import { normalizeAllowedConditions } from "@/lib/listings/condition-filter";
import {
  migrateSelectedHuntIds,
  migrateSelectedMatchQualities,
} from "@/lib/listings/hunt-finds-filter";
import { useCasebackStore, migrateModelHeartsToHunts, type FeedView } from "@/store/caseback";
import type { PersistedState } from "@/lib/persistence/types";
import { isPersistedStateEmpty, mergeAttributeLibraries, mergeAttributeHidden } from "@/lib/persistence/state-utils";

function migrateFeedView(raw: string | undefined): FeedView {
  if (raw === "interested" || raw === "starred") return "starred";
  if (raw === "dismissed") return "dismissed";
  if (raw === "all") return "all";
  return "new";
}

function pickPersistedState(): PersistedState {
  const s = useCasebackStore.getState();
  return {
    seen: s.seen,
    dismissed: s.dismissed,
    listingStatus: s.listingStatus,
    selectedHuntIds: s.selectedHuntIds,
    selectedMatchQualities: s.selectedMatchQualities,
    marketplaceFilter: s.marketplaceFilter,
    feedView: s.feedView,
    hiddenListings: s.hiddenListings,
    dislikedModels: s.dislikedModels,
    criteria: s.criteria,
    hunts: s.hunts,
    globalFilters: s.globalFilters,
    savedGlobalFilters: s.savedGlobalFilters,
    purchasedWatches: s.purchasedWatches,
    attributeLibrary: s.attributeLibrary ?? {},
    attributeHidden: s.attributeHidden ?? {},
    feedAttributeFilters: s.feedAttributeFilters ?? emptyHuntAttributes(),
  };
}

function applyPersistedState(
  state: PersistedState & {
    feedView?: string;
    modelHearts?: Record<string, number>;
    alertScope?: AlertScope;
    matchQualityFilter?: string;
  }
) {
  const hunts = migrateModelHeartsToHunts(
    (state.hunts ?? []).map((h) => withInferredHuntCriteria(normalizeHunt(h as Hunt))),
    state.modelHearts
  );
  const globalFilters = {
    ...useCasebackStore.getState().globalFilters,
    ...(state.globalFilters ?? {}),
    allowedConditions: normalizeAllowedConditions(
      state.globalFilters?.allowedConditions,
      state.criteria?.excludeForParts
    ),
  };
  const criteria = {
    ...(state.criteria ?? useCasebackStore.getState().criteria),
    allowedConditions: globalFilters.allowedConditions,
    excludeForParts: !globalFilters.allowedConditions.includes("For parts / project"),
  };
  const savedGlobalFilters = {
    ...globalFilters,
    ...(state.savedGlobalFilters ?? {}),
    allowedConditions: normalizeAllowedConditions(
      state.savedGlobalFilters?.allowedConditions ?? globalFilters.allowedConditions,
      state.criteria?.excludeForParts
    ),
  };
  const hasDismissedField = state.dismissed != null;
  useCasebackStore.setState({
    seen: hasDismissedField ? (state.seen ?? []) : [],
    dismissed: hasDismissedField ? (state.dismissed ?? []) : (state.seen ?? []),
    listingStatus: state.listingStatus ?? {},
    selectedHuntIds: migrateSelectedHuntIds(hunts, state),
    selectedMatchQualities: migrateSelectedMatchQualities(state),
    marketplaceFilter: state.marketplaceFilter ?? "all",
    feedView: migrateFeedView(state.feedView),
    hiddenListings: state.hiddenListings ?? [],
    dislikedModels: state.dislikedModels ?? [],
    criteria,
    hunts,
    globalFilters,
    savedGlobalFilters,
    purchasedWatches: mergeDefaultPurchasedWatches(
      (state.purchasedWatches ?? []).map((p) =>
        normalizePurchasedWatch(p as PurchasedWatch)
      )
    ),
    attributeLibrary: mergeAttributeLibraries(
      useCasebackStore.getState().attributeLibrary,
      state.attributeLibrary
    ),
    attributeHidden: mergeAttributeHidden(
      useCasebackStore.getState().attributeHidden,
      state.attributeHidden
    ),
    feedAttributeFilters: state.feedAttributeFilters ?? emptyHuntAttributes(),
  });
}

export function StateSync() {
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverLoaded = useRef(false);

  useEffect(() => {
    async function loadFromServer() {
      if (serverLoaded.current) return;
      serverLoaded.current = true;

      try {
        const res = await fetch("/api/state");
        if (res.status === 401) {
          hydrated.current = true;
          return;
        }
        if (!res.ok) {
          hydrated.current = true;
          return;
        }

        const state = (await res.json()) as PersistedState;
        const local = pickPersistedState();

        if (isPersistedStateEmpty(state) && !isPersistedStateEmpty(local)) {
          await fetch("/api/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(local),
          });
          hydrated.current = true;
          return;
        }

        applyPersistedState(state);
        hydrated.current = true;
      } catch {
        hydrated.current = true;
      }
    }

    const finishHydration = () => {
      void loadFromServer();
    };

    if (useCasebackStore.persist.hasHydrated()) {
      finishHydration();
    } else {
      useCasebackStore.persist.onFinishHydration(finishHydration);
    }
  }, []);

  useEffect(() => {
    const unsub = useCasebackStore.subscribe(() => {
      if (!hydrated.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pickPersistedState()),
        }).catch(() => {});
      }, 800);
    });
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return null;
}
