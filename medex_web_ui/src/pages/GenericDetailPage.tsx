import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGetGenericById, apiGetGenericBrands } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, Breadcrumb, InfoRow, Tag,
  SectionHeader, BrandCard, MonographSection, Pagination,
} from '../components/ui'
import type { GenericDetail, Page, Brand, InnovatorsMonograph } from '../appTypes'

// Monograph sections we show, matching app's "Innovator's Monograph" display
const MONO_SECTIONS: { key: string; label: string }[] = [
  { key: 'indication', label: '📋 Indications & Dosage' },
  { key: 'pharmacology', label: '🔬 Pharmacology' },
  { key: 'contraindication', label: '🚫 Contraindications' },
  { key: 'sideEffect', label: '⚠️ Side Effects' },
  { key: 'interaction', label: '💊 Drug Interactions' },
  { key: 'pregnancy', label: '🤰 Pregnancy & Lactation' },
  { key: 'precaution', label: '⚠️ Precautions' },
  { key: 'overdose', label: '🚨 Overdose' },
  { key: 'storage', label: '🌡 Storage' },
  { key: 'preparation', label: '🧪 Preparation' },
]

function BrandsSection({ genericId }: { genericId: number | string }) {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Brand> }>(
    () => apiGetGenericBrands(genericId, { page }),
    [genericId, page]
  )
  const brands = data?.data?.data ?? []
  const pagination = data?.data

  if (loading) return <Skeleton rows={4} />
  if (error)   return <ErrorCard msg={error} onRetry={reload} />
  if (brands.length === 0) return <p className="muted">No brands found.</p>

  return (
    <>
      <div className="card-list">{brands.map(b => <BrandCard key={b.id} b={b} />)}</div>
      {pagination && (
        <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={setPage} />
      )}
    </>
  )
}

export default function GenericDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [showMono, setShowMono] = useState(true)

  const { data, loading, error, reload } = useFetch(
    () => apiGetGenericById(id!),
    [id]
  )

  if (loading) return <div className="detail-page"><Skeleton rows={6} /></div>
  if (error)   return <div className="detail-page"><ErrorCard msg={error} onRetry={reload} /></div>

  const g = data?.data as GenericDetail | undefined
  if (!g) return <div className="detail-page"><ErrorCard msg="Generic not found" /></div>

  const typeColor = g.type === 'herbal' ? 'green' : g.type === 'veterinary' ? 'purple' : 'blue'
  const typeIcon  = g.type === 'herbal' ? '🌿' : g.type === 'veterinary' ? '🐾' : '🧬'

  // Monograph: may be a string (HTML) or an object
  const mono = g.innovatorsMonograph
  const monoIsStr = typeof mono === 'string'
  const monoObj = (!monoIsStr && mono) ? mono as InnovatorsMonograph : null

  return (
    <div className="detail-page">
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/app' },
        { label: 'Generics', to: '/app/generics' },
        { label: g.name },
      ]} />

      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-main">
          <span className="detail-type-icon">{typeIcon}</span>
          <h1 className="detail-name">{g.name}</h1>
          {g.type && <Tag label={g.type} color={typeColor} />}
        </div>
        <div className="detail-header-sub">
          <span className="detail-id">ID: {g.id}</span>
          {g.brandsCount !== undefined && (
            <span className="detail-count">💊 {g.brandsCount} brands</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="detail-info-card">
        <div className="detail-info-grid">
          {g.drugClass && (
            <InfoRow label="Drug Class">
              <Link to={`/app/drug-classes/${g.drugClass.id}`} className="detail-link">
                {g.drugClass.name}
              </Link>
            </InfoRow>
          )}
          {g.indication && (
            <InfoRow label="Indication"><span>{g.indication}</span></InfoRow>
          )}
          <InfoRow label="Brands Available">
            <span>{g.brandsCount ?? '—'}</span>
          </InfoRow>
        </div>
      </div>

      {/* Innovator's Monograph */}
      {mono && (
        <div className="detail-section">
          <div className="section-hdr">
            <div className="section-hdr-left">
              <h2 className="section-title">Innovator's Monograph</h2>
            </div>
            <button className="toggle-btn" onClick={() => setShowMono(v => !v)}>
              {showMono ? '▾ Collapse' : '▸ Expand'}
            </button>
          </div>
          {showMono && (
            <div className="monograph-container">
              {monoIsStr
                ? <MonographSection title="" html={mono as string} />
                : monoObj && MONO_SECTIONS.map(s =>
                    monoObj[s.key]
                      ? <MonographSection key={s.key} title={s.label} html={monoObj[s.key]} />
                      : null
                  )
              }
            </div>
          )}
        </div>
      )}

      {/* Available Brands */}
      <div className="detail-section">
        <SectionHeader
          title="Available Brands"
          count={g.brandsCount}
          action={
            <Link to={`/app/generics/${id}/brands`} className="see-all-link">
              See all →
            </Link>
          }
        />
        <BrandsSection genericId={id!} />
      </div>

      {/* Shortcut */}
      {g.drugClass && (
        <div className="detail-nav-shortcuts">
          <Link to={`/app/drug-classes/${g.drugClass.id}`} className="shortcut-btn">
            💉 All generics in {g.drugClass.name}
          </Link>
        </div>
      )}
    </div>
  )
}
