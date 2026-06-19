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

export type VapiBody = {
  message?: {
    call?: {
      id?: string;
      metadata?: Record<string, unknown>;
    };
    toolCallList?: Array<{
      id?: string;
      arguments?: Record<string, unknown>;
    }>;
  };
};

export function parseVapiBody(body: VapiBody) {
  const call = body?.message?.call ?? {};
  const toolCall = body?.message?.toolCallList?.[0];
  const meta = call?.metadata ?? {};
  const args = toolCall?.arguments ?? {};
  return {
    toolCallId: toolCall?.id ?? "unknown",
    args,
    listingId: (meta.listing_id ?? args.listing_id) as string | undefined,
    investorId: meta.investor_id as string | undefined,
    callId: call?.id,
  };
}

export async function parseVapiTool(req: Request) {
  const body = (await req.json()) as VapiBody;
  return parseVapiBody(body);
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
