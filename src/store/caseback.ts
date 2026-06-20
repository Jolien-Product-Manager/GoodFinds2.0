import { DEFAULT_CRITERIA } from "@/lib/criteria";
import type { AlertScope, CriteriaSettings, ListingStatus } from "@/lib/listings/types";
import { normalizeHunt, type GlobalFilters, type Hunt, type PurchasedWatch } from "@/lib/hunts/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FeedView = "new" | "starred" | "dismissed";

interface CasebackState {
  seen: string[];
  listingStatus: Record<string, ListingStatus>;
  alertScope: AlertScope;
  feedView: FeedView;
  modelHearts: Record<string, number>;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria: CriteriaSettings;
  hunts: Hunt[];
  globalFilters: GlobalFilters;
  purchasedWatches: PurchasedWatch[];
  dismissListing: (id: string) => void;
  restoreListing: (id: string) => void;
  toggleInterested: (id: string) => void;
  dismissAllUnseen: (ids: string[]) => void;
  restoreAll: (ids: string[]) => void;
  setAlertScope: (scope: AlertScope) => void;
  setFeedView: (view: FeedView) => void;
  setModelHearts: (model: string, hearts: number) => void;
  setCriteria: (criteria: Partial<CriteriaSettings>) => void;
  setHunts: (hunts: Hunt[]) => void;
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void;
  setPurchasedWatches: (watches: PurchasedWatch[]) => void;
}

export const useCasebackStore = create<CasebackState>()(
  persist(
    (set, get) => ({
      seen: [],
      listingStatus: {},
      alertScope: "all",
      feedView: "new",
      modelHearts: {},
      hiddenListings: [],
      dislikedModels: [],
      criteria: DEFAULT_CRITERIA,
      hunts: [],
      globalFilters: {
        priceCeiling: 50,
        shipsToMe: true,
        postalCode: "M6K1V8",
      },
      purchasedWatches: [],

      dismissListing: (id) =>
        set((s) => ({
          seen: s.seen.includes(id) ? s.seen : [...s.seen, id],
        })),

      restoreListing: (id) =>
        set((s) => ({ seen: s.seen.filter((x) => x !== id) })),

      toggleInterested: (id) =>
        set((s) => {
          const current = s.listingStatus[id]?.interested ?? false;
          return {
            listingStatus: {
              ...s.listingStatus,
              [id]: { ...s.listingStatus[id], interested: !current },
            },
          };
        }),

      dismissAllUnseen: (ids) =>
        set((s) => ({
          seen: [...new Set([...s.seen, ...ids])],
        })),

      restoreAll: (ids) =>
        set((s) => ({
          seen: s.seen.filter((x) => !ids.includes(x)),
        })),

      setAlertScope: (scope) => set({ alertScope: scope }),
      setFeedView: (view) => set({ feedView: view }),
      setModelHearts: (model, hearts) =>
        set((s) => ({
          modelHearts: { ...s.modelHearts, [model]: hearts },
        })),
      setCriteria: (criteria) =>
        set((s) => ({ criteria: { ...s.criteria, ...criteria } })),
      setHunts: (hunts) => set({ hunts: hunts.map((h) => normalizeHunt(h)) }),
      setGlobalFilters: (filters) =>
        set((s) => {
          const next = { ...s.globalFilters, ...filters };
          return {
            globalFilters: next,
            criteria: {
              ...s.criteria,
              maxTotalCost: next.priceCeiling,
              maxTotalCostEnabled: next.priceCeiling != null,
              shipsToMe: next.shipsToMe,
              postalCode: next.postalCode ?? s.criteria.postalCode,
            },
          };
        }),
      setPurchasedWatches: (purchasedWatches) => set({ purchasedWatches }),
    }),
    {
      name: "caseback-state-v3",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hunts = (state.hunts ?? []).map((h) => normalizeHunt(h));
        const feedView = state.feedView as string;
        if (feedView === "interested") {
          state.feedView = "starred";
        }
      },
    }
  )
);

export function useUnseenCount(listingIds: string[]): number {
  const seen = useCasebackStore((s) => s.seen);
  const listingStatus = useCasebackStore((s) => s.listingStatus);
  return listingIds.filter(
    (id) => !seen.includes(id) && !listingStatus[id]?.interested
  ).length;
}
