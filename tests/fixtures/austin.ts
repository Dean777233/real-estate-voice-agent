export const AUSTIN_LISTING_ID = "76c2dbd6-71fe-4e33-837e-a77fdf27c292";

export const austinListing = {
  id: AUSTIN_LISTING_ID,
  address: "742 Evergreen Terrace",
  city: "Austin",
  state: "TX",
  zip: "78745",
  beds: 3,
  baths: 2,
  sqft: 1450,
  list_price: 285000,
  rent_estimate: 2200,
  arv_estimate: 340000,
  rehab_estimate: 35000,
  taxes_annual: 6200,
  insurance_annual: 1400,
  property_type: "single_family",
  photo_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6",
};

export const austinAreaStats = {
  city: "Austin",
  state: "TX",
  zip: "78745",
  crime_index: 42,
  violent_crime_rate: 3.2,
  property_crime_rate: 18.5,
  school_rating: 7.8,
  rent_growth_yoy: 0.04,
  notes: "Strong job growth, moderate crime in south Austin.",
};

export function vapiPayload(
  listingId: string,
  extra?: { investorId?: string; args?: Record<string, unknown> },
) {
  return {
    message: {
      call: {
        id: "test-call-id",
        metadata: {
          listing_id: listingId,
          ...(extra?.investorId ? { investor_id: extra.investorId } : {}),
        },
      },
      toolCallList: [
        {
          id: "tc-test-1",
          arguments: extra?.args ?? {},
        },
      ],
    },
  };
}
