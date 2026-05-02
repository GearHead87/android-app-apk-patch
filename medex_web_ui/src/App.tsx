import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ENDPOINTS, GROUPS } from './endpoints'
import type { EndpointDef, KV, HttpMethod } from './types'
import './App.css'

/* ─────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                 */
/* ─────────────────────────────────────────────────────────────────────── */

let kvId = 0
const mkKV = (key: string, value: string, enabled = true): KV => ({
  id: String(++kvId),
  key,
  value,
  enabled,
})

/** Resolve dot-path into JSON object, e.g. "data.authToken" */
function getPath(obj: unknown, path: string): string | null {
  const val = path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k]
    return null
  }, obj)
  return typeof val === 'string' ? val : null
}

/** Basic JSON syntax highlighter (returns HTML string) */
function hlJson(src: string): string {
  let text = src
  try { text = JSON.stringify(JSON.parse(src), null, 2) } catch { /* not JSON */ }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    /* keys */
    .replace(/"([^"\\]*)"\s*:/g, '<span class="j-key">"$1"</span>:')
    /* string values */
    .replace(/:\s*"([^"\\]*)"/g, (_, v) => `: <span class="j-str">"${v}"</span>`)
    /* booleans */
    .replace(/:\s*(true|false)\b/g, ': <span class="j-bool">$1</span>')
    /* null */
    .replace(/:\s*(null)\b/g, ': <span class="j-null">$1</span>')
    /* numbers */
    .replace(/:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, ': <span class="j-num">$1</span>')
}

const METHOD_CLASS: Record<string, string> = {
  GET: 'method-get', POST: 'method-post', DELETE: 'method-del',
  PUT: 'method-put', PATCH: 'method-patch',
}

function statusClass(code: number) {
  if (code >= 500) return 'st-5xx'
  if (code >= 400) return 'st-4xx'
  if (code >= 300) return 'st-3xx'
  if (code >= 200) return 'st-2xx'
  return ''
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  KV Editor                                                               */
/* ─────────────────────────────────────────────────────────────────────── */

interface KVEditorProps {
  rows: KV[]
  onChange: (rows: KV[]) => void
  keyPlaceholder?: string
  valPlaceholder?: string
  readOnly?: boolean
}

function KVEditor({ rows, onChange, keyPlaceholder = 'Key', valPlaceholder = 'Value', readOnly }: KVEditorProps) {
  const set = (id: string, field: keyof KV, val: string | boolean) =>
    onChange(rows.map(r => r.id === id ? { ...r, [field]: val } : r))
  return (
    <div className="kv-list">
      {rows.map(r => (
        <div key={r.id} className={`kv-row ${!r.enabled ? 'kv-off' : ''} ${readOnly ? 'kv-ro' : ''}`}>
          {!readOnly && (
            <input type="checkbox" checked={r.enabled} onChange={e => set(r.id, 'enabled', e.target.checked)} className="kv-cb" />
          )}
          <input
            className="kv-k"
            value={r.key}
            placeholder={keyPlaceholder}
            onChange={e => set(r.id, 'key', e.target.value)}
            readOnly={readOnly}
          />
          <span className="kv-colon">:</span>
          <input
            className="kv-v"
            value={r.value}
            placeholder={valPlaceholder}
            onChange={e => set(r.id, 'value', e.target.value)}
            readOnly={readOnly}
          />
          {!readOnly && (
            <button className="kv-rm" onClick={() => onChange(rows.filter(x => x.id !== r.id))} title="Remove">×</button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button className="kv-add" onClick={() => onChange([...rows, mkKV('', '')])}>
          + Add row
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Token banner                                                            */
/* ─────────────────────────────────────────────────────────────────────── */

interface TokenBadgeProps {
  label: string
  token: string
  onClear: () => void
  onEdit: (v: string) => void
}

function TokenBadge({ label, token, onClear, onEdit }: TokenBadgeProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(token)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const commit = () => { onEdit(draft.trim()); setEditing(false) }

  return (
    <div className={`tok-badge ${token ? 'tok-on' : 'tok-off'}`}>
      <span className="tok-dot" />
      <span className="tok-label">{label}</span>
      {editing ? (
        <>
          <input
            ref={ref}
            className="tok-edit"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            placeholder="Paste token…"
          />
          <button className="tok-btn" onClick={commit}>✓</button>
          <button className="tok-btn" onClick={() => setEditing(false)}>✕</button>
        </>
      ) : token ? (
        <>
          <span className="tok-preview" title={token}>{token.slice(0, 18)}…</span>
          <button className="tok-btn" onClick={() => { setDraft(token); setEditing(true) }} title="Edit token">✎</button>
          <button className="tok-btn tok-clear" onClick={onClear} title="Clear token">×</button>
        </>
      ) : (
        <button className="tok-btn tok-set" onClick={() => { setDraft(''); setEditing(true) }}>Set manually</button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Main App                                                                */
/* ─────────────────────────────────────────────────────────────────────── */

type ReqTab = 'headers' | 'params' | 'body'
type ResTab = 'body' | 'res-headers'
type ResMode = 'pretty' | 'raw'

interface ResponseState {
  status: number | null
  statusText: string
  time: number | null
  body: string
  headers: Record<string, string>
  loading: boolean
  error: string | null
}

const BLANK_RES: ResponseState = {
  status: null, statusText: '', time: null, body: '', headers: {}, loading: false, error: null,
}

export default function App() {
  /* tokens */
  const [medexToken, setMedexToken] = useState(() => localStorage.getItem('mx_tok') ?? '')
  const [acibdToken, setAcibdToken] = useState(() => localStorage.getItem('ac_tok') ?? '')

  useEffect(() => { localStorage.setItem('mx_tok', medexToken) }, [medexToken])
  useEffect(() => { localStorage.setItem('ac_tok', acibdToken) }, [acibdToken])

  /* sidebar */
  const [activeId, setActiveId] = useState('medex-login')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [sideFilter, setSideFilter] = useState('')

  /* request */
  const [reqMethod, setReqMethod] = useState<HttpMethod>('POST')
  const [reqUrl, setReqUrl] = useState('/proxy/medex/login')
  const [reqHeaders, setReqHeaders] = useState<KV[]>([])
  const [reqParams, setReqParams] = useState<KV[]>([])
  const [reqBody, setReqBody] = useState('')
  const [reqTab, setReqTab] = useState<ReqTab>('body')

  /* response */
  const [res, setRes] = useState<ResponseState>(BLANK_RES)
  const [resTab, setResTab] = useState<ResTab>('body')
  const [resMode, setResMode] = useState<ResMode>('pretty')

  /* misc */
  const [showDesc, setShowDesc] = useState(true)
  const [copied, setCopied] = useState(false)

  const ep = ENDPOINTS.find(e => e.id === activeId) ?? ENDPOINTS[0]

  /* ── load endpoint into request state ── */
  const loadEp = useCallback((def: EndpointDef, currentMedexToken: string) => {
    setActiveId(def.id)
    setReqMethod(def.method)
    setReqUrl(def.proxyPath)
    setReqBody(def.defaultBody)

    /* build headers – auto-inject auth if token exists */
    const hdrs = def.defaultHeaders.map(h => mkKV(h.key, h.value, h.enabled))
    if (def.requiresAuth && def.authSystem === 'medex' && currentMedexToken) {
      const hasAuth = hdrs.some(h => h.key.toLowerCase() === 'authorization')
      if (!hasAuth) hdrs.unshift(mkKV('Authorization', `Bearer ${currentMedexToken}`, true))
    }
    setReqHeaders(hdrs)
    setReqParams(def.defaultParams.map(p => mkKV(p.key, p.value, p.enabled)))

    /* smart tab switch */
    if (def.method !== 'GET' && def.defaultBody) setReqTab('body')
    else if (def.defaultParams.length) setReqTab('params')
    else setReqTab('headers')

    setRes(BLANK_RES)
  }, [])

  /* initial mount */
  useEffect(() => { loadEp(ep, medexToken) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── send request ── */
  async function send() {
    setRes({ ...BLANK_RES, loading: true })
    setResTab('body')

    /* build URL with enabled query params */
    const enabled = reqParams.filter(p => p.enabled && p.key)
    const qs = enabled.length
      ? '?' + enabled.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
      : ''
    const url = reqUrl + qs

    /* build headers */
    const hdrObj: Record<string, string> = {}
    reqHeaders.filter(h => h.enabled && h.key).forEach(h => { hdrObj[h.key] = h.value })

    const opts: RequestInit = { method: reqMethod, headers: hdrObj }
    if (reqMethod !== 'GET' && reqBody.trim()) opts.body = reqBody

    const t0 = Date.now()
    try {
      const r = await fetch(url, opts)
      const elapsed = Date.now() - t0
      const resHdrs: Record<string, string> = {}
      r.headers.forEach((v, k) => { resHdrs[k] = v })
      const body = await r.text()

      setRes({ status: r.status, statusText: r.statusText, time: elapsed, body, headers: resHdrs, loading: false, error: null })

      /* auto-detect display mode */
      const ct = r.headers.get('content-type') ?? ''
      setResMode(ct.includes('html') || (!ct.includes('json') && body.trim().startsWith('<')) ? 'raw' : 'pretty')

      /* auto-save token on login endpoints */
      if (ep.isLoginEndpoint && ep.tokenPath) {
        try {
          const json = JSON.parse(body)
          const token = getPath(json, ep.tokenPath)
          if (token) {
            if (ep.authSystem === 'medex') setMedexToken(token)
            else if (ep.authSystem === 'acibd') setAcibdToken(token)
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      setRes({ status: null, statusText: '', time: Date.now() - t0, body: '', headers: {}, loading: false, error: String(err) })
    }
  }

  /* ── helpers ── */
  function toggleGroup(gid: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(gid) ? n.delete(gid) : n.add(gid); return n })
  }

  function injectToken() {
    const val = `Bearer ${medexToken}`
    const idx = reqHeaders.findIndex(h => h.key.toLowerCase() === 'authorization')
    if (idx >= 0) setReqHeaders(reqHeaders.map((h, i) => i === idx ? { ...h, value: val, enabled: true } : h))
    else setReqHeaders([mkKV('Authorization', val, true), ...reqHeaders])
  }

  function formatBody() {
    try { setReqBody(JSON.stringify(JSON.parse(reqBody), null, 2)) } catch { /* ignore */ }
  }

  function copyResponse() {
    navigator.clipboard.writeText(res.body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { })
  }

  const prettyBody = (() => {
    try { return JSON.stringify(JSON.parse(res.body), null, 2) } catch { return res.body }
  })()

  const isHtmlResponse = (() => {
    try { JSON.parse(res.body); return false } catch { return res.body.trim().startsWith('<') }
  })()

  /* ── sidebar filter ── */
  const filteredGroups = GROUPS.map(g => ({
    ...g,
    endpoints: g.endpoints.filter(e =>
      !sideFilter || e.name.toLowerCase().includes(sideFilter.toLowerCase()) || e.method.includes(sideFilter.toUpperCase())
    ),
  })).filter(g => g.endpoints.length > 0)

  const hdrCount = reqHeaders.filter(h => h.enabled && h.key).length
  const paramCount = reqParams.filter(p => p.enabled && p.key).length

  /* ═══════════════════════════════════════════════════════════════ */
  /*  Render                                                          */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="hdr">
        <div className="hdr-left">
          <span className="hdr-logo">💊</span>
          <span className="hdr-title">MedEx API Explorer</span>
          <span className="hdr-ver">3.3.0</span>
        </div>
        <div className="hdr-right">
          <Link to="/app" style={{ fontSize:'12px', padding:'4px 12px', background:'#6366f115', border:'1px solid #6366f140', borderRadius:'16px', color:'#a5b4fc', textDecoration:'none', whiteSpace:'nowrap' }}>🏠 Web App</Link>
          <TokenBadge
            label="MedEx"
            token={medexToken}
            onClear={() => setMedexToken('')}
            onEdit={setMedexToken}
          />
          <TokenBadge
            label="ACIBD"
            token={acibdToken}
            onClear={() => setAcibdToken('')}
            onEdit={setAcibdToken}
          />
        </div>
      </header>

      <div className="body">
        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sb-search-wrap">
            <input
              className="sb-search"
              placeholder="Filter endpoints…"
              value={sideFilter}
              onChange={e => setSideFilter(e.target.value)}
            />
            {sideFilter && <button className="sb-search-clear" onClick={() => setSideFilter('')}>×</button>}
          </div>

          {filteredGroups.map(g => (
            <div key={g.id} className="sb-group">
              <button className="sb-group-hdr" onClick={() => toggleGroup(g.id)}>
                <span>{g.icon}&nbsp;&nbsp;{g.label}</span>
                <span className={`sb-chevron ${collapsed.has(g.id) ? 'sb-collapsed' : ''}`}>▾</span>
              </button>
              {!collapsed.has(g.id) && (
                <div className="sb-eps">
                  {g.endpoints.map(e => (
                    <button
                      key={e.id}
                      className={`sb-ep ${activeId === e.id ? 'sb-ep-active' : ''}`}
                      onClick={() => loadEp(e, medexToken)}
                    >
                      <span className={`mb ${METHOD_CLASS[e.method]}`}>{e.method}</span>
                      <span className="sb-ep-name">{e.name}</span>
                      {e.badge === 'first' && <span className="fl-badge fl-first">1st</span>}
                      {e.badge === 'unconfirmed' && <span className="fl-badge fl-unc">?</span>}
                      {e.badge === 'auth' && <span className="fl-badge fl-auth">🔒</span>}
                      {e.badge === 'public' && <span className="fl-badge fl-pub">pub</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>

        {/* ── MAIN ── */}
        <main className="main">
          {/* endpoint title bar */}
          <div className="ep-hdr">
            <div className="ep-hdr-row">
              <span className={`mb mb-lg ${METHOD_CLASS[ep.method]}`}>{ep.method}</span>
              <span className="ep-name">{ep.name}</span>
              <span className="ep-group">{ep.groupIcon} {ep.groupLabel}</span>
            </div>
            {ep.flowNote && <div className="flow-note">{ep.flowNote}</div>}
          </div>

          {/* description */}
          <div className="desc-section">
            <button className="desc-toggle" onClick={() => setShowDesc(v => !v)}>
              {showDesc ? '▾' : '▸'} Description
            </button>
            {showDesc && <pre className="desc-text">{ep.description}</pre>}
          </div>

          {/* ── REQUEST ── */}
          <div className="req-section">
            {/* URL bar */}
            <div className="url-bar">
              <select
                className="method-sel"
                value={reqMethod}
                onChange={e => setReqMethod(e.target.value as HttpMethod)}
              >
                {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as HttpMethod[]).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <input
                className="url-inp"
                value={reqUrl}
                onChange={e => setReqUrl(e.target.value)}
                placeholder="/proxy/medex/…"
                spellCheck={false}
              />

              <span className="url-real" title={ep.realUrl}>→ {ep.realUrl}</span>

              <button
                className="send-btn"
                onClick={send}
                disabled={res.loading}
              >
                {res.loading ? '⏳ Sending…' : '▶  Send'}
              </button>
            </div>

            {/* request tabs */}
            <div className="tabs req-tabs">
              <button
                className={`tab ${reqTab === 'headers' ? 'tab-active' : ''}`}
                onClick={() => setReqTab('headers')}
              >
                Headers{hdrCount > 0 && <span className="tab-cnt">{hdrCount}</span>}
              </button>
              <button
                className={`tab ${reqTab === 'params' ? 'tab-active' : ''}`}
                onClick={() => setReqTab('params')}
              >
                Query Params{paramCount > 0 && <span className="tab-cnt">{paramCount}</span>}
              </button>
              <button
                className={`tab ${reqTab === 'body' ? 'tab-active' : ''} ${reqMethod === 'GET' ? 'tab-disabled' : ''}`}
                onClick={() => reqMethod !== 'GET' && setReqTab('body')}
              >
                Body
              </button>

              {/* auth helpers */}
              {ep.requiresAuth && ep.authSystem === 'medex' && medexToken && (
                <button className="inject-btn" onClick={injectToken} title="Inject saved MedEx token into headers">
                  🔑 Inject Token
                </button>
              )}
              {ep.requiresAuth && ep.authSystem === 'medex' && !medexToken && (
                <span className="auth-warn">⚠ Auth required — run Login first</span>
              )}
            </div>

            {/* request tab pane */}
            <div className="tab-pane">
              {reqTab === 'headers' && (
                <KVEditor
                  rows={reqHeaders}
                  onChange={setReqHeaders}
                  keyPlaceholder="Header name"
                  valPlaceholder="Header value"
                />
              )}
              {reqTab === 'params' && (
                <KVEditor
                  rows={reqParams}
                  onChange={setReqParams}
                  keyPlaceholder="Param name"
                  valPlaceholder="Param value"
                />
              )}
              {reqTab === 'body' && (
                <div className="body-wrap">
                  <textarea
                    className="body-ta"
                    value={reqBody}
                    onChange={e => setReqBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    spellCheck={false}
                  />
                  <button className="fmt-btn" onClick={formatBody} title="Format JSON">
                    ⌘ Format JSON
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── RESPONSE ── */}
          <div className="res-section">
            {/* response meta bar */}
            <div className="res-meta">
              <span className="res-title">Response</span>
              {res.status !== null && (
                <span className={`res-status ${statusClass(res.status)}`}>
                  {res.status} {res.statusText}
                </span>
              )}
              {res.time !== null && <span className="res-time">{res.time}ms</span>}
              {res.body && (
                <>
                  <button
                    className={`mode-btn ${resMode === 'pretty' ? 'mode-active' : ''}`}
                    onClick={() => setResMode('pretty')}
                  >
                    Pretty
                  </button>
                  <button
                    className={`mode-btn ${resMode === 'raw' ? 'mode-active' : ''}`}
                    onClick={() => setResMode('raw')}
                  >
                    Raw
                  </button>
                  <button className="copy-btn" onClick={copyResponse}>
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </>
              )}
            </div>

            {/* response tabs */}
            <div className="tabs res-tabs">
              <button
                className={`tab ${resTab === 'body' ? 'tab-active' : ''}`}
                onClick={() => setResTab('body')}
              >
                Body
              </button>
              <button
                className={`tab ${resTab === 'res-headers' ? 'tab-active' : ''}`}
                onClick={() => setResTab('res-headers')}
              >
                Headers
                {Object.keys(res.headers).length > 0 && (
                  <span className="tab-cnt">{Object.keys(res.headers).length}</span>
                )}
              </button>
            </div>

            {/* response pane */}
            <div className="res-body">
              {res.loading && <div className="res-placeholder">⏳ Waiting for response…</div>}

              {res.error && (
                <div className="res-err">
                  <strong>Network / CORS error</strong>
                  <p>{res.error}</p>
                  <p className="res-err-hint">
                    Make sure you're running via <code>pnpm dev</code> (Vite proxy handles CORS).<br />
                    Direct <code>file://</code> open won't work.
                  </p>
                </div>
              )}

              {!res.loading && !res.error && resTab === 'body' && res.body && (
                isHtmlResponse ? (
                  <div>
                    <div className="html-note">
                      ⚠ Response is HTML (in-app WebView). Showing raw markup:
                    </div>
                    <pre className="res-pre res-raw">{res.body}</pre>
                  </div>
                ) : resMode === 'pretty' ? (
                  <pre
                    className="res-pre"
                    dangerouslySetInnerHTML={{ __html: hlJson(prettyBody) }}
                  />
                ) : (
                  <pre className="res-pre res-raw">{res.body}</pre>
                )
              )}

              {!res.loading && !res.error && resTab === 'res-headers' && (
                <KVEditor
                  rows={Object.entries(res.headers).map(([k, v]) => mkKV(k, v, true))}
                  onChange={() => { }}
                  readOnly
                />
              )}

              {!res.loading && !res.error && !res.body && !res.error && (
                <div className="res-placeholder">
                  Send a request to see the response here.
                  {ep.requiresAuth && !medexToken && (
                    <span className="res-ph-hint">
                      {'\n'}⚠ This endpoint requires auth — run <strong>Login / Register</strong> first.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
