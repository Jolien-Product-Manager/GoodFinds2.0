"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlobalFiltersSection } from "@/components/global-filters-section";
import { Badge } from "@/components/ui/badge";
import {
  ATTR_OPTIONS,
  BUYER_AXIS_KEYS,
  HUNT_GENDER_OPTIONS,
  isGenderRequired,
  PRIORITY_ATTR_KEYS,
  TASTE_ATTR_KEYS,
  attributeChipOptions,
  createDraftHunt,
  isAttributeValueSelected,
  isRequiredPick,
  markPickRequired,
  normalizeCustomValue,
  normalizeHunt,
  toggleAttributePick,
  toggleAttributeRequiredPick,
  type AttrKey,
  type Hunt,
  type HuntHearts,
  type PurchasedWatch,
} from "@/lib/hunts/types";
import {
  buildHuntHuntingForLine,
  buildHuntSummary,
  huntTightness,
  partitionHuntFilterPills,
  sortSavedHunts,
  simulateListingParse,
  type HuntFilterPill,
} from "@/lib/hunts/summary";
import {
  backfillPurchasedWatchImages,
  findListingImageForPurchaseUrl,
  type ListingImageRef,
} from "@/lib/hunts/purchased-watch";
import { HuntHeartsPicker } from "@/components/hunt-hearts";
import { PurchasedWatchRow } from "@/components/purchased-watch-row";
import { useCasebackStore } from "@/store/caseback";
import type { AttributeLibrary } from "@/lib/persistence/types";
import {
  resolveHuntSearchIntent,
  type HuntSearchIntent,
} from "@/lib/hunts/search-intent";
import { Masthead } from "@/components/masthead";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function HuntBuilderScreen() {
  const hunts = useCasebackStore((s) => s.hunts);
  const globalFilters = useCasebackStore((s) => s.globalFilters);
  const purchasedWatches = useCasebackStore((s) => s.purchasedWatches);
  const setHunts = useCasebackStore((s) => s.setHunts);
  const setGlobalFilters = useCasebackStore((s) => s.setGlobalFilters);
  const setPurchasedWatches = useCasebackStore((s) => s.setPurchasedWatches);
  const attributeLibrary = useCasebackStore((s) => s.attributeLibrary ?? {});
  const attributeHidden = useCasebackStore((s) => s.attributeHidden ?? {});
  const addAttributeLibraryOption = useCasebackStore((s) => s.addAttributeLibraryOption);
  const removeAttributeOption = useCasebackStore((s) => s.removeAttributeOption);
  const restoreAllAttributeTiles = useCasebackStore((s) => s.restoreAllAttributeTiles);

  const hasHiddenTiles = Object.values(attributeHidden).some(
    (values) => (values?.length ?? 0) > 0
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Hunt | null>(null);
  const [workingCopy, setWorkingCopy] = useState<Hunt | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [listingImages, setListingImages] = useState<ListingImageRef[]>([]);

  const startNewHunt = () => {
    const d = createDraftHunt();
    setDraft(d);
    setWorkingCopy(d);
    setEditingId(null);
  };

  const openEdit = (hunt: Hunt) => {
    setDraft(null);
    setEditingId(hunt.id);
    setWorkingCopy(normalizeHunt(JSON.parse(JSON.stringify(hunt)) as Hunt));
  };

  const updateAttr = (key: AttrKey, picks?: string[], customs?: string[]) => {
    setWorkingCopy((prev) => {
      if (!prev) return prev;
      const current = prev.attributes[key] ?? { picks: [], customs: [] };
      return {
        ...prev,
        saved: false,
        attributes: {
          ...prev.attributes,
          [key]: {
            picks: picks ?? current.picks,
            customs: customs ?? current.customs,
          },
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const togglePick = (key: AttrKey, value: string) => {
    setWorkingCopy((prev) => {
      if (!prev) return prev;
      const current = prev.attributes[key] ?? { picks: [], customs: [] };
      const next = toggleAttributePick(current, value);
      return {
        ...prev,
        saved: false,
        attributes: {
          ...prev.attributes,
          [key]: next,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const toggleRequiredPick = (key: AttrKey, value: string) => {
    setWorkingCopy((prev) => {
      if (!prev) return prev;
      const current = prev.attributes[key] ?? { picks: [], customs: [] };
      const next = toggleAttributeRequiredPick(current, value);
      return {
        ...prev,
        saved: false,
        attributes: {
          ...prev.attributes,
          [key]: next,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleAddCustomFilter = (key: AttrKey, raw: string, required = false) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    addAttributeLibraryOption(key, trimmed);
    const norm = normalizeCustomValue(trimmed);
    const libraryLabel =
      (useCasebackStore.getState().attributeLibrary?.[key] ?? []).find(
        (v) => normalizeCustomValue(v) === norm
      ) ?? trimmed;
    setWorkingCopy((prev) => {
      if (!prev) return prev;
      const current = prev.attributes[key] ?? { picks: [], customs: [] };
      if (isAttributeValueSelected(current, libraryLabel)) {
        return {
          ...prev,
          saved: false,
          attributes: {
            ...prev.attributes,
            [key]: required
              ? markPickRequired(current, libraryLabel)
              : current,
          },
          updatedAt: new Date().toISOString(),
        };
      }
      const next = toggleAttributePick(current, libraryLabel);
      return {
        ...prev,
        saved: false,
        attributes: {
          ...prev.attributes,
          [key]: required ? markPickRequired(next, libraryLabel) : next,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleRemoveOption = (key: AttrKey, value: string) => {
    removeAttributeOption(key, value);
    setWorkingCopy((prev) => {
      if (!prev) return prev;
      const current = prev.attributes[key] ?? { picks: [], customs: [] };
      const norm = normalizeCustomValue(value);
      const next = {
        picks: current.picks.filter((v) => normalizeCustomValue(v) !== norm),
        customs: current.customs.filter((v) => normalizeCustomValue(v) !== norm),
      };
      return {
        ...prev,
        saved: false,
        attributes: { ...prev.attributes, [key]: next },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleSave = () => {
    if (!workingCopy) return;
    if (!workingCopy.name.trim()) {
      toast.error("Name your hunt before saving");
      return;
    }
    if (workingCopy.hearts == null) {
      toast.error("Choose how badly you want this hunt (1–4 hearts)");
      return;
    }
    const saved: Hunt = normalizeHunt({
      ...workingCopy,
      saved: true,
      updatedAt: new Date().toISOString(),
    });
    const exists = hunts.some((h) => h.id === saved.id);
    const next = exists
      ? hunts.map((h) => (h.id === saved.id ? saved : h))
      : [...hunts, saved];
    setHunts(next);
    toast.success("Hunt saved");
    handleCollapse();
  };

  const handleDelete = () => {
    if (!workingCopy) return;
    if (!workingCopy.saved) {
      setDraft(null);
      setWorkingCopy(null);
      setEditingId(null);
      return;
    }
    setHunts(hunts.filter((h) => h.id !== workingCopy.id));
    setWorkingCopy(null);
    setEditingId(null);
    toast("Hunt deleted");
  };

  const handleCollapse = () => {
    setEditingId(null);
    setDraft(null);
    setWorkingCopy(null);
  };

  const addPurchase = useCallback(() => {
    let url = purchaseUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const id = crypto.randomUUID();
    const item: PurchasedWatch = {
      id,
      url,
      parsing: true,
      features: null,
      imageUrl: null,
    };
    setPurchasedWatches([item, ...purchasedWatches]);
    setPurchaseUrl("");
    setTimeout(() => {
      const imageUrl = findListingImageForPurchaseUrl(url, listingImages);
      setPurchasedWatches(
        useCasebackStore.getState().purchasedWatches.map((p) =>
          p.id === id
            ? {
                ...p,
                parsing: false,
                features: simulateListingParse(url),
                imageUrl,
              }
            : p
        )
      );
    }, 1200);
  }, [purchaseUrl, purchasedWatches, setPurchasedWatches, listingImages]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/listing-images")
      .then((res) => res.json())
      .then((images: ListingImageRef[]) => {
        if (cancelled || !Array.isArray(images)) return;
        setListingImages(images);
        const current = useCasebackStore.getState().purchasedWatches;
        if (current.length === 0) return;
        const next = backfillPurchasedWatchImages(current, images);
        if (next !== current) {
          setPurchasedWatches(next);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setPurchasedWatches]);

  const tightness = workingCopy ? huntTightness(workingCopy) : null;
  const editorOpen = workingCopy != null;
  const savedHunts = useMemo(() => sortSavedHunts(hunts), [hunts]);
  const savedHuntCount = savedHunts.length;

  return (
    <>
      <Masthead />
      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) handleCollapse();
        }}
      >
        <DialogContent
          showCloseButton
          className="max-h-[min(90vh,900px)] overflow-y-auto border-line-strong bg-card p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">
            {workingCopy?.saved ? `Edit ${workingCopy.name}` : "New hunt"}
          </DialogTitle>
          {workingCopy && (
            <HuntEditorPanel
              hunt={workingCopy}
              tightness={tightness}
              savedFlash={savedFlash}
              attributeLibrary={attributeLibrary}
              attributeHidden={attributeHidden}
              onUpdate={(next) => setWorkingCopy({ ...next, saved: false })}
              onTogglePick={togglePick}
              onToggleRequiredPick={toggleRequiredPick}
              onAddCustom={handleAddCustomFilter}
              onRemoveOption={handleRemoveOption}
              hasHiddenTiles={hasHiddenTiles}
              onRestoreAllTiles={restoreAllAttributeTiles}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          )}
        </DialogContent>
      </Dialog>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-3xl font-semibold text-ink">
            What are you looking for?
          </h1>
          <Button variant="outline" size="sm" className="h-8" onClick={startNewHunt}>
            <Plus className="mr-1 h-3 w-3" />
            New hunt
            {draft && (
              <span className="ml-2 text-xs italic text-ink-soft">(unsaved)</span>
            )}
          </Button>
        </div>

        {/* Saved hunts */}
        <section className="space-y-5">
          {savedHuntCount === 0 && (
            <p className="text-sm text-ink-soft">No saved hunts yet.</p>
          )}

          <HuntListGroup
            title="Hunts"
            description="Specific watches or features you find interesting"
            hunts={savedHunts}
            editingId={editingId}
            editorOpen={editorOpen}
            onEdit={openEdit}
          />
        </section>

        <GlobalFiltersSection
          globalFilters={globalFilters}
          onChange={setGlobalFilters}
        />

        {/* Purchased watches */}
        <section className="space-y-2 rounded-sm border border-line-strong bg-card px-3 py-2.5">
          <h2 className="font-display text-lg font-medium text-ink">Purchased watches</h2>
          <div className="flex gap-2">
            <Input
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              placeholder="Paste listing URL"
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addPurchase()}
            />
            <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={addPurchase}>
              Add
            </Button>
          </div>
          <ul className="space-y-1.5">
            {purchasedWatches.map((p) => (
              <PurchasedWatchRow
                key={p.id}
                watch={p}
                onRemove={() =>
                  setPurchasedWatches(purchasedWatches.filter((x) => x.id !== p.id))
                }
                onImageChange={(imageUrl) =>
                  setPurchasedWatches(
                    purchasedWatches.map((x) =>
                      x.id === p.id ? { ...x, imageUrl } : x
                    )
                  )
                }
              />
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

function HuntListGroup({
  title,
  description,
  hunts,
  editingId,
  editorOpen,
  onEdit,
}: {
  title: string;
  description: string;
  hunts: Hunt[];
  editingId: string | null;
  editorOpen: boolean;
  onEdit: (hunt: Hunt) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
      </div>
      {hunts.length > 0 ? (
        <ul className="space-y-1.5">
          {hunts.map((hunt) => (
            <SavedHuntCard
              key={hunt.id}
              hunt={hunt}
              isActive={editingId === hunt.id && editorOpen}
              onEdit={() => onEdit(hunt)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SavedHuntCard({
  hunt,
  isActive,
  onEdit,
}: {
  hunt: Hunt;
  isActive: boolean;
  onEdit: () => void;
}) {
  const tightnessForHunt = huntTightness(hunt);

  return (
    <li>
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          "w-full rounded-sm border bg-card px-3 py-2 text-left transition-colors hover:border-brass/50 hover:bg-brass/5",
          isActive
            ? "border-brass bg-brass/10 ring-1 ring-brass/30"
            : "border-line-strong"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h3 className="font-display text-base font-medium leading-tight text-ink">
                {hunt.name}
              </h3>
              <HuntHeartsPicker value={hunt.hearts} size="xs" />
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-[10px] font-normal",
                  tightnessForHunt.level === "specific" &&
                    "border-steal text-steal"
                )}
              >
                {tightnessForHunt.label}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs italic leading-snug text-ink-soft">
              {buildHuntSummary(hunt, { omitGender: true })}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-soft">
            <Pencil className="h-3 w-3" />
            Edit
          </span>
        </div>
      </button>
    </li>
  );
}

function HuntEditorPanel({
  hunt,
  tightness,
  savedFlash,
  attributeLibrary,
  attributeHidden,
  onUpdate,
  onTogglePick,
  onToggleRequiredPick,
  onAddCustom,
  onRemoveOption,
  hasHiddenTiles,
  onRestoreAllTiles,
  onSave,
  onDelete,
}: {
  hunt: Hunt;
  tightness: ReturnType<typeof huntTightness> | null;
  savedFlash: boolean;
  attributeLibrary: AttributeLibrary;
  attributeHidden: AttributeLibrary;
  onUpdate: (hunt: Hunt) => void;
  onTogglePick: (key: AttrKey, value: string) => void;
  onToggleRequiredPick: (key: AttrKey, value: string) => void;
  onAddCustom: (key: AttrKey, value: string, required?: boolean) => void;
  onRemoveOption: (key: AttrKey, value: string) => void;
  hasHiddenTiles: boolean;
  onRestoreAllTiles: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [editingTiles, setEditingTiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mustHave, setMustHave] = useState(false);
  const [searching, setSearching] = useState(false);
  const [heartsRequiredHint, setHeartsRequiredHint] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { mustHave: mustHavePills, interested: interestedPills } = useMemo(
    () => partitionHuntFilterPills(hunt),
    [hunt]
  );
  const huntingForLine = useMemo(() => buildHuntHuntingForLine(hunt), [hunt]);

  const applySearchIntent = (intent: HuntSearchIntent) => {
    if (intent.kind === "gender") {
      const next = applyGenderSelection(hunt, intent.value);
      onUpdate({
        ...next,
        genderRequired: mustHave ? true : next.genderRequired,
      });
      return;
    }
    if (intent.kind === "attr") {
      const current = hunt.attributes[intent.key] ?? { picks: [], customs: [] };
      let nextAttr = current;
      if (!isAttributeValueSelected(current, intent.value)) {
        nextAttr = mustHave
          ? markPickRequired(current, intent.value)
          : toggleAttributePick(current, intent.value);
      } else if (mustHave && !isRequiredPick(current, intent.value)) {
        nextAttr = markPickRequired(current, intent.value);
      }
      onUpdate({
        ...hunt,
        attributes: { ...hunt.attributes, [intent.key]: nextAttr },
      });
      return;
    }
    onAddCustom("traits", intent.value, mustHave);
  };

  const addFromSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || searching) return;

    setSearching(true);
    try {
      const intent = await resolveHuntSearchIntent(
        trimmed,
        hunt,
        attributeLibrary,
        attributeHidden
      );
      applySearchIntent(intent);
      setSearchQuery("");
      setMustHave(false);
    } finally {
      setSearching(false);
    }
  };

  const removeFilterPill = (pill: HuntFilterPill) => {
    if (pill.kind === "gender") {
      onUpdate({ ...hunt, gender: "both", genderRequired: undefined });
      return;
    }
    onTogglePick(pill.key, pill.value);
  };

  const togglePillRequired = (pill: HuntFilterPill) => {
    if (pill.kind === "gender") {
      onUpdate({
        ...hunt,
        genderRequired: pill.required ? false : true,
      });
      return;
    }
    onToggleRequiredPick(pill.key, pill.value);
  };

  const selectedCount = (key: AttrKey) => {
    const attr = hunt.attributes[key];
    if (!attr) return 0;
    return [...attr.picks, ...attr.customs].length;
  };

  const categoryHasRequired = (key: AttrKey) => {
    const attr = hunt.attributes[key];
    return attr?.required === true || (attr?.requiredPicks?.length ?? 0) > 0;
  };

  return (
    <section className="space-y-5 p-5 pt-8">
      {/* Title + edit tiles */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 pr-8">
          <Input
            value={hunt.name}
            onChange={(e) => onUpdate({ ...hunt, name: e.target.value })}
            className="h-10 min-w-0 flex-1 rounded-sm border-line-strong bg-card font-display text-base"
            placeholder="Untitled hunt"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-10 shrink-0 rounded-sm px-3 text-xs",
              editingTiles && "border-brass text-brass"
            )}
            onClick={() => setEditingTiles((v) => !v)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {editingTiles ? "Done" : "Edit tiles"}
          </Button>
        </div>
        {editingTiles && (
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-ink-soft">
            <span>Tap × on a tile to remove it from suggestions</span>
            {hasHiddenTiles && (
              <button
                type="button"
                className="text-brass underline-offset-2 hover:underline"
                onClick={() => {
                  onRestoreAllTiles();
                  setEditingTiles(false);
                }}
              >
                Restore all removed tiles
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search + must-have + add */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search what you're looking for —"
            className="h-10 rounded-sm border-line-strong bg-card pl-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFromSearch();
              }
            }}
          />
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={mustHave}
            onChange={(e) => setMustHave(e.target.checked)}
            className="h-4 w-4 rounded-sm border-line-strong accent-brass"
          />
          Must-have
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 shrink-0 rounded-sm px-4"
          onClick={addFromSearch}
          disabled={!searchQuery.trim() || searching}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          {searching ? "Adding…" : "Add"}
        </Button>
      </div>

      {/* Summary card */}
      <HuntInterestSummaryCard
        mustHavePills={mustHavePills}
        interestedPills={interestedPills}
        huntingForLine={huntingForLine}
        tightness={tightness}
        onTogglePillRequired={togglePillRequired}
        onRemovePill={removeFilterPill}
      />

      {/* Urgency */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-sm border bg-card px-4 py-3",
          heartsRequiredHint && hunt.hearts == null
            ? "border-steal/50"
            : "border-line-strong"
        )}
      >
        <div>
          <Label className="text-xs text-brass">
            How badly do you want this? <span className="text-steal">*</span>
          </Label>
          <p className="text-[11px] text-ink-soft">1♥ keeping an eye out · 4♥ must-find</p>
        </div>
        <HuntHeartsPicker
          value={hunt.hearts}
          required={heartsRequiredHint}
          onChange={(hearts: HuntHearts) => {
            setHeartsRequiredHint(false);
            onUpdate({ ...hunt, hearts });
          }}
        />
      </div>

      {/* Category tiles */}
      <div className="space-y-2">
        <HuntCategoryTile
          label="Gender"
          summary={
            (hunt.gender ?? "both") !== "both"
              ? HUNT_GENDER_OPTIONS.find((o) => o.value === hunt.gender)?.label
              : undefined
          }
          selectedCount={(hunt.gender ?? "both") !== "both" ? 1 : 0}
          open={expandedSections.has("gender")}
          onOpenChange={(nextOpen) => {
            setExpandedSections((prev) => {
              const next = new Set(prev);
              if (nextOpen) next.add("gender");
              else next.delete("gender");
              return next;
            });
          }}
          required={isGenderRequired(hunt)}
        >
          <GenderCategoryPanel
            hunt={hunt}
            onUpdate={onUpdate}
          />
        </HuntCategoryTile>

        {PRIORITY_ATTR_KEYS.map((key) => (
          <HuntCategoryTile
            key={key}
            label={ATTR_OPTIONS[key].label}
            selectedCount={selectedCount(key)}
            open={expandedSections.has(key)}
            onOpenChange={(nextOpen) => {
              setExpandedSections((prev) => {
                const next = new Set(prev);
                if (nextOpen) next.add(key);
                else next.delete(key);
                return next;
              });
            }}
            required={categoryHasRequired(key)}
          >
            <AttributeChipGrid
              attrKey={key}
              hunt={hunt}
              savedCustoms={attributeLibrary[key] ?? []}
              hiddenOptions={attributeHidden[key] ?? []}
              editingTiles={editingTiles}
              onTogglePick={onTogglePick}
              onToggleRequiredPick={onToggleRequiredPick}
              onAddCustom={onAddCustom}
              onRemoveOption={onRemoveOption}
            />
          </HuntCategoryTile>
        ))}

        {BUYER_AXIS_KEYS.map((key) => (
          <HuntCategoryTile
            key={key}
            label={ATTR_OPTIONS[key].label}
            selectedCount={selectedCount(key)}
            open={expandedSections.has(key)}
            onOpenChange={(nextOpen) => {
              setExpandedSections((prev) => {
                const next = new Set(prev);
                if (nextOpen) next.add(key);
                else next.delete(key);
                return next;
              });
            }}
            required={categoryHasRequired(key)}
          >
            <AttributeChipGrid
              attrKey={key}
              hunt={hunt}
              savedCustoms={attributeLibrary[key] ?? []}
              hiddenOptions={attributeHidden[key] ?? []}
              editingTiles={editingTiles}
              onTogglePick={onTogglePick}
              onToggleRequiredPick={onToggleRequiredPick}
              onAddCustom={onAddCustom}
              onRemoveOption={onRemoveOption}
            />
          </HuntCategoryTile>
        ))}

        {TASTE_ATTR_KEYS.map((key) => (
          <HuntCategoryTile
            key={key}
            label={ATTR_OPTIONS[key].label}
            selectedCount={selectedCount(key)}
            open={expandedSections.has(key)}
            onOpenChange={(nextOpen) => {
              setExpandedSections((prev) => {
                const next = new Set(prev);
                if (nextOpen) next.add(key);
                else next.delete(key);
                return next;
              });
            }}
            required={categoryHasRequired(key)}
          >
            <AttributeChipGrid
              attrKey={key}
              hunt={hunt}
              savedCustoms={attributeLibrary[key] ?? []}
              hiddenOptions={attributeHidden[key] ?? []}
              editingTiles={editingTiles}
              onTogglePick={onTogglePick}
              onToggleRequiredPick={onToggleRequiredPick}
              onAddCustom={onAddCustom}
              onRemoveOption={onRemoveOption}
            />
          </HuntCategoryTile>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" className="text-steal" onClick={onDelete}>
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
          <div className="flex items-center gap-2">
            {!hunt.saved && (
              <span className="text-xs text-brass">Unsaved changes</span>
            )}
            <Button
              onClick={() => {
                if (hunt.hearts == null) {
                  setHeartsRequiredHint(true);
                  toast.error("Choose how badly you want this hunt (1–4 hearts)");
                  return;
                }
                onSave();
              }}
              className="rounded-sm bg-ink text-card"
            >
              {savedFlash ? "Saved" : "Save hunt"}
            </Button>
          </div>
        </div>
        <p className="text-[11px] italic leading-snug text-ink-soft">
          {buildHuntSummary(hunt)}
        </p>
      </div>
    </section>
  );
}

function HuntCategoryTile({
  label,
  summary,
  selectedCount,
  required,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  summary?: string;
  selectedCount: number;
  required?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-sm border border-line-strong bg-card px-3 py-2.5 text-left transition-colors hover:border-brass/40 hover:bg-brass/5"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-ink-soft transition-transform",
              open && "rotate-180"
            )}
          />
          <span className="min-w-0 flex-1 font-display text-sm font-medium text-ink">
            {label}
          </span>
          {!open && summary && selectedCount > 0 && (
            <span className="truncate text-xs text-ink-soft">{summary}</span>
          )}
          {selectedCount > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 shrink-0 px-1.5 text-[10px] font-normal",
                required && "border-brass text-brass"
              )}
            >
              {selectedCount}
              {required === true ? " req" : ""}
            </Badge>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function GenderCategoryPanel({
  hunt,
  onUpdate,
}: {
  hunt: Hunt;
  onUpdate: (hunt: Hunt) => void;
}) {
  const [query, setQuery] = useState("");
  const currentGender = hunt.gender ?? "both";
  const filteredOptions = HUNT_GENDER_OPTIONS.filter((opt) => {
    if (!query.trim()) return true;
    const q = normalizeCustomValue(query);
    return normalizeCustomValue(opt.label).includes(q);
  });

  return (
    <div className="space-y-2 border-x border-b border-line-strong bg-paper/30 px-3 py-3">
      <CategorySearchRow
        value={query}
        onChange={setQuery}
        placeholder="Search gender —"
        onAdd={() => {
          const q = normalizeCustomValue(query);
          const match = HUNT_GENDER_OPTIONS.find(
            (opt) => normalizeCustomValue(opt.label) === q
          );
          if (match) onUpdate(applyGenderSelection(hunt, match.value));
          setQuery("");
        }}
        canAdd={Boolean(query.trim())}
        showMustHave={false}
      />
      <div className="flex flex-wrap gap-2">
        {filteredOptions.map((opt) => {
          const isActive =
            currentGender === opt.value && opt.value !== "both";
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate(applyGenderSelection(hunt, opt.value))}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "border-brass bg-brass/15 text-ink"
                  : "border-line-strong text-ink-soft hover:border-brass/40"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategorySearchRow({
  value,
  onChange,
  placeholder,
  onAdd,
  canAdd,
  mustHave = false,
  onMustHaveChange,
  showMustHave = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onAdd: () => void;
  canAdd: boolean;
  mustHave?: boolean;
  onMustHaveChange?: (checked: boolean) => void;
  showMustHave?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 rounded-sm border-line-strong bg-card pl-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
      </div>
      {showMustHave && onMustHaveChange && (
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={mustHave}
            onChange={(e) => onMustHaveChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded-sm border-line-strong accent-brass"
          />
          Must-have
        </label>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 rounded-sm px-3"
        onClick={onAdd}
        disabled={!canAdd}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}

function AttributeChipGrid({
  attrKey,
  hunt,
  savedCustoms,
  hiddenOptions,
  editingTiles,
  onTogglePick,
  onToggleRequiredPick,
  onAddCustom,
  onRemoveOption,
}: {
  attrKey: AttrKey;
  hunt: Hunt;
  savedCustoms: string[];
  hiddenOptions: string[];
  editingTiles: boolean;
  onTogglePick: (key: AttrKey, value: string) => void;
  onToggleRequiredPick: (key: AttrKey, value: string) => void;
  onAddCustom: (key: AttrKey, value: string, required?: boolean) => void;
  onRemoveOption: (key: AttrKey, value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [mustHave, setMustHave] = useState(false);
  let chips = attributeChipOptions(attrKey, savedCustoms, hunt, hiddenOptions);
  if (attrKey === "model") {
    chips = [...chips].sort((a, b) => a.localeCompare(b));
  }
  const attr = hunt.attributes[attrKey] ?? { picks: [], customs: [] };
  const presetSet = new Set(
    ATTR_OPTIONS[attrKey].options.map((o) => normalizeCustomValue(o))
  );

  const filteredChips = query.trim()
    ? chips.filter((chip) =>
        normalizeCustomValue(chip).includes(normalizeCustomValue(query))
      )
    : chips;

  const addFromCategorySearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const q = normalizeCustomValue(trimmed);
    const exact = chips.find((chip) => normalizeCustomValue(chip) === q);
    const partial = chips.find((chip) =>
      normalizeCustomValue(chip).includes(q)
    );
    const match = exact ?? partial;
    if (match) {
      onAddCustom(attrKey, match, mustHave);
    } else {
      onAddCustom(attrKey, trimmed, mustHave);
    }
    setQuery("");
    setMustHave(false);
  };

  return (
    <div className="space-y-2 border-x border-b border-line-strong bg-paper/30 px-3 py-3">
      <CategorySearchRow
        value={query}
        onChange={setQuery}
        placeholder={`Search ${ATTR_OPTIONS[attrKey].label.toLowerCase()} —`}
        onAdd={addFromCategorySearch}
        canAdd={Boolean(query.trim())}
        mustHave={mustHave}
        onMustHaveChange={setMustHave}
      />
      {attrKey === "traits" && filteredChips.length === 0 && !query.trim() && (
        <p className="text-xs text-ink-soft">
          Search or add free-form notes and characteristics.
        </p>
      )}
      {filteredChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filteredChips.map((opt) => {
            const selected = isAttributeValueSelected(attr, opt);
            const required = isRequiredPick(attr, opt);
            const isCustom = !presetSet.has(normalizeCustomValue(opt));
            return (
              <span
                key={opt}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-sm border text-xs",
                  editingTiles
                    ? "border-steal/40 bg-steal/5 pr-0.5"
                    : selected && required
                      ? "border-must/45 bg-must/15 text-ink ring-1 ring-must/20"
                      : selected
                        ? "border-brass bg-brass/15 text-ink"
                        : "border-line-strong text-ink-soft",
                  isCustom && !selected && !editingTiles && "border-dashed",
                  selected && !editingTiles && "pl-0.5"
                )}
              >
                {selected && !editingTiles && (
                  <RequiredPinButton
                    required={required}
                    onToggle={() => onToggleRequiredPick(attrKey, opt)}
                  />
                )}
                <button
                  type="button"
                  disabled={editingTiles}
                  onClick={() => !editingTiles && onTogglePick(attrKey, opt)}
                  className={cn(
                    "px-2 py-1",
                    editingTiles && "cursor-default opacity-70"
                  )}
                >
                  {opt}
                </button>
                {editingTiles && (
                  <button
                    type="button"
                    aria-label={`Remove ${opt}`}
                    onClick={() => onRemoveOption(attrKey, opt)}
                    className="rounded-sm p-1 text-steal hover:bg-steal/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      {query.trim() && filteredChips.length === 0 && (
        <p className="text-xs text-ink-soft">
          No matches — press Add to create &quot;{query.trim()}&quot;.
        </p>
      )}
    </div>
  );
}

function applyGenderSelection(hunt: Hunt, value: Hunt["gender"]): Hunt {
  if (value === "both") {
    return { ...hunt, gender: "both", genderRequired: undefined };
  }
  const changing = (hunt.gender ?? "both") !== value;
  return {
    ...hunt,
    gender: value,
    genderRequired: changing ? false : hunt.genderRequired,
  };
}

function pillKey(pill: HuntFilterPill): string {
  return pill.kind === "gender"
    ? `gender-${pill.value}`
    : `${pill.key}-${pill.value}`;
}

function HuntInterestSummaryCard({
  mustHavePills,
  interestedPills,
  huntingForLine,
  tightness,
  onTogglePillRequired,
  onRemovePill,
}: {
  mustHavePills: HuntFilterPill[];
  interestedPills: HuntFilterPill[];
  huntingForLine: string;
  tightness: ReturnType<typeof huntTightness> | null;
  onTogglePillRequired: (pill: HuntFilterPill) => void;
  onRemovePill: (pill: HuntFilterPill) => void;
}) {
  const hasPills = mustHavePills.length > 0 || interestedPills.length > 0;

  return (
    <div className="rounded-sm border border-line-strong bg-card px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-soft">
        You&apos;re hunting for
      </p>

      {hasPills ? (
        <p className="mt-1 font-display text-base leading-snug">
          {mustHavePills.length > 0 && (
            <span className="font-semibold text-must">
              Must have {mustHavePills.map((p) => p.label).join(", ")}
            </span>
          )}
          {mustHavePills.length > 0 && interestedPills.length > 0 && (
            <span className="text-ink"> · also interested in </span>
          )}
          {interestedPills.length > 0 && (
            <span className="text-ink">
              {interestedPills.map((p) => p.label).join(", ")}.
            </span>
          )}
        </p>
      ) : (
        <p className="mt-1 font-display text-base leading-snug text-ink">
          {huntingForLine}
        </p>
      )}

      {mustHavePills.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] bg-must" />
            <span className="text-sm font-semibold text-must">Must have</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {mustHavePills.map((pill) => (
              <SummaryFilterChip
                key={pillKey(pill)}
                pill={pill}
                variant="must"
                onToggleRequired={() => onTogglePillRequired(pill)}
                onRemove={() => onRemovePill(pill)}
              />
            ))}
          </div>
        </div>
      )}

      {interestedPills.length > 0 && (
        <div className={cn("space-y-2", mustHavePills.length > 0 && "mt-4")}>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] border border-line-strong bg-card" />
            <span className="text-sm font-medium text-ink-soft">
              Other features I&apos;m interested in
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interestedPills.map((pill) => (
              <SummaryFilterChip
                key={pillKey(pill)}
                pill={pill}
                variant="interested"
                onToggleRequired={() => onTogglePillRequired(pill)}
                onRemove={() => onRemovePill(pill)}
              />
            ))}
          </div>
        </div>
      )}

      {hasPills && (
        <>
          <div className="mt-4 border-t border-line/60 pt-3">
            <p className="text-[11px] text-ink-soft">
              Tap the badge on any chip to move it between must-have and other
              features.
            </p>
          </div>
        </>
      )}

      {tightness && (
        <Badge
          variant="outline"
          className={cn(
            "mt-3 h-5 px-1.5 text-[10px] font-normal",
            tightness.level === "specific" && "border-steal text-steal"
          )}
        >
          {tightness.label}
        </Badge>
      )}
    </div>
  );
}

function SummaryFilterChip({
  pill,
  variant,
  onToggleRequired,
  onRemove,
}: {
  pill: HuntFilterPill;
  variant: "must" | "interested";
  onToggleRequired: () => void;
  onRemove: () => void;
}) {
  const isMust = variant === "must";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm border py-0.5 pl-0.5 pr-1 text-xs",
        isMust
          ? "border-must/40 bg-must/15 text-ink"
          : "border-line-strong bg-paper/60 text-ink"
      )}
    >
      <RequiredPinButton
        required={pill.required === true}
        onToggle={onToggleRequired}
      />
      <span className="px-1">{pill.label}</span>
      <button
        type="button"
        aria-label={`Remove ${pill.label}`}
        onClick={onRemove}
        className="rounded-sm p-1 text-ink-soft hover:bg-line/30 hover:text-ink"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function RequiredPinButton({
  required,
  onToggle,
}: {
  required: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={required ? "Remove must-have" : "Mark as must-have"}
      aria-pressed={required}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "mx-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border transition-colors",
        required
          ? "border-must bg-must text-card"
          : "border-line-strong bg-card text-ink-soft hover:border-must/40 hover:text-must"
      )}
    >
      <span className="text-[8px] font-bold leading-none">!</span>
    </button>
  );
}
