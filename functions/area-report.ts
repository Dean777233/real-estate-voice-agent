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

function pct(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `${(Number(n) * 100).toFixed(1)}%`;
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
