import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGetDrugClasses } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState, Breadcrumb, PageHeader, SectionHeader,
} from '../components/ui'
import type { DrugClass } from '../appTypes'

/** Recursive tree item — mirrors the app's multi-level drug class hierarchy */
function DrugClassItem({ dc, depth = 0 }: { dc: DrugClass; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)
  const hasChildren = dc.subClasses && dc.subClasses.length > 0

  return (
    <div className={`dc-item depth-${depth}`}>
      <div className="dc-row">
        <button
          className="dc-toggle"
          onClick={() => hasChildren && setOpen(v => !v)}
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
        >
          {hasChildren ? (open ? '▾' : '▸') : '·'}
        </button>
        <Link to={`/app/drug-classes/${dc.id}`} className="dc-name">
          {dc.name}
        </Link>
        {dc.genericsCount !== undefined && (
          <span className="dc-count">{dc.genericsCount} generics</span>
        )}
      </div>
      {hasChildren && open && (
        <div className="dc-children">
          {dc.subClasses!.map(sub => <DrugClassItem key={sub.id} dc={sub} depth={depth + 1} />)}
        </div>
      )}
    </div>
  )
}

export default function DrugClassesPage() {
  const { data, loading, error, reload } = useFetch(
    () => apiGetDrugClasses(),
    []
  )

  // API may return { data: DrugClass[] } or { data: { data: DrugClass[] } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = data?.data
  const classes: DrugClass[] = Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : []

  return (
    <div className="list-page">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/app' }, { label: 'Drug Classes' }]} />
      <PageHeader
        title="Drug Classes"
        icon="💉"
        subtitle="Therapeutic & pharmacological drug classification hierarchy"
      />

      {loading && <Skeleton />}
      {error   && <ErrorCard msg={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <SectionHeader title="All Drug Classes" count={classes.length} />
          {classes.length === 0
            ? <EmptyState icon="💉" msg="No drug classes found" />
            : (
              <div className="dc-tree">
                {classes.map(dc => <DrugClassItem key={dc.id} dc={dc} />)}
              </div>
            )
          }
        </>
      )}
    </div>
  )
}
