import { describe, expect, it } from "vitest";
import {
  calculateNumbers,
  formatNumbersSummary,
} from "../../lib/run-numbers.js";
import { austinListing } from "../fixtures/austin.js";

describe("run-numbers math", () => {
  const input = {
    address: austinListing.address,
    city: austinListing.city,
    state: austinListing.state,
    list_price: austinListing.list_price,
    rent_estimate: austinListing.rent_estimate,
    taxes_annual: austinListing.taxes_annual,
    insurance_annual: austinListing.insurance_annual,
  };

  it("calculates NOI, expenses, and cap rate for Austin demo listing", () => {
    const calc = calculateNumbers(input);

    expect(calc.grossRentAnnual).toBe(26400);
    expect(calc.expenses).toBe(10240);
    expect(calc.noi).toBe(16160);
    expect(calc.capRate).toBeCloseTo(5.67, 1);
    expect(calc.cashOnCash).toBeCloseTo(5.67, 1);
  });

  it("formats spoken summary with cap rate", () => {
    const calc = calculateNumbers(input);
    const summary = formatNumbersSummary(input, calc);

    expect(summary).toContain("742 Evergreen Terrace");
    expect(summary).toContain("$26,400");
    expect(summary).toContain("$10,240");
    expect(summary).toContain("$16,160");
    expect(summary).toMatch(/Cap rate 5\.7 percent/);
  });

  it("returns zero cap rate when list price is zero", () => {
    const calc = calculateNumbers({ ...input, list_price: 0 });
    expect(calc.capRate).toBe(0);
    expect(calc.cashOnCash).toBe(0);
  });
});
