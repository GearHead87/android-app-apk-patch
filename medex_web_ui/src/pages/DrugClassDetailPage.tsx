import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGetDrugClassById, apiGetDrugClassGenerics } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState, Pagination,
  SectionHeader, GenericCard, Breadcrumb,
} from '../components/ui'
import type { DrugClass, Page, Generic } from '../appTypes'

function GenericsSection({ classId }: { classId: string }) {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Generic> }>(
    () => apiGetDrugClassGenerics(classId, { page }),
    [classId, page]
  )
  const generics = data?.data?.data ?? []
  const pagination = data?.data

  if (loading) return <Skeleton rows={4} />
  if (error)   return <ErrorCard msg={error} onRetry={reload} />
  if (generics.length === 0) return <EmptyState icon="🧬" msg="No generics in this class" />

  return (
    <>
      <div className="card-list">{generics.map(g => <GenericCard key={g.id} g={g} />)}</div>
      {pagination && (
        <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={setPage} />
      )}
    </>
  )
}

export default function DrugClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error, reload } = useFetch(
    () => apiGetDrugClassById(id!),
    [id]
  )

  if (loading) return <div className="detail-page"><Skeleton rows={4} /></div>
  if (error)   return <div className="detail-page"><ErrorCard msg={error} onRetry={reload} /></div>

  // May come as { data: DrugClass } or { data: { data: DrugClass } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = data?.data
  const dc: DrugClass | undefined = raw && 'name' in raw ? raw as DrugClass : raw?.data as DrugClass | undefined

  if (!dc) return <div className="detail-page"><ErrorCard msg="Drug class not found" /></div>

  return (
    <div className="detail-page">
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/app' },
        { label: 'Drug Classes', to: '/app/drug-classes' },
        { label: dc.name },
      ]} />

      <div className="detail-header">
        <div className="detail-header-main">
          <span className="detail-type-icon">💉</span>
          <h1 className="detail-name">{dc.name}</h1>
        </div>
        <div className="detail-header-sub">
          <span className="detail-id">ID: {dc.id}</span>
          {dc.genericsCount !== undefined && (
            <span className="detail-count">🧬 {dc.genericsCount} generics</span>
          )}
        </div>
      </div>

      {/* Sub-classes hierarchy */}
      {dc.subClasses && dc.subClasses.length > 0 && (
        <div className="detail-section">
          <SectionHeader title="Sub-classes" count={dc.subClasses.length} />
          <div className="dc-tree dc-tree-compact">
            {dc.subClasses.map(sub => (
              <Link key={sub.id} to={`/app/drug-classes/${sub.id}`} className="dc-sub-link">
                <span className="dc-sub-arrow">▸</span>
                <span>{sub.name}</span>
                {sub.subClasses && sub.subClasses.length > 0 && (
                  <span className="muted">&nbsp;({sub.subClasses.length} sub-classes)</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Generics in this class */}
      <div className="detail-section">
        <SectionHeader
          title="Generic Drugs in this Class"
          count={dc.genericsCount}
        />
        <GenericsSection classId={id!} />
      </div>
    </div>
  )
}
