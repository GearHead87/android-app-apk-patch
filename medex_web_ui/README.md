# MedEx API Explorer — Web UI

A single-page Postman-style API explorer for the **MedEx 3.3.0** app endpoints,
reverse-engineered from the Android APK (`libapp.so` strings + live HTTP probes).

---

## Quick start

```bash
pnpm install
pnpm dev          # opens on http://localhost:5173
```

> **Important:** always open via `pnpm dev` (Vite dev-server).  
> The app proxies all requests through Vite to avoid CORS errors.  
> Opening `dist/index.html` directly as a file will fail on CORS.

---

## Proxy map

| Browser calls | Vite rewrites to |
|---|---|
| `/proxy/medex/…` | `https://medex.com.bd/api/beta/…` |
| `/proxy/acibd/…` | `http://apps.acibd.com/apps/myaci/…` |
| `/proxy/gscript` | Google Apps Script macro exec URL |

---

## API call flow (must follow this order)

```
1. POST /login          ← ALWAYS first — saves authToken automatically
   ├─ otpRequired=false → use authToken directly on all subsequent calls
   └─ otpRequired=true
       ├─ POST /verify-otp   (with user_id + otp)
       └─ GET  /resend-otp?user_id=…  (if OTP expired)

2. All catalog endpoints (brands, generics, companies, …)
   └─ require: Authorization: Bearer <authToken>
      (auto-injected if token is saved — or click "🔑 Inject Token")

3. ACIBD order system (separate auth, independent of MedEx login)
   POST /acibd/login   ← Step 1 for order flow
   POST /acibd/send-otp
   POST /acibd/add-order
   GET  /acibd/my-customer-product/
```

---

## Endpoint groups

| Icon | Group | Endpoints |
|------|-------|-----------|
| 🔐 | Auth Flow | Login, Verify OTP, Resend OTP |
| 📄 | Static Content | Terms, Privacy Policy |
| 🔍 | Search | Global search |
| 💊 | Brands / Drugs | List, Detail |
| 🧬 | Generics | List, Herbal, Veterinary, Detail, Brands |
| 🏢 | Companies | List, Brands by Company |
| 💉 | Drug Classes | List, Detail, Generics |
| 📦 | Dosage Forms | List, Brands |
| 📋 | Indications | List |
| 💼 | Jobs | List, Detail |
| ❤️ | User Data | Favourites, History, Contact, Add Medicine |
| 🛒 | ACIBD Order System | Login, OTP, Add Order, Products |
| 📊 | Google Apps Script | Webhook (native Android sheet logging) |

---

## Features

- **Auto-save tokens** — login endpoints extract and persist the auth token to `localStorage`.
  MedEx token shows in the header badge; click **✎** to edit manually or **×** to clear.
- **Auto-inject auth** — selecting an auth-required endpoint auto-prepends the saved
  `Authorization: Bearer …` header. Click **🔑 Inject Token** to refresh it manually.
- **Editable everything** — method dropdown, URL bar (replace `{id}` placeholders), headers,
  query params, JSON body — all editable before sending.
- **Format JSON** button on request body.
- **Pretty / Raw** toggle on response with JSON syntax highlighting.
- **Response Headers** tab on the response pane.
- **Sidebar filter** — type to search endpoints by name/method.
- Badges: `1st` (must call first), 🔒 (auth required), `pub` (public), `?` (schema unconfirmed).

---

## Badge legend

| Badge | Meaning |
|-------|---------|
| `1st` | Must call before any other endpoint in this auth system |
| 🔒 | Requires `Authorization: Bearer <authToken>` header |
| `pub` | Fully public, no auth needed |
| `?` | Route fragment from binary only — HTTP verb/body not fully confirmed by live probe |

---

## Notes

- Endpoints marked `?` (unconfirmed) were extracted from `libapp.so` strings. The method, exact
  path, and body schema may differ from what the binary actually sends at runtime.
- ACIBD backend uses plain `http://` — the Vite proxy upgrades this safely for local dev.
- `tokenGet` / `tokenPost` symbols appear in the binary but resolved to 404 in probes —
  they are likely client-side storage helpers, not HTTP routes.
- Firestore / Firebase traffic goes through Google's SDK (not via `medex.com.bd`) — not included.
