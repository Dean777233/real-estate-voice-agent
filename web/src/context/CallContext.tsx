import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onVapiCallEnd, startDealScoutCall, stopDealScoutCall } from '../lib/vapi'
import type { Listing } from '../lib/types'

interface CallContextValue {
  activeListing: Listing | null
  connecting: boolean
  error: string | null
  startCall: (listing: Listing) => Promise<void>
  endCall: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function CallProvider({ children }: { children: ReactNode }) {
  const [activeListing, setActiveListing] = useState<Listing | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onVapiCallEnd(() => {
      setActiveListing(null)
      setConnecting(false)
    })
  }, [])

  const endCall = useCallback(() => {
    stopDealScoutCall()
    setActiveListing(null)
    setConnecting(false)
  }, [])

  const startCall = useCallback(async (listing: Listing) => {
    setConnecting(true)
    setError(null)
    try {
      await startDealScoutCall(listing)
      setActiveListing(listing)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call')
    } finally {
      setConnecting(false)
    }
  }, [])

  const value = useMemo(
    () => ({ activeListing, connecting, error, startCall, endCall }),
    [activeListing, connecting, error, startCall, endCall],
  )

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used within CallProvider')
  return ctx
}
