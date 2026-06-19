export type ListingVisionContext = {
  address: string;
  city: string;
  state: string;
  year_built: number | null;
  rehab_estimate: number | null;
  property_type: string | null;
  photo_url: string;
};

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function numberUnder100(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`;
}

export function speakThousands(amount: number): string {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n <= 0) {
    return "no listed rehab budget";
  }
  if (n < 1000) return `${numberUnder100(n)} dollars`;
  if (n % 1000 === 0) {
    const k = n / 1000;
    if (k < 100) return `${numberUnder100(k)} thousand`;
    return `${n.toLocaleString("en-US")} dollars`;
  }
  return `about ${n.toLocaleString("en-US")} dollars`;
}

export function formatPropertyType(propertyType: string | null): string {
  const raw = (propertyType ?? "single_family").trim().toLowerCase();
  if (raw === "single_family" || raw === "single-family") return "single family";
  if (raw === "multi_family" || raw === "multi-family") return "multi-family";
  return raw.replace(/_/g, " ");
}

export function yearBuiltPhrase(yearBuilt: number | null): string {
  if (yearBuilt == null || !Number.isFinite(yearBuilt)) {
    return "built in a typical range";
  }
  return `built in ${Math.round(yearBuilt)}`;
}

export function investorWalkthroughHint(propertyType: string | null): string {
  const raw = (propertyType ?? "").trim().toLowerCase();
  if (raw === "duplex" || raw === "triplex" || raw === "multi_family") {
    return "I'd recommend an in-person walkthrough for roof, foundation, and mechanicals in each unit.";
  }
  if (raw === "condo" || raw === "townhouse") {
    return "I'd recommend an in-person walkthrough and a review of HOA reserves and exterior maintenance.";
  }
  return "I'd recommend an in-person walkthrough for roof and foundation.";
}

export function photoHostLabel(photoUrl: string): string {
  try {
    return new URL(photoUrl).hostname;
  } catch {
    return "the listing image host";
  }
}

export function visionAnalysisFallback(ctx: ListingVisionContext): string {
  const propertyLabel = formatPropertyType(ctx.property_type);
  const yearPhrase = yearBuiltPhrase(ctx.year_built);
  const rehabPhrase = speakThousands(Number(ctx.rehab_estimate ?? 0));
  const addressLabel = ctx.address?.trim() || "this property";

  const rehabPart =
    rehabPhrase === "no listed rehab budget"
      ? "with no rehab budgeted on the listing"
      : `with an estimated rehab budget of ${rehabPhrase}`;

  return (
    `I couldn't run the photo analysis right now. Automated vision is temporarily unavailable. ` +
    `For ${addressLabel}, the listing shows a ${propertyLabel} ${yearPhrase} ${rehabPart}. ` +
    investorWalkthroughHint(ctx.property_type) +
    ` Listing exterior image at ${photoHostLabel(ctx.photo_url)}.`
  );
}

export function isNebiusAuthFailure(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true;
  const lower = body.toLowerCase();
  return lower.includes("couldn't authenticate") || lower.includes("unable authenticate");
}
