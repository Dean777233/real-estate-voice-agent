import { createClient } from '@insforge/sdk'

const baseUrl = import.meta.env.VITE_INSFORGE_URL as string
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string

if (!baseUrl || !anonKey) {
  console.warn(
    'Missing VITE_INSFORGE_URL or VITE_INSFORGE_ANON_KEY. Copy web/.env.example to web/.env.local.',
  )
}

export const insforge = createClient({ baseUrl, anonKey })
