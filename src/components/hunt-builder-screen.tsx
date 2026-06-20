"use client";

import { useCallback, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ATTR_KEYS,
  ATTR_OPTIONS,
  createDraftHunt,
  normalizeCustomValue,
  type AttrKey,
  type Hunt,
  type PurchasedWatch,
} from "@/lib/hunts/types";
import { buildHuntSummary, huntTightness, simulateListingParse } from "@/lib/hunts/summary";
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

  const expanded = editingId != null || draft != null;
  const activeHunt = workingCopy ?? draft;

  const startNewHunt = () => {
    const d = createDraftHunt();
    setDraft(d);
    setWorkingCopy(d);
    setEditingId(null);
  };

  const selectHunt = (hunt: Hunt) => {
    if (editingId === hunt.id) {
      setEditingId(null);
      setWorkingCopy(null);
      return;
    }
    setDraft(null);
    setEditingId(hunt.id);
    setWorkingCopy(JSON.parse(JSON.stringify(hunt)) as Hunt);
  };

  const updateAttr = (key: AttrKey, picks?: string[], customs?: string[]) => {
    if (!workingCopy) return;
    setWorkingCopy({
      ...workingCopy,
      saved: false,
      attributes: {
        ...workingCopy.attributes,
        [key]: {
          picks: picks ?? workingCopy.attributes[key].picks,
          customs: customs ?? workingCopy.attributes[key].customs,
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const togglePick = (key: AttrKey, value: string) => {
    if (!workingCopy) return;
    const current = workingCopy.attributes[key].picks;
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
    const saved: Hunt = { ...workingCopy, saved: true, updatedAt: new Date().toISOString() };
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
    const item: PurchasedWatch = { id, url, parsing: true, features: null };
    setPurchasedWatches([item, ...purchasedWatches]);
    setPurchaseUrl("");
    setTimeout(() => {
      setPurchasedWatches(
        useCasebackStore.getState().purchasedWatches.map((p) =>
          p.id === id
            ? { ...p, parsing: false, features: simulateListingParse(url) }
            : p
        )
      );
    }, 1200);
  }, [purchaseUrl, purchasedWatches, setPurchasedWatches]);

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

        {/* Saved hunts bar */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {hunts.filter((h) => h.saved).map((hunt) => (
              <button
                key={hunt.id}
                type="button"
                onClick={() => selectHunt(hunt)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-sm",
                  editingId === hunt.id
                    ? "border-brass bg-brass/15 text-ink"
                    : "border-line-strong text-ink-soft hover:text-ink"
                )}
              >
                {hunt.name}
                {editingId === hunt.id && workingCopy && !workingCopy.saved && (
                  <span className="ml-1 text-brass">•</span>
                )}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={startNewHunt}>
              <Plus className="mr-1 h-3 w-3" />
              New hunt
              {draft && (
                <span className="ml-2 text-xs italic text-ink-soft">(unsaved)</span>
              )}
            </Button>
          </div>
        </section>

        {/* Hunt form */}
        {!expanded && (
          <p className="text-sm italic text-ink-soft">
            Select a saved hunt to edit, or start a New hunt.
          </p>
        )}

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

            {ATTR_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <Label className="text-brass">{ATTR_OPTIONS[key].label}</Label>
                <div className="flex flex-wrap gap-2">
                  {ATTR_OPTIONS[key].options.map((opt) => {
                    const selected = activeHunt.attributes[key].picks.includes(opt);
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
                  defaultValue={activeHunt.attributes[key].customs.join(", ")}
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
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-sm border border-line p-3 text-sm"
              >
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-ink underline"
                >
                  {p.url}
                </a>
                {p.parsing && (
                  <span className="text-ink-soft italic">Reading listing…</span>
                )}
                {p.features &&
                  Object.entries(p.features).map(([k, v]) => (
                    <Badge key={k} variant="outline">
                      {k}: {v}
                    </Badge>
                  ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-steal"
                  onClick={() =>
                    setPurchasedWatches(purchasedWatches.filter((x) => x.id !== p.id))
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
