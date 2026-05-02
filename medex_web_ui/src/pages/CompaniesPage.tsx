import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGetCompanies } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState, Pagination,
  SectionHeader, CompanyCard, Breadcrumb, PageHeader,
} from '../components/ui'
import type { Page, Company } from '../appTypes'

const ALPHABET = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]

export default function CompaniesPage() {
  const [sp, setSp] = useSearchParams()
  const [page, setPage]   = useState(Number(sp.get('page') ?? 1))
  const [alpha, setAlpha] = useState(sp.get('alpha') ?? '')

  useEffect(() => {
    const p: Record<string, string> = {}
    if (page > 1) p.page = String(page)
    if (alpha) p.alpha = alpha
    setSp(p, { replace: true })
  }, [page, alpha])

  useEffect(() => { setPage(1) }, [alpha])

  const { data, loading, error, reload } = useFetch<{ success: boolean; data: Page<Company> | Company[] }>(
    () => apiGetCompanies({ alpha: alpha || undefined, page }),
    [page, alpha]
  )

  // API may return paginated or flat list
  const companies: Company[] = Array.isArray(data?.data)
    ? (data!.data as Company[])
    : ((data?.data as Page<Company>)?.data ?? [])
  const pagination = Array.isArray(data?.data) ? null : data?.data as Page<Company> | null

  return (
    <div className="list-page">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/app' }, { label: 'Companies' }]} />
      <PageHeader title="Pharmaceutical Companies" icon="🏢" subtitle="All pharma companies in Bangladesh" />

      {/* A-Z filter — mirrors app's companies?alpha= filter */}
      <div className="az-filter">
        {ALPHABET.map(l => (
          <button
            key={l}
            className={`az-btn ${(alpha === '' && l === 'All') || alpha === l ? 'az-active' : ''}`}
            onClick={() => setAlpha(l === 'All' ? '' : l)}
          >{l}</button>
        ))}
      </div>

      {loading && <Skeleton />}
      {error   && <ErrorCard msg={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <SectionHeader title="Companies" count={pagination?.total ?? companies.length} />
          {companies.length === 0
            ? <EmptyState icon="🏢" msg="No companies found" />
            : <div className="company-grid">{companies.map(c => <CompanyCard key={c.id} c={c} />)}</div>
          }
          {pagination && (
            <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPage={setPage} />
          )}
        </>
      )}
    </div>
  )
}
