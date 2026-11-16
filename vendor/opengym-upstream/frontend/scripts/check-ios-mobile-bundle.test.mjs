import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkIOSMobileBundle } from './check-ios-mobile-bundle.mjs'

const html = '<meta name="opengym-flavor" content="mobile"><script src="/assets/index.js"></script><link href="/assets/index.css" rel="stylesheet">'
const makeFixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'redfit-ios-'))
  for (const dir of ['dist', 'ios/App/App/public']) {
    mkdirSync(join(root, dir, 'assets'), { recursive: true })
    for (const [file, value] of [
      ['index.html', html], ['assets/index.js', 'mobile'],
      ['assets/index.css', 'a{}'], ['sw.js', 'build-2026'],
    ]) {
      writeFileSync(join(root, dir, file), value)
    }
  }
  return root
}

function withFixture(check) {
  const root = makeFixture()
  try { check(root) } finally { rmSync(root, { recursive: true, force: true }) }
}

test('accepts a fully synced original iOS mobile bundle', () => withFixture(root => {
  assert.deepEqual(checkIOSMobileBundle(root), [])
}))

test('catches stale JavaScript copied to the iOS shell', () => withFixture(root => {
  writeFileSync(join(root, 'ios/App/App/public/assets/index.js'), 'old')
  assert.match(checkIOSMobileBundle(root).join('\n'), /Stale\/mismatched iOS mobile asset: assets\/index\.js/)
}))

test('catches iOS html that is a web build, not a mobile build', () => withFixture(root => {
  writeFileSync(join(root, 'ios/App/App/public/index.html'), '<html>web only</html>')
  assert.match(checkIOSMobileBundle(root).join('\n'), /not the mobile build/)
}))

test('refuses an absent native iOS web directory', () => withFixture(root => {
  rmSync(join(root, 'ios/App/App/public'), { recursive: true })
  assert.match(checkIOSMobileBundle(root).join('\n'), /no index\.html/)
}))

test('does not require an Android package for an iOS-only build', () => withFixture(root => {
  assert.deepEqual(checkIOSMobileBundle(root), [])
  mkdirSync(join(root, 'android/app/src/main/assets/public'), { recursive: true })
  writeFileSync(join(root, 'android/app/src/main/assets/public/index.html'), 'stale')
  assert.deepEqual(checkIOSMobileBundle(root), [])
}))
