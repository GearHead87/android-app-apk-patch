# MedEx 3.3.0 — HTTP entry points (extracted)

Sources: **`lib/arm64-v8a/libapp.so`** (strings), **`com/medex/bd/medex/MainActivity.java` / `.smali`**, **`res/values/strings.xml`**, plus **live HTTP status checks** on `medex.com.bd` where noted.

Path fragments marked **(binary only)** appear in the Flutter AOT binary; the exact HTTP method and final URL may be built in Dart (concatenation, IDs in path, or POST body).

---

## 1. First-party application URLs (literal in binary or Java)

| URL | Role |
|-----|------|
| `https://medex.com.bd/api/beta/` | Base URL for MedEx REST API (suffix paths below). |
| `https://script.google.com/macros/s/AKfycbxsszVblVlSzb_EVjf5MCem1QGx9VT1Kykkxu5x9LKiw7bHls9HACI8EacA1gRvzyao/exec` | Google Apps Script webhook (`MainActivity` POST JSON). |
| `http://apps.acibd.com/apps/myaci/login` | ACIBD / “MyACI” order login (cleartext HTTP). |
| `http://apps.acibd.com/apps/myaci/send-otp` | ACIBD OTP send. |
| `http://apps.acibd.com/apps/myaci/add-order` | ACIBD place order. |
| `http://apps.acibd.com/apps/myaci/my-customer-product/` | ACIBD customer product (trailing `/` as in binary). |
| `https://api.whatsapp.com/send/?phone=8801711943040&text&type=phone_number` | WhatsApp deep link (support). |
| `https://play.google.com/store/apps/details?id=com.medex.bd.medex` | Play Store listing. |

**Documentation / framework noise in `libapp.so` (not app API):**  
`https://api.flutter.dev/...`, `https://docs.flutter.dev/...`, `https://pub.dev/`, W3C/XML DTD/SVG namespace URLs — excluded from “app API” below.

---

## 2. MedEx REST — resolved base + routes

**Base:** `https://medex.com.bd/api/beta/`

### 2.1 Auth & OTP (verbs probed)

| Full URL | Notes |
|----------|--------|
| `https://medex.com.bd/api/beta/login` | **POST** — registration/login body (`GET` → 405). |
| `https://medex.com.bd/api/beta/verify-otp` | **POST** (`GET` → 405). |
| `https://medex.com.bd/api/beta/resend-otp?user_id=<id>` | **GET** with query (string in binary). |

### 2.2 Static / legal content

| Full URL | Notes |
|----------|--------|
| `https://medex.com.bd/api/beta/info/terms` | **GET** — JSON with HTML in `data`. |
| `https://medex.com.bd/api/beta/info/privacy-policy` | **GET** — same pattern. |

### 2.3 Core catalog & search (typically **GET** + `Authorization` for full data)

Live probe: these return **200** (may return JSON “token missing” without auth):

| Full URL |
|----------|
| `https://medex.com.bd/api/beta/brands` |
| `https://medex.com.bd/api/beta/companies` |
| `https://medex.com.bd/api/beta/generics` |
| `https://medex.com.bd/api/beta/drug-classes` |
| `https://medex.com.bd/api/beta/dosage-forms` |
| `https://medex.com.bd/api/beta/indications` |
| `https://medex.com.bd/api/beta/search` |
| `https://medex.com.bd/api/beta/jobs` |

**Query fragments (binary)** — append to the relevant resource (exact pairing is app logic):

- `brands?page=`, `brands?sortBy=`, `brands?type=gen&page=`
- `companies?alpha=`
- `generics?page=`, `generics?type=herbal&page=`, `generics?type=veterinary&page=`
- `indications?search=`
- `search?search=`, `search?type=`

### 2.4 User data & contact

| Full URL | Notes |
|----------|--------|
| `https://medex.com.bd/api/beta/contact` | **POST** (`GET` → 405). |
| `https://medex.com.bd/api/beta/favorites` | **GET** — list (`Authorization` for real data). |
| `https://medex.com.bd/api/beta/histories` | **GET** — list. |
| `https://medex.com.bd/api/beta/histories/remove/all` | **GET** returns JSON (auth required for success). |

### 2.5 Other routes found via probe

| Full URL | Notes |
|----------|--------|
| `https://medex.com.bd/api/beta/request/add-medicine` | **GET** returns JSON envelope (auth may be required for action). |

### 2.6 Path fragments **(binary only)** — combine with base (method unknown / 404 on naive probe)

These strings appear in `libapp.so` as route pieces; they are **not** all valid as simple `GET /api/beta/<segment>`:

- `favorites/add/`, `favorites/remove/`
- `histories/remove/`
- `verify-otp`, `login`, `tokenGet`, `tokenPost` (also appear as symbols; `tokenGet`/`tokenPost` as bare paths → **404** in probe)

### 2.7 Dart HTTP wrapper names → backend (symbols in `libapp.so`)

These are **client function names** in `package:medex_app_new/http/request.dart`. The table in **§2.8** maps each symbol to **inferred or probed** HTTP behavior, bodies, and types.

---

### 2.8 Per-symbol request mapping (`package:medex_app_new/http/request.dart`)

**Global defaults (MedEx `medex.com.bd` JSON API):**

- **Content type:** `application/json` for **POST** bodies (and often sent on other verbs by HTTP clients).
- **Auth (after login):** header `Authorization: Bearer <authToken>` where `<authToken>` is the string returned in `data.authToken` from `POST /login` (opaque string / long hex in responses).
- **List responses:** envelope `{"success":bool,"message":string,"data":array|object}`.

**Evidence legend:** **probe** = HTTP behavior checked against `api/beta`; **strings** = path/query fragments in `libapp.so`; **login** = `POST /login` validation messages; **ACIBD** = host `apps.acibd.com` only; **infer** = naming + routes above, not proven by decompiled Dart source.

| Client symbol | Backend (primary) | Method | Path / query | Request body (JSON or query) | Types / notes |
|---------------|-------------------|--------|--------------|-------------------------------|---------------|
| `apiLogin` | MedEx | POST | `/login` | `name` (string, min length 3), `mobile_number` (string), `profession` (string/ID — server accepts values like `"1"`) | **login** validation. Response includes `authToken`, `userId`, `otpRequired`, etc. |
| `apiVerifyOTP` | MedEx | POST | `/verify-otp` | Likely `user_id` (int/string) + `otp` (string); invalid attempts return `Invalid attempt.` | **probe** does not expose field names; keys inferred from OTP flows + `user_id` in `resend-otp`. |
| `apiOTPResend` | MedEx | GET | `/resend-otp` | Query only: `user_id=<numeric id>` | **strings** + **probe**. No JSON body. |
| `apilogout` | *Unclear* | *—* | No literal `.../apilogout` route found (**probe** 404). App may clear token locally only, or call an unprobed path. | If server logout exists: often POST with `{}` or `{ "authToken": "..." }` — **not confirmed**. | Mark as **infer / unknown**. |
| `apiTermsAndConditions` | MedEx | GET | `/info/terms` | *None* | Returns HTML string inside `data`. |
| `apiPrivacyPolicy` | MedEx | GET | `/info/privacy-policy` | *None* | Same as terms. |
| `apiContactUs` | MedEx | POST | `/contact` | Typical contact forms use `name`, `email`, `message`, optional `subject`, `phone` (**strings** include `subject`, `message`, `email`). Server returned **500** on test probes — schema **not** verified live. | **infer** + **strings**. |
| `apiCompaniesList` | MedEx | GET | `/companies` | Query: `alpha=<letter>` for A–Z filter (**strings**: `companies?alpha=`), pagination likely `page` | **strings** + **probe** (`GET /companies` → 200). |
| `apiCompanyBrandsList` | MedEx | GET | `/companies/{companyId}/brands` | Path param: `companyId` (int, snowflake-style IDs in API) | **probe** (`.../companies/86934930844/brands` → 200). No body. |
| `apiDosageFormsBrandList` | MedEx | GET | `/dosage-forms/{dosageFormId}/brands` | Path: `dosageFormId` | **probe** (`/dosage-forms/80981232451/brands` → 200). |
| `apiDrugsClassesDetailsList` | MedEx | GET | `/drug-classes/{classId}` | Path: `classId` | **probe** (`/drug-classes/1` → 200). |
| `apiDrugsClassesGenericsList` | MedEx | GET | `/drug-classes/{classId}/generics` | Path: `classId` | **probe** → 200. |
| `apiDrugsList` | MedEx | GET | `/brands` (paginated / filtered) | Query: `page`, optional `sortBy`, `type=gen` (**strings**: `/brands?page=`, `brands?sortBy=`, `brands?type=gen&page=`) | **strings** + **probe**. “Drugs” in UI are often **brand** rows. |
| `apiDrugsDetailsList` | MedEx | GET | `/brands/{brandId}` | Path: `brandId` (`GET /drugs/{id}` → **404**; `/brands/{id}` → 200) | **probe**. Detail = brand/drug card. |
| `apiGenericsList` | MedEx | GET | `/generics` | Query: `page`, optional `type` | **strings** `generics?page=` + **probe**. |
| `apiGenericsDetailsList` | MedEx | GET | `/generics/{genericId}` | Path: `genericId` | **probe** (`/generics/1` → 200). |
| `apiGenericBrandsList` | MedEx | GET | `/generics/{genericId}/brands` | Path: `genericId` | **probe** → 200. |
| `apiGenericBrandsShortBy` | MedEx | GET | `/brands` | Query: `sortBy=...` (**strings** `brands?sortBy=`) | **strings**; same resource as sorted brand list. |
| `apiHerbalList` | MedEx | GET | `/generics` | Query: `type=herbal`, `page` (**strings** `generics?type=herbal&page=`) | **strings** + **probe** on `/generics`. |
| `apiHerbalDetailsList` | MedEx | GET | `/generics/{id}` | Path + herbal context from list filter | **infer** (same resource as generic detail). |
| `apiHerbalBrandsList` | MedEx | GET | `/generics/{genericId}/brands` | Path: herbal generic id | **infer** (same as `apiGenericBrandsList` for herbal generics). |
| `apiVeterinaryList` | MedEx | GET | `/generics` | Query: `type=veterinary`, `page` (**strings** `generics?type=veterinary&page=`) | **strings**. |
| `apiVeterinaryDetailsList` | MedEx | GET | `/generics/{id}` | Same as herbal detail | **infer**. |
| `apiVeterinaryBrandsList` | MedEx | GET | `/generics/{genericId}/brands` | Same pattern | **infer**. |
| `apiGetSearchList` | MedEx | GET | `/search` | Query: `search=<term>`, optional `type` (**strings** `search?search=`, `search?type=`) | **strings** + **probe** (`search?search=test` → 200). |
| `apiJobsList` | MedEx | GET | `/jobs` | Optional pagination (not in short strings) | **probe**. |
| `apiJobsDetailsList` | MedEx | GET | `/jobs/{jobId}` | Path: `jobId` | **probe** (`/jobs/1` → 200). |
| `apiProductList` | *Likely ACIBD* | GET/POST | `http://apps.acibd.com/apps/myaci/my-customer-product/` (and related) | **ACIBD** — body/query not in `libapp.so` as JSON keys; often needs `order_token` / customer session (**symbols** `tokenOrderGet`, `tokenOrderPost`, `order_token`). | **infer** from order flow symbols + URL string. |
| `apiOrderLogin` | ACIBD | POST | `http://apps.acibd.com/apps/myaci/login` | JSON fields named by server: **Customer Code**, **Mobile No**, **OTP** (see error array on empty POST) | **ACIBD** + **probe**. |
| `apiOrderVerifyOTP` | ACIBD | *Likely* POST | Same host family (`send-otp`, login flow) | OTP + identifiers — **infer**; exact path not duplicated as full URL in binary except login/send-otp/add-order/product. | **infer**. |
| `tokenGet` | MedEx (?) | *Unknown* | No standalone `GET .../tokenGet` (**probe** 404). May be **client-side** helper name for “get token from storage” rather than HTTP. | *N/A* if not HTTP | **infer**. |
| `tokenPost` | MedEx (?) | *Unknown* | No `.../tokenPost` route (**probe** 404). Could be refresh/token exchange implemented under another path. | If refresh exists: often `{ "refresh_token": "..." }` — **not confirmed** | **infer**. |
| `tokenOrderGet` | ACIBD | *Likely* GET | ACIBD order APIs | Query/header using `order_token` / customer session | **strings** only (`tokenOrderGet`, `order_token`). |
| `tokenOrderPost` | ACIBD | *Likely* POST | ACIBD order APIs | Same family | **strings** only. |
| `apiKey` | **Config / SDK** | *—* | Not mapped to `medex.com.bd` REST in binary. Android **`google_api_key`** is in `res/values/strings.xml` (`AIzaSy...`) for **Firebase / Google SDKs**. | If a Dart field named `apiKey` is sent, it would be as a JSON key or header — **not** verified. | Treat as **Firebase client key**, not MedEx bearer token. |

**Favourites / history (related HTTP, symbols not in your list but same `request.dart` layer):** binary fragments `favorites/add/`, `favorites/remove/`, `histories/remove/` — likely **POST** or **DELETE** with JSON such as `{ "brand_id": <int> }` or path IDs; **not** confirmed by route probing.

---

## 3. Google Ads (app unit id in binary)

| Id | Role |
|----|------|
| `ca-app-pub-1866145002806538/6672307489` | AdMob ad unit (from `libapp.so` strings). |

Impression/auction traffic uses Google’s ad hosts (see SDK section).

---

## 4. Firebase / Google Mobile Services (SDK — not MedEx domain)

From **`strings.xml`** and dependency smali (typical hosts the binary contacts):

| Host / pattern | SDK |
|----------------|-----|
| `https://firebaseinstallations.googleapis.com/v1/` | Firebase Installations |
| `https://firebase-settings.crashlytics.com/spi/v2/platforms/android/gmp/` | Crashlytics |
| Firestore / Firebase APIs via **`medex-plus`** project (see `project_id`, `google_app_id`) | Cloud Firestore, etc. |
| `https://pagead2.googlesyndication.com/...`, `https://googleads.g.doubleclick.net/...`, `https://imasdk.googleapis.com/...`, `https://fundingchoicesmessages.google.com/...` | AdMob / UMP / ads |

Exact Firestore document paths are **not** fully enumerated from strings alone.

---

## 5. Summary count

| Category | Count (approx.) |
|----------|-------------------|
| Literal full URLs (app + ACIBD + WhatsApp + Play + Apps Script) | **11** unique hosts/paths in §1 |
| MedEx `api/beta` routes with confirmed HTTP behavior | **20+** rows in §2 (plus query variants) |
| Dart `api*` symbol names | **31** (+ `tokenOrderGet`, `tokenOrderPost` in same binary) |
| Per-symbol request mapping | **§2.8** (table) |
| ACIBD | **4** endpoints |
| Binary-only path fragments | **10+** |

---

*For request headers, bodies, and response shapes, see `medEx_Endpoints.md` in the same folder. Per-method body/query detail for each `api*` name is in **§2.8** above.*
