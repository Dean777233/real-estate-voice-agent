import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AUSTIN_LISTING_ID, vapiPayload } from "../fixtures/austin.js";

const INSFORGE_BASE_URL =
  process.env.INSFORGE_BASE_URL ??
  process.env.NEXT_PUBLIC_INSFORGE_URL ??
  "https://zmyph3p8.us-east.insforge.app";

const isInsforgeLinked =
  Boolean(process.env.INSFORGE_PROJECT_ID) ||
  existsSync(resolve(process.cwd(), ".insforge/project.json"));

type VapiResponse = {
  results?: Array<{ toolCallId: string; result: string }>;
};

async function invokeFunction(
  slug: string,
  body: Record<string, unknown>,
): Promise<{ status: number; data: VapiResponse }> {
  const res = await fetch(`${INSFORGE_BASE_URL}/functions/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as VapiResponse;
  return { status: res.status, data };
}

function resultText(data: VapiResponse): string {
  return data.results?.[0]?.result ?? "";
}

describe.skipIf(!isInsforgeLinked)("InsForge edge functions (live)", () => {
  const payload = vapiPayload(AUSTIN_LISTING_ID);

  it("get-deal returns Evergreen Terrace summary", async () => {
    const { status, data } = await invokeFunction("get-deal", payload);
    const text = resultText(data);

    expect(status).toBe(200);
    expect(text).toContain("Evergreen");
    expect(text).toContain("Austin");
  });

  it("run-numbers returns cap rate analysis", async () => {
    const { status, data } = await invokeFunction("run-numbers", payload);
    const text = resultText(data);

    expect(status).toBe(200);
    expect(text.toLowerCase()).toContain("cap rate");
    expect(text).toContain("742 Evergreen Terrace");
  });

  it("area-report returns Austin neighborhood stats", async () => {
    const { status, data } = await invokeFunction("area-report", payload);
    const text = resultText(data);

    expect(status).toBe(200);
    expect(text).toContain("Austin");
    expect(text.toLowerCase()).toContain("crime");
  });

  it("search-similar returns comparable listings", async () => {
    const { status, data } = await invokeFunction("search-similar", payload);
    const text = resultText(data);

    expect(status).toBe(200);
    expect(text.toLowerCase()).toMatch(/similar|no similar listings/);
    expect(text).toContain("Austin");
  });

  it("save-deal saves to watchlist", async () => {
    const { status, data } = await invokeFunction("save-deal", {
      ...payload,
      message: {
        ...payload.message,
        toolCallList: [
          {
            id: "tc-save",
            arguments: { notes: "integration test", rating: 4 },
          },
        ],
      },
    });
    const text = resultText(data);

    expect(status).toBe(200);
    expect(text.toLowerCase()).toContain("watchlist");
    expect(text).toContain("Evergreen");
  });

  it("analyze-listing-photo returns photo analysis or fallback", async () => {
    const { status, data } = await invokeFunction(
      "analyze-listing-photo",
      payload,
    );
    const text = resultText(data);

    expect(status).toBe(200);
    expect(text.length).toBeGreaterThan(20);
    expect(text).toMatch(/photo|property|listing|vision|walkthrough/i);
  });
});
