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

function fmt(n: number): string {
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

  const { data, error } = await admin.database
    .from("listings")
    .select(
      "address, city, state, list_price, rent_estimate, taxes_annual, insurance_annual",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    return vapiResult(toolCallId, "Listing not found.", corsHeaders);
  }

  const rentMonthly = Number(data.rent_estimate ?? 0);
  const listPrice = Number(data.list_price ?? 0);
  const taxes = Number(data.taxes_annual ?? 0);
  const insurance = Number(data.insurance_annual ?? 0);

  const grossRentAnnual = rentMonthly * 12;
  const mgmtRepairs = grossRentAnnual * 0.1;
  const expenses = taxes + insurance + mgmtRepairs;
  const noi = grossRentAnnual - expenses;
  const capRate = listPrice > 0 ? (noi / listPrice) * 100 : 0;
  const cashOnCash = listPrice > 0 ? (noi / listPrice) * 100 : 0;

  const summary =
    `Numbers for ${data.address}, ${data.city} ${data.state}. ` +
    `Gross rent about $${fmt(grossRentAnnual)} per year. ` +
    `Expenses roughly $${fmt(expenses)} including taxes, insurance, and 10% for management and repairs. ` +
    `Net operating income about $${fmt(noi)}. ` +
    `Cap rate ${capRate.toFixed(1)} percent. ` +
    `Rough cash-on-cash around ${cashOnCash.toFixed(1)} percent assuming all-cash purchase.`;

  return vapiResult(toolCallId, summary, corsHeaders);
}
