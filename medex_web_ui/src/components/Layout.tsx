import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../store'

const NAV = [
  { to: '/app', label: '🏠 Home', end: true },
  { to: '/app/brands', label: '💊 Brands' },
  { to: '/app/generics', label: '🧬 Generics' },
  { to: '/app/companies', label: '🏢 Companies' },
  { to: '/app/drug-classes', label: '💉 Drug Classes' },
  { to: '/app/dosage-forms', label: '📦 Dosage Forms' },
  { to: '/app/indications', label: '📋 Indications' },
  { to: '/app/search', label: '🔍 Search' },
]

export default function Layout() {
  const { clearAuth, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQ.trim()
    if (q) { navigate(`/app/search?q=${encodeURIComponent(q)}`); setSearchQ('') }
  }

  // close mobile nav on route change
  useEffect(() => { setMobileOpen(false) }, [navigate])

  return (
    <div className="layout">
      {/* ── top bar ── */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <button className="burger" onClick={() => setMobileOpen(v => !v)}>☰</button>
            <Link to="/app" className="brand-logo">
              <span className="brand-pill">💊</span>
              <span className="brand-name">MedEx</span>
            </Link>
          </div>

          {/* search */}
          <form className="top-search" onSubmit={handleSearch}>
            <input
              ref={searchRef}
              className="top-search-inp"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search brand, generic, company…"
            />
            <button type="submit" className="top-search-btn">🔍</button>
          </form>

          <div className="topbar-right">
            {isLoggedIn ? (
              <>
                <span className="auth-status">
                  <span className="dot-green" /> Logged in
                </span>
                <button className="auth-btn" onClick={() => { clearAuth(); navigate('/app/login') }}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/app/login" className="auth-btn auth-btn-primary">Sign in</Link>
            )}
            <Link to="/" className="dev-link" title="API Explorer">⚙ Dev Tools</Link>
          </div>
        </div>
      </header>

      {/* ── sidebar nav ── */}
      <div className={`sidebar-nav ${mobileOpen ? 'sidebar-open' : ''}`}>
        <nav className="sidenav">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `sidenav-link ${isActive ? 'sidenav-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {n.label}
            </NavLink>
          ))}
          <div className="sidenav-divider" />
          {isLoggedIn && (
            <>
              <NavLink to="/app/favorites" className={({ isActive }) => `sidenav-link ${isActive ? 'sidenav-active' : ''}`}>❤️ Favourites</NavLink>
              <NavLink to="/app/history"   className={({ isActive }) => `sidenav-link ${isActive ? 'sidenav-active' : ''}`}>🕐 History</NavLink>
            </>
          )}
          <NavLink to="/app/herbal"     className={({ isActive }) => `sidenav-link ${isActive ? 'sidenav-active' : ''}`}>🌿 Herbal</NavLink>
          <NavLink to="/app/veterinary" className={({ isActive }) => `sidenav-link ${isActive ? 'sidenav-active' : ''}`}>🐾 Veterinary</NavLink>
          <NavLink to="/app/jobs"       className={({ isActive }) => `sidenav-link ${isActive ? 'sidenav-active' : ''}`}>💼 Jobs</NavLink>
        </nav>
        {!isLoggedIn && (
          <div className="sidenav-auth-cta">
            <p>Sign in to access full data &amp; personalised features.</p>
            <Link to="/app/login" className="cta-btn" onClick={() => setMobileOpen(false)}>Sign In</Link>
          </div>
        )}
      </div>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* ── content ── */}
      <main className="page-content">
        {!isLoggedIn && (
          <div className="auth-banner">
            ⚠ Some data requires authentication.{' '}
            <Link to="/app/login">Sign in</Link> for full access.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
