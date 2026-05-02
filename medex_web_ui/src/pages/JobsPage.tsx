import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetJobs, apiGetJobById } from '../api'
import { useFetch } from '../hooks'
import { Skeleton, ErrorCard, EmptyState, Pagination, SectionHeader, JobCard, Breadcrumb, PageHeader } from '../components/ui'
import type { Page, Job } from '../appTypes'

export function JobsPage() {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Job> }>(
    () => apiGetJobs({ page }), [page]
  )
  const jobs = data?.data?.data ?? []
  const pagination = data?.data
  return (
    <div className="list-page">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/app' }, { label: 'Jobs' }]} />
      <PageHeader title="Jobs" icon="💼" subtitle="Pharmaceutical career opportunities" />
      {loading && <Skeleton />}
      {error   && <ErrorCard msg={error} onRetry={reload} />}
      {!loading && !error && (
        <>
          <SectionHeader title="Job Listings" count={pagination?.total} />
          {jobs.length === 0
            ? <EmptyState icon="💼" msg="No jobs found" />
            : <div className="card-list">{jobs.map(j => <JobCard key={j.id} j={j} />)}</div>
          }
          {pagination && <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={setPage} />}
        </>
      )}
    </div>
  )
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error, reload } = useFetch(() => apiGetJobById(id!), [id])
  if (loading) return <div className="detail-page"><Skeleton rows={4} /></div>
  if (error)   return <div className="detail-page"><ErrorCard msg={error} onRetry={reload} /></div>
  const j = data?.data as Job | undefined
  if (!j) return <div className="detail-page"><ErrorCard msg="Job not found" /></div>
  return (
    <div className="detail-page">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/app' }, { label: 'Jobs', to: '/app/jobs' }, { label: j.title ?? j.name ?? 'Job' }]} />
      <div className="detail-header">
        <div className="detail-header-main">
          <span className="detail-type-icon">💼</span>
          <h1 className="detail-name">{j.title ?? j.name ?? `Job #${j.id}`}</h1>
        </div>
      </div>
      {j.company && <div className="detail-info-card"><p>🏢 {typeof j.company === 'string' ? j.company : j.company.name}</p></div>}
      {j.description && (
        <div className="detail-section">
          <div className="mono-body" dangerouslySetInnerHTML={{ __html: j.description }} />
        </div>
      )}
    </div>
  )
}
