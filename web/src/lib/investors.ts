import { insforge } from './insforge'
import type { AuthUser } from './types'

export async function ensureInvestor(user: AuthUser): Promise<void> {
  const { data: existing, error: selectError } = await insforge.database
    .from('investors')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return

  const { error: insertError } = await insforge.database.from('investors').insert([
    {
      id: user.id,
      email: user.email ?? null,
      full_name: user.name ?? user.email?.split('@')[0] ?? null,
    },
  ])

  if (insertError) throw insertError
}
