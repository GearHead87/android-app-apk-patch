import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetDosageFormBrands } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState, Pagination,
  SectionHeader, BrandCard, Breadcrumb,
} from '../components/ui'
import type { Page, Brand } from '../appTypes'

export default function DosageFormDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState(1)

  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Brand> }>(
    () => apiGetDosageFormBrands(id!, { page }),
    [id, page]
  )

  const brands = data?.data?.data ?? []
  const pagination = data?.data
  const formName = brands[0]?.dosageForm?.name ?? `Dosage Form #${id}`

  return (
    <div className="detail-page">
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/app' },
        { label: 'Dosage Forms', to: '/app/dosage-forms' },
        { label: formName },
      ]} />

      <div className="detail-header">
        <div className="detail-header-main">
          <span className="detail-type-icon">📦</span>
          <h1 className="detail-name">{formName}</h1>
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
            <SectionHeader title="Available Brands" count={pagination?.total} />
            {brands.length === 0
              ? <EmptyState icon="💊" msg="No brands found for this dosage form" />
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
