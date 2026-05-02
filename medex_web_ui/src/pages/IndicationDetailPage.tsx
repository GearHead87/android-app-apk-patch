import { useParams } from 'react-router-dom'
import { apiGetIndicationById } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState,
  SectionHeader, GenericCard, Breadcrumb,
} from '../components/ui'
import type { IndicationDetail } from '../appTypes'

export default function IndicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error, reload } = useFetch(
    () => apiGetIndicationById(id!),
    [id]
  )

  if (loading) return <div className="detail-page"><Skeleton rows={4} /></div>
  if (error)   return <div className="detail-page"><ErrorCard msg={error} onRetry={reload} /></div>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = data?.data
  const ind: IndicationDetail | undefined = raw && 'name' in raw ? raw as IndicationDetail : raw?.data as IndicationDetail | undefined

  if (!ind) return <div className="detail-page"><ErrorCard msg="Indication not found" /></div>

  return (
    <div className="detail-page">
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/app' },
        { label: 'Indications', to: '/app/indications' },
        { label: ind.name },
      ]} />

      <div className="detail-header">
        <div className="detail-header-main">
          <span className="detail-type-icon">📋</span>
          <h1 className="detail-name">{ind.name}</h1>
        </div>
        {ind.generics && (
          <div className="detail-header-sub">
            <span className="detail-count">🧬 {ind.generics.length} generics</span>
          </div>
        )}
      </div>

      {ind.description && (
        <div className="detail-info-card">
          <p className="ind-description">{ind.description}</p>
        </div>
      )}

      <div className="detail-section">
        <SectionHeader
          title={`Generics indicated for "${ind.name}"`}
          count={ind.generics?.length}
        />
        {!ind.generics || ind.generics.length === 0
          ? <EmptyState icon="🧬" msg="No generics listed for this indication" />
          : <div className="card-list">{ind.generics.map(g => <GenericCard key={g.id} g={g} />)}</div>
        }
      </div>
    </div>
  )
}
