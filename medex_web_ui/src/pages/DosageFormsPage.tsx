import { apiGetDosageForms } from '../api'
import { useFetch } from '../hooks'
import {
  Skeleton, ErrorCard, EmptyState,
  SectionHeader, DosageFormCard, Breadcrumb, PageHeader,
} from '../components/ui'
import type { DosageForm } from '../appTypes'

export default function DosageFormsPage() {
  const { data, loading, error, reload } = useFetch(
    () => apiGetDosageForms(),
    []
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = data?.data
  const forms: DosageForm[] = Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : []

  return (
    <div className="list-page">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/app' }, { label: 'Dosage Forms' }]} />
      <PageHeader
        title="Dosage Forms"
        icon="📦"
        subtitle="Browse drugs by their physical form"
      />

      {loading && <Skeleton />}
      {error   && <ErrorCard msg={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <SectionHeader title="Dosage Forms" count={forms.length} />
          {forms.length === 0
            ? <EmptyState icon="📦" msg="No dosage forms found" />
            : <div className="df-grid">{forms.map(df => <DosageFormCard key={df.id} df={df} />)}</div>
          }
        </>
      )}
    </div>
  )
}
