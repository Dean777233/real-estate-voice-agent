import Vapi from '@vapi-ai/web'
import type { Listing } from './types'

const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY as string
const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID as string

let vapiInstance: Vapi | null = null

function getVapi(): Vapi {
  if (!publicKey) throw new Error('VITE_VAPI_PUBLIC_KEY is not configured')
  if (!vapiInstance) vapiInstance = new Vapi(publicKey)
  return vapiInstance
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

function buildOverrides(listing: Listing) {
  const listingAddress = `${listing.address}, ${listing.city} ${listing.state}`
  return {
    metadata: { listing_id: listing.id },
    variableValues: {
      listing_id: listing.id,
      listing_address: listingAddress,
      list_price: formatPrice(listing.list_price),
    },
  }
}

export async function startDealScoutCall(listing: Listing): Promise<void> {
  if (!assistantId) throw new Error('VITE_VAPI_ASSISTANT_ID is not configured')

  const overrides = buildOverrides(listing)

  try {
    const vapi = getVapi()
    await vapi.start(assistantId, overrides)
    return
  } catch (sdkError) {
    console.warn('@vapi-ai/web start failed, falling back to REST:', sdkError)
  }

  if (!publicKey) throw new Error('VITE_VAPI_PUBLIC_KEY is not configured')

  const response = await fetch('https://api.vapi.ai/call/web', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${publicKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId,
      metadata: overrides.metadata,
      assistantOverrides: {
        variableValues: overrides.variableValues,
      },
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof body?.message === 'string'
        ? body.message
        : `Vapi web call failed (${response.status})`
    throw new Error(message)
  }

  const webCallUrl = body.webCallUrl ?? body.url
  if (!webCallUrl) throw new Error('No webCallUrl returned from Vapi')
  window.open(webCallUrl, '_blank', 'noopener,noreferrer')
}

export function stopDealScoutCall(): void {
  vapiInstance?.stop()
}
