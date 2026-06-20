import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PERSISTED_STATE,
  type PersistedState,
} from "@/lib/persistence/types";

function mergeWithDefaults(raw: unknown): PersistedState {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PERSISTED_STATE;
  }
  return { ...DEFAULT_PERSISTED_STATE, ...(raw as Partial<PersistedState>) };
}

export function isPersistedStateEmpty(state: PersistedState): boolean {
  return (
    state.seen.length === 0 &&
    state.hunts.length === 0 &&
    state.purchasedWatches.length === 0 &&
    Object.keys(state.listingStatus).length === 0
  );
}

export async function readUserStateFromDb(
  supabase: SupabaseClient,
  userId: string
): Promise<PersistedState> {
  const { data, error } = await supabase
    .from("user_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Supabase read user_state failed:", error.message);
    return DEFAULT_PERSISTED_STATE;
  }

  if (!data?.state) {
    return DEFAULT_PERSISTED_STATE;
  }

  return mergeWithDefaults(data.state);
}

export async function writeUserStateToDb(
  supabase: SupabaseClient,
  userId: string,
  state: PersistedState
): Promise<void> {
  const { error } = await supabase.from("user_state").upsert(
    {
      user_id: userId,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}
