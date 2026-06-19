import { describe, expect, it } from "vitest";
import { parseVapiBody, resolveListingId } from "../../lib/vapi.js";
import { AUSTIN_LISTING_ID, vapiPayload } from "../fixtures/austin.js";

describe("resolveListingId", () => {
  it("extracts listing_id from call metadata", () => {
    const id = resolveListingId(vapiPayload(AUSTIN_LISTING_ID));
    expect(id).toBe(AUSTIN_LISTING_ID);
  });

  it("falls back to assistantOverrides.variableValues", () => {
    const id = resolveListingId({
      message: {
        call: {
          assistantOverrides: {
            variableValues: { listing_id: AUSTIN_LISTING_ID },
          },
        },
        toolCallList: [{ id: "tc-1", arguments: {} }],
      },
    });
    expect(id).toBe(AUSTIN_LISTING_ID);
  });

  it("falls back to message artifact variableValues", () => {
    const id = resolveListingId({
      message: {
        call: {},
        artifact: { variableValues: { listing_id: AUSTIN_LISTING_ID } },
        toolCallList: [{ id: "tc-1", arguments: {} }],
      },
    });
    expect(id).toBe(AUSTIN_LISTING_ID);
  });

  it("falls back to tool arguments when metadata has no listing_id", () => {
    const id = resolveListingId({
      message: {
        call: { id: "c1", metadata: {} },
        toolCallList: [
          { id: "tc-2", arguments: { listing_id: AUSTIN_LISTING_ID } },
        ],
      },
    });
    expect(id).toBe(AUSTIN_LISTING_ID);
  });

  it("prefers metadata listing_id over variableValues and arguments", () => {
    const id = resolveListingId({
      message: {
        call: {
          metadata: { listing_id: AUSTIN_LISTING_ID },
          assistantOverrides: {
            variableValues: { listing_id: "other-from-vars" },
          },
        },
        toolCallList: [
          { id: "tc-3", arguments: { listing_id: "other-from-args" } },
        ],
      },
    });
    expect(id).toBe(AUSTIN_LISTING_ID);
  });
});

describe("parseVapiBody", () => {
  it("extracts listing_id from call metadata", () => {
    const body = vapiPayload(AUSTIN_LISTING_ID);
    const parsed = parseVapiBody(body);

    expect(parsed.toolCallId).toBe("tc-test-1");
    expect(parsed.listingId).toBe(AUSTIN_LISTING_ID);
    expect(parsed.callId).toBe("test-call-id");
  });

  it("extracts investor_id from metadata", () => {
    const body = vapiPayload(AUSTIN_LISTING_ID, {
      investorId: "inv-123",
    });
    const parsed = parseVapiBody(body);

    expect(parsed.investorId).toBe("inv-123");
  });

  it("defaults toolCallId when missing", () => {
    const parsed = parseVapiBody({ message: { call: {}, toolCallList: [] } });
    expect(parsed.toolCallId).toBe("unknown");
    expect(parsed.listingId).toBeUndefined();
  });
});
