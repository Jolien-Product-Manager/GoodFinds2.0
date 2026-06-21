import { DEFAULT_CRITERIA } from "@/lib/criteria";
import { DEFAULT_ALLOWED_CONDITIONS, normalizeAllowedConditions } from "@/lib/listings/condition-filter";
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

const INITIAL_GLOBAL_FILTERS: GlobalFilters = {
  priceCeiling: 50,
  shipsToMe: true,
  postalCode: "M6K1V8",
  allowedConditions: DEFAULT_ALLOWED_CONDITIONS,
};

function syncCriteriaWithGlobalFilters(
  criteria: CriteriaSettings,
  globalFilters: GlobalFilters
): { globalFilters: GlobalFilters; criteria: CriteriaSettings } {
  const allowedConditions = normalizeAllowedConditions(
    globalFilters.allowedConditions,
    criteria.excludeForParts
  );
  const nextFilters = { ...globalFilters, allowedConditions };
  return {
    globalFilters: nextFilters,
    criteria: {
      ...criteria,
      maxTotalCost: nextFilters.priceCeiling,
      maxTotalCostEnabled: nextFilters.priceCeiling != null,
      shipsToMe: nextFilters.shipsToMe,
      postalCode: nextFilters.postalCode ?? criteria.postalCode,
      allowedConditions,
      excludeForParts: !allowedConditions.includes("For parts / project"),
    },
  };
}

interface CasebackState {
  seen: string[];
  dismissed: string[];
  listingStatus: Record<string, ListingStatus>;
  alertScope: AlertScope;
  marketplaceFilter: MarketplaceFilter;
  feedView: FeedView;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria: CriteriaSettings;
  hunts: Hunt[];
  globalFilters: GlobalFilters;
  savedGlobalFilters: GlobalFilters;
  purchasedWatches: PurchasedWatch[];
  attributeLibrary: AttributeLibrary;
  attributeHidden: AttributeLibrary;
  feedAttributeFilters: Record<AttrKey, HuntAttribute>;
  dismissListing: (id: string) => void;
  restoreListing: (id: string) => void;
  markListingSeen: (id: string) => void;
  toggleInterested: (id: string) => void;
  dismissAllUnseen: (ids: string[]) => void;
  restoreAll: (ids: string[]) => void;
  setAlertScope: (scope: AlertScope) => void;
  setMarketplaceFilter: (filter: MarketplaceFilter) => void;
  setFeedView: (view: FeedView) => void;
  setCriteria: (criteria: Partial<CriteriaSettings>) => void;
  setHunts: (hunts: Hunt[]) => void;
  archiveHunt: (id: string) => void;
  unarchiveHunt: (id: string) => void;
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void;
  saveGlobalFilters: (filters: GlobalFilters) => void;
  resetGlobalFiltersToSaved: () => void;
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
      dismissed: [],
      listingStatus: {},
      alertScope: "all",
      marketplaceFilter: "all",
      feedView: "new",
      hiddenListings: [],
      dislikedModels: [],
      criteria: DEFAULT_CRITERIA,
      hunts: [],
      globalFilters: INITIAL_GLOBAL_FILTERS,
      savedGlobalFilters: INITIAL_GLOBAL_FILTERS,
      purchasedWatches: [],
      attributeLibrary: {},
      attributeHidden: {},
      feedAttributeFilters: emptyHuntAttributes(),

      dismissListing: (id) =>
        set((s) => ({
          dismissed: s.dismissed.includes(id)
            ? s.dismissed
            : [...s.dismissed, id],
          seen: s.seen.includes(id) ? s.seen : [...s.seen, id],
        })),

      restoreListing: (id) =>
        set((s) => ({
          dismissed: s.dismissed.filter((x) => x !== id),
        })),

      markListingSeen: (id) =>
        set((s) => ({
          seen: s.seen.includes(id) ? s.seen : [...s.seen, id],
        })),

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
          dismissed: [...new Set([...s.dismissed, ...ids])],
          seen: [...new Set([...s.seen, ...ids])],
        })),

      restoreAll: (ids) =>
        set((s) => ({
          dismissed: s.dismissed.filter((x) => !ids.includes(x)),
        })),

      setAlertScope: (scope) => set({ alertScope: scope }),
      setMarketplaceFilter: (filter) => set({ marketplaceFilter: filter }),
      setFeedView: (view) => set({ feedView: view }),
      setCriteria: (criteria) =>
        set((s) => ({ criteria: { ...s.criteria, ...criteria } })),
      setHunts: (hunts) =>
        set({ hunts: hunts.map((h) => withInferredHuntCriteria(normalizeHunt(h))) }),
      archiveHunt: (id) =>
        set((s) => {
          const huntScope = `hunt:${id}` as AlertScope;
          return {
            hunts: s.hunts.map((h) =>
              h.id === id
                ? withInferredHuntCriteria(
                    normalizeHunt({
                      ...h,
                      archived: true,
                      updatedAt: new Date().toISOString(),
                    })
                  )
                : h
            ),
            alertScope: s.alertScope === huntScope ? "all" : s.alertScope,
          };
        }),
      unarchiveHunt: (id) =>
        set((s) => ({
          hunts: s.hunts.map((h) =>
            h.id === id
              ? withInferredHuntCriteria(
                  normalizeHunt({
                    ...h,
                    archived: false,
                    updatedAt: new Date().toISOString(),
                  })
                )
              : h
          ),
        })),
      setGlobalFilters: (filters) =>
        set((s) =>
          syncCriteriaWithGlobalFilters(s.criteria, {
            ...s.globalFilters,
            ...filters,
          })
        ),
      saveGlobalFilters: (filters) =>
        set((s) => {
          const synced = syncCriteriaWithGlobalFilters(s.criteria, filters);
          return {
            ...synced,
            savedGlobalFilters: synced.globalFilters,
          };
        }),
      resetGlobalFiltersToSaved: () =>
        set((s) => syncCriteriaWithGlobalFilters(s.criteria, s.savedGlobalFilters)),
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
      name: "caseback-state-v8",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const legacy = state as CasebackState & {
          modelHearts?: Record<string, number>;
          dismissed?: string[];
        };
        if (legacy.dismissed == null) {
          legacy.dismissed = [...(legacy.seen ?? [])];
          legacy.seen = [];
        }
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
        const allowedConditions = normalizeAllowedConditions(
          legacy.globalFilters?.allowedConditions,
          legacy.criteria?.excludeForParts
        );
        legacy.globalFilters = {
          ...legacy.globalFilters,
          allowedConditions,
        };
        legacy.criteria = {
          ...legacy.criteria,
          allowedConditions,
          excludeForParts: !allowedConditions.includes("For parts / project"),
        };
        if (!legacy.savedGlobalFilters) {
          legacy.savedGlobalFilters = { ...legacy.globalFilters };
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
