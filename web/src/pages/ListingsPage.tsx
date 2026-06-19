import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DealScoutCallButton } from '../components/DealScoutCall'
import { insforge } from '../lib/insforge'
import type { Listing } from '../lib/types'

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await insforge.database
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('list_price', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setListings((data ?? []) as Listing[])
      }
      setLoading(false)
    }

    void load()
  }, [])

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Listings</h1>
          <p className="muted">Demo deals from InsForge. Pick one and talk to DealScout.</p>
        </div>
        <Link className="btn secondary" to="/login">
          Save deals → sign in
        </Link>
      </div>

      {loading && <p className="muted">Loading listings…</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="listing-grid">
        {listings.map((listing) => (
          <article key={listing.id} className="listing-card">
            {listing.photo_url ? (
              <img src={listing.photo_url} alt={listing.address} className="listing-photo" />
            ) : (
              <div className="listing-photo placeholder">No photo</div>
            )}
            <div className="listing-body">
              <h2>{listing.address}</h2>
              <p className="muted">
                {listing.city}, {listing.state}
                {listing.zip ? ` ${listing.zip}` : ''}
              </p>
              <p className="price">{formatMoney(listing.list_price)}</p>
              <ul className="stats">
                {listing.beds != null && <li>{listing.beds} bd</li>}
                {listing.baths != null && <li>{listing.baths} ba</li>}
                {listing.sqft != null && <li>{listing.sqft.toLocaleString()} sqft</li>}
              </ul>
              {listing.rent_estimate != null && (
                <p className="muted">Est. rent {formatMoney(listing.rent_estimate)}/mo</p>
              )}
              <DealScoutCallButton listing={listing} />
            </div>
          </article>
        ))}
      </div>

      {!loading && listings.length === 0 && !error && (
        <p className="muted">No active listings found. Run seed scripts on the backend.</p>
      )}
    </section>
  )
}
