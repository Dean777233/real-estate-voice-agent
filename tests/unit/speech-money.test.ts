import { describe, expect, it } from "vitest";
import {
  formatDollarsForSpeech,
  formatDollarsPerMonthForSpeech,
  formatDollarsPerYearForSpeech,
  integerToWords,
} from "../../lib/speech-money.js";

describe("integerToWords", () => {
  it("handles zero and small numbers", () => {
    expect(integerToWords(0)).toBe("zero");
    expect(integerToWords(1)).toBe("one");
    expect(integerToWords(19)).toBe("nineteen");
    expect(integerToWords(21)).toBe("twenty-one");
  });

  it("handles hundreds and thousands", () => {
    expect(integerToWords(285)).toBe("two hundred eighty-five");
    expect(integerToWords(2200)).toBe("two thousand two hundred");
    expect(integerToWords(285000)).toBe("two hundred eighty-five thousand");
    expect(integerToWords(1000000)).toBe("one million");
  });
});

describe("formatDollarsForSpeech", () => {
  it("formats list prices for TTS", () => {
    expect(formatDollarsForSpeech(285000)).toBe(
      "two hundred eighty-five thousand dollars",
    );
    expect(formatDollarsForSpeech(1)).toBe("one dollar");
    expect(formatDollarsForSpeech(45000)).toBe("forty-five thousand dollars");
  });

  it("rounds and clamps invalid input", () => {
    expect(formatDollarsForSpeech(285000.49)).toBe(
      "two hundred eighty-five thousand dollars",
    );
    expect(formatDollarsForSpeech(NaN)).toBe("zero dollars");
  });
});

describe("formatDollarsPerMonthForSpeech", () => {
  it("uses hundred shorthand for round monthly rents", () => {
    expect(formatDollarsPerMonthForSpeech(2200)).toBe(
      "twenty-two hundred dollars per month",
    );
    expect(formatDollarsPerMonthForSpeech(1500)).toBe(
      "fifteen hundred dollars per month",
    );
  });

  it("uses full form for non-round monthly rents", () => {
    expect(formatDollarsPerMonthForSpeech(2250)).toBe(
      "two thousand two hundred fifty dollars per month",
    );
  });
});

describe("formatDollarsPerYearForSpeech", () => {
  it("appends per year", () => {
    expect(formatDollarsPerYearForSpeech(26400)).toBe(
      "twenty-six thousand four hundred dollars per year",
    );
  });
});
