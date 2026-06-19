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
      "No listing ID provided. Pass listing_id in call metadata, variableValues, or tool arguments.",
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
