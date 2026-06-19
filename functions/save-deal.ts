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
    investorId: meta.investor_id as string | undefined,
    notes: args.notes as string | undefined,
    rating: args.rating as number | undefined,
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

  const { toolCallId, listingId, investorId, notes, rating } =
    await parseVapiTool(req);

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
