"use client";

import { useEffect, useRef } from "react";
import { useCasebackStore, migrateModelHeartsToHunts, type FeedView } from "@/store/caseback";
import type { PersistedState } from "@/lib/persistence/types";
import { isPersistedStateEmpty } from "@/lib/persistence/state-utils";
import { normalizeHunt, type Hunt, type PurchasedWatch } from "@/lib/hunts/types";
import { normalizePurchasedWatch } from "@/lib/hunts/purchased-watch";

function migrateFeedView(raw: string | undefined): FeedView {
  if (raw === "interested" || raw === "starred") return "starred";
  if (raw === "dismissed") return "dismissed";
  return "new";
}

function pickPersistedState(): PersistedState {
  const s = useCasebackStore.getState();
  return {
    seen: s.seen,
    listingStatus: s.listingStatus,
    alertScope: s.alertScope,
    feedView: s.feedView,
    hiddenListings: s.hiddenListings,
    dislikedModels: s.dislikedModels,
    criteria: s.criteria,
    hunts: s.hunts,
    globalFilters: s.globalFilters,
    purchasedWatches: s.purchasedWatches,
  };
}

function applyPersistedState(
  state: PersistedState & { feedView?: string; modelHearts?: Record<string, number> }
) {
  const hunts = migrateModelHeartsToHunts(
    (state.hunts ?? []).map((h) => normalizeHunt(h as Hunt)),
    state.modelHearts
  );
  useCasebackStore.setState({
    seen: state.seen ?? [],
    listingStatus: state.listingStatus ?? {},
    alertScope: state.alertScope ?? "all",
    feedView: migrateFeedView(state.feedView),
    hiddenListings: state.hiddenListings ?? [],
    dislikedModels: state.dislikedModels ?? [],
    criteria: state.criteria ?? useCasebackStore.getState().criteria,
    hunts,
    globalFilters: state.globalFilters ?? useCasebackStore.getState().globalFilters,
    purchasedWatches: (state.purchasedWatches ?? []).map((p) =>
      normalizePurchasedWatch(p as PurchasedWatch)
    ),
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
