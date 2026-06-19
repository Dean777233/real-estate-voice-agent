export function cors(req: Request): Response | Record<string, string> {
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

export async function parseVapiTool(req: Request) {
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

export function vapiResult(
  toolCallId: string,
  result: string,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify({ results: [{ toolCallId, result }] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
