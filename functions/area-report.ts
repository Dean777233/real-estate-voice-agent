import { createAdminClient } from "npm:@insforge/sdk";

// Vapi helpers — keep in sync with functions/_vapi-utils.ts (InsForge deploys single files)
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

type VariableValues = Record<string, unknown>;

type VapiBody = {
  message?: {
    call?: {
      id?: string;
      metadata?: Record<string, unknown>;
      assistantOverrides?: { variableValues?: VariableValues };
      artifact?: { variableValues?: VariableValues };
    };
    artifact?: { variableValues?: VariableValues };
    toolCallList?: Array<{
      id?: string;
      arguments?: Record<string, unknown>;
    }>;
  };
};

function asListingId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function listingIdFromVariableValues(
  values: VariableValues | undefined,
): string | undefined {
  return asListingId(values?.listing_id);
}

function resolveListingId(body: VapiBody): string | undefined {
  const message = body?.message;
  const call = message?.call ?? {};
  const args = message?.toolCallList?.[0]?.arguments ?? {};

  const fromMetadata = asListingId(call.metadata?.listing_id);
  if (fromMetadata) return fromMetadata;

  const fromAssistantOverrides = listingIdFromVariableValues(
    call.assistantOverrides?.variableValues,
  );
  if (fromAssistantOverrides) return fromAssistantOverrides;

  const fromMessageArtifact = listingIdFromVariableValues(
    message?.artifact?.variableValues,
  );
  if (fromMessageArtifact) return fromMessageArtifact;

  const fromCallArtifact = listingIdFromVariableValues(
    call.artifact?.variableValues,
  );
  if (fromCallArtifact) return fromCallArtifact;

  return asListingId(args.listing_id);
}

async function parseVapiTool(req: Request) {
  const body = (await req.json()) as VapiBody;
  const call = body?.message?.call ?? {};
  const toolCall = body?.message?.toolCallList?.[0];
  const meta = call?.metadata ?? {};
  const args = toolCall?.arguments ?? {};
  const listingId = resolveListingId(body);

  if (!listingId) {
    console.warn("[vapi] listing_id missing", {
      callId: call?.id,
      hasMetadata: meta.listing_id != null,
      hasAssistantOverrides: call.assistantOverrides?.variableValues?.listing_id != null,
      hasArtifact:
        body?.message?.artifact?.variableValues?.listing_id != null ||
        call.artifact?.variableValues?.listing_id != null,
      hasArgs: args.listing_id != null,
    });
  }

  return {
    toolCallId: toolCall?.id ?? "unknown",
    args,
    listingId,
    investorId: asListingId(meta.investor_id),
    callId: call?.id,
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

type AreaStatsRow = {
  city: string;
  state: string;
  zip?: string | null;
  crime_index?: number | null;
  violent_crime_rate?: number | null;
  property_crime_rate?: number | null;
  school_rating?: number | null;
  rent_growth_yoy?: number | null;
  notes?: string | null;
};

function pct(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

function ratePerThousand(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `${Number(n).toFixed(1)} per thousand residents`;
}

function formatAreaReport(
  lookupCity: string,
  lookupState: string,
  stats: AreaStatsRow,
  requestedZip?: string,
): string {
  const zipNote =
    requestedZip && stats.zip && requestedZip !== stats.zip
      ? ` Stats are for zip ${stats.zip} in the same market.`
      : "";

  const summary =
    `Area report for ${lookupCity}, ${lookupState}` +
    (stats.zip ? ` ${stats.zip}` : "") +
    `. Crime index ${stats.crime_index ?? "n/a"} out of 100. ` +
    `Violent crime rate ${ratePerThousand(stats.violent_crime_rate)}. ` +
    `Property crime rate ${ratePerThousand(stats.property_crime_rate)}. ` +
    `School rating ${stats.school_rating ?? "n/a"} out of 10. ` +
    `Rent growth year over year ${pct(stats.rent_growth_yoy)}.` +
    zipNote +
    (stats.notes ? ` ${stats.notes}` : "");

  return summary.trim();
}

function formatNoAreaStatsMessage(city: string, state: string): string {
  return (
    `I don't have neighborhood statistics for ${city}, ${state} yet. ` +
    "Crime and school data are not available for this area in our database — " +
    "I recommend checking local crime maps and school rating sites before deciding."
  );
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function lookupAreaStats(
  admin: AdminClient,
  city: string,
  state: string,
  zip?: string,
): Promise<{ stats: AreaStatsRow | null; error: unknown }> {
  if (zip) {
    const { data, error } = await admin.database
      .from("area_stats")
      .select("*")
      .eq("city", city)
      .eq("state", state)
      .eq("zip", zip)
      .maybeSingle();
    if (error) return { stats: null, error };
    if (data) return { stats: data as AreaStatsRow, error: null };
  }

  const { data: byCityState, error: cityStateError } = await admin.database
    .from("area_stats")
    .select("*")
    .eq("city", city)
    .eq("state", state)
    .limit(1);
  if (cityStateError) return { stats: null, error: cityStateError };
  if (byCityState?.[0]) {
    return { stats: byCityState[0] as AreaStatsRow, error: null };
  }

  const { data: byCity, error: cityError } = await admin.database
    .from("area_stats")
    .select("*")
    .eq("city", city)
    .limit(1);
  if (cityError) return { stats: null, error: cityError };
  if (byCity?.[0]) return { stats: byCity[0] as AreaStatsRow, error: null };

  return { stats: null, error: null };
}

export default async function (req: Request): Promise<Response> {
  const corsResult = cors(req);
  if (corsResult instanceof Response) return corsResult;
  const corsHeaders = corsResult;

  const { toolCallId, listingId, args } = await parseVapiTool(req);
  const city = args.city as string | undefined;
  const state = args.state as string | undefined;

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

  const { stats, error: statsError } = await lookupAreaStats(
    admin,
    lookupCity,
    lookupState,
    lookupZip,
  );

  if (statsError) {
    console.error("[area-report] lookup failed", statsError);
    return vapiResult(
      toolCallId,
      formatNoAreaStatsMessage(lookupCity, lookupState),
      corsHeaders,
    );
  }

  if (!stats) {
    return vapiResult(
      toolCallId,
      formatNoAreaStatsMessage(lookupCity, lookupState),
      corsHeaders,
    );
  }

  const summary = formatAreaReport(
    lookupCity,
    lookupState,
    stats,
    lookupZip,
  );

  return vapiResult(toolCallId, summary, corsHeaders);
}
