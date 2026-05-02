import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetCompanyBrands } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState, Pagination,
  SectionHeader, BrandCard, Breadcrumb,
} from '../components/ui'
import type { Page, Brand } from '../appTypes'

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState(1)

  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Brand> }>(
    () => apiGetCompanyBrands(id!, { page }),
    [id, page]
  )

  const brands = data?.data?.data ?? []
  const pagination = data?.data
  // Try to get company name from first brand
  const companyName = brands[0]?.company?.name ?? `Company #${id}`

  return (
    <div className="detail-page">
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/app' },
        { label: 'Companies', to: '/app/companies' },
        { label: companyName },
      ]} />

      <div className="detail-header">
        <div className="detail-header-main">
          <span className="detail-type-icon">🏢</span>
          <h1 className="detail-name">{companyName}</h1>
        </div>
        {pagination?.total !== undefined && (
          <div className="detail-header-sub">
            <span className="detail-count">💊 {pagination.total} brands</span>
          </div>
        )}
      </div>

      <div className="detail-section">
        {loading && <Skeleton />}
        {error   && <ErrorCard msg={error} onRetry={reload} />}
        {!loading && !error && (
          <>
            <SectionHeader title="Brand Products" count={pagination?.total} />
            {brands.length === 0
              ? <EmptyState icon="💊" msg="No brands found for this company" />
              : <div className="card-list">{brands.map(b => <BrandCard key={b.id} b={b} />)}</div>
            }
            {pagination && (
              <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={setPage} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
