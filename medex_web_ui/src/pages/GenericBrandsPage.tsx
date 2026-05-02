/** /app/generics/:id/brands — standalone page */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetGenericById, apiGetGenericBrands } from '../api'
import { useFetch } from '../hooks'
import { Skeleton, ErrorCard, EmptyState, Pagination, SectionHeader, BrandCard, Breadcrumb } from '../components/ui'
import type { Page, Brand } from '../appTypes'

export default function GenericBrandsPage() {
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState(1)

  const { data: gData } = useFetch(() => apiGetGenericById(id!), [id])
  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Brand> }>(
    () => apiGetGenericBrands(id!, { page }), [id, page]
  )

  const genericName = gData?.data?.name ?? `Generic #${id}`
  const brands = data?.data?.data ?? []
  const pagination = data?.data

  return (
    <div className="detail-page">
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/app' },
        { label: 'Generics', to: '/app/generics' },
        { label: genericName, to: `/app/generics/${id}` },
        { label: 'Brands' },
      ]} />
      <div className="detail-header">
        <div className="detail-header-main">
          <span className="detail-type-icon">💊</span>
          <h1 className="detail-name">Brands for {genericName}</h1>
        </div>
      </div>
      <div className="detail-section">
        {loading && <Skeleton />}
        {error   && <ErrorCard msg={error} onRetry={reload} />}
        {!loading && !error && (
          <>
            <SectionHeader title="Available Brands" count={pagination?.total} />
            {brands.length === 0
              ? <EmptyState icon="💊" msg="No brands found" />
              : <div className="card-list">{brands.map(b => <BrandCard key={b.id} b={b} />)}</div>
            }
            {pagination && <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
