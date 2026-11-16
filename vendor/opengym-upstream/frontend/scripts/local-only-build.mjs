// Applies to web AND mobile builds; no production opt-out through build variables.
export const LOCAL_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' data: blob: opengym-pack:",
  "img-src 'self' data: blob: opengym-pack:",
  "media-src 'self' data: blob: opengym-pack:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "frame-src 'none'", "object-src 'none'", "form-action 'none'", "base-uri 'self'",
].join('; ')

export function localOnlyBuild(env = process.env) {
  return {
    name: 'red-fit-local-only',
    configResolved() {
      if (env.VITE_UMAMI_SRC || env.VITE_UMAMI_ID) throw new Error('RED Fit local-only builds do not permit analytics.')
      for (const key of ['VITE_IMG_BASE', 'VITE_GIF_BASE']) {
        if (env[key] && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(env[key].trim())) {
          throw new Error(`${key}: RED Fit requires bundled exercise media.`)
        }
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: LOCAL_ONLY_CSP }, injectTo: 'head-prepend' },
          { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
          { tag: 'meta', attrs: { name: 'red-fit-data-policy', content: 'local-only' }, injectTo: 'head-prepend' },
        ]
      },
    },
  }
}
