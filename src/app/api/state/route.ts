import { NextResponse } from "next/server";
import {
  readPersistedState,
  writePersistedState,
} from "@/lib/persistence/server-store";
import type { PersistedState } from "@/lib/persistence/types";

export async function GET() {
  const state = readPersistedState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PersistedState;
    writePersistedState(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }
}
