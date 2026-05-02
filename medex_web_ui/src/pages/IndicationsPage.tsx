import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGetIndications } from '../api'
import { useFetch, useDebounce } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState, Pagination,
  SectionHeader, Breadcrumb, PageHeader,
} from '../components/ui'
import type { Page, Indication } from '../appTypes'

export default function IndicationsPage() {
  const [sp, setSp] = useSearchParams()
  const [search, setSearch] = useState(sp.get('q') ?? '')
  const dSearch = useDebounce(search, 500)

  useEffect(() => {
    setSp(dSearch ? { q: dSearch } : {}, { replace: true })
  }, [dSearch])

  const { data, loading, error, reload } = useFetch(
    () => apiGetIndications({ search: dSearch || undefined }),
    [dSearch]
  )

  // API may return paginated or flat list
  const raw = data?.data
  const indications: Indication[] = Array.isArray(raw) ? raw
    : Array.isArray((raw as Page<Indication>)?.data) ? (raw as Page<Indication>).data
    : []
  const pagination = (!Array.isArray(raw) && (raw as Page<Indication>)?.current_page)
    ? raw as Page<Indication> : null

  return (
    <div className="list-page">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/app' }, { label: 'Indications' }]} />
      <PageHeader
        title="Indications"
        icon="📋"
        subtitle="Browse generics by medical indication"
      />

      <div className="filters-bar">
        <input
          className="filter-search"
          placeholder="Search by indication…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading && <Skeleton />}
      {error   && <ErrorCard msg={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <SectionHeader title="Indications" count={pagination?.total ?? indications.length} />
          {indications.length === 0
            ? <EmptyState icon="📋" msg="No indications found" />
            : (
              <div className="indication-list">
                {indications.map(ind => (
                  <Link key={ind.id} to={`/app/indications/${ind.id}`} className="indication-item card">
                    <span className="card-name">{ind.name}</span>
                    {ind.description && <p className="ind-desc">{ind.description}</p>}
                  </Link>
                ))}
              </div>
            )
          }
          {pagination && (
            <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={() => {}} />
          )}
        </>
      )}
    </div>
  )
}
