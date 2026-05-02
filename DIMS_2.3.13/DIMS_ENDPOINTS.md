# DIMS 2.3.13 — HTTP endpoints (static analysis)

This document is derived from the decompiled APK (`decompiled_apktool/`): Retrofit interfaces `com.twgbd.dims.retrofit.Api`, `com.twgbd.dimsplus.dpretrofit.DPApi`, Firebase Remote Config defaults, and related helpers. Runtime values (tokens, Remote Config overrides) are not fixed in the binary.

## Base URLs and configuration

| Purpose | Default / source | Notes |
|--------|------------------|--------|
| Main REST API | `http://dims.itmapi.com/` | Remote Config keys `base_url` and `dp_base_url` in `res/xml/remote_cofig_defaults.xml`; consumed as Retrofit `baseUrl` (must end with `/`). |
| Alternate PDM host (pref only) | `http://stpdm.itmapi.com/` | `PrefManager` key `pdm_url`; default string present; no `invoke` to `getPDM_URL` found in app smali (may be unused or called via reflection). |
| News feed (WordPress JSON) | `http://www.pdmbd.com/news/?json=get_posts` | Default in `PrefManager`; Remote Config key `news_url` can override with same style URL. |
| Static assets / ads | `https://cdn.itmedicus.org/` | Prefixed to relative image paths in UI code. |
| Marketing / web | `http://dimsbd.com/`, `https://clinicalinfobd.com/` | Strings / deep links; not the JSON API. |
| Firebase Realtime Database | `https://medanalytics-145509.firebaseio.com` | `res/values/strings.xml` (`firebase_database_url`). |
| SSL pin exception URL | `http://dims.itmapi.com/api/registration/skip` | Hostname allowlisted in `CustomTrust` for certificate pinning. |

## Global request behavior

- **Encoding**: Almost all Retrofit methods use `@FormUrlEncoded` → body is **`application/x-www-form-urlencoded`** (standard form fields below).
- **Exceptions**: `genericDetails()` is `POST` with **no** `@Field` parameters (empty body). `getCurrentTime` is `POST` with **header only**, no form fields.
- **Auth headers** (string values are **runtime** — stored prefs, Remote Config, or **native code**):
  - **`P-Auth-Token`**: Most registration, profile, FCM, BMDC, premium enrollment, device, trial, etc.
  - **`X-Auth-Token`**: Paginated catalog sync (`page`, `date`, `limit`) for brands, generics, indications, etc.
  - **`DIMS-Auth-Token`**: Premium bookmarks, some premium content, device list, logout.
- **Native library**: `com.twgbd.dims.api.ApiCall` loads `native-lib` and implements `stringFromJNI` / `stringFromJNI1` used as **extra OkHttp headers** on raw `GET`/`POST` (header **names and values are not visible** in Java/Kotlin/smali). `RegistrationRequestBuilder` also loads `native-lib` for `stringaeskey()`.

---

## Primary API — `http://dims.itmapi.com/` + path

Unless noted, method is **POST**. Full URL = `baseUrl + path` (Retrofit merges paths; leading `/` on some paths is normalized against base).

### Registration, login, profile, version

| Path | Headers | Form body fields | Response type (app model) |
|------|---------|------------------|----------------------------|
| `api/registration/skip/` | `P-Auth-Token` | `phone` | `LoginResponseModel` |
| `api/registration` | `P-Auth-Token` | `name`, `email`, `phone`, `occupation`, `specialty`, `organization`, `bmdc`, `bmdc_type` | `JsonObject` |
| `api/oldregistration` | `P-Auth-Token` | `id`, `name`, `email`, `phone`, `occupation`, `specialty`, `organization`, `bmdc`, `qualification`, `designation`, `bmdc_type`, `version`, `email_verified`, `bmdc_verified` | `JsonObject` |
| `api/profile` | `P-Auth-Token` | **saveProfile**: `userid`, `name`, `email`, `phone`, `occupation`, `specialty`, `organization`, `bmdc`, `qualification`, `designation`, `bmdc_type` | `JsonObject` |
| `api/profile` | `P-Auth-Token` | **updateProfile**: `userid`, `name`, `email`, `phone`, `occupation`, `specialty`, `organization`, `bmdc`, `qualification`, `dsignation`, `bmdc_type`, `thana_id`, `district_id` | `JsonObject` |
| `api/registration/version` | `P-Auth-Token` | `userid`, `version` | `JsonObject` |
| `api/version` | `P-Auth-Token` | `limit`, `date` | `JsonObject` |
| `api/getkey` | `P-Auth-Token` | `user_id` | `KeyResponseModel` |
| `/api/currenttime` | `P-Auth-Token` | *(none)* | `CurrentTimeResponse` — fields: `success`, `current_time` (long) |

### Email, FCM, BMDC

| Path | Headers | Form body | Response |
|------|---------|-----------|----------|
| `api/email` | `P-Auth-Token` | `userid`, `email` | `SaveEmailResponse` (Api) / `JsonObject` (DPApi) |
| `api/emailverify/sendverification` | `P-Auth-Token` | `userid` | `JsonObject` |
| `api/emailverify/check` | `P-Auth-Token` | `userid` | `JsonObject` |
| `api/fcm` | `P-Auth-Token` | `userid`, `fcmid` | `JsonObject` / `DPFcmResultModels` (DPApi) |
| `api/bmdc/check` | `P-Auth-Token` | `userid` | `JsonObject` |
| `api/bmdc` | `P-Auth-Token` | `userid`, `bmdc`, `bmdc_type` | `JsonObject` |

### Occupational / doctor-specific

| Path | Headers | Form body | Response |
|------|---------|-----------|----------|
| `api/occupationalinfo` | `P-Auth-Token` | **saveOccupation**: `userid`, `occupation`, `organization`, `designation`, `qualification`, `department`, `corporate_email` | `JsonObject` |
| `api/occupationalinfo` | `P-Auth-Token` | **saveOccupationDoctor**: `userid`, `bmdc`, `bmdc_type`, `occupation`, `organization`, `reg_no`, `sesion` *(typo in app)* | `JsonObject` |

### Drug submission

| Path | Headers | Form body | Response |
|------|---------|-----------|----------|
| `api/drug/add` | `P-Auth-Token` | `brandname`, `strength`, `form`, `genericname`, `company`, `userid` | `JsonObject` |

### Premium: bookmarks, SSL, devices, trial (DPApi overlaps)

| Path | Headers | Form body | Response |
|------|---------|-----------|----------|
| `api/premium/bookmark` | `DIMS-Auth-Token` | `user_id` | `BookMarkListModel` |
| `api/premium/bookmark/save` | `DIMS-Auth-Token` | `item_type`, `item_id` | `SaveBookmarkResponseModel` |
| `api/premium/bookmark/delete` | `DIMS-Auth-Token` | `item_type`, `item_id` | `DeleteBookmarkResponseModel` |
| `/api/premium/transactions` | `P-Auth-Token` | `userid` | `SSLTransactionsResponse` |
| `/api/premium/enroll` | `P-Auth-Token` | `val_id`, `userid`, `value_a`, `value_b`, `value_c` | `SSLSaveSubscriptionResponseModel` |
| `/api/premium/enroll/transaction` | `P-Auth-Token` | `tran_id`, `userid`, `value_a`, `value_b`, `value_c` | `SSLSaveSubscriptionResponseModel` |
| `api/premium/devices` | `DIMS-Auth-Token` | `userid` | `JsonObject` |
| `api/premium/savedevice` | `P-Auth-Token` | **saveDevice** (4 args): `device_model`, `device_unique_id`, `userid` **or** (5 args): + `remove_id` **or** **saveDevice2**: same 4 fields | `JsonObject` / `SaveDeviceResponseModel` |
| `api/trial` | `P-Auth-Token` | `userid` | `DpTrialSuccessModel` |
| `api/checktrial` | `P-Auth-Token` | `userid` | `DpTrialSuccessModel` |
| `api/checkpremium` | `P-Auth-Token` | `userid` | `JsonObject` / `SSLSaveSubscriptionResponseModel` (suspending variant) |
| `api/premium/logout ` | `DIMS-Auth-Token` | `userid` | `JsonObject` — *note trailing space in path string as compiled* |

### Premium content (paginated)

`page`, `date`, `limit` + header **`DIMS-Auth-Token`** unless noted.

| Path | Response model |
|------|----------------|
| `api/premium/disease` | `DiseaseArticleIdModel` |
| `api/premium/disease/value` | `DiseaseArticleValueModel` |
| `api/premium/indicationarticle` | `IndicationArticleId` |
| `api/premium/investigation` | `InvestigationModel` |
| `api/premium/investigation/availability` | `InvestigationAvaibalityModel` |
| `api/premium/investigation/organization` | `InvestigationOrganizationModel` |
| `api/premium/nationalguideline` | `InternationalGuideLine` |
| `api/premium/advertisement` | `PlusAddModel` |

### Catalog sync (classic) — header **`X-Auth-Token`**

Common form: `page`, `date`, `limit`.

| Path | Response model |
|------|----------------|
| `api/advertisement/byoccupation` | `AdvertisementDataModel` |
| `api/brand` | `BrandDataCollection` |
| `api/company` | `CompanyDataModel` |
| `api/generic` | `GenericDataCollection` |
| `api/generic/indication` | `GenericIndicationDataModel` |
| `api/selectedrestrictions` | `GenericRestictionData` |
| `api/generic/therapitic` | `TherapiticGenericData` |
| `api/herbalbrand` | `HerbalBrandDataModel` |
| `api/herbalgeneric` | `HerbalGenericDataModel` |
| `api/indication` | `IndicationDataModel` |
| `api/pregnancy` | `PregnancyCategoryData` |
| `api/specialty` | `SpecialtyModel` |
| `api/sponsored` | `SponsoredDataModel` |
| `api/system` | `SystemDataModel` |
| `api/therapitic` | `TherapiticDataCollection` |

### Other

| Path | Headers | Body | Response |
|------|---------|------|----------|
| `api/value_added_content` | *(none in interface)* | empty POST | `GenericDetailsModels[]` |
| `api/postUpdate` | *(none)* | `lastTime` | `JsonArray` |
| `api/savearea` | `P-Auth-Token` | `userid`, `district_id`, `thana_id` | `DPNormalMessageModel` |
| `api/chamnber` | `P-Auth-Token` | `userid`, `os`, `chamber_name`, `address`, `phone`, `time` | `JsonObject` — *typo `chamnber`* |
| `api/chamnber/list` | `P-Auth-Token` | `userid` | `ChamberListModels` |
| `api/testactive` | `P-Auth-Token` | `userid` | `JsonObject` |

---

## Example response shape — `api/registration/skip/` (`LoginResponseModel`)

Kotlin properties deserialize from JSON (typical Gson; field names match property names unless `@SerializedName` elsewhere). Main fields include: `bmdc`, `bmdc_type`, `bmdc_verified`, `designation`, `district_id`, `email`, `email_verified`, `message`, `name`, `occupation`, `occupation_updated`, `organization`, `phone`, `premium`, `qualification`, `specialty`, `success`, `thana_id`, `trial`, `userid`.

---

## External / non-Retrofit

| URL | Role |
|-----|------|
| `http://www.pdmbd.com/news/?json=get_posts` | WordPress **JSON REST** (`?json=get_posts`); query params and response follow WordPress plugin conventions — not defined in DIMS Retrofit. |
| Firebase Remote Config | Fetches `base_url`, `dp_base_url`, `news_url`, and other toggles — can change hosts without an app update. |
| Google Play, Facebook, Google Forms | In-app browser / intents; not backend API contracts. |

---

## Limitations

- **`P-Auth-Token` / `X-Auth-Token` / `DIMS-Auth-Token` values** are not hard-coded in readable form; JNI provides additional secret header material for `ApiCall` HTTP helpers.
- **Exact JSON** for `JsonObject` / `JsonArray` return types depends on server behavior.
- **HTTPS**: defaults use `http://`; production may redirect or use TLS at the network layer — verify with a live capture if needed.
