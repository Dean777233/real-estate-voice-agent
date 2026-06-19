import { useCall } from '../context/CallContext'

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function CallScreen() {
  const { activeListing, endCall } = useCall()

  if (!activeListing) return null

  const location = [activeListing.city, activeListing.state, activeListing.zip]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="call-screen-overlay" role="dialog" aria-modal="true" aria-labelledby="call-screen-title">
      <div className="call-screen">
        <div className="call-screen-status">
          <span className="call-pulse" aria-hidden="true" />
          <span>Connected to DealScout</span>
        </div>

        <div className="call-screen-listing">
          <p className="call-screen-label">Discussing</p>
          <h2 id="call-screen-title">{activeListing.address}</h2>
          <p className="call-screen-location">{location}</p>
          <p className="call-screen-price">{formatMoney(activeListing.list_price)}</p>
          {(activeListing.beds != null || activeListing.baths != null) && (
            <p className="call-screen-stats">
              {activeListing.beds != null && `${activeListing.beds} bd`}
              {activeListing.beds != null && activeListing.baths != null && ' · '}
              {activeListing.baths != null && `${activeListing.baths} ba`}
            </p>
          )}
        </div>

        <div className="call-screen-controls">
          <div className="call-mute-placeholder" aria-label="Mute (coming soon)">
            <span className="call-mute-icon" aria-hidden="true">
              🎤
            </span>
            <span>Mic on</span>
          </div>

          <button type="button" className="btn call-hangup" onClick={endCall}>
            <span className="call-hangup-icon" aria-hidden="true">
              ✕
            </span>
            Hang up
          </button>
        </div>

        <p className="call-screen-hint">Ask DealScout about cap rate, comps, or save this deal to your watchlist.</p>
      </div>
    </div>
  )
}
