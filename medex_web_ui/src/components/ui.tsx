/** Shared UI building-blocks used across all pages */
import { Link } from 'react-router-dom'
import type { Brand, Generic, Company, DosageForm, SearchResult, Job } from '../appTypes'

/* ── Loading skeleton ─────────────────────────────────────── */
export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skel skel-title" />
          <div className="skel skel-sub" />
          <div className="skel skel-sub skel-short" />
        </div>
      ))}
    </div>
  )
}

/* ── Error card ───────────────────────────────────────────── */
export function ErrorCard({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="error-card">
      <span className="error-icon">⚠</span>
      <div>
        <strong>Failed to load</strong>
        <p>{msg}</p>
        {msg.toLowerCase().includes('401') || msg.toLowerCase().includes('authentication') ? (
          <p className="error-hint">This endpoint requires a valid auth token. <Link to="/app/login">Sign in</Link></p>
        ) : msg.toLowerCase().includes('network') || msg.toLowerCase().includes('cors') ? (
          <p className="error-hint">Run the app via <code>pnpm dev</code> to enable the proxy.</p>
        ) : null}
      </div>
      {onRetry && <button className="retry-btn" onClick={onRetry}>↺ Retry</button>}
    </div>
  )
}

/* ── Empty state ──────────────────────────────────────────── */
export function EmptyState({ icon = '📭', msg = 'No data found' }: { icon?: string; msg?: string }) {
  return <div className="empty-state"><span>{icon}</span><p>{msg}</p></div>
}

/* ── Pagination ───────────────────────────────────────────── */
export function Pagination({
  page, lastPage, onPage,
}: { page: number; lastPage: number; onPage: (p: number) => void }) {
  if (lastPage <= 1) return null
  const pages: (number | '…')[] = []
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(lastPage - 1, page + 1); i++) pages.push(i)
    if (page < lastPage - 2) pages.push('…')
    pages.push(lastPage)
  }
  return (
    <div className="pagination">
      <button className="pg-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Prev</button>
      {pages.map((p, i) =>
        p === '…' ? <span key={`el${i}`} className="pg-ellipsis">…</span>
          : <button key={p} className={`pg-btn ${p === page ? 'pg-active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
      )}
      <button className="pg-btn" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>Next ›</button>
    </div>
  )
}

/* ── Tag / badge ──────────────────────────────────────────── */
export function Tag({ label, color = 'default' }: { label: string; color?: string }) {
  return <span className={`tag tag-${color}`}>{label}</span>
}

/* ── Section header ───────────────────────────────────────── */
export function SectionHeader({ title, count, action }: {
  title: string; count?: number; action?: React.ReactNode
}) {
  return (
    <div className="section-hdr">
      <div className="section-hdr-left">
        <h2 className="section-title">{title}</h2>
        {count !== undefined && <span className="section-count">{count.toLocaleString()}</span>}
      </div>
      {action && <div className="section-hdr-action">{action}</div>}
    </div>
  )
}

/* ── Breadcrumb ────────────────────────────────────────────── */
export function Breadcrumb({ crumbs }: { crumbs: { label: string; to?: string }[] }) {
  return (
    <nav className="breadcrumb">
      {crumbs.map((c, i) => (
        <span key={i}>
          {i > 0 && <span className="bc-sep">›</span>}
          {c.to ? <Link to={c.to} className="bc-link">{c.label}</Link> : <span className="bc-cur">{c.label}</span>}
        </span>
      ))}
    </nav>
  )
}

/* ── Brand card ────────────────────────────────────────────── */
export function BrandCard({ b }: { b: Brand }) {
  const genericName = b.generic?.name ?? b.generic_name ?? '—'
  const company     = b.company?.name ?? '—'
  const form        = b.dosageForm?.name ?? '—'
  const lowestPkg   = b.packages?.[0]
  return (
    <Link to={`/app/brands/${b.id}`} className="brand-card card">
      <div className="card-top">
        <div>
          <span className="card-name">{b.name}</span>
          {b.strength && <span className="card-strength">{b.strength}</span>}
        </div>
        {b.type === 'gen' && <Tag label="Generic" color="green" />}
      </div>
      <div className="card-meta">
        <span title="Generic">🧬 {genericName}</span>
        <span title="Company">🏢 {company}</span>
        <span title="Form">📦 {form}</span>
      </div>
      {lowestPkg?.price && (
        <div className="card-price">💰 {lowestPkg.price}</div>
      )}
    </Link>
  )
}

/* ── Generic card ──────────────────────────────────────────── */
export function GenericCard({ g }: { g: Generic }) {
  const typeColor = g.type === 'herbal' ? 'green' : g.type === 'veterinary' ? 'purple' : 'blue'
  return (
    <Link to={`/app/generics/${g.id}`} className="generic-card card">
      <div className="card-top">
        <span className="card-name">{g.name}</span>
        {g.type && <Tag label={g.type} color={typeColor} />}
      </div>
      <div className="card-meta">
        {g.drugClass?.name && <span title="Drug Class">💉 {g.drugClass.name}</span>}
        {g.brandsCount !== undefined && <span>💊 {g.brandsCount} brands</span>}
      </div>
    </Link>
  )
}

/* ── Company card ──────────────────────────────────────────── */
export function CompanyCard({ c }: { c: Company }) {
  return (
    <Link to={`/app/companies/${c.id}`} className="company-card card">
      <div className="company-logo">
        {c.logoUrl
          ? <img src={c.logoUrl} alt={c.name} onError={e => (e.currentTarget.style.display = 'none')} />
          : <span className="company-logo-placeholder">🏢</span>}
      </div>
      <div className="card-info">
        <span className="card-name">{c.name}</span>
        {c.brandsCount !== undefined && <span className="card-sub">{c.brandsCount} brands</span>}
      </div>
    </Link>
  )
}

/* ── Dosage form card ──────────────────────────────────────── */
export function DosageFormCard({ df }: { df: DosageForm }) {
  const icon = df.iconUrl ?? df.dosageFormIconUrl
  return (
    <Link to={`/app/dosage-forms/${df.id}`} className="df-card card">
      <div className="df-icon">
        {icon ? <img src={icon} alt={df.name} onError={e => (e.currentTarget.style.display = 'none')} /> : '📦'}
      </div>
      <span className="df-name">{df.name}</span>
      {df.brandsCount !== undefined && <span className="df-count">{df.brandsCount}</span>}
    </Link>
  )
}

/* ── Search result card ────────────────────────────────────── */
export function SearchResultCard({ r }: { r: SearchResult }) {
  const to = (() => {
    const t = r.type?.toLowerCase()
    if (t === 'brand' || t === 'drug') return `/app/brands/${r.id}`
    if (t === 'generic')  return `/app/generics/${r.id}`
    if (t === 'company')  return `/app/companies/${r.id}`
    if (t === 'indication') return `/app/indications/${r.id}`
    return `/app/brands/${r.id}`
  })()
  const typeColor = r.type === 'brand' ? 'orange' : r.type === 'generic' ? 'blue' : r.type === 'company' ? 'teal' : 'default'
  return (
    <Link to={to} className="search-card card">
      <div className="card-top">
        <span className="card-name">{r.name}</span>
        {r.type && <Tag label={r.type} color={typeColor} />}
      </div>
      <div className="card-meta">
        {r.strength && <span>💊 {r.strength}</span>}
        {r.generic && <span>🧬 {typeof r.generic === 'string' ? r.generic : r.generic.name}</span>}
        {r.company && <span>🏢 {typeof r.company === 'string' ? r.company : r.company.name}</span>}
      </div>
    </Link>
  )
}

/* ── Job card ──────────────────────────────────────────────── */
export function JobCard({ j }: { j: Job }) {
  return (
    <Link to={`/app/jobs/${j.id}`} className="job-card card">
      <span className="card-name">{j.title ?? j.name ?? `Job #${j.id}`}</span>
      {j.company && (
        <div className="card-meta">
          <span>🏢 {typeof j.company === 'string' ? j.company : j.company.name}</span>
        </div>
      )}
      {j.deadline && <div className="card-price">📅 {j.deadline}</div>}
    </Link>
  )
}

/* ── Info row (for detail pages) ───────────────────────────── */
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{children}</span>
    </div>
  )
}

/* ── Monograph section (HTML content) ─────────────────────── */
export function MonographSection({ title, html }: { title: string; html: string }) {
  if (!html?.trim()) return null
  return (
    <div className="monograph-section">
      <h4 className="mono-title">{title}</h4>
      <div className="mono-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

/* ── Page header ───────────────────────────────────────────── */
export function PageHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div className="page-header">
      {icon && <span className="page-header-icon">{icon}</span>}
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}
