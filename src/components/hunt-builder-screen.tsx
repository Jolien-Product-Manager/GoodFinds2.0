"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  TASTE_ATTR_KEYS,
  attributeChipOptions,
  createDraftHunt,
  isAttributeValueSelected,
  normalizeCustomValue,
  normalizeHunt,
  toggleAttributePick,
  type AttrKey,
  type Hunt,
  type HuntHearts,
  type PurchasedWatch,
} from "@/lib/hunts/types";
import { buildHuntSummary, huntTightness, simulateListingParse } from "@/lib/hunts/summary";
import {
  backfillPurchasedWatchImages,
  findListingImageForPurchaseUrl,
  type ListingImageRef,
} from "@/lib/hunts/purchased-watch";
import { HuntHeartsPicker } from "@/components/hunt-hearts";
import { PurchasedWatchRow } from "@/components/purchased-watch-row";
import { useCasebackStore } from "@/store/caseback";
import type { AttributeLibrary } from "@/lib/persistence/types";
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

  const handleAddCustomFilter = (key: AttrKey, raw: string) => {
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
        return { ...prev, saved: false, updatedAt: new Date().toISOString() };
      }
      const next = toggleAttributePick(current, libraryLabel);
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
    setWorkingCopy(saved);
    setDraft(null);
    setEditingId(saved.id);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
    toast.success("Hunt saved");
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
          className="max-h-[min(90vh,900px)] overflow-y-auto border-line-strong bg-card p-0 sm:max-w-2xl"
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
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Hunts</h1>
          <p className="mt-1 text-ink-soft">
            Define what you&apos;re looking for — gates and taste live here.
          </p>
        </div>

        {/* Saved hunts */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-medium text-ink">Defined hunts</h2>
            <Button variant="outline" size="sm" className="h-8" onClick={startNewHunt}>
              <Plus className="mr-1 h-3 w-3" />
              New hunt
              {draft && (
                <span className="ml-2 text-xs italic text-ink-soft">(unsaved)</span>
              )}
            </Button>
          </div>

          {hunts.filter((h) => h.saved).length === 0 ? (
            <p className="text-sm text-ink-soft">No saved hunts yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {hunts
                .filter((h) => h.saved)
                .map((hunt) => {
                  const tightnessForHunt = huntTightness(hunt);
                  const isActive = editingId === hunt.id && editorOpen;

                  return (
                    <li key={hunt.id}>
                      <button
                        type="button"
                        onClick={() => openEdit(hunt)}
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
                              <HuntHeartsPicker value={hunt.hearts ?? 2} size="xs" />
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
                              <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-normal text-ink-soft"
                              >
                                {
                                  HUNT_GENDER_OPTIONS.find(
                                    (o) => o.value === (hunt.gender ?? "both")
                                  )?.label
                                }
                              </Badge>
                            </div>
                            <p className="mt-0.5 truncate text-xs italic leading-snug text-ink-soft">
                              {buildHuntSummary(hunt)}
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
                })}
            </ul>
          )}
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

function HuntEditorPanel({
  hunt,
  tightness,
  savedFlash,
  attributeLibrary,
  attributeHidden,
  onUpdate,
  onTogglePick,
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
  onAddCustom: (key: AttrKey, value: string) => void;
  onRemoveOption: (key: AttrKey, value: string) => void;
  hasHiddenTiles: boolean;
  onRestoreAllTiles: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [editingTiles, setEditingTiles] = useState(false);

  return (
    <section className="space-y-6 p-6 pt-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2 pr-8">
          <Input
            value={hunt.name}
            onChange={(e) => onUpdate({ ...hunt, name: e.target.value })}
            className="min-w-0 flex-1 font-display text-lg"
            placeholder="Hunt name"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 shrink-0 px-2 text-xs",
              editingTiles ? "text-brass" : "text-ink-soft"
            )}
            onClick={() => setEditingTiles((v) => !v)}
          >
            <Pencil className="mr-1 h-3 w-3" />
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

      <div className="space-y-2">
        <Label className="text-brass">Gender</Label>
        <div className="flex flex-wrap gap-2">
          {HUNT_GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ ...hunt, gender: opt.value })}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-sm",
                (hunt.gender ?? "both") === opt.value
                  ? "border-brass bg-brass/15 text-ink"
                  : "border-line-strong text-ink-soft"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-brass">What you're scoring listings on</Label>
        <p className="text-xs text-ink-soft">
          Model, era, dial originality, plating, crystal, running, completeness — the axes a
          knowledgeable buyer checks first.
        </p>
      </div>

      {BUYER_AXIS_KEYS.map((key) => (
        <AttributeFilterSection
          key={key}
          attrKey={key}
          hunt={hunt}
          savedCustoms={attributeLibrary[key] ?? []}
          hiddenOptions={attributeHidden[key] ?? []}
          editingTiles={editingTiles}
          onTogglePick={onTogglePick}
          onAddCustom={onAddCustom}
          onRemoveOption={onRemoveOption}
        />
      ))}

      <div className="space-y-1 pt-2">
        <Label className="text-brass">Additional taste</Label>
        <p className="text-xs text-ink-soft">
          Collaboration, dial pattern, colour, movement type, and free-form notes.
        </p>
      </div>

      {TASTE_ATTR_KEYS.map((key) => (
        <AttributeFilterSection
          key={key}
          attrKey={key}
          hunt={hunt}
          savedCustoms={attributeLibrary[key] ?? []}
          hiddenOptions={attributeHidden[key] ?? []}
          editingTiles={editingTiles}
          onTogglePick={onTogglePick}
          onAddCustom={onAddCustom}
          onRemoveOption={onRemoveOption}
        />
      ))}

      <div className="space-y-2">
        <Label className="text-brass">How badly do you want this hunt?</Label>
        <p className="text-xs text-ink-soft">
          1 heart = keeping an eye out · 4 hearts = must-find
        </p>
        <HuntHeartsPicker
          value={hunt.hearts ?? 2}
          onChange={(hearts: HuntHearts) => onUpdate({ ...hunt, hearts })}
        />
      </div>

      <div className="rounded-sm border border-line bg-paper/50 p-4">
        <p className="font-display text-sm italic text-ink">{buildHuntSummary(hunt)}</p>
        {tightness && (
          <Badge
            variant="outline"
            className={cn(
              "mt-2",
              tightness.level === "specific" && "border-steal text-steal"
            )}
          >
            {tightness.label}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" className="text-steal" onClick={onDelete}>
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
        <div className="flex items-center gap-2">
          {!hunt.saved && (
            <span className="text-xs text-brass">Unsaved changes</span>
          )}
          <Button onClick={onSave} className="bg-ink text-card">
            {savedFlash ? "Saved" : "Save hunt"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function AttributeFilterSection({
  attrKey,
  hunt,
  savedCustoms,
  hiddenOptions,
  editingTiles,
  onTogglePick,
  onAddCustom,
  onRemoveOption,
}: {
  attrKey: AttrKey;
  hunt: Hunt;
  savedCustoms: string[];
  hiddenOptions: string[];
  editingTiles: boolean;
  onTogglePick: (key: AttrKey, value: string) => void;
  onAddCustom: (key: AttrKey, value: string) => void;
  onRemoveOption: (key: AttrKey, value: string) => void;
}) {
  const [input, setInput] = useState("");
  let chips = attributeChipOptions(attrKey, savedCustoms, hunt, hiddenOptions);
  if (attrKey === "model") {
    chips = [...chips].sort((a, b) => a.localeCompare(b));
  }
  const attr = hunt.attributes[attrKey] ?? { picks: [], customs: [] };
  const presetSet = new Set(
    ATTR_OPTIONS[attrKey].options.map((o) => normalizeCustomValue(o))
  );

  const submitCustom = () => {
    if (!input.trim()) return;
    onAddCustom(attrKey, input);
    setInput("");
  };

  return (
    <div className={cn("space-y-2", attrKey === "traits" && "border-t border-line pt-4")}>
      <Label className="text-brass">{ATTR_OPTIONS[attrKey].label}</Label>
      {attrKey === "traits" && (
        <p className="text-xs text-ink-soft">
          Anything else you care about — add a filter and tap to select
        </p>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((opt) => {
            const selected = isAttributeValueSelected(attr, opt);
            const isCustom = !presetSet.has(normalizeCustomValue(opt));
            return (
              <span
                key={opt}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-sm border text-xs",
                  editingTiles
                    ? "border-steal/40 bg-steal/5 pr-0.5"
                    : selected
                      ? "border-brass bg-brass/15 text-ink"
                      : "border-line-strong text-ink-soft",
                  isCustom && !selected && !editingTiles && "border-dashed"
                )}
              >
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
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Add ${ATTR_OPTIONS[attrKey].label.toLowerCase()} filter`}
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCustom();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={submitCustom}
          disabled={!input.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
