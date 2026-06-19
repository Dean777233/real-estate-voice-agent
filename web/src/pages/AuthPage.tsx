import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AuthPage() {
  const { user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/listings" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)

    const result =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password, name || email.split('@')[0])

    if (result) {
      if (mode === 'signup' && result.toLowerCase().includes('email')) {
        setMessage(result)
      } else {
        setError(result)
      }
    }
    setSubmitting(false)
  }

  return (
    <section className="panel narrow">
      <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <p className="muted">
        {mode === 'login'
          ? 'Access your investor profile, criteria, and watchlist.'
          : 'Register to save deals and set investment criteria.'}
      </p>

      <form className="stack" onSubmit={(e) => void handleSubmit(e)}>
        {mode === 'signup' && (
          <label>
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Investor" />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <p className="muted switch-mode">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <button type="button" className="link-button" onClick={() => setMode('signup')}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" className="link-button" onClick={() => setMode('login')}>
              Sign in
            </button>
          </>
        )}
      </p>

      <p className="muted">
        <Link to="/listings">Browse listings without signing in →</Link>
      </p>
    </section>
  )
}
