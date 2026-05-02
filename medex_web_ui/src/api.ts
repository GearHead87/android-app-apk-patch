/**
 * MedEx API client
 * All requests go through the Vite dev-server proxy:
 *   /proxy/medex/ → https://medex.com.bd/api/beta/
 */
import type {
  ApiEnvelope, Page,
  Brand, BrandDetail, Generic, GenericDetail,
  Company, DosageForm, DrugClass, Indication, IndicationDetail,
  SearchResult, Job, Campaign, LoginResponse,
} from './appTypes'

const BASE = '/proxy/medex'

/* ── helpers ─────────────────────────────────────────────── */
function tok() { return localStorage.getItem('mx_tok') ?? '' }

function authHdr(): Record<string, string> {
  const t = tok()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function _get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) url.searchParams.set(k, String(v))
    })
  }
  const r = await fetch(url.toString(), { headers: { ...authHdr() } })
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try { const j = await r.json(); msg = j.message ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  return r.json()
}

async function _post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHdr() },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try { const j = await r.json(); msg = j.message ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  return r.json()
}

/* ── Auth ─────────────────────────────────────────────────── */
export interface LoginBody { name: string; mobile_number: string; profession: string }
export const apiLogin   = (b: LoginBody) => _post<ApiEnvelope<LoginResponse>>('/login', b)
export const apiVerifyOtp = (b: { user_id: string | number; otp: string }) =>
  _post<ApiEnvelope<LoginResponse>>('/verify-otp', b)
export const apiResendOtp = (userId: string | number) =>
  _get<ApiEnvelope<unknown>>('/resend-otp', { user_id: userId })

/* ── Brands / Drugs ────────────────────────────────────────── */
export const apiGetBrands = (p?: { page?: number; sortBy?: string; type?: string }) =>
  _get<ApiEnvelope<Page<Brand>>>('/brands', p as Record<string, string|number|undefined>)

export const apiGetBrandById = (id: number | string) =>
  _get<ApiEnvelope<BrandDetail>>(`/brands/${id}`)

/* ── Generics ──────────────────────────────────────────────── */
export const apiGetGenerics = (p?: { page?: number; type?: string }) =>
  _get<ApiEnvelope<Page<Generic>>>('/generics', p as Record<string, string|number|undefined>)

export const apiGetGenericById = (id: number | string) =>
  _get<ApiEnvelope<GenericDetail>>(`/generics/${id}`)

export const apiGetGenericBrands = (id: number | string, p?: { page?: number }) =>
  _get<ApiEnvelope<Page<Brand>>>(`/generics/${id}/brands`, p as Record<string, string|number|undefined>)

/* ── Companies ─────────────────────────────────────────────── */
export const apiGetCompanies = (p?: { alpha?: string; page?: number }) =>
  _get<ApiEnvelope<Page<Company>>>('/companies', p as Record<string, string|number|undefined>)

export const apiGetCompanyBrands = (id: number | string, p?: { page?: number }) =>
  _get<ApiEnvelope<Page<Brand>>>(`/companies/${id}/brands`, p as Record<string, string|number|undefined>)

/* ── Drug Classes ──────────────────────────────────────────── */
export const apiGetDrugClasses = () =>
  _get<ApiEnvelope<DrugClass[]>>('/drug-classes')

export const apiGetDrugClassById = (id: number | string) =>
  _get<ApiEnvelope<DrugClass>>(`/drug-classes/${id}`)

export const apiGetDrugClassGenerics = (id: number | string, p?: { page?: number }) =>
  _get<ApiEnvelope<Page<Generic>>>(`/drug-classes/${id}/generics`, p as Record<string, string|number|undefined>)

/* ── Dosage Forms ──────────────────────────────────────────── */
export const apiGetDosageForms = () =>
  _get<ApiEnvelope<DosageForm[]>>('/dosage-forms')

export const apiGetDosageFormBrands = (id: number | string, p?: { page?: number }) =>
  _get<ApiEnvelope<Page<Brand>>>(`/dosage-forms/${id}/brands`, p as Record<string, string|number|undefined>)

/* ── Indications ───────────────────────────────────────────── */
export const apiGetIndications = (p?: { search?: string }) =>
  _get<ApiEnvelope<Page<Indication> | Indication[]>>('/indications', p as Record<string, string|number|undefined>)

export const apiGetIndicationById = (id: number | string) =>
  _get<ApiEnvelope<IndicationDetail>>(`/indications/${id}`)

/* ── Search ────────────────────────────────────────────────── */
export const apiSearch = (query: string, type?: string) =>
  _get<ApiEnvelope<Page<SearchResult> | SearchResult[]>>('/search', {
    search: query, ...(type ? { type } : {}),
  })

/* ── Jobs ──────────────────────────────────────────────────── */
export const apiGetJobs = (p?: { page?: number }) =>
  _get<ApiEnvelope<Page<Job>>>('/jobs', p as Record<string, string|number|undefined>)

export const apiGetJobById = (id: number | string) =>
  _get<ApiEnvelope<Job>>(`/jobs/${id}`)

/* ── Home campaigns (if endpoint exists) ───────────────────── */
export const apiGetCampaigns = () =>
  _get<ApiEnvelope<Campaign[]>>('/campaigns').catch(() => ({ success: false, message: '', data: [] as Campaign[] }))

/* ── Favourites ────────────────────────────────────────────── */
export const apiGetFavorites = () =>
  _get<ApiEnvelope<Brand[]>>('/favorites')

/* ── History ───────────────────────────────────────────────── */
export const apiGetHistory = () =>
  _get<ApiEnvelope<Brand[]>>('/histories')

export const apiClearHistory = () =>
  _get<ApiEnvelope<unknown>>('/histories/remove/all')

/* ── Static ────────────────────────────────────────────────── */
export const apiGetTerms   = () => _get<ApiEnvelope<string>>('/info/terms')
export const apiGetPrivacy = () => _get<ApiEnvelope<string>>('/info/privacy-policy')
