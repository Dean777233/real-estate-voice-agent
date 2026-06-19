import { createAdminClient } from "npm:@insforge/sdk";

// Vapi helpers (canonical copy in ./_vapi-utils.ts for other functions)
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
  return {
    toolCallId: toolCall?.id ?? "unknown",
    args: toolCall?.arguments ?? {},
    listingId: meta.listing_id ?? toolCall?.arguments?.listing_id,
    investorId: meta.investor_id,
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
    .select("*")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    return vapiResult(toolCallId, "Listing not found.", corsHeaders);
  }

  const summary =
    `${data.address}, ${data.city} ${data.state}. ` +
    `${data.beds} bed ${data.baths} bath, ${data.sqft} sqft. ` +
    `List price $${data.list_price}. Est rent $${data.rent_estimate}/mo. ` +
    `ARV $${data.arv_estimate}. Rehab est $${data.rehab_estimate}.`;

  return vapiResult(toolCallId, summary, corsHeaders);
}
