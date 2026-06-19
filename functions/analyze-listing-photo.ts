import { createAdminClient } from "npm:@insforge/sdk";

const NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const VISION_MODELS = [
  "Qwen/Qwen2-VL-72B-Instruct",
  "meta-llama/Llama-3.2-90B-Vision-Instruct",
  "meta-llama/Llama-3.2-11B-Vision-Instruct",
];

type ListingVisionContext = {
  address: string;
  city: string;
  state: string;
  year_built: number | null;
  rehab_estimate: number | null;
  property_type: string | null;
  photo_url: string;
};

function cors(req: Request): Response | Record<string, string> {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  return headers;
}

async function parseVapiTool(req: Request) {
  const body = await req.json();
  const call = body?.message?.call ?? {};
  const toolCall = body?.message?.toolCallList?.[0];
  const meta = call?.metadata ?? {};
  const args = toolCall?.arguments ?? {};
  return {
    toolCallId: toolCall?.id ?? "unknown",
    listingId: meta.listing_id ?? args.listing_id,
  };
}

function vapiResult(
  toolCallId: string,
  result: string,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify({ results: [{ toolCallId, result }] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function numberUnder100(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`;
}

function speakThousands(amount: number): string {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n <= 0) {
    return "no listed rehab budget";
  }
  if (n < 1000) return `${numberUnder100(n)} dollars`;
  if (n % 1000 === 0) {
    const k = n / 1000;
    if (k < 100) return `${numberUnder100(k)} thousand`;
    return `${n.toLocaleString("en-US")} dollars`;
  }
  return `about ${n.toLocaleString("en-US")} dollars`;
}

function formatPropertyType(propertyType: string | null): string {
  const raw = (propertyType ?? "single_family").trim().toLowerCase();
  if (raw === "single_family" || raw === "single-family") return "single family";
  if (raw === "multi_family" || raw === "multi-family") return "multi-family";
  return raw.replace(/_/g, " ");
}

function yearBuiltPhrase(yearBuilt: number | null): string {
  if (yearBuilt == null || !Number.isFinite(yearBuilt)) {
    return "built in a typical range";
  }
  return `built in ${Math.round(yearBuilt)}`;
}

function investorWalkthroughHint(propertyType: string | null): string {
  const raw = (propertyType ?? "").trim().toLowerCase();
  if (raw === "duplex" || raw === "triplex" || raw === "multi_family") {
    return "I'd recommend an in-person walkthrough for roof, foundation, and mechanicals in each unit.";
  }
  if (raw === "condo" || raw === "townhouse") {
    return "I'd recommend an in-person walkthrough and a review of HOA reserves and exterior maintenance.";
  }
  return "I'd recommend an in-person walkthrough for roof and foundation.";
}

function photoHostLabel(photoUrl: string): string {
  try {
    return new URL(photoUrl).hostname;
  } catch {
    return "the listing image host";
  }
}

function visionAnalysisFallback(ctx: ListingVisionContext): string {
  const propertyLabel = formatPropertyType(ctx.property_type);
  const yearPhrase = yearBuiltPhrase(ctx.year_built);
  const rehabPhrase = speakThousands(Number(ctx.rehab_estimate ?? 0));
  const addressLabel = ctx.address?.trim() || "this property";

  const rehabPart =
    rehabPhrase === "no listed rehab budget"
      ? "with no rehab budgeted on the listing"
      : `with an estimated rehab budget of ${rehabPhrase}`;

  return (
    `I couldn't run the photo analysis right now. Automated vision is temporarily unavailable. ` +
    `For ${addressLabel}, the listing shows a ${propertyLabel} ${yearPhrase} ${rehabPart}. ` +
    investorWalkthroughHint(ctx.property_type) + ` Listing exterior image at ${photoHostLabel(ctx.photo_url)}.`
  );
}

function isNebiusAuthFailure(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true;
  const lower = body.toLowerCase();
  return lower.includes("couldn't authenticate") || lower.includes("unable authenticate");
}

async function analyzeWithNebius(ctx: ListingVisionContext): Promise<string> {
  const apiKey = Deno.env.get("NEBIUS_API_KEY")?.trim();
  if (!apiKey) {
    return visionAnalysisFallback(ctx);
  }

  const address = `${ctx.address}, ${ctx.city} ${ctx.state}`;
  const prompt =
    `You are advising a real estate investor. Analyze this property photo for ` +
    `${address}. In 2-3 sentences, summarize visible condition, curb appeal, ` +
    `and any rehab red flags or positives. Be direct and investor-focused.`;

  for (const model of VISION_MODELS) {
    const res = await fetch(NEBIUS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: ctx.photo_url } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      if (isNebiusAuthFailure(res.status, errBody)) {
        return visionAnalysisFallback(ctx);
      }
      continue;
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    if (text) return text;
  }

  return visionAnalysisFallback(ctx);
}

export default async function (req: Request): Promise<Response> {
  const corsResult = cors(req);
  if (corsResult instanceof Response) return corsResult;
  const corsHeaders = corsResult;

  const { toolCallId, listingId } = await parseVapiTool(req);

  if (!listingId) {
    return vapiResult(
      toolCallId,
      "No listing ID provided. Pass listing_id in call metadata or tool arguments.",
      corsHeaders,
    );
  }

  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL")!,
    apiKey: Deno.env.get("API_KEY")!,
  });

  const { data, error } = await admin.database
    .from("listings")
    .select(
      "address, city, state, photo_url, year_built, rehab_estimate, property_type",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    return vapiResult(toolCallId, "Listing not found.", corsHeaders);
  }

  if (!data.photo_url) {
    return vapiResult(
      toolCallId,
      "No photo available for this listing.",
      corsHeaders,
    );
  }

  const ctx: ListingVisionContext = {
    address: data.address,
    city: data.city,
    state: data.state,
    year_built: data.year_built ?? null,
    rehab_estimate: data.rehab_estimate ?? null,
    property_type: data.property_type ?? null,
    photo_url: data.photo_url,
  };

  try {
    const summary = await analyzeWithNebius(ctx);
    return vapiResult(toolCallId, summary, corsHeaders);
  } catch {
    return vapiResult(toolCallId, visionAnalysisFallback(ctx), corsHeaders);
  }
}
