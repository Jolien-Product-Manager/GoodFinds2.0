import { NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveHuntSearchIntentRules,
  huntSearchIntentFallback,
  type HuntSearchIntent,
} from "@/lib/hunts/search-intent";
import {
  ATTR_KEYS,
  ATTR_OPTIONS,
  HUNT_GENDER_OPTIONS,
  createDraftHunt,
  type AttrKey,
} from "@/lib/hunts/types";

const bodySchema = z.object({
  query: z.string().min(1).max(200),
});

const intentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("gender"),
    value: z.enum([
      "mens",
      "womens",
      "both",
      "unisex",
      "childrens",
      "boys",
      "girls",
      "unisex_children",
    ] as const),
  }),
  z.object({
    kind: z.literal("attr"),
    key: z.enum(ATTR_KEYS as [AttrKey, ...AttrKey[]]),
    value: z.string().min(1).max(120),
  }),
  z.object({
    kind: z.literal("custom"),
    value: z.string().min(1).max(120),
  }),
]);

function attributeCatalogForPrompt(): string {
  return ATTR_KEYS.map((key) => {
    const opts = ATTR_OPTIONS[key].options.slice(0, 12);
    const sample =
      opts.length > 0 ? opts.join(", ") : "(free-form custom values)";
    return `${key} (${ATTR_OPTIONS[key].label}): ${sample}`;
  }).join("\n");
}

async function classifyWithAnthropic(query: string): Promise<HuntSearchIntent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const genderList = HUNT_GENDER_OPTIONS.map((o) => `${o.value}=${o.label}`).join(
    ", "
  );

  const prompt = `Classify this vintage Timex hunt search query into ONE filter.

Query: "${query}"

Gender values: ${genderList}

Attribute keys and examples:
${attributeCatalogForPrompt()}

Return ONLY valid JSON, one of:
{"kind":"gender","value":"<gender value>"}
{"kind":"attr","key":"<attr key>","value":"<exact or close option label>"}
{"kind":"custom","value":"<free text for traits>"}

Examples:
- "womens" → {"kind":"gender","value":"womens"}
- "ladies watch" → {"kind":"gender","value":"womens"}
- "marlin" → {"kind":"attr","key":"model","value":"Marlin"}
- "1970s" → {"kind":"attr","key":"era","value":"1970s"}
- "peanuts snoopy" → {"kind":"attr","key":"collab","value":"Peanuts"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_HUNT_INTENT_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 180,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return null;

  const payload = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = payload.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) return null;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = intentSchema.parse(JSON.parse(jsonMatch[0]));
    return { ...parsed, source: "ai" } as HuntSearchIntent;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { query } = parsed.data;
  const draft = createDraftHunt();

  const rules = resolveHuntSearchIntentRules(query, draft, {}, {});
  if (rules) {
    return NextResponse.json(rules);
  }

  const ai = await classifyWithAnthropic(query);
  if (ai) {
    return NextResponse.json(ai);
  }

  return NextResponse.json(huntSearchIntentFallback(query));
}
