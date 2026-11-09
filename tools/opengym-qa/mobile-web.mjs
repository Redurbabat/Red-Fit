import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Checks ONLY the mobile-flavoured Vite output. It does not sync, edit, or claim to
 * validate the original iOS/Android native project (owned by Agent 04).
 */
export function checkMobileWebDist(dir) {
  const failures = []
  const index = join(dir, 'index.html')
  if (!existsSync(index)) return [`${index}: missing mobile index.html`]
  const html = readFileSync(index, 'utf8')
  if (!/<meta\s+name="opengym-flavor"\s+content="mobile"/.test(html)) {
    failures.push('Mobile build marker missing: VITE_MOBILE=1 was not applied')
  }
  const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"?]+\.(?:js|css))(?:\?[^\"]*)?"/g)]
  if (!assets.length) failures.push('No Vite JS/CSS assets referenced by mobile index.html')
  for (const [, asset] of assets) {
    if (!existsSync(join(dir, asset))) failures.push(`Missing mobile asset: ${asset}`)
  }
  const sw = join(dir, 'sw.js')
  if (existsSync(sw) && readFileSync(sw, 'utf8').includes('__BUILD__')) {
    failures.push('Unstamped service worker placeholder in mobile output')
  }
  return failures
}
