import { describe, expect, it } from "vitest";
import { formatAreaReport, pct } from "../../lib/area-report.js";
import { austinAreaStats } from "../fixtures/austin.js";

describe("area-report formatting", () => {
  it("formats pct for rent growth", () => {
    expect(pct(0.04)).toBe("4.0%");
    expect(pct(null)).toBe("n/a");
  });

  it("formats Austin area_stats row as spoken string", () => {
    const summary = formatAreaReport(
      austinAreaStats.city,
      austinAreaStats.state,
      austinAreaStats,
    );

    expect(summary).toContain("Area report for Austin, TX 78745");
    expect(summary).toContain("Crime index 42 out of 100");
    expect(summary).toContain("School rating 7.8 out of 10");
    expect(summary).toContain("Rent growth year over year 4.0%");
    expect(summary).toContain("Strong job growth");
  });

  it("omits zip segment when not provided", () => {
    const summary = formatAreaReport("Cleveland", "OH", {
      city: "Cleveland",
      state: "OH",
      crime_index: 68,
      school_rating: 5.2,
      rent_growth_yoy: 0.03,
    });

    expect(summary).toContain("Area report for Cleveland, OH.");
    expect(summary).not.toContain("Cleveland, OH 4");
  });
});
