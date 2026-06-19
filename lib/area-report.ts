export type AreaStatsRow = {
  city: string;
  state: string;
  zip?: string | null;
  crime_index?: number | null;
  violent_crime_rate?: number | null;
  property_crime_rate?: number | null;
  school_rating?: number | null;
  rent_growth_yoy?: number | null;
  notes?: string | null;
};

export type AreaLookup = {
  city: string;
  state: string;
  zip?: string;
};

export function pct(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

function ratePerThousand(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `${Number(n).toFixed(1)} per thousand residents`;
}

export function formatAreaReport(
  lookupCity: string,
  lookupState: string,
  stats: AreaStatsRow,
  options?: { requestedZip?: string },
): string {
  const zipNote =
    options?.requestedZip &&
    stats.zip &&
    options.requestedZip !== stats.zip
      ? ` Stats are for zip ${stats.zip} in the same market.`
      : "";

  const summary =
    `Area report for ${lookupCity}, ${lookupState}` +
    (stats.zip ? ` ${stats.zip}` : "") +
    `. Crime index ${stats.crime_index ?? "n/a"} out of 100. ` +
    `Violent crime rate ${ratePerThousand(stats.violent_crime_rate)}. ` +
    `Property crime rate ${ratePerThousand(stats.property_crime_rate)}. ` +
    `School rating ${stats.school_rating ?? "n/a"} out of 10. ` +
    `Rent growth year over year ${pct(stats.rent_growth_yoy)}.` +
    zipNote +
    (stats.notes ? ` ${stats.notes}` : "");

  return summary.trim();
}

export function formatNoAreaStatsMessage(city: string, state: string): string {
  return (
    `I don't have neighborhood statistics for ${city}, ${state} yet. ` +
    "Crime and school data are not available for this area in our database — " +
    "I recommend checking local crime maps and school rating sites before deciding."
  );
}
