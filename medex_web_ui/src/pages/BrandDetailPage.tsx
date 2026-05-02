import { useParams, Link } from 'react-router-dom'
import { apiGetBrandById } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, Breadcrumb, InfoRow,
  Tag, SectionHeader,
} from '../components/ui'
import type { BrandDetail } from '../appTypes'

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error, reload } = useFetch(
    () => apiGetBrandById(id!),
    [id]
  )

  if (loading) return <div className="detail-page"><Skeleton rows={6} /></div>
  if (error)   return <div className="detail-page"><ErrorCard msg={error} onRetry={reload} /></div>

  const b = data?.data as BrandDetail | undefined
  if (!b)      return <div className="detail-page"><ErrorCard msg="Brand not found" /></div>

  const genericName = b.generic?.name ?? b.generic_name ?? '—'

  return (
    <div className="detail-page">
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/app' },
        { label: 'Brands', to: '/app/brands' },
        { label: b.name },
      ]} />

      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-main">
          <h1 className="detail-name">{b.name}</h1>
          {b.strength && <span className="detail-strength">{b.strength}</span>}
          {b.type === 'gen' && <Tag label="Generic Substitute" color="green" />}
        </div>
        <div className="detail-header-sub">
          <span className="detail-id">ID: {b.id}</span>
        </div>
      </div>

      {/* Info grid */}
      <div className="detail-info-card">
        <div className="detail-info-grid">
          <InfoRow label="Generic Name">
            {b.generic
              ? <Link to={`/app/generics/${b.generic.id}`} className="detail-link">{b.generic.name}</Link>
              : <span>{genericName}</span>}
          </InfoRow>
          <InfoRow label="Company">
            {b.company
              ? <Link to={`/app/companies/${b.company.id}`} className="detail-link">{b.company.name}</Link>
              : <span>—</span>}
          </InfoRow>
          <InfoRow label="Dosage Form">
            {b.dosageForm
              ? <Link to={`/app/dosage-forms/${b.dosageForm.id}`} className="detail-link">{b.dosageForm.name}</Link>
              : <span>—</span>}
          </InfoRow>
          <InfoRow label="Drug Class">
            {b.drugClass
              ? <Link to={`/app/drug-classes/${b.drugClass.id}`} className="detail-link">{b.drugClass.name}</Link>
              : <span>—</span>}
          </InfoRow>
          <InfoRow label="Strength"><span>{b.strength ?? '—'}</span></InfoRow>
          <InfoRow label="Type"><span>{b.type ?? 'Standard'}</span></InfoRow>
        </div>
      </div>

      {/* Packages / Prices */}
      {b.packages && b.packages.length > 0 && (
        <div className="detail-section">
          <SectionHeader title="Package & Price" count={b.packages.length} />
          <div className="packages-table">
            <table>
              <thead>
                <tr><th>Unit</th><th>Price</th><th>Info</th></tr>
              </thead>
              <tbody>
                {b.packages.map((pkg, i) => (
                  <tr key={pkg.id ?? i}>
                    <td>{pkg.unit ?? '—'}</td>
                    <td className="price-cell">{pkg.price ?? '—'}</td>
                    <td className="muted">{pkg.priceInfo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sibling brands (same generic) */}
      {b.siblingBrands && b.siblingBrands.length > 0 && (
        <div className="detail-section">
          <SectionHeader title="Similar Brands (same generic)" count={b.siblingBrands.length} />
          <div className="card-list card-list-compact">
            {b.siblingBrands.map(s => (
              <Link key={s.id} to={`/app/brands/${s.id}`} className="sibling-card card">
                <span className="card-name">{s.name}</span>
                {s.strength && <span className="card-strength">{s.strength}</span>}
                {s.company?.name && <span className="muted">{s.company.name}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Navigation shortcuts */}
      <div className="detail-nav-shortcuts">
        {b.generic && (
          <Link to={`/app/generics/${b.generic.id}`} className="shortcut-btn">
            🧬 View Generic: {b.generic.name}
          </Link>
        )}
        {b.company && (
          <Link to={`/app/companies/${b.company.id}`} className="shortcut-btn">
            🏢 All brands by {b.company.name}
          </Link>
        )}
        {b.dosageForm && (
          <Link to={`/app/dosage-forms/${b.dosageForm.id}`} className="shortcut-btn">
            📦 More {b.dosageForm.name} brands
          </Link>
        )}
        {b.drugClass && (
          <Link to={`/app/drug-classes/${b.drugClass.id}`} className="shortcut-btn">
            💉 Drug class: {b.drugClass.name}
          </Link>
        )}
      </div>
    </div>
  )
}
