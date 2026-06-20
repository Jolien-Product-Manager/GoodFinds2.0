"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ATTR_KEYS,
  ATTR_OPTIONS,
  HUNT_GENDER_OPTIONS,
  createDraftHunt,
  normalizeCustomValue,
  normalizeHunt,
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Hunt | null>(null);
  const [workingCopy, setWorkingCopy] = useState<Hunt | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [listingImages, setListingImages] = useState<ListingImageRef[]>([]);

  const expanded = editingId != null || draft != null;
  const activeHunt = workingCopy ?? draft;

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
    if (!workingCopy) return;
    const current = workingCopy.attributes[key] ?? { picks: [], customs: [] };
    setWorkingCopy({
      ...workingCopy,
      saved: false,
      attributes: {
        ...workingCopy.attributes,
        [key]: {
          picks: picks ?? current.picks,
          customs: customs ?? current.customs,
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const togglePick = (key: AttrKey, value: string) => {
    if (!workingCopy) return;
    const current = workingCopy.attributes[key]?.picks ?? [];
    const picks = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateAttr(key, picks);
  };

  const handleCustomInput = (key: AttrKey, raw: string) => {
    const customs = raw
      .split(",")
      .map((s) => normalizeCustomValue(s))
      .filter(Boolean);
    updateAttr(key, undefined, customs);
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

  const tightness = activeHunt ? huntTightness(activeHunt) : null;

  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Hunts</h1>
          <p className="mt-1 text-ink-soft">
            Define what you&apos;re looking for — gates and taste live here.
          </p>
        </div>

        {/* Saved hunts */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-medium text-ink">Defined hunts</h2>
            <Button variant="outline" size="sm" onClick={startNewHunt}>
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
            <ul className="space-y-3">
              {hunts
                .filter((h) => h.saved)
                .map((hunt) => {
                  const tightnessForHunt = huntTightness(hunt);
                  const isEditing = editingId === hunt.id && !draft;

                  return (
                    <li
                      key={hunt.id}
                      className={cn(
                        "rounded-sm border bg-card p-4",
                        isEditing
                          ? "border-brass bg-brass/5"
                          : "border-line-strong"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-medium text-ink">
                              {hunt.name}
                            </h3>
                            <HuntHeartsPicker value={hunt.hearts ?? 2} size="xs" />
                          </div>
                          <p className="font-display text-sm italic text-ink-soft">
                            {buildHuntSummary(hunt)}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              tightnessForHunt.level === "specific" &&
                                "border-steal text-steal"
                            )}
                          >
                            {tightnessForHunt.label}
                          </Badge>
                        </div>
                        {!isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => openEdit(hunt)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        {/* Hunt editor */}
        {expanded && activeHunt && (
          <section className="space-y-6 rounded-sm border border-line-strong bg-card p-6">
            <div className="flex items-center gap-2">
              <Input
                value={activeHunt.name}
                onChange={(e) =>
                  setWorkingCopy({
                    ...activeHunt,
                    name: e.target.value,
                    saved: false,
                  })
                }
                className="font-display text-lg"
                placeholder="Hunt name"
              />
              <Button variant="ghost" size="icon" onClick={handleCollapse}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-brass">Gender</Label>
              <div className="flex flex-wrap gap-2">
                {HUNT_GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setWorkingCopy({
                        ...activeHunt,
                        gender: opt.value,
                        saved: false,
                      })
                    }
                    className={cn(
                      "rounded-sm border px-3 py-1.5 text-sm",
                      (activeHunt.gender ?? "both") === opt.value
                        ? "border-brass bg-brass/15 text-ink"
                        : "border-line-strong text-ink-soft"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-brass">How badly do you want this hunt?</Label>
              <p className="text-xs text-ink-soft">
                1 heart = keeping an eye out · 4 hearts = must-find
              </p>
              <HuntHeartsPicker
                value={activeHunt.hearts ?? 2}
                onChange={(hearts: HuntHearts) =>
                  setWorkingCopy({
                    ...activeHunt,
                    hearts,
                    saved: false,
                  })
                }
              />
            </div>

            {ATTR_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <Label className="text-brass">{ATTR_OPTIONS[key].label}</Label>
                <div className="flex flex-wrap gap-2">
                  {ATTR_OPTIONS[key].options.map((opt) => {
                    const selected = (activeHunt.attributes[key]?.picks ?? []).includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => togglePick(key, opt)}
                        className={cn(
                          "rounded-sm border px-2 py-1 text-xs",
                          selected
                            ? "border-brass bg-brass/15 text-ink"
                            : "border-line-strong text-ink-soft"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="Or type your own (comma-separated)"
                  defaultValue={(activeHunt.attributes[key]?.customs ?? []).join(", ")}
                  onBlur={(e) => handleCustomInput(key, e.target.value)}
                  className="text-sm"
                />
              </div>
            ))}

            <div className="rounded-sm border border-line bg-paper/50 p-4">
              <p className="font-display text-sm italic text-ink">
                {buildHuntSummary(activeHunt)}
              </p>
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
              <Button
                variant="ghost"
                className="text-steal"
                onClick={handleDelete}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
              <div className="flex items-center gap-2">
                {!activeHunt.saved && (
                  <span className="text-xs text-brass">Unsaved changes</span>
                )}
                <Button onClick={handleSave} className="bg-ink text-card">
                  {savedFlash ? "Saved" : "Save hunt"}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Global filters */}
        <section className="space-y-4 rounded-sm border border-line-strong bg-card p-6">
          <h2 className="font-display text-xl font-medium text-ink">Global filters</h2>
          <div className="space-y-2">
            <Label htmlFor="price-ceiling">Price ceiling (landed cost)</Label>
            <Input
              id="price-ceiling"
              type="number"
              value={globalFilters.priceCeiling ?? ""}
              onChange={(e) =>
                setGlobalFilters({
                  priceCeiling: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="No limit"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ships-to-me">Ships to my address</Label>
            <Switch
              id="ships-to-me"
              checked={globalFilters.shipsToMe}
              onCheckedChange={(v) => setGlobalFilters({ shipsToMe: v })}
            />
          </div>
          {globalFilters.shipsToMe && (
            <div className="space-y-2">
              <Label htmlFor="postal">Postal code</Label>
              <Input
                id="postal"
                value={globalFilters.postalCode ?? ""}
                onChange={(e) => setGlobalFilters({ postalCode: e.target.value })}
                placeholder="M6K1V8"
              />
            </div>
          )}
        </section>

        {/* Purchased watches */}
        <section className="space-y-4 rounded-sm border border-line-strong bg-card p-6">
          <h2 className="font-display text-xl font-medium text-ink">Purchased watches</h2>
          <div className="flex gap-2">
            <Input
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              placeholder="Paste listing URL"
              onKeyDown={(e) => e.key === "Enter" && addPurchase()}
            />
            <Button variant="outline" onClick={addPurchase}>
              Add
            </Button>
          </div>
          <ul className="space-y-3">
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
