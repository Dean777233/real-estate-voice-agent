import { useCall } from '../context/CallContext'
import type { Listing } from '../lib/types'

interface DealScoutCallProps {
  listing: Listing
}

export function DealScoutCallButton({ listing }: DealScoutCallProps) {
  const { activeListing, connecting, error, startCall, endCall } = useCall()

  const isThisListingActive = activeListing?.id === listing.id
  const anotherCallActive = activeListing != null && !isThisListingActive

  async function handleStart() {
    await startCall(listing)
  }

  function handleStop() {
    endCall()
  }

  return (
    <div className="call-actions">
      {!isThisListingActive ? (
        <button
          type="button"
          className="btn primary"
          disabled={connecting || anotherCallActive}
          onClick={() => void handleStart()}
        >
          {connecting ? 'Connecting…' : anotherCallActive ? 'Call in progress' : 'Talk to DealScout'}
        </button>
      ) : (
        <button type="button" className="btn danger" onClick={handleStop}>
          End call
        </button>
      )}
      {error && !isThisListingActive && !anotherCallActive && <p className="error-text">{error}</p>}
    </div>
  )
}
