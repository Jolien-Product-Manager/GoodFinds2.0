import { inferCollabFromTitle } from "@/lib/listings/collab";
import {
  inferCompletenessFromTitle,
  inferCrystalFromTitle,
  inferDateCodeFromTitle,
  inferDialOrigFromTitle,
  inferPlatingFromTitle,
  inferRunningFromTitle,
} from "@/lib/listings/infer-buyer-axes";
import { eraFromYear, matchListingToModel } from "@/lib/models/catalog";
import type { PurchasedWatch } from "./types";

const PURCHASE_FEATURE_ORDER = [
  "model",
  "collab",
  "era",
  "mvmt",
  "complications",
  "running",
  "complete",
  "dial",
  "color",
  "crystal",
  "datecode",
  "dialOrig",
  "plating",
] as const;

function inferMvmtFromTitle(title: string): string | undefined {
  const lower = title.toLowerCase();
  if (lower.includes("quartz")) return "Quartz";
  if (lower.includes("automatic")) return "Self-wind / auto";
  if (lower.includes("electric")) return "Electric";
  if (lower.includes("manual") || lower.includes("mechanical")) return "Manual wind";
  return undefined;
}

function inferEraFromText(text: string): string | undefined {
  const yearMatch = text.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  if (yearMatch) {
    return eraFromYear(Number.parseInt(yearMatch[1], 10));
  }

  const lower = text.toLowerCase();
  if (lower.includes("1950")) return "1950s";
  if (lower.includes("1960") || lower.includes("sixties")) return "1960s";
  if (lower.includes("1970") || lower.includes("seventies")) return "1970s";
  if (lower.includes("1980") || lower.includes("eighties")) return "1980s";
  if (lower.includes("1990") || lower.includes("nineties")) return "1990s";
  return undefined;
}

function inferComplicationsFromTitle(title: string): string | undefined {
  const lower = title.toLowerCase();
  if (lower.includes("chronograph")) return "Chronograph (stopwatch)";
  if (lower.includes("alarm")) return "Alarm";
  if (lower.includes("gmt") || lower.includes("dual time")) return "GMT / dual time";
  if (lower.includes("world time")) return "World time";
  if (lower.includes("day-date") || lower.includes("day date")) {
    return "Day-date (day + date)";
  }
  if (lower.includes("date")) return "Date";
  if (lower.includes("indiglo")) return "Indiglo night-light";
  return undefined;
}

function inferPromoCollabFromTitle(title: string): string | undefined {
  const quoted = title.match(/[“"']([^“”"']+)[”"']/);
  if (!quoted) return undefined;
  const candidate = quoted[1].trim();
  if (!candidate || candidate.toLowerCase().includes("timex")) return undefined;
  return candidate;
}

function inferRunningFromPurchaseTitle(title: string): string | undefined {
  const fromKeywords = inferRunningFromTitle(title);
  if (fromKeywords) return fromKeywords;
  if (/\bworks?\s+(great|well|fine|good)\b/i.test(title)) return "Running";
  return undefined;
}

/** Pull hunt-relevant tags from a purchased watch's title, description, and URL. */
export function extractPurchasedWatchFeatures(
  input: Pick<PurchasedWatch, "url" | "title" | "description">
): Record<string, string> {
  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const combined = [title, description, input.url].filter(Boolean).join(" ");
  if (!combined.trim()) return {};

  const sourceTitle = title || combined;
  const features: Record<string, string> = {};

  const model = matchListingToModel(sourceTitle);
  if (model) features.model = model;

  const collab =
    inferCollabFromTitle(sourceTitle) ?? inferPromoCollabFromTitle(sourceTitle);
  if (collab) features.collab = collab;

  const mvmt = inferMvmtFromTitle(sourceTitle);
  if (mvmt) features.mvmt = mvmt;

  const era = inferEraFromText(combined);
  if (era) features.era = era;

  const complications = inferComplicationsFromTitle(sourceTitle);
  if (complications) features.complications = complications;

  const running = inferRunningFromPurchaseTitle(sourceTitle);
  if (running) features.running = running;

  const complete = inferCompletenessFromTitle(sourceTitle);
  if (complete) features.complete = complete;

  const crystal = inferCrystalFromTitle(sourceTitle);
  if (crystal) features.crystal = crystal;

  const datecode = inferDateCodeFromTitle(sourceTitle);
  if (datecode) features.datecode = datecode;

  const dialOrig = inferDialOrigFromTitle(sourceTitle);
  if (dialOrig) features.dialOrig = dialOrig;

  const plating = inferPlatingFromTitle(sourceTitle);
  if (plating) features.plating = plating;

  const lowerCombined = combined.toLowerCase();
  if (!features.model && lowerCombined.includes("marlin")) features.model = "Marlin";
  if (!features.model && lowerCombined.includes("viscount")) features.model = "Viscount";
  if (!features.mvmt && lowerCombined.includes("electric")) features.mvmt = "Electric";

  return features;
}

function isGenericTimexModel(value: string | number | undefined): boolean {
  return String(value ?? "").trim().toLowerCase() === "timex";
}

/** Display tags for a purchased watch row — skips generic model: Timex. */
export function purchasedWatchFeatureTags(
  watch: Pick<PurchasedWatch, "url" | "title" | "description" | "features">
): string[] {
  const extracted = extractPurchasedWatchFeatures(watch);
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(watch.features ?? {})) {
    if (value != null && String(value).trim() !== "") {
      merged[key] = String(value);
    }
  }
  Object.assign(merged, extracted);

  const tags: string[] = [];
  for (const key of PURCHASE_FEATURE_ORDER) {
    const value = merged[key];
    if (value == null || String(value).trim() === "") continue;
    if (key === "model" && isGenericTimexModel(value)) continue;
    tags.push(String(value));
  }
  return tags;
}
