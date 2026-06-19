import { useState } from 'react'
import { startDealScoutCall, stopDealScoutCall } from '../lib/vapi'
import type { Listing } from '../lib/types'

interface DealScoutCallProps {
  listing: Listing
}

export function DealScoutCallButton({ listing }: DealScoutCallProps) {
  const [calling, setCalling] = useState(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setCalling(true)
    setError(null)
    try {
      await startDealScoutCall(listing)
      setActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call')
    } finally {
      setCalling(false)
    }
  }

  function handleStop() {
    stopDealScoutCall()
    setActive(false)
  }

  return (
    <div className="call-actions">
      {!active ? (
        <button type="button" className="btn primary" disabled={calling} onClick={() => void handleStart()}>
          {calling ? 'Connecting…' : 'Talk to DealScout'}
        </button>
      ) : (
        <button type="button" className="btn danger" onClick={handleStop}>
          End call
        </button>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
