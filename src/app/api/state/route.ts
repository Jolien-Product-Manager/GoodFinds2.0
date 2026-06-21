import { NextResponse } from "next/server";
import {
  readPersistedState,
  writePersistedState,
} from "@/lib/persistence/server-store";
import {
  isPersistedStateEmpty,
  normalizePersistedState,
  readUserStateFromDb,
  writeUserStateToDb,
} from "@/lib/persistence/db-store";
import type { PersistedState } from "@/lib/persistence/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAuthenticatedUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();

  if (userId) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const state = await readUserStateFromDb(supabase, userId);
    return NextResponse.json(state);
  }

  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  return NextResponse.json(readPersistedState());
}

export async function POST(request: Request) {
  let body: PersistedState;
  try {
    body = (await request.json()) as PersistedState;
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  const normalized = normalizePersistedState(body);

  if (userId) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    try {
      await writeUserStateToDb(supabase, userId, normalized);
      return NextResponse.json({ ok: true, storage: "supabase" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  writePersistedState(normalized);
  return NextResponse.json({ ok: true, storage: "file" });
}
