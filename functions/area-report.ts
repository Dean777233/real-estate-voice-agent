import { createAdminClient } from "npm:@insforge/sdk";

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
    args,
    listingId: meta.listing_id ?? args.listing_id,
    city: args.city as string | undefined,
    state: args.state as string | undefined,
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

function pct(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

export default async function (req: Request): Promise<Response> {
  const corsResult = cors(req);
  if (corsResult instanceof Response) return corsResult;
  const corsHeaders = corsResult;

  const { toolCallId, listingId, city, state } = await parseVapiTool(req);

  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL")!,
    apiKey: Deno.env.get("API_KEY")!,
  });

  let lookupCity = city;
  let lookupState = state;
  let lookupZip: string | undefined;

  if (listingId) {
    const { data: listing, error } = await admin.database
      .from("listings")
      .select("city, state, zip")
      .eq("id", listingId)
      .maybeSingle();

    if (error || !listing) {
      return vapiResult(toolCallId, "Listing not found.", corsHeaders);
    }
    lookupCity = listing.city;
    lookupState = listing.state;
    lookupZip = listing.zip ?? undefined;
  }

  if (!lookupCity || !lookupState) {
    return vapiResult(
      toolCallId,
      "Provide listing_id or both city and state for area stats.",
      corsHeaders,
    );
  }

  let query = admin.database
    .from("area_stats")
    .select("*")
    .eq("city", lookupCity)
    .eq("state", lookupState);

  if (lookupZip) {
    query = query.eq("zip", lookupZip);
  }

  const { data: stats, error: statsError } = await query.maybeSingle();

  if (statsError || !stats) {
    return vapiResult(
      toolCallId,
      `No area stats found for ${lookupCity}, ${lookupState}.`,
      corsHeaders,
    );
  }

  const summary =
    `Area report for ${lookupCity}, ${lookupState}` +
    (stats.zip ? ` ${stats.zip}` : "") +
    `. Crime index ${stats.crime_index ?? "n/a"} out of 100. ` +
    `School rating ${stats.school_rating ?? "n/a"} out of 10. ` +
    `Rent growth year over year ${pct(stats.rent_growth_yoy)}. ` +
    (stats.notes ? stats.notes : "");

  return vapiResult(toolCallId, summary.trim(), corsHeaders);
}
