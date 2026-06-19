import VapiImport from '@vapi-ai/web'
import type { Listing } from './types'

type VapiClient = InstanceType<
  typeof VapiImport extends new (...args: infer A) => infer R ? new (...args: A) => R : never
>

type WebCallPayload = {
  id?: string
  webCallUrl?: string
  url?: string
  artifactPlan?: { videoRecordingEnabled?: boolean }
  assistant?: { voice?: { provider?: string } }
  transport?: { callUrl?: string }
}

function resolveVapiConstructor(): new (publicKey: string) => VapiClient {
  const mod = VapiImport as unknown as { default?: new (publicKey: string) => VapiClient }
  const VapiCtor = mod.default ?? (VapiImport as unknown as new (publicKey: string) => VapiClient)
  if (typeof VapiCtor !== 'function') {
    throw new Error('Failed to load @vapi-ai/web constructor')
  }
  return VapiCtor
}

const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY as string
const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID as string

let vapiInstance: VapiClient | null = null
let listenersAttached = false
const callEndCallbacks = new Set<() => void>()

function attachVapiListeners(vapi: VapiClient) {
  if (listenersAttached) return
  listenersAttached = true

  vapi.on('call-end', () => {
    callEndCallbacks.forEach((cb) => cb())
  })
}

function getVapi(): VapiClient {
  if (!publicKey) throw new Error('VITE_VAPI_PUBLIC_KEY is not configured')
  if (!vapiInstance) {
    const VapiCtor = resolveVapiConstructor()
    vapiInstance = new VapiCtor(publicKey)
    attachVapiListeners(vapiInstance)
  }
  return vapiInstance
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

/** Listing context passed to Vapi as call metadata + assistant template variables. */
export function buildDealScoutCallContext(listing: Listing) {
  const listingAddress = `${listing.address}, ${listing.city} ${listing.state}`
  const listPrice = formatPrice(listing.list_price)
  return {
    metadata: { listing_id: listing.id },
    assistantOverrides: {
      variableValues: {
        listing_id: listing.id,
        listing_address: listingAddress,
        list_price: listPrice,
      },
      firstMessage: `Hey, I'm DealScout. I'm here about ${listingAddress} at ${listPrice}. What would you like to know about this listing — the numbers, the neighborhood, or something else?`,
    },
  }
}

async function createWebCall(listing: Listing): Promise<WebCallPayload> {
  if (!publicKey) throw new Error('VITE_VAPI_PUBLIC_KEY is not configured')
  if (!assistantId) throw new Error('VITE_VAPI_ASSISTANT_ID is not configured')

  const { metadata, assistantOverrides } = buildDealScoutCallContext(listing)

  const response = await fetch('https://api.vapi.ai/call/web', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${publicKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId,
      metadata,
      assistantOverrides,
    }),
  })

  const body = (await response.json().catch(() => ({}))) as WebCallPayload & { message?: string }
  if (!response.ok) {
    const message =
      typeof body?.message === 'string'
        ? body.message
        : `Vapi web call failed (${response.status})`
    throw new Error(message)
  }

  return body
}

function resolveWebCallUrl(body: WebCallPayload): string | undefined {
  return body.webCallUrl ?? body.url ?? body.transport?.callUrl
}

export async function startDealScoutCall(listing: Listing): Promise<void> {
  const body = await createWebCall(listing)
  const webCallUrl = resolveWebCallUrl(body)
  if (!webCallUrl) throw new Error('No webCallUrl returned from Vapi')

  try {
    const vapi = getVapi()
    await vapi.reconnect({
      webCallUrl,
      id: body.id,
      artifactPlan: body.artifactPlan,
      assistant: body.assistant,
    })
    return
  } catch (reconnectError) {
    console.warn('@vapi-ai/web reconnect failed, opening call URL:', reconnectError)
    window.open(webCallUrl, '_blank', 'noopener,noreferrer')
  }
}

export function stopDealScoutCall(): void {
  vapiInstance?.stop()
}

export function onVapiCallEnd(callback: () => void): () => void {
  callEndCallbacks.add(callback)
  return () => callEndCallbacks.delete(callback)
}
