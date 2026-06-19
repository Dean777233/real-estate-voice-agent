import { createAdminClient } from "npm:@insforge/sdk";

// Speech money helpers — keep in sync with lib/speech-money.ts (InsForge deploys single files)
const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
] as const;
const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
] as const;
function numberUnder100(n: number): string {
  if (n < 20) return ONES[n]!;
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one ? `${TENS[ten]}-${ONES[one]}` : TENS[ten]!;
}
function numberUnder1000(n: number): string {
  if (n < 100) return numberUnder100(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (rest === 0) return `${ONES[hundred]} hundred`;
  return `${ONES[hundred]} hundred ${numberUnder100(rest)}`;
}
function integerToWords(n: number): string {
  const amount = Math.max(0, Math.round(n));
  if (amount === 0) return "zero";
  if (amount >= 1_000_000_000) return String(amount);
  const parts: string[] = [];
  let remaining = amount;
  const millions = Math.floor(remaining / 1_000_000);
  if (millions) {
    parts.push(`${numberUnder1000(millions)} million`);
    remaining %= 1_000_000;
  }
  const thousands = Math.floor(remaining / 1_000);
  if (thousands) {
    parts.push(`${numberUnder1000(thousands)} thousand`);
    remaining %= 1_000;
  }
  if (remaining) parts.push(numberUnder1000(remaining));
  return parts.join(" ");
}
function normalizeDollarAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}
function formatDollarsForSpeech(amount: number): string {
  const dollars = normalizeDollarAmount(amount);
  const label = dollars === 1 ? "dollar" : "dollars";
  return `${integerToWords(dollars)} ${label}`;
}
function formatDollarsPerYearForSpeech(amount: number): string {
  return `${formatDollarsForSpeech(amount)} per year`;
}

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
    `Gross rent about ${formatDollarsPerYearForSpeech(grossRentAnnual)}. ` +
    `Expenses roughly ${formatDollarsForSpeech(expenses)} including taxes, insurance, and 10% for management and repairs. ` +
    `Net operating income about ${formatDollarsForSpeech(noi)}. ` +
    `Cap rate ${capRate.toFixed(1)} percent. ` +
    `Rough cash-on-cash around ${cashOnCash.toFixed(1)} percent assuming all-cash purchase.`;

  return vapiResult(toolCallId, summary, corsHeaders);
}
