import { describe, expect, it } from "vitest";
import {
  isNebiusAuthFailure,
  speakThousands,
  visionAnalysisFallback,
} from "../../lib/vision-fallback.js";
import { austinListing } from "../fixtures/austin.js";

describe("analyze-listing-photo fallback", () => {
  const ctx = {
    address: austinListing.address,
    city: austinListing.city,
    state: austinListing.state,
    year_built: null as number | null,
    rehab_estimate: austinListing.rehab_estimate,
    property_type: austinListing.property_type,
    photo_url: austinListing.photo_url,
  };

  it("builds fallback text with property details when vision fails", () => {
    const text = visionAnalysisFallback(ctx);

    expect(text).toContain("couldn't run the photo analysis");
    expect(text).toContain("742 Evergreen Terrace");
    expect(text).toContain("single family");
    expect(text).toContain("thirty-five thousand");
    expect(text).toContain("images.unsplash.com");
    expect(text).toContain("in-person walkthrough");
  });

  it("uses duplex walkthrough hint for multi-unit types", () => {
    const text = visionAnalysisFallback({
      ...ctx,
      property_type: "duplex",
      rehab_estimate: null,
    });

    expect(text).toContain("no rehab budgeted");
    expect(text).toContain("each unit");
  });

  it("speakThousands handles edge amounts", () => {
    expect(speakThousands(0)).toBe("no listed rehab budget");
    expect(speakThousands(50)).toBe("fifty dollars");
    expect(speakThousands(35000)).toBe("thirty-five thousand");
  });

  it("detects Nebius auth failures", () => {
    expect(isNebiusAuthFailure(401, "")).toBe(true);
    expect(isNebiusAuthFailure(500, "Couldn't authenticate")).toBe(true);
    expect(isNebiusAuthFailure(500, "timeout")).toBe(false);
  });
});
