import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGetGenerics } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState, Pagination,
  SectionHeader, GenericCard, Breadcrumb, PageHeader,
} from '../components/ui'
import type { Page, Generic } from '../appTypes'

const TYPE_OPTIONS = [
  { v: '',           l: 'All Generics', icon: '🧬' },
  { v: 'herbal',     l: 'Herbal',       icon: '🌿' },
  { v: 'veterinary', l: 'Veterinary',   icon: '🐾' },
]

interface Props { type?: string }   // allows reuse for /herbal and /veterinary

export default function GenericsPage({ type: forcedType }: Props) {
  const [sp, setSp] = useSearchParams()
  const urlType = forcedType ?? sp.get('type') ?? ''
  const [page, setPage]   = useState(Number(sp.get('page') ?? 1))
  const [typeF, setTypeF] = useState(urlType)

  useEffect(() => {
    const p: Record<string, string> = {}
    if (page > 1) p.page = String(page)
    if (typeF && !forcedType) p.type = typeF
    setSp(p, { replace: true })
  }, [page, typeF])

  useEffect(() => { setPage(1) }, [typeF])

  const activeType = forcedType ?? typeF
  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Generic> }>(
    () => apiGetGenerics({ page, type: activeType || undefined }),
    [page, activeType]
  )

  const generics = data?.data?.data ?? []
  const pagination = data?.data

  const titles: Record<string, { title: string; icon: string; sub: string }> = {
    '':           { title: 'Generic Drugs',    icon: '🧬', sub: 'All generic drug molecules' },
    'herbal':     { title: 'Herbal Medicine',  icon: '🌿', sub: 'Herbal / plant-based generics' },
    'veterinary': { title: 'Veterinary Drugs', icon: '🐾', sub: 'Animal / veterinary generics' },
  }
  const { title, icon, sub } = titles[activeType] ?? titles['']

  return (
    <div className="list-page">
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/app' },
        { label: title },
      ]} />
      <PageHeader title={title} icon={icon} subtitle={sub} />

      {/* Type filter — only shown when not forced */}
      {!forcedType && (
        <div className="filters-bar">
          <div className="filter-pills">
            {TYPE_OPTIONS.map(o => (
              <button
                key={o.v}
                className={`pill ${typeF === o.v ? 'pill-active' : ''}`}
                onClick={() => setTypeF(o.v)}
              >{o.icon} {o.l}</button>
            ))}
          </div>
        </div>
      )}

      {loading && <Skeleton />}
      {error   && <ErrorCard msg={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <SectionHeader title={title} count={pagination?.total} />
          {generics.length === 0
            ? <EmptyState icon={icon} msg={`No ${title.toLowerCase()} found`} />
            : <div className="card-list">{generics.map(g => <GenericCard key={g.id} g={g} />)}</div>
          }
          {pagination && (
            <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={setPage} />
          )}
        </>
      )}
    </div>
  )
}
