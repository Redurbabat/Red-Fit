// RED Fit's production entry point enables this policy before loading the app.
// One way only: saved settings, imports and environment variables cannot turn it off.
// Keeping activation at the entry point lets the original transport unit tests run in isolation.
let active = false
export const isLocalOnly = () => active
export function requireLocalOnly() { active = true }

export const LOCAL_ONLY_MESSAGE = 'RED Fit arbeitet lokal. Verbindungen zu Servern und externen Diensten sind deaktiviert.'
export const localOnlyError = () => Object.assign(new Error(LOCAL_ONLY_MESSAGE), { code: 'local-only', status: 0 })
export function requireNetworkFeature() { if (active) throw localOnlyError() }

// Only read packaged/same-origin resources. An API at the same origin is still a server,
// and redirects must never turn a local asset request into an external request.
export function localResourceAllowed(input, init = {}, base = globalThis.location?.href) {
  try {
    const method = String(init.method || input?.method || 'GET').toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') return false
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, base)
    if (url.username || url.password) return false
    if (url.protocol === 'data:' || url.protocol === 'opengym-pack:') return true
    const page = new URL(base)
    if (url.protocol === 'blob:') return url.origin === page.origin
    if (url.protocol !== page.protocol || url.host !== page.host) return false
    const path = decodeURIComponent(url.pathname).replace(/\\/g, '/')
    return !/(^|\/)api(?:\/|$)/i.test(path)
  } catch { return false }
}

export function assertLocalResource(input, init) {
  if (active && !localResourceAllowed(input, init)) throw localOnlyError()
}

export function installLocalOnlyPolicy(win = globalThis) {
  requireLocalOnly()
  const originalFetch = win.fetch?.bind(win)
  if (originalFetch) win.fetch = async (input, init = {}) => {
    if (!localResourceAllowed(input, init, win.location?.href || globalThis.location?.href)) throw localOnlyError()
    return originalFetch(input, { ...init, redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer' })
  }
  const xhr = win.XMLHttpRequest?.prototype
  if (xhr?.open) {
    const open = xhr.open
    xhr.open = function (method, url, ...rest) {
      if (!localResourceAllowed(url, { method }, win.location?.href || globalThis.location?.href)) throw localOnlyError()
      return open.call(this, method, url, ...rest)
    }
  }
  if (win.navigator?.sendBeacon) win.navigator.sendBeacon = () => false
  for (const key of ['WebSocket', 'EventSource']) {
    if (win[key]) win[key] = class { constructor() { throw localOnlyError() } }
  }
  // An external link can carry routine/health data in its query or fragment.
  // Exports continue through the explicit OS share/file flow, not a provider URL.
  const open = win.open?.bind(win)
  if (open) win.open = (url, ...rest) => localResourceAllowed(url) ? open(url, ...rest) : null
  win.document?.addEventListener('click', event => {
    const link = event.target?.closest?.('a[href]')
    if (link && !localResourceAllowed(link.href)) { event.preventDefault(); event.stopImmediatePropagation() }
  }, true)
}
