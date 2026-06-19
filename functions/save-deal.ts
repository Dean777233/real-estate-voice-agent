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

export default async function (req: Request): Promise<Response> {
  const corsResult = cors(req);
  if (corsResult instanceof Response) return corsResult;
  const corsHeaders = corsResult;

  const { toolCallId, listingId, investorId, args } = await parseVapiTool(req);
  const notes = args.notes as string | undefined;
  const rating = args.rating as number | undefined;

  if (!listingId) {
    return vapiResult(
      toolCallId,
      "No listing ID provided. Pass listing_id in call metadata, variableValues, or tool arguments.",
      corsHeaders,
    );
  }

  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL")!,
    apiKey: Deno.env.get("API_KEY")!,
  });

  const { data: listing, error: listingError } = await admin.database
    .from("listings")
    .select("id, address, city, state")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return vapiResult(toolCallId, "Listing not found.", corsHeaders);
  }

  const row: Record<string, unknown> = { listing_id: listingId };
  if (investorId) row.investor_id = investorId;
  if (notes != null && notes !== "") row.notes = notes;
  if (rating != null) {
    const r = Number(rating);
    if (r >= 1 && r <= 5) row.rating = Math.round(r);
  }

  const { data: existing } = investorId
    ? await admin.database
      .from("watchlist")
      .select("id")
      .eq("listing_id", listingId)
      .eq("investor_id", investorId)
      .maybeSingle()
    : await admin.database
      .from("watchlist")
      .select("id")
      .eq("listing_id", listingId)
      .is("investor_id", null)
      .maybeSingle();

  const { error: insertError } = existing?.id
    ? await admin.database.from("watchlist").update(row).eq("id", existing.id)
    : await admin.database.from("watchlist").insert([row]);

  if (insertError) {
    return vapiResult(
      toolCallId,
      `Could not save deal: ${insertError.message}`,
      corsHeaders,
    );
  }

  const ratingPart =
    row.rating != null ? ` with a ${row.rating} out of 5 rating` : "";
  const notesPart = row.notes ? " Your notes are saved." : "";

  return vapiResult(
    toolCallId,
    `Saved ${listing.address} in ${listing.city}, ${listing.state} to your watchlist${ratingPart}.${notesPart}`,
    corsHeaders,
  );
}
