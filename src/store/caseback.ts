import { DEFAULT_CRITERIA } from "@/lib/criteria";
import type {
  AlertScope,
  CriteriaSettings,
  ListingStatus,
  MarketplaceFilter,
} from "@/lib/listings/types";
import { migrateAttributeLibrary } from "@/lib/hunts/migrate-attributes";
import { withInferredHuntCriteria } from "@/lib/hunts/domain-terms";
import {
  createDraftHunt,
  emptyHuntAttributes,
  normalizeCustomValue,
  normalizeHunt,
  toggleAttributePick,
  ATTR_OPTIONS,
  type GlobalFilters,
  type Hunt,
  type HuntAttribute,
  type HuntHearts,
  type PurchasedWatch,
  type AttrKey,
} from "@/lib/hunts/types";
import type { AttributeLibrary } from "@/lib/persistence/types";
import { normalizePurchasedWatch } from "@/lib/hunts/purchased-watch";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FeedView = "new" | "all" | "starred" | "dismissed";

interface CasebackState {
  seen: string[];
  listingStatus: Record<string, ListingStatus>;
  alertScope: AlertScope;
  marketplaceFilter: MarketplaceFilter;
  feedView: FeedView;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria: CriteriaSettings;
  hunts: Hunt[];
  globalFilters: GlobalFilters;
  purchasedWatches: PurchasedWatch[];
  attributeLibrary: AttributeLibrary;
  attributeHidden: AttributeLibrary;
  feedAttributeFilters: Record<AttrKey, HuntAttribute>;
  dismissListing: (id: string) => void;
  restoreListing: (id: string) => void;
  toggleInterested: (id: string) => void;
  dismissAllUnseen: (ids: string[]) => void;
  restoreAll: (ids: string[]) => void;
  setAlertScope: (scope: AlertScope) => void;
  setMarketplaceFilter: (filter: MarketplaceFilter) => void;
  setFeedView: (view: FeedView) => void;
  setCriteria: (criteria: Partial<CriteriaSettings>) => void;
  setHunts: (hunts: Hunt[]) => void;
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void;
  setPurchasedWatches: (watches: PurchasedWatch[]) => void;
  addAttributeLibraryOption: (key: AttrKey, value: string) => void;
  removeAttributeOption: (key: AttrKey, value: string) => void;
  restoreAllAttributeTiles: () => void;
  toggleFeedAttributeFilter: (key: AttrKey, value: string) => void;
  clearFeedAttributeFilters: () => void;
}

function huntTargetsModel(hunt: Hunt, model: string): boolean {
  const normalized = normalizeCustomValue(model);
  const picks = hunt.attributes.model?.picks ?? [];
  const customs = hunt.attributes.model?.customs ?? [];
  return [...picks, ...customs].some(
    (v) => normalizeCustomValue(v) === normalized
  );
}

function modelHeartsToHuntHearts(legacyHearts: number): HuntHearts {
  const mapped = Math.min(4, Math.max(1, legacyHearts + 1));
  return mapped as HuntHearts;
}

export function migrateModelHeartsToHunts(
  hunts: Hunt[],
  modelHearts: Record<string, number> | undefined
): Hunt[] {
  if (!modelHearts || Object.keys(modelHearts).length === 0) {
    return hunts;
  }

  const next = [...hunts];
  for (const [model, legacyHearts] of Object.entries(modelHearts)) {
    if (!model.trim() || legacyHearts <= 0) continue;
    const already = next.some((h) => h.saved && huntTargetsModel(h, model));
    if (already) continue;

    const draft = createDraftHunt();
    next.push(
      normalizeHunt({
        ...draft,
        name: `${model} hunt`,
        saved: true,
        hearts: modelHeartsToHuntHearts(legacyHearts),
        attributes: {
          ...emptyHuntAttributes(),
          model: { picks: [model], customs: [] },
        },
      })
    );
  }
  return next;
}

export const useCasebackStore = create<CasebackState>()(
  persist(
    (set) => ({
      seen: [],
      listingStatus: {},
      alertScope: "all",
      marketplaceFilter: "all",
      feedView: "new",
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
      attributeLibrary: {},
      attributeHidden: {},
      feedAttributeFilters: emptyHuntAttributes(),

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
      setMarketplaceFilter: (filter) => set({ marketplaceFilter: filter }),
      setFeedView: (view) => set({ feedView: view }),
      setCriteria: (criteria) =>
        set((s) => ({ criteria: { ...s.criteria, ...criteria } })),
      setHunts: (hunts) =>
        set({ hunts: hunts.map((h) => withInferredHuntCriteria(normalizeHunt(h))) }),
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
      addAttributeLibraryOption: (key, value) =>
        set((s) => {
          const trimmed = value.trim();
          if (!trimmed) return s;
          const norm = normalizeCustomValue(trimmed);
          const library = s.attributeLibrary ?? {};
          const existing = library[key] ?? [];
          if (existing.some((v) => normalizeCustomValue(v) === norm)) {
            return s;
          }
          return {
            attributeLibrary: {
              ...library,
              [key]: [...existing, trimmed],
            },
          };
        }),
      removeAttributeOption: (key, value) =>
        set((s) => {
          const trimmed = value.trim();
          if (!trimmed) return s;
          const norm = normalizeCustomValue(trimmed);
          const library = s.attributeLibrary ?? {};
          const hidden = s.attributeHidden ?? {};
          const existingHidden = hidden[key] ?? [];
          if (existingHidden.some((v) => normalizeCustomValue(v) === norm)) {
            return s;
          }
          const presetLabel = ATTR_OPTIONS[key].options.find(
            (o) => normalizeCustomValue(o) === norm
          );
          const label = presetLabel ?? trimmed;
          const nextLibrary = { ...library };
          if (library[key]?.some((v) => normalizeCustomValue(v) === norm)) {
            nextLibrary[key] = library[key]!.filter(
              (v) => normalizeCustomValue(v) !== norm
            );
          }
          return {
            attributeLibrary: nextLibrary,
            attributeHidden: {
              ...hidden,
              [key]: [...existingHidden, label],
            },
          };
        }),
      restoreAllAttributeTiles: () => set({ attributeHidden: {} }),

      toggleFeedAttributeFilter: (key, value) =>
        set((s) => {
          const current = s.feedAttributeFilters[key] ?? { picks: [], customs: [] };
          return {
            feedAttributeFilters: {
              ...s.feedAttributeFilters,
              [key]: toggleAttributePick(current, value),
            },
          };
        }),

      clearFeedAttributeFilters: () =>
        set({ feedAttributeFilters: emptyHuntAttributes() }),
    }),
    {
      name: "caseback-state-v7",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const legacy = state as CasebackState & {
          modelHearts?: Record<string, number>;
        };
        legacy.hunts = migrateModelHeartsToHunts(
          (legacy.hunts ?? []).map((h) => withInferredHuntCriteria(normalizeHunt(h))),
          legacy.modelHearts
        );
        delete legacy.modelHearts;
        legacy.purchasedWatches = (legacy.purchasedWatches ?? []).map((p) =>
          normalizePurchasedWatch(p)
        );
        legacy.attributeLibrary = migrateAttributeLibrary(legacy.attributeLibrary);
        legacy.attributeHidden = migrateAttributeLibrary(legacy.attributeHidden);
        legacy.feedAttributeFilters =
          legacy.feedAttributeFilters ?? emptyHuntAttributes();
        const feedView = state.feedView as string;
        if (feedView === "interested") {
          state.feedView = "starred";
        }
        if ((legacy.alertScope as string) === "top") {
          legacy.alertScope = "all";
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
