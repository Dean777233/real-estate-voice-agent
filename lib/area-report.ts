export type AreaStatsRow = {
  city: string;
  state: string;
  zip?: string | null;
  crime_index?: number | null;
  school_rating?: number | null;
  rent_growth_yoy?: number | null;
  notes?: string | null;
};

export function pct(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

export function formatAreaReport(
  lookupCity: string,
  lookupState: string,
  stats: AreaStatsRow,
): string {
  const summary =
    `Area report for ${lookupCity}, ${lookupState}` +
    (stats.zip ? ` ${stats.zip}` : "") +
    `. Crime index ${stats.crime_index ?? "n/a"} out of 100. ` +
    `School rating ${stats.school_rating ?? "n/a"} out of 10. ` +
    `Rent growth year over year ${pct(stats.rent_growth_yoy)}. ` +
    (stats.notes ? stats.notes : "");

  return summary.trim();
}
