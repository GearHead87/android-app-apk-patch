import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGetBrands } from '../api'
import { useFetch, useDebounce } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState, Pagination,
  SectionHeader, BrandCard, Breadcrumb, PageHeader,
} from '../components/ui'
import type { Page, Brand } from '../appTypes'

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'strength', label: 'Strength' },
]

export default function BrandsPage() {
  const [sp, setSp] = useSearchParams()
  const [page, setPage]     = useState(Number(sp.get('page') ?? 1))
  const [sortBy, setSortBy] = useState(sp.get('sortBy') ?? '')
  const [typeFilter, setTypeFilter] = useState(sp.get('type') ?? '')
  const [search, setSearch] = useState(sp.get('q') ?? '')
  const dSearch = useDebounce(search, 500)

  // Keep URL in sync
  useEffect(() => {
    const p: Record<string, string> = {}
    if (page > 1) p.page = String(page)
    if (sortBy) p.sortBy = sortBy
    if (typeFilter) p.type = typeFilter
    if (dSearch) p.q = dSearch
    setSp(p, { replace: true })
  }, [page, sortBy, typeFilter, dSearch])

  // Reset to page 1 on filter/sort/search change
  useEffect(() => { setPage(1) }, [sortBy, typeFilter, dSearch])

  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Brand> }>(
    () => apiGetBrands({ page, sortBy: sortBy || undefined, type: typeFilter || undefined }),
    [page, sortBy, typeFilter]
    // Note: search on brand list goes through /search endpoint in a real scenario;
    // here we rely on server-side filtering if backend supports it
  )

  const brands = data?.data?.data ?? []
  const pagination = data?.data

  return (
    <div className="list-page">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/app' }, { label: 'Brands' }]} />
      <PageHeader title="Drug Brands" icon="💊" subtitle="All pharmaceutical brands in Bangladesh" />

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="filter-search"
          placeholder="Search brands…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="filter-pills">
          {[{ v: '', l: 'All' }, { v: 'gen', l: 'Generic sub.' }].map(f => (
            <button
              key={f.v}
              className={`pill ${typeFilter === f.v ? 'pill-active' : ''}`}
              onClick={() => setTypeFilter(f.v)}
            >{f.l}</button>
          ))}
        </div>
      </div>

      {loading && <Skeleton rows={8} />}
      {error   && <ErrorCard msg={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <SectionHeader
            title="Brands"
            count={pagination?.total}
          />
          {brands.length === 0
            ? <EmptyState icon="💊" msg="No brands found" />
            : <div className="card-list">{brands.map(b => <BrandCard key={b.id} b={b} />)}</div>
          }
          {pagination && (
            <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={setPage} />
          )}
        </>
      )}
    </div>
  )
}
