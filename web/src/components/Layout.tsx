import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo } from './Logo'

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <Logo className="brand-logo" size={40} />
          <div>
            <strong>DealScout</strong>
            <p>Real estate voice agent</p>
          </div>
        </div>
        <nav className="app-nav">
          <NavLink to="/listings" end>
            Listings
          </NavLink>
          {user && (
            <>
              <NavLink to="/criteria">Criteria</NavLink>
              <NavLink to="/watchlist">Watchlist</NavLink>
            </>
          )}
          {!user ? (
            <NavLink to="/login">Login</NavLink>
          ) : (
            <button type="button" className="link-button" onClick={() => void signOut()}>
              Sign out
            </button>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
