import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { insforge } from '../lib/insforge'
import type { InvestorCriteria } from '../lib/types'

const STRATEGIES = ['buy_and_hold', 'fix_and_flip', 'brrrr', 'wholesale']

export function CriteriaPage() {
  const { user, loading: authLoading } = useAuth()
  const [markets, setMarkets] = useState('Austin TX, Phoenix AZ')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minBeds, setMinBeds] = useState('2')
  const [minCapRate, setMinCapRate] = useState('')
  const [strategy, setStrategy] = useState('buy_and_hold')
  const [criteriaId, setCriteriaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    async function load() {
      setLoading(true)
      const { data, error: fetchError } = await insforge.database
        .from('investor_criteria')
        .select('*')
        .eq('investor_id', user!.id)
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) {
        setError(fetchError.message)
      } else if (data) {
        const row = data as InvestorCriteria
        setCriteriaId(row.id)
        setMarkets((row.markets ?? []).join(', '))
        setMinPrice(row.min_price != null ? String(row.min_price) : '')
        setMaxPrice(row.max_price != null ? String(row.max_price) : '')
        setMinBeds(row.min_beds != null ? String(row.min_beds) : '')
        setMinCapRate(row.min_cap_rate != null ? String(row.min_cap_rate) : '')
        setStrategy(row.strategy ?? 'buy_and_hold')
      }
      setLoading(false)
    }

    void load()
  }, [user])

  if (authLoading) return <p className="muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setMessage(null)

    const payload = {
      investor_id: user.id,
      label: 'default',
      markets: markets
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
      min_price: minPrice ? Number(minPrice) : null,
      max_price: maxPrice ? Number(maxPrice) : null,
      min_beds: minBeds ? Number(minBeds) : null,
      min_cap_rate: minCapRate ? Number(minCapRate) : null,
      strategy,
      active: true,
    }

    const { data, error: saveError } = criteriaId
      ? await insforge.database
          .from('investor_criteria')
          .update(payload)
          .eq('id', criteriaId)
          .select()
          .maybeSingle()
      : await insforge.database.from('investor_criteria').insert([payload]).select().maybeSingle()

    if (saveError) {
      setError(saveError.message)
    } else {
      if (data && 'id' in data) setCriteriaId(data.id as string)
      setMessage('Investment criteria saved.')
    }
    setSaving(false)
  }

  return (
    <section className="panel">
      <h1>Investment criteria</h1>
      <p className="muted">Tell DealScout what markets and numbers you care about.</p>

      {loading ? (
        <p className="muted">Loading your criteria…</p>
      ) : (
        <form className="stack criteria-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Target markets (comma-separated)
            <input value={markets} onChange={(e) => setMarkets(e.target.value)} placeholder="Austin TX, Cleveland OH" />
          </label>
          <div className="grid two">
            <label>
              Min price ($)
              <input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            </label>
            <label>
              Max price ($)
              <input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </label>
          </div>
          <div className="grid two">
            <label>
              Min beds
              <input type="number" min={0} value={minBeds} onChange={(e) => setMinBeds(e.target.value)} />
            </label>
            <label>
              Min cap rate (%)
              <input
                type="number"
                min={0}
                step={0.1}
                value={minCapRate}
                onChange={(e) => setMinCapRate(e.target.value)}
              />
            </label>
          </div>
          <label>
            Strategy
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save criteria'}
          </button>
        </form>
      )}
    </section>
  )
}
