# MedEx 3.3.0 — API and network endpoints

This document is derived from the decompiled Android build under `apps/MedEx_3.3.0` (JADX + `libapp.so` strings from the Flutter AOT binary), `res/values/strings.xml`, `MainActivity.java`, and **limited live HTTP checks** against public routes to confirm JSON shape. Internal Dart method names (e.g. `apiLogin`) are **client-side** symbols; the server route is usually a path under the beta base URL, not the symbol name itself.

**Flat catalog of every HTTP entry point (URLs, probes, SDK hosts):** [`medEx_Http_Entry_Points.md`](medEx_Http_Entry_Points.md).

---

## 1. Primary REST API — MedEx (`https://medex.com.bd/api/beta/`)

**Base URL (embedded in app):** `https://medex.com.bd/api/beta/`

### 1.1 Common conventions

| Item | Detail |
|------|--------|
| **Default request headers** | `Content-Type: application/json` (JSON bodies), `Accept: application/json` |
| **Authentication** | After login, protected routes expect a bearer token: `Authorization: Bearer <authToken>` |
| **Typical JSON envelope** | `{"success": <bool>, "message": "<string>", "data": <object\|array>}` |
| **Unauthenticated list routes** | Many `GET` resources return `401`-style semantics in JSON, e.g. `{"success":false,"message":"Authentication token missing","data":[]}` |

### 1.2 Auth — login (POST)

- **URL:** `POST https://medex.com.bd/api/beta/login`
- **Headers:** `Content-Type: application/json`
- **Body (validated by server):** at minimum `name` (≥ 3 characters), `mobile_number`, `profession` (and possibly more fields in other flows).
- **Example response (shape only — values are illustrative):**

```json
{
  "success": true,
  "data": {
    "userId": 45012641530,
    "otpRequired": false,
    "authToken": "<long-hex-or-opaque-token>",
    "displayMessage": "Login successful",
    "otpValidity": 0,
    "resendInterval": 0,
    "loginVerified": false
  }
}
```

### 1.3 OTP — verify (POST)

- **URL:** `POST https://medex.com.bd/api/beta/verify-otp`
- **Headers:** `Content-Type: application/json`
- **Body:** OTP-related fields (exact keys are enforced server-side; empty or invalid payloads return errors such as `Invalid attempt.`).

### 1.4 OTP — resend (GET with query)

- **URL:** `GET https://medex.com.bd/api/beta/resend-otp?user_id=<id>`
- **Example error (invalid session / user):** `{"success":false,"message":"Invalid attempt!","data":[]}`

### 1.5 Static content — terms & privacy (GET)

- **Terms:** `GET https://medex.com.bd/api/beta/info/terms`
- **Privacy:** `GET https://medex.com.bd/api/beta/info/privacy-policy`
- **Response:** `success: true`, `data` is an **HTML string** (markup for in-app WebView), not a JSON object tree.

### 1.6 Data listing / search — path and query fragments (from `libapp.so`)

These fragments are appended to the base URL (sometimes with leading `/`, sometimes as query-only additions). Typical usage is **`GET`** with `Authorization` for user-specific data.

| Area | Path / query fragments (as embedded in the binary) |
|------|------------------------------------------------------|
| Brands | `brands`, `brands?page=`, `brands?sortBy=`, `brands?type=gen&page=` |
| Companies | `companies/`, `companies?alpha=` |
| Drug classes | `drug-classes/`, `drug-classes/...` (detail routes in app navigation) |
| Dosage forms | `dosage-forms/` |
| Generics | `generics?page=`, `generics?type=herbal&page=`, `generics?type=veterinary&page=` |
| Indications | `indications/`, `indications?search=` |
| Search | `search?search=`, `search?type=` |
| Jobs | `jobs/` |
| Favourites | `favorites/add/`, `favorites/remove/` (exact HTTP method/path may be POST with body — see note below) |
| History | `histories/remove/`, `histories/remove/all` |

**Authenticated list example (`GET /brands?page=1`):** With a valid `Authorization: Bearer` token, `data` is an array of brand objects with fields such as `id`, `name`, `strength`, `category`, nested `dosageForm`, `company`, `packages` (prices), `generic`, etc.

**Note:** Strings like `favorites/add/` appear in the binary as **route fragments**; naive `POST` to `.../favorites/add` returned **404** in a quick probe, so the app may use a different verb, body shape, or nested ID (e.g. `/favorites/{id}`). Treat the table as **evidence from the binary**, not a guaranteed OpenAPI map.

### 1.7 Dart HTTP client entry points (`libapp.so` symbol names)

These names correspond to functions in `package:medex_app_new/http/request.dart` (path not shipped as source). They are **not** always 1:1 with URL path segments (e.g. `apilogout` did not resolve to `api/beta/apilogout` in a live probe).

**Per-symbol HTTP method, path, query parameters, JSON body keys, and types** (with evidence notes): see **`medEx_Http_Entry_Points.md` §2.8**.

`apiCompaniesList`, `apiCompanyBrandsList`, `apiContactUs`, `apiDosageFormsBrandList`, `apiDrugsClassesDetailsList`, `apiDrugsClassesGenericsList`, `apiDrugsDetailsList`, `apiDrugsList`, `apiGenericBrandsList`, `apiGenericBrandsShortBy`, `apiGenericsDetailsList`, `apiGenericsList`, `apiGetSearchList`, `apiHerbalBrandsList`, `apiHerbalDetailsList`, `apiHerbalList`, `apiJobsDetailsList`, `apiJobsList`, `apiLogin`, `apilogout`, `apiOrderLogin`, `apiOrderVerifyOTP`, `apiOTPResend`, `apiPrivacyPolicy`, `apiProductList`, `apiTermsAndConditions`, `apiVerifyOTP`, `apiVeterinaryBrandsList`, `apiVeterinaryDetailsList`, `apiVeterinaryList`, `apiKey`, `tokenGet`, `tokenPost`.

---

## 2. Google Apps Script webhook (native Android)

**Source:** `com/medex/bd/medex/MainActivity.java` — static method `n(Map)` posts to a fixed macro URL.

| Item | Value |
|------|--------|
| **URL** | `https://script.google.com/macros/s/AKfycbxsszVblVlSzb_EVjf5MCem1QGx9VT1Kykkxu5x9LKiw7bHls9HACI8EacA1gRvzyao/exec` |
| **Method** | `POST` |
| **Headers** | `Content-Type: application/json; utf-8`, `Accept: application/json` |
| **Body** | JSON object: all keys/values from the incoming `Map` (null values sent as `""`). Built with `JSONObject` over the map. |
| **Response** | App checks HTTP **200** only (boolean success); response body is not parsed in Java. |
| **Flutter channel name** | `com.medex.bd.medex/sheet` (used to pass the map from Dart; see `sendLoginUserToSheetIfLoggedIn` / related symbols in `libapp.so`). |

**Example body (illustrative):** any flat JSON object the Dart side supplies, e.g. analytics or sheet row fields.

---

## 3. ACIBD “MyACI” order backend (`http://apps.acibd.com/apps/myaci/…`)

**Source:** `libapp.so` URL strings (plain `http`).

| Endpoint | Notes |
|----------|--------|
| `http://apps.acibd.com/apps/myaci/login` | **POST** JSON — server validation messages reference **Customer Code**, **OTP**, **Mobile No**. |
| `http://apps.acibd.com/apps/myaci/send-otp` | OTP send (method inferred as **POST**; confirm with proxy if needed). |
| `http://apps.acibd.com/apps/myaci/add-order` | Order submission. |
| `http://apps.acibd.com/apps/myaci/my-customer-product/` | Customer product list / related (trailing slash as in binary). |

**Example error envelope (empty POST to login):**

```json
{
  "error": [
    "The Customer Code field is required.",
    "The OTP field is required.",
    "The Mobile No field is required."
  ],
  "success": 0,
  "message": "Precondition Failed"
}
```

---

## 4. Firebase / Google Cloud (FlutterFire)

**Source:** `res/values/strings.xml` + `AndroidManifest.xml` component registrations.

| Setting | Value |
|---------|--------|
| **Firebase project (`project_id`)** | `medex-plus` |
| **App ID** | `1:758332342377:android:4e7b9c2952533561e5a2f8` |
| **GCM / FCM sender** | `758332342377` |
| **Storage bucket** | `medex-plus.appspot.com` |
| **API key (Android client)** | Present in `google_api_key` (restricted by Firebase console; treat as **client identifier**, not a secret). |

**Firestore:** The app registers `FlutterFirebaseFirestoreRegistrar` / Firestore SDK. Traffic goes to Google’s Firestore endpoints via the official SDK (gRPC/REST as implemented by the SDK), not to `medex.com.bd`. **Collection IDs and document paths** are not fully recoverable from strings alone without deeper IL/snapshot analysis.

**Other Google APIs present in dependencies:** Firebase Installations (`firebaseinstallations.googleapis.com`), AdMob / Ads (many `googleads` / `doubleclick` URLs in Play Services code — third-party SDK, not MedEx-specific business API).

---

## 5. Other hard-coded URLs

| URL | Purpose |
|-----|---------|
| `https://api.whatsapp.com/send/?phone=8801711943040&text&type=phone_number` | Support / contact via WhatsApp (`libapp.so`). |
| `https://play.google.com/store/apps/details?id=com.medex.bd.medex` | Play Store listing. |

---

## 6. Local / bundled assets (not remote APIs)

- `assets/json/district_list.json` — bundled district list (no HTTP call required).

---

## 7. Limitations

1. **Flutter AOT** hides exact URL concatenation and some request bodies; this list uses **strings embedded in `libapp.so`** plus **spot-checked HTTP** behavior.
2. **Example responses** for authenticated routes should use **redacted** tokens and IDs in any public documentation.
3. **Order login** symbols (`apiOrderLogin`, `apiOrderVerifyOTP`) may target **ACIBD** or **MedEx** depending on branch; only ACIBD URLs appear as plain HTTP strings in the binary.

---

*Generated from MedEx 3.3.0 decompiled artifacts in this repository.*
