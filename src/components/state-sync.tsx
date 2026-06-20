"use client";

import { useEffect, useRef } from "react";
import { useCasebackStore, type FeedView } from "@/store/caseback";
import type { PersistedState } from "@/lib/persistence/types";
import { normalizeHunt, type Hunt } from "@/lib/hunts/types";

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
    modelHearts: s.modelHearts,
    hiddenListings: s.hiddenListings,
    dislikedModels: s.dislikedModels,
    criteria: s.criteria,
    hunts: s.hunts,
    globalFilters: s.globalFilters,
    purchasedWatches: s.purchasedWatches,
  };
}

export function StateSync() {
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((state: PersistedState & { feedView?: string }) => {
        useCasebackStore.setState({
          seen: state.seen ?? [],
          listingStatus: state.listingStatus ?? {},
          alertScope: state.alertScope ?? "all",
          feedView: migrateFeedView(state.feedView),
          modelHearts: state.modelHearts ?? {},
          hiddenListings: state.hiddenListings ?? [],
          dislikedModels: state.dislikedModels ?? [],
          criteria: state.criteria ?? useCasebackStore.getState().criteria,
          hunts: (state.hunts ?? []).map((h) => normalizeHunt(h as Hunt)),
          globalFilters: state.globalFilters ?? useCasebackStore.getState().globalFilters,
          purchasedWatches: state.purchasedWatches ?? [],
        });
        hydrated.current = true;
      })
      .catch(() => {
        hydrated.current = true;
      });
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
