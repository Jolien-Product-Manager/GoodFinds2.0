"use client";

import { useEffect, useRef } from "react";
import { useCasebackStore, migrateModelHeartsToHunts, type FeedView } from "@/store/caseback";
import type { PersistedState } from "@/lib/persistence/types";
import { isPersistedStateEmpty, mergeAttributeLibraries, mergeAttributeHidden } from "@/lib/persistence/state-utils";
import { normalizeHunt, emptyHuntAttributes, type Hunt, type PurchasedWatch } from "@/lib/hunts/types";
import { withInferredHuntCriteria } from "@/lib/hunts/domain-terms";
import { normalizePurchasedWatch, mergeDefaultPurchasedWatches } from "@/lib/hunts/purchased-watch";
import { normalizeAllowedConditions } from "@/lib/listings/condition-filter";
import type { AlertScope } from "@/lib/listings/types";

function migrateFeedView(raw: string | undefined): FeedView {
  if (raw === "interested" || raw === "starred") return "starred";
  if (raw === "dismissed") return "dismissed";
  if (raw === "all") return "all";
  return "new";
}

function migrateAlertScope(raw: string | undefined): AlertScope {
  if (raw === "top") return "all";
  if (raw === "watchlist" || raw === "all") return raw;
  if (raw?.startsWith("hunt:")) return raw as AlertScope;
  return "all";
}

function pickPersistedState(): PersistedState {
  const s = useCasebackStore.getState();
  return {
    seen: s.seen,
    dismissed: s.dismissed,
    listingStatus: s.listingStatus,
    alertScope: s.alertScope,
    marketplaceFilter: s.marketplaceFilter,
    feedView: s.feedView,
    hiddenListings: s.hiddenListings,
    dislikedModels: s.dislikedModels,
    criteria: s.criteria,
    hunts: s.hunts,
    globalFilters: s.globalFilters,
    purchasedWatches: s.purchasedWatches,
    attributeLibrary: s.attributeLibrary ?? {},
    attributeHidden: s.attributeHidden ?? {},
    feedAttributeFilters: s.feedAttributeFilters ?? emptyHuntAttributes(),
  };
}

function applyPersistedState(
  state: PersistedState & { feedView?: string; modelHearts?: Record<string, number> }
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
  const hasDismissedField = state.dismissed != null;
  useCasebackStore.setState({
    seen: hasDismissedField ? (state.seen ?? []) : [],
    dismissed: hasDismissedField ? (state.dismissed ?? []) : (state.seen ?? []),
    listingStatus: state.listingStatus ?? {},
    alertScope: migrateAlertScope(state.alertScope as string | undefined),
    marketplaceFilter: state.marketplaceFilter ?? "all",
    feedView: migrateFeedView(state.feedView),
    hiddenListings: state.hiddenListings ?? [],
    dislikedModels: state.dislikedModels ?? [],
    criteria,
    hunts,
    globalFilters,
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
