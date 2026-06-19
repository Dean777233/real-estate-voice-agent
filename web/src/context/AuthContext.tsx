import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { insforge } from '../lib/insforge'
import { ensureInvestor } from '../lib/investors'
import type { AuthUser } from '../lib/types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapUser(raw: { id: string; email?: string; name?: string } | null): AuthUser | null {
  if (!raw) return null
  return { id: raw.id, email: raw.email, name: raw.name }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (cancelled) return
      if (!error && data?.user) {
        setUser(mapUser(data.user))
        try {
          await ensureInvestor(mapUser(data.user)!)
        } catch (err) {
          console.error('ensureInvestor on hydrate:', err)
        }
      }
      setLoading(false)
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) return error.message ?? 'Sign in failed'
    if (data?.user) {
      const mapped = mapUser(data.user)!
      setUser(mapped)
      try {
        await ensureInvestor(mapped)
      } catch (err) {
        console.error('ensureInvestor on signIn:', err)
      }
    }
    return null
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) return error.message ?? 'Sign up failed'

    if (data?.requireEmailVerification) {
      return 'Check your email to verify your account, then sign in.'
    }

    if (data?.user) {
      const mapped = mapUser(data.user)!
      setUser(mapped)
      try {
        await ensureInvestor(mapped)
      } catch (err) {
        console.error('ensureInvestor on signUp:', err)
      }
    }
    return null
  }, [])

  const signOut = useCallback(async () => {
    await insforge.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
