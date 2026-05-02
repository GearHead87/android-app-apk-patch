import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiSearch } from '../api'
import { useFetch, useDebounce } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState,
  SectionHeader, SearchResultCard, Breadcrumb, PageHeader,
} from '../components/ui'
import type { Page, SearchResult } from '../appTypes'

const TYPE_FILTERS = [
  { v: '', l: 'All' },
  { v: 'brand', l: '💊 Brands' },
  { v: 'generic', l: '🧬 Generics' },
  { v: 'company', l: '🏢 Companies' },
]

export default function SearchPage() {
  const [sp, setSp] = useSearchParams()
  const [query, setQuery]   = useState(sp.get('q') ?? '')
  const [typeF, setTypeF]   = useState(sp.get('type') ?? '')
  const dQuery = useDebounce(query, 400)

  useEffect(() => {
    const p: Record<string, string> = {}
    if (dQuery) p.q = dQuery
    if (typeF) p.type = typeF
    setSp(p, { replace: true })
  }, [dQuery, typeF])

  const enabled = dQuery.trim().length >= 2

  const { data, loading, error, reload } = useFetch(
    () => enabled ? apiSearch(dQuery.trim(), typeF || undefined)
                  : Promise.resolve({ success: true, message: '', data: [] }),
    [dQuery, typeF]
  )

  const raw = data?.data
  const results: SearchResult[] = Array.isArray(raw) ? raw
    : Array.isArray((raw as Page<SearchResult>)?.data) ? (raw as Page<SearchResult>).data
    : []

  // Group by type for display
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const t = r.type ?? 'other'
    ;(acc[t] = acc[t] ?? []).push(r)
    return acc
  }, {})

  return (
    <div className="list-page">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/app' }, { label: 'Search' }]} />
      <PageHeader title="Search" icon="🔍" subtitle="Search brands, generics, companies and indications" />

      <div className="search-hero">
        <input
          className="search-big-inp"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by brand or generic name…"
          autoFocus
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')}>✕</button>
        )}
      </div>

      <div className="filters-bar">
        <div className="filter-pills">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.v}
              className={`pill ${typeF === f.v ? 'pill-active' : ''}`}
              onClick={() => setTypeF(f.v)}
            >{f.l}</button>
          ))}
        </div>
      </div>

      {!enabled && !query && (
        <div className="search-prompt">
          <p>Type at least 2 characters to search.</p>
          <div className="search-examples">
            <span>Try:</span>
            {['Napa', 'Paracetamol', 'Beximco', 'Tablet', 'Analgesic'].map(ex => (
              <button key={ex} className="ex-btn" onClick={() => setQuery(ex)}>{ex}</button>
            ))}
          </div>
        </div>
      )}

      {enabled && loading && <Skeleton rows={6} />}
      {enabled && error   && <ErrorCard msg={error} onRetry={reload} />}

      {enabled && !loading && !error && results.length === 0 && (
        <EmptyState icon="🔍" msg={`No results for "${dQuery}"`} />
      )}

      {enabled && !loading && !error && results.length > 0 && (
        typeF
          ? (
            <>
              <SectionHeader title="Results" count={results.length} />
              <div className="card-list">
                {results.map(r => <SearchResultCard key={`${r.type}-${r.id}`} r={r} />)}
              </div>
            </>
          )
          : Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="search-group">
              <SectionHeader
                title={type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                count={items.length}
              />
              <div className="card-list">
                {items.map(r => <SearchResultCard key={`${r.type}-${r.id}`} r={r} />)}
              </div>
            </div>
          ))
      )}
    </div>
  )
}
