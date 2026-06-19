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

function fmtPrice(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
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

  const { data: source, error: sourceError } = await admin.database
    .from("listings")
    .select("id, city, state, list_price, beds")
    .eq("id", listingId)
    .maybeSingle();

  if (sourceError || !source) {
    return vapiResult(toolCallId, "Listing not found.", corsHeaders);
  }

  const price = Number(source.list_price);
  const beds = Number(source.beds ?? 0);
  const minPrice = price * 0.8;
  const maxPrice = price * 1.2;
  const minBeds = Math.max(0, beds - 1);
  const maxBeds = beds + 1;

  const { data: matches, error: matchError } = await admin.database
    .from("listings")
    .select("address, city, state, list_price, beds, baths")
    .eq("city", source.city)
    .eq("state", source.state)
    .eq("status", "active")
    .neq("id", listingId)
    .gte("list_price", minPrice)
    .lte("list_price", maxPrice)
    .gte("beds", minBeds)
    .lte("beds", maxBeds)
    .order("list_price", { ascending: true })
    .limit(3);

  if (matchError) {
    return vapiResult(
      toolCallId,
      `Search failed: ${matchError.message}`,
      corsHeaders,
    );
  }

  if (!matches?.length) {
    return vapiResult(
      toolCallId,
      `No similar listings found in ${source.city}, ${source.state} within 20% of the price and one bedroom of this property.`,
      corsHeaders,
    );
  }

  const parts = matches.map(
    (m, i) =>
      `${i + 1}. ${m.address}, ${m.city} ${m.state}. ` +
      `${m.beds} bed, list price $${fmtPrice(Number(m.list_price))}.`,
  );

  return vapiResult(
    toolCallId,
    `Top ${matches.length} similar listings in ${source.city}, ${source.state}: ${parts.join(" ")}`,
    corsHeaders,
  );
}
