import fs from "node:fs";
import path from "node:path";
import {
  mergeDefaultPurchasedWatches,
  normalizePurchasedWatch,
} from "@/lib/hunts/purchased-watch";
import type { PurchasedWatch } from "@/lib/hunts/types";
import {
  DEFAULT_PERSISTED_STATE,
  type PersistedState,
} from "./types";

const STORE_PATH = path.join(process.cwd(), "data/store/state.json");

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

export function readPersistedState(): PersistedState {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_PATH)) {
      return DEFAULT_PERSISTED_STATE;
    }
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    const merged = { ...DEFAULT_PERSISTED_STATE, ...raw };
    merged.purchasedWatches = mergeDefaultPurchasedWatches(
      (merged.purchasedWatches ?? []).map((watch: PurchasedWatch) =>
        normalizePurchasedWatch(watch)
      )
    );
    return merged;
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}

export function writePersistedState(state: PersistedState): void {
  ensureStoreDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), "utf-8");
}
