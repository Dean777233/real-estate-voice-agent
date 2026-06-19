import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { DealScoutCallButton } from '../components/DealScoutCall'
import { useAuth } from '../context/AuthContext'
import { insforge } from '../lib/insforge'
import type { WatchlistItem } from '../lib/types'

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function WatchlistPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    async function load() {
      const { data, error: fetchError } = await insforge.database
        .from('watchlist')
        .select('*, listings(*)')
        .eq('investor_id', user!.id)
        .order('saved_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setItems((data ?? []) as WatchlistItem[])
      }
      setLoading(false)
    }

    void load()
  }, [user])

  if (authLoading) return <p className="muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace />

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Watchlist</h1>
          <p className="muted">Deals you saved during DealScout calls.</p>
        </div>
      </div>

      {loading && <p className="muted">Loading watchlist…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && items.length === 0 && !error && (
        <div className="panel narrow">
          <p className="muted">No saved deals yet. Browse listings and ask DealScout to save a deal.</p>
        </div>
      )}

      <div className="listing-grid">
        {items.map((item) => {
          const listing = item.listings
          if (!listing) return null
          return (
            <article key={item.id} className="listing-card">
              {listing.photo_url ? (
                <img src={listing.photo_url} alt={listing.address} className="listing-photo" />
              ) : (
                <div className="listing-photo placeholder">No photo</div>
              )}
              <div className="listing-body">
                <h2>{listing.address}</h2>
                <p className="muted">
                  {listing.city}, {listing.state}
                </p>
                <p className="price">{formatMoney(listing.list_price)}</p>
                {item.rating != null && <p className="badge">Rating {item.rating}/5</p>}
                {item.notes && <p className="muted">{item.notes}</p>}
                <DealScoutCallButton listing={listing} />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
