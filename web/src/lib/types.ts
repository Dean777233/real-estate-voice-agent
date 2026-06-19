export interface Listing {
  id: string
  external_id: string | null
  address: string
  city: string
  state: string
  zip: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  list_price: number
  rent_estimate: number | null
  arv_estimate: number | null
  photo_url: string | null
  status: string | null
}

export interface InvestorCriteria {
  id: string
  investor_id: string
  label: string | null
  markets: string[] | null
  min_beds: number | null
  max_beds: number | null
  min_price: number | null
  max_price: number | null
  min_cap_rate: number | null
  property_types: string[] | null
  strategy: string | null
  active: boolean | null
}

export interface WatchlistItem {
  id: string
  investor_id: string
  listing_id: string
  notes: string | null
  rating: number | null
  saved_at: string | null
  listings: Listing | null
}

export interface AuthUser {
  id: string
  email?: string
  name?: string
}
