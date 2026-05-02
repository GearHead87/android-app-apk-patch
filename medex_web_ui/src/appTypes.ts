/* =========================================================
   MedEx app data types — reverse-engineered from libapp.so
   ========================================================= */

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export interface Page<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
}

/* ── Cross-reference stubs ─────────────────────────────── */
export interface Ref { id: number; name: string }
export interface CompanyRef  extends Ref { logoUrl?: string }
export interface DosageRef   extends Ref { iconUrl?: string; dosageFormIconUrl?: string }
export interface GenericRef  extends Ref { type?: string }
export interface DrugClassRef extends Ref {}

/* ── Packages / pricing ────────────────────────────────── */
export interface Package {
  id?: number
  price?: string
  priceInfo?: string
  unit?: string
}

/* ── Brand (DrugsListData / DrugDetailsData) ───────────── */
export interface Brand {
  id: number
  name: string
  strength?: string
  type?: string          // null = regular, 'gen' = generic substitute
  generic?: GenericRef
  generic_name?: string
  company?: CompanyRef
  dosageForm?: DosageRef
  packages?: Package[]
  imageUrl?: string
  brandsCount?: number
}

export interface SiblingBrand {
  id: number
  name: string
  strength?: string
  company?: CompanyRef
  dosageForm?: DosageRef
}

export interface BrandDetail extends Brand {
  siblingBrands?: SiblingBrand[]
  drugClass?: DrugClassRef
}

/* ── Generic (GenericsListData / GenericsDetailsData) ──── */
export interface Generic {
  id: number
  name: string
  type?: string          // null | 'herbal' | 'veterinary'
  brandsCount?: number
  genericsCount?: number
  indication?: string
  drugClass?: DrugClassRef
}

export interface InnovatorsMonograph {
  [section: string]: string  // pharmacology, indication, contraindication, etc.
}

export interface GenericDetail extends Generic {
  brands?: Brand[]
  innovatorsMonograph?: string | InnovatorsMonograph
}

/* ── Company (CompaniesListData) ───────────────────────── */
export interface Company {
  id: number
  name: string
  logoUrl?: string
  brandsCount?: number
}

/* ── Dosage Form (DosageFormsList) ─────────────────────── */
export interface DosageForm {
  id: number
  name: string
  iconUrl?: string
  dosageFormIconUrl?: string
  brandsCount?: number
}

/* ── Drug Class (DrugClassesListData / Details) ─────────── */
export interface DrugClass {
  id: number
  name: string
  subClasses?: DrugClass[]
  genericsCount?: number
  parentId?: number
}

export interface DrugClassDetail extends DrugClass {
  generics?: Generic[]
}

/* ── Indication (IndictionListData / IndictionDetails) ──── */
export interface Indication {
  id: number
  name: string
  description?: string
}

export interface IndicationDetail extends Indication {
  generics?: Generic[]
}

/* ── Search (SearchListData) ───────────────────────────── */
export interface SearchResult {
  id: number
  name: string
  type: string         // 'brand' | 'generic' | 'company' | 'indication' etc.
  strength?: string
  company?: string | CompanyRef
  generic?: string | GenericRef
  dosageForm?: DosageRef
}

/* ── Job (JobListData / JobDetailsData) ─────────────────── */
export interface Job {
  id: number
  title?: string
  name?: string
  company?: CompanyRef | string
  description?: string
  deadline?: string
}

/* ── Home campaigns (HomeCampaignsData) ─────────────────── */
export interface Campaign {
  id: number
  title?: string
  imageUrl?: string
  type?: string
  targetId?: number
}

/* ── Auth ────────────────────────────────────────────────── */
export interface LoginResponse {
  userId: number
  authToken: string
  otpRequired: boolean
  displayMessage?: string
  otpValidity?: number
  resendInterval?: number
  loginVerified?: boolean
}
