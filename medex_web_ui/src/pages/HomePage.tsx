import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../store'

const GRID_ITEMS = [
  { icon: '💊', label: 'Brand Name',      to: '/app/brands',       color: '#0d9488' },
  { icon: '🧬', label: 'Generic Name',    to: '/app/generics',      color: '#7c3aed' },
  { icon: '💉', label: 'Drug Classes',    to: '/app/drug-classes',  color: '#0e7490' },
  { icon: '📦', label: 'Dosage Forms',    to: '/app/dosage-forms',  color: '#b45309' },
  { icon: '📋', label: 'Indications',     to: '/app/indications',   color: '#be185d' },
  { icon: '🌿', label: 'Herbal Medicine', to: '/app/herbal',        color: '#15803d' },
  { icon: '🐾', label: 'Veterinary',      to: '/app/veterinary',    color: '#7c2d12' },
  { icon: '🏢', label: 'Pharmaceutical',  to: '/app/companies',     color: '#1d4ed8' },
  { icon: '💼', label: 'Jobs',            to: '/app/jobs',          color: '#4338ca' },
  { icon: '🔍', label: 'Search',          to: '/app/search',        color: '#0f766e' },
  { icon: '➕', label: 'Add Medicine',    to: '/app/add-medicine',  color: '#6d28d9' },
  { icon: '📊', label: 'More',            to: '/app/search',        color: '#64748b' },
]

export default function HomePage() {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const t = q.trim()
    if (t) navigate(`/app/search?q=${encodeURIComponent(t)}`)
  }

  return (
    <div className="home-page">
      {/* Hero search */}
      <div className="home-hero">
        <h1 className="hero-title">MedEx Drug Reference</h1>
        <p className="hero-sub">Bangladesh's comprehensive pharmaceutical database</p>
        <form className="hero-search" onSubmit={handleSearch}>
          <input
            className="hero-search-inp"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by brand or generic name…"
            autoFocus
          />
          <button type="submit" className="hero-search-btn">Search</button>
        </form>
      </div>

      {/* Category grid — mirrors the mobile app home grid */}
      <div className="home-grid-section">
        <div className="home-grid">
          {GRID_ITEMS.map(item => (
            <Link
              key={item.to + item.label}
              to={item.to}
              className="home-grid-item"
              style={{ '--item-color': item.color } as React.CSSProperties}
            >
              <div className="hgi-icon">{item.icon}</div>
              <span className="hgi-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="quick-links">
        <div className="ql-group">
          <h3>Browse by Type</h3>
          <div className="ql-chips">
            <Link to="/app/generics?type=herbal"     className="ql-chip chip-green">🌿 Herbal</Link>
            <Link to="/app/generics?type=veterinary" className="ql-chip chip-purple">🐾 Veterinary</Link>
            <Link to="/app/brands?sortBy=name"       className="ql-chip chip-blue">💊 A-Z Brands</Link>
            <Link to="/app/companies"                className="ql-chip chip-teal">🏢 Companies</Link>
            <Link to="/app/drug-classes"             className="ql-chip chip-orange">💉 Drug Classes</Link>
          </div>
        </div>
        {!isLoggedIn && (
          <div className="ql-group">
            <div className="signin-prompt">
              <span>🔐</span>
              <div>
                <strong>Sign in for full access</strong>
                <p>View complete drug information, prices, manage favourites and history.</p>
              </div>
              <Link to="/app/login" className="signin-btn">Sign In</Link>
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div className="home-about">
        <h3>About MedEx</h3>
        <p>
          MedEx is Bangladesh's leading pharmaceutical drug reference. Browse{' '}
          <strong>brands</strong>, <strong>generics</strong>, <strong>drug classes</strong>,
          <strong>dosage forms</strong>, and <strong>indications</strong> — all sourced from
          the official MedEx mobile application API.
        </p>
        <div className="about-stats">
          <div className="stat"><span className="stat-icon">💊</span><span>Brands</span></div>
          <div className="stat"><span className="stat-icon">🧬</span><span>Generics</span></div>
          <div className="stat"><span className="stat-icon">🏢</span><span>Companies</span></div>
          <div className="stat"><span className="stat-icon">💉</span><span>Drug Classes</span></div>
        </div>
      </div>
    </div>
  )
}
