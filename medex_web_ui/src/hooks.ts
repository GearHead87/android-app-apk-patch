import { useState, useEffect, useRef } from 'react'

export interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/** Generic data-fetching hook */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []): FetchState<T> {
  const [data, setData]     = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const rev = useRef(0)

  function run() {
    const stamp = ++rev.current
    setLoading(true); setError(null)
    fetcher()
      .then(d => { if (rev.current === stamp) { setData(d); setLoading(false) } })
      .catch(e => { if (rev.current === stamp) { setError(String(e)); setLoading(false) } })
  }

  useEffect(() => { run() }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, reload: run }
}

/** Debounced value */
export function useDebounce<T>(value: T, ms = 400): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return dv
}
