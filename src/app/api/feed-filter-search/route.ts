import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ATTR_KEYS,
  type AttrKey,
} from "@/lib/hunts/types";
import {
  buildFeedFilterCatalog,
  catalogEntryForMatch,
  feedFilterCatalogForPrompt,
  finalizeFeedFilterMatches,
  matchFeedFilterOptionsLocal,
  type FeedFilterMatch,
} from "@/lib/listings/feed-filter-search";

const bodySchema = z.object({
  query: z.string().min(1).max(200),
  /** Optional client attribute library (custom chips). */
  attributeLibrary: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .default({}),
});

const matchSchema = z.object({
  key: z.enum(ATTR_KEYS as [AttrKey, ...AttrKey[]]),
  value: z.string().min(1).max(120),
});

async function matchWithAnthropic(
  query: string,
  catalog: FeedFilterMatch[],
  attributeLibrary: Record<string, string[]>
): Promise<FeedFilterMatch[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return [];

  const prompt = `You help search vintage Timex feed filters. Given a user query, return preset filter options that match — including spelling variants, spacing, synonyms, and partial terms.

Query: "${query}"

Available filters (key (label): options):
${feedFilterCatalogForPrompt(attributeLibrary)}

Return ONLY valid JSON — an array of matches, each:
{"key":"<attr key>","value":"<exact option string from the list above>"}

Rules:
- Match semantically, not just literally (e.g. "moonphase" → complications "Moon phase", "chrono" → "Chronograph (stopwatch)", "gmt" / "dual time zone" / "dual hour" → complications "GMT / dual time").
- Use exact option strings from the catalog.
- Return [] if nothing fits.
- Prefer complication/collab/era/model presets over inventing new values.
- "deadstock" / "dead stock" is NOT "NOS / unworn" — return [] (handled separately as Custom Deadstock).

Examples:
- "moonphase" → [{"key":"complications","value":"Moon phase"}]
- "gmt" → [{"key":"complications","value":"GMT / dual time"}]
- "dual time zone" → [{"key":"complications","value":"GMT / dual time"}]
- "snoopy" → [{"key":"collab","value":"Peanuts"}]
- "70s" → [{"key":"era","value":"1970s"}]
- "deadstock" → []`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:
        process.env.ANTHROPIC_FEED_FILTER_MODEL ??
        process.env.ANTHROPIC_HUNT_INTENT_MODEL ??
        "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return [];

  const payload = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = payload.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) return [];

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = z.array(matchSchema).parse(JSON.parse(jsonMatch[0]));
    const out: FeedFilterMatch[] = [];
    for (const item of parsed) {
      const entry = catalogEntryForMatch(catalog, item.key, item.value);
      if (entry) out.push({ ...entry, source: "ai" });
    }
    return out;
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { query, attributeLibrary } = parsed.data;
  const catalog = buildFeedFilterCatalog(attributeLibrary);
  const local = matchFeedFilterOptionsLocal(query, catalog);

  const ai = await matchWithAnthropic(query, catalog, attributeLibrary);
  const matches = finalizeFeedFilterMatches([...local, ...ai], query);

  return NextResponse.json({ matches, source: ai.length > 0 ? "ai" : "rules" });
}
