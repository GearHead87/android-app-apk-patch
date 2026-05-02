import type { EndpointDef } from './types'

/* ── proxy roots (Vite dev-server rewrites these to real hosts) ── */
const MP = '/proxy/medex'   // → https://medex.com.bd/api/beta
const AP = '/proxy/acibd'  // → http://apps.acibd.com/apps/myaci
const GP = '/proxy/gscript' // → Google Apps Script exec URL

/* ── real base URLs (display only) ── */
const MB = 'https://medex.com.bd/api/beta'
const AB = 'http://apps.acibd.com/apps/myaci'
const GS =
  'https://script.google.com/macros/s/AKfycbxsszVblVlSzb_EVjf5MCem1QGx9VT1Kykkxu5x9LKiw7bHls9HACI8EacA1gRvzyao/exec'

const JSON_HDR = [{ key: 'Content-Type', value: 'application/json', enabled: true }]

export const ENDPOINTS: EndpointDef[] = [
  // ═══════════════════════════════════════════════════════════
  //  GROUP 1 — AUTH FLOW  (must call login before anything else)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'medex-login',
    groupId: 'auth',
    groupLabel: 'Auth Flow',
    groupIcon: '🔐',
    name: 'Login / Register',
    method: 'POST',
    proxyPath: `${MP}/login`,
    realUrl: `${MB}/login`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: JSON.stringify({ name: '', mobile_number: '', profession: '1' }, null, 2),
    description:
      'FIRST endpoint to call. Registers or logs in a user.\n' +
      '• name: ≥3 chars\n' +
      '• mobile_number: BD mobile\n' +
      '• profession: numeric string e.g. "1"\n' +
      'Returns data.authToken (auto-saved) + data.otpRequired.\n' +
      'If otpRequired=true → call Verify OTP next.',
    requiresAuth: false,
    authSystem: 'medex',
    isLoginEndpoint: true,
    tokenPath: 'data.authToken',
    flowNote: '⚡ Step 1 — Run this first. authToken is auto-saved on success.',
    badge: 'first',
  },
  {
    id: 'medex-verify-otp',
    groupId: 'auth',
    groupLabel: 'Auth Flow',
    groupIcon: '🔐',
    name: 'Verify OTP',
    method: 'POST',
    proxyPath: `${MP}/verify-otp`,
    realUrl: `${MB}/verify-otp`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: JSON.stringify({ user_id: '', otp: '' }, null, 2),
    description:
      'Only needed when login response returned otpRequired=true.\n' +
      '• user_id: from login response data.userId\n' +
      '• otp: 4–6 digit code sent to mobile',
    requiresAuth: false,
    authSystem: 'medex',
    isLoginEndpoint: false,
    flowNote: '⚡ Step 2 — Only if otpRequired=true from login.',
    badge: 'otp',
  },
  {
    id: 'medex-resend-otp',
    groupId: 'auth',
    groupLabel: 'Auth Flow',
    groupIcon: '🔐',
    name: 'Resend OTP',
    method: 'GET',
    proxyPath: `${MP}/resend-otp`,
    realUrl: `${MB}/resend-otp`,
    defaultHeaders: [],
    defaultParams: [{ key: 'user_id', value: '', enabled: true }],
    defaultBody: '',
    description:
      'Resend OTP to user\'s mobile. Query param user_id = data.userId from login response.',
    requiresAuth: false,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'otp',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 2 — STATIC / PUBLIC (no auth needed)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'terms',
    groupId: 'static',
    groupLabel: 'Static Content',
    groupIcon: '📄',
    name: 'Terms & Conditions',
    method: 'GET',
    proxyPath: `${MP}/info/terms`,
    realUrl: `${MB}/info/terms`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description:
      'Returns an HTML string in data.data (rendered in-app as a WebView). No auth required.',
    requiresAuth: false,
    authSystem: 'none',
    isLoginEndpoint: false,
    badge: 'public',
  },
  {
    id: 'privacy',
    groupId: 'static',
    groupLabel: 'Static Content',
    groupIcon: '📄',
    name: 'Privacy Policy',
    method: 'GET',
    proxyPath: `${MP}/info/privacy-policy`,
    realUrl: `${MB}/info/privacy-policy`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'Returns HTML string in data.data for privacy policy. No auth required.',
    requiresAuth: false,
    authSystem: 'none',
    isLoginEndpoint: false,
    badge: 'public',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 3 — SEARCH
  // ═══════════════════════════════════════════════════════════
  {
    id: 'search',
    groupId: 'search',
    groupLabel: 'Search',
    groupIcon: '🔍',
    name: 'Global Search',
    method: 'GET',
    proxyPath: `${MP}/search`,
    realUrl: `${MB}/search`,
    defaultHeaders: [],
    defaultParams: [
      { key: 'search', value: '', enabled: true },
      { key: 'type', value: '', enabled: false },
    ],
    defaultBody: '',
    description:
      'Search across brands, generics, companies, etc.\n' +
      '• search: query string\n' +
      '• type: optional filter (e.g. brand, generic)',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 4 — BRANDS / DRUGS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'brands-list',
    groupId: 'brands',
    groupLabel: 'Brands / Drugs',
    groupIcon: '💊',
    name: 'List Brands',
    method: 'GET',
    proxyPath: `${MP}/brands`,
    realUrl: `${MB}/brands`,
    defaultHeaders: [],
    defaultParams: [
      { key: 'page', value: '1', enabled: true },
      { key: 'sortBy', value: '', enabled: false },
      { key: 'type', value: '', enabled: false },
    ],
    defaultBody: '',
    description:
      'Paginated brand/drug list.\n' +
      '• page: page number (default 1)\n' +
      '• sortBy: optional sort field\n' +
      '• type=gen: filter generic drugs only',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'brands-detail',
    groupId: 'brands',
    groupLabel: 'Brands / Drugs',
    groupIcon: '💊',
    name: 'Brand Detail',
    method: 'GET',
    proxyPath: `${MP}/brands/{id}`,
    realUrl: `${MB}/brands/{id}`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description:
      'Full detail card for one brand/drug.\n' +
      'Replace {id} in the URL bar with the numeric brand ID\n' +
      '(obtained from brands list — snowflake-style large int).',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 5 — GENERICS (incl. herbal & veterinary)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'generics-list',
    groupId: 'generics',
    groupLabel: 'Generics',
    groupIcon: '🧬',
    name: 'List Generics',
    method: 'GET',
    proxyPath: `${MP}/generics`,
    realUrl: `${MB}/generics`,
    defaultHeaders: [],
    defaultParams: [
      { key: 'page', value: '1', enabled: true },
      { key: 'type', value: '', enabled: false },
    ],
    defaultBody: '',
    description:
      'Paginated generic drugs list.\n' +
      '• type=herbal → herbal generics\n' +
      '• type=veterinary → vet generics\n' +
      '• omit type → standard human generics',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'generics-herbal',
    groupId: 'generics',
    groupLabel: 'Generics',
    groupIcon: '🧬',
    name: 'Herbal Generics',
    method: 'GET',
    proxyPath: `${MP}/generics`,
    realUrl: `${MB}/generics`,
    defaultHeaders: [],
    defaultParams: [
      { key: 'type', value: 'herbal', enabled: true },
      { key: 'page', value: '1', enabled: true },
    ],
    defaultBody: '',
    description: 'Shortcut: generics filtered to type=herbal.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'generics-veterinary',
    groupId: 'generics',
    groupLabel: 'Generics',
    groupIcon: '🧬',
    name: 'Veterinary Generics',
    method: 'GET',
    proxyPath: `${MP}/generics`,
    realUrl: `${MB}/generics`,
    defaultHeaders: [],
    defaultParams: [
      { key: 'type', value: 'veterinary', enabled: true },
      { key: 'page', value: '1', enabled: true },
    ],
    defaultBody: '',
    description: 'Shortcut: generics filtered to type=veterinary.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'generics-detail',
    groupId: 'generics',
    groupLabel: 'Generics',
    groupIcon: '🧬',
    name: 'Generic Detail',
    method: 'GET',
    proxyPath: `${MP}/generics/{id}`,
    realUrl: `${MB}/generics/{id}`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'Full detail for a single generic. Replace {id} in URL bar.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'generics-brands',
    groupId: 'generics',
    groupLabel: 'Generics',
    groupIcon: '🧬',
    name: 'Brands by Generic',
    method: 'GET',
    proxyPath: `${MP}/generics/{id}/brands`,
    realUrl: `${MB}/generics/{id}/brands`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description:
      'All brand products that contain this generic molecule.\n' +
      'Replace {id} with the generic ID.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 6 — COMPANIES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'companies-list',
    groupId: 'companies',
    groupLabel: 'Companies',
    groupIcon: '🏢',
    name: 'List Companies',
    method: 'GET',
    proxyPath: `${MP}/companies`,
    realUrl: `${MB}/companies`,
    defaultHeaders: [],
    defaultParams: [{ key: 'alpha', value: '', enabled: false }],
    defaultBody: '',
    description:
      'All pharmaceutical companies.\n' +
      '• alpha=A–Z: filter companies starting with that letter',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'company-brands',
    groupId: 'companies',
    groupLabel: 'Companies',
    groupIcon: '🏢',
    name: 'Brands by Company',
    method: 'GET',
    proxyPath: `${MP}/companies/{id}/brands`,
    realUrl: `${MB}/companies/{id}/brands`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description:
      'All drug brands manufactured by a specific company.\n' +
      'Replace {id} with the company ID (large snowflake int from companies list).',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 7 — DRUG CLASSES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'drug-classes-list',
    groupId: 'drugclasses',
    groupLabel: 'Drug Classes',
    groupIcon: '💉',
    name: 'List Drug Classes',
    method: 'GET',
    proxyPath: `${MP}/drug-classes`,
    realUrl: `${MB}/drug-classes`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'All therapeutic / pharmacological drug classes.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'drug-classes-detail',
    groupId: 'drugclasses',
    groupLabel: 'Drug Classes',
    groupIcon: '💉',
    name: 'Drug Class Detail',
    method: 'GET',
    proxyPath: `${MP}/drug-classes/{id}`,
    realUrl: `${MB}/drug-classes/{id}`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'Detail for a single drug class. Replace {id}.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'drug-classes-generics',
    groupId: 'drugclasses',
    groupLabel: 'Drug Classes',
    groupIcon: '💉',
    name: 'Generics by Drug Class',
    method: 'GET',
    proxyPath: `${MP}/drug-classes/{id}/generics`,
    realUrl: `${MB}/drug-classes/{id}/generics`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'All generic drugs in a given drug class. Replace {id}.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 8 — DOSAGE FORMS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'dosage-forms-list',
    groupId: 'dosageforms',
    groupLabel: 'Dosage Forms',
    groupIcon: '📦',
    name: 'List Dosage Forms',
    method: 'GET',
    proxyPath: `${MP}/dosage-forms`,
    realUrl: `${MB}/dosage-forms`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'All dosage forms (tablet, capsule, syrup, injection, etc.).',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'dosage-forms-brands',
    groupId: 'dosageforms',
    groupLabel: 'Dosage Forms',
    groupIcon: '📦',
    name: 'Brands by Dosage Form',
    method: 'GET',
    proxyPath: `${MP}/dosage-forms/{id}/brands`,
    realUrl: `${MB}/dosage-forms/{id}/brands`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'All brands available in a specific dosage form. Replace {id}.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 9 — INDICATIONS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'indications-list',
    groupId: 'indications',
    groupLabel: 'Indications',
    groupIcon: '📋',
    name: 'List Indications',
    method: 'GET',
    proxyPath: `${MP}/indications`,
    realUrl: `${MB}/indications`,
    defaultHeaders: [],
    defaultParams: [{ key: 'search', value: '', enabled: false }],
    defaultBody: '',
    description:
      'Medical indications catalog.\n' +
      '• search=<term>: optional text filter',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 10 — JOBS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'jobs-list',
    groupId: 'jobs',
    groupLabel: 'Jobs',
    groupIcon: '💼',
    name: 'List Jobs',
    method: 'GET',
    proxyPath: `${MP}/jobs`,
    realUrl: `${MB}/jobs`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'Available pharmaceutical job postings.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'jobs-detail',
    groupId: 'jobs',
    groupLabel: 'Jobs',
    groupIcon: '💼',
    name: 'Job Detail',
    method: 'GET',
    proxyPath: `${MP}/jobs/{id}`,
    realUrl: `${MB}/jobs/{id}`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'Full detail for a single job posting. Replace {id}.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 11 — USER DATA  (all require MedEx auth)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'favorites-list',
    groupId: 'userdata',
    groupLabel: 'User Data',
    groupIcon: '❤️',
    name: 'List Favourites',
    method: 'GET',
    proxyPath: `${MP}/favorites`,
    realUrl: `${MB}/favorites`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'User\'s saved favourites. Requires valid authToken.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'favorites-add',
    groupId: 'userdata',
    groupLabel: 'User Data',
    groupIcon: '❤️',
    name: 'Add Favourite',
    method: 'POST',
    proxyPath: `${MP}/favorites/add/{id}`,
    realUrl: `${MB}/favorites/add/{id}`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: '',
    description:
      'Add a brand to favourites. Replace {id} with the brand ID.\n' +
      '⚠ Route fragment only from binary — verb/body not fully confirmed by live probe.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'unconfirmed',
  },
  {
    id: 'favorites-remove',
    groupId: 'userdata',
    groupLabel: 'User Data',
    groupIcon: '❤️',
    name: 'Remove Favourite',
    method: 'POST',
    proxyPath: `${MP}/favorites/remove/{id}`,
    realUrl: `${MB}/favorites/remove/{id}`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: '',
    description:
      'Remove a brand from favourites. Replace {id}.\n' +
      '⚠ Route fragment only from binary — verb not fully confirmed.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'unconfirmed',
  },
  {
    id: 'histories-list',
    groupId: 'userdata',
    groupLabel: 'User Data',
    groupIcon: '❤️',
    name: 'View History',
    method: 'GET',
    proxyPath: `${MP}/histories`,
    realUrl: `${MB}/histories`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'User\'s browsing history list.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'histories-remove-all',
    groupId: 'userdata',
    groupLabel: 'User Data',
    groupIcon: '❤️',
    name: 'Clear All History',
    method: 'GET',
    proxyPath: `${MP}/histories/remove/all`,
    realUrl: `${MB}/histories/remove/all`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'Clear the entire browsing history for the authenticated user.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },
  {
    id: 'histories-remove-one',
    groupId: 'userdata',
    groupLabel: 'User Data',
    groupIcon: '❤️',
    name: 'Remove History Item',
    method: 'POST',
    proxyPath: `${MP}/histories/remove/{id}`,
    realUrl: `${MB}/histories/remove/{id}`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: '',
    description:
      'Remove a single history entry. Replace {id}.\n' +
      '⚠ Fragment from binary — verb may differ.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'unconfirmed',
  },
  {
    id: 'contact',
    groupId: 'userdata',
    groupLabel: 'User Data',
    groupIcon: '❤️',
    name: 'Contact Us',
    method: 'POST',
    proxyPath: `${MP}/contact`,
    realUrl: `${MB}/contact`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: JSON.stringify({ name: '', email: '', subject: '', message: '' }, null, 2),
    description:
      'Submit a contact / support message.\n' +
      '⚠ Server returned 500 on test probes — body schema inferred from string extraction.',
    requiresAuth: false,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'unconfirmed',
  },
  {
    id: 'add-medicine-request',
    groupId: 'userdata',
    groupLabel: 'User Data',
    groupIcon: '❤️',
    name: 'Request New Medicine',
    method: 'GET',
    proxyPath: `${MP}/request/add-medicine`,
    realUrl: `${MB}/request/add-medicine`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description: 'Request a new medicine be added to the MedEx catalog.',
    requiresAuth: true,
    authSystem: 'medex',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 12 — ACIBD ORDER SYSTEM (separate auth, plain HTTP)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'acibd-login',
    groupId: 'acibd',
    groupLabel: 'ACIBD Order System',
    groupIcon: '🛒',
    name: 'Order Login',
    method: 'POST',
    proxyPath: `${AP}/login`,
    realUrl: `${AB}/login`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: JSON.stringify(
      { 'Customer Code': '', 'Mobile No': '', OTP: '' },
      null,
      2,
    ),
    description:
      'ACIBD MyACI order-system login. Separate from MedEx auth.\n' +
      'Server validation fields: "Customer Code", "OTP", "Mobile No"\n' +
      '⚠ Plain HTTP (not HTTPS) — proxied safely through Vite dev server.',
    requiresAuth: false,
    authSystem: 'acibd',
    isLoginEndpoint: true,
    tokenPath: 'token',
    flowNote: '⚡ ACIBD Step 1 — Independent of MedEx login.',
    badge: 'first',
  },
  {
    id: 'acibd-send-otp',
    groupId: 'acibd',
    groupLabel: 'ACIBD Order System',
    groupIcon: '🛒',
    name: 'Send OTP',
    method: 'POST',
    proxyPath: `${AP}/send-otp`,
    realUrl: `${AB}/send-otp`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: JSON.stringify({ 'Mobile No': '' }, null, 2),
    description:
      'Request OTP for ACIBD login flow.\n' +
      '⚠ Method inferred — exact body may differ.',
    requiresAuth: false,
    authSystem: 'acibd',
    isLoginEndpoint: false,
    badge: 'otp',
  },
  {
    id: 'acibd-add-order',
    groupId: 'acibd',
    groupLabel: 'ACIBD Order System',
    groupIcon: '🛒',
    name: 'Add Order',
    method: 'POST',
    proxyPath: `${AP}/add-order`,
    realUrl: `${AB}/add-order`,
    defaultHeaders: JSON_HDR,
    defaultParams: [],
    defaultBody: JSON.stringify({}, null, 2),
    description:
      'Submit an order via ACIBD backend.\n' +
      '⚠ Body schema not confirmed — fill in order fields manually.',
    requiresAuth: false,
    authSystem: 'acibd',
    isLoginEndpoint: false,
    badge: 'unconfirmed',
  },
  {
    id: 'acibd-products',
    groupId: 'acibd',
    groupLabel: 'ACIBD Order System',
    groupIcon: '🛒',
    name: 'My Customer Products',
    method: 'GET',
    proxyPath: `${AP}/my-customer-product/`,
    realUrl: `${AB}/my-customer-product/`,
    defaultHeaders: [],
    defaultParams: [],
    defaultBody: '',
    description:
      'Customer\'s product list / order history.\n' +
      '⚠ Session token likely required — add order_token to headers.',
    requiresAuth: false,
    authSystem: 'acibd',
    isLoginEndpoint: false,
    badge: 'auth',
  },

  // ═══════════════════════════════════════════════════════════
  //  GROUP 13 — GOOGLE APPS SCRIPT WEBHOOK
  // ═══════════════════════════════════════════════════════════
  {
    id: 'gscript-webhook',
    groupId: 'gscript',
    groupLabel: 'Google Apps Script',
    groupIcon: '📊',
    name: 'Apps Script Webhook',
    method: 'POST',
    proxyPath: GP,
    realUrl: GS,
    defaultHeaders: [
      { key: 'Content-Type', value: 'application/json; utf-8', enabled: true },
      { key: 'Accept', value: 'application/json', enabled: true },
    ],
    defaultParams: [],
    defaultBody: JSON.stringify({ key: 'value' }, null, 2),
    description:
      'Google Apps Script macro webhook from native MainActivity.\n' +
      'Posts a flat JSON object (null values sent as ""). Called via Flutter channel: com.medex.bd.medex/sheet.\n' +
      'App only checks HTTP 200 — response body is not parsed client-side.\n' +
      '⚠ This is analytics/sheet-logging — body keys depend on Dart-side payload.',
    requiresAuth: false,
    authSystem: 'none',
    isLoginEndpoint: false,
  },
]

/** Grouped sidebar structure */
export const GROUPS = (() => {
  const seen = new Set<string>()
  const order: string[] = []
  for (const ep of ENDPOINTS) {
    if (!seen.has(ep.groupId)) { seen.add(ep.groupId); order.push(ep.groupId) }
  }
  return order.map((gid) => {
    const eps = ENDPOINTS.filter((e) => e.groupId === gid)
    return { id: gid, label: eps[0].groupLabel, icon: eps[0].groupIcon, endpoints: eps }
  })
})()
