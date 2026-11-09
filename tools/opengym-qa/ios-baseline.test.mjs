import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { IOS_NATIVE_BASELINE_PATHS, inspectIOSBaseline } from './ios-baseline.mjs'

function fixture(t, config = { appId: 'ch.duartesantos.opengym', appName: 'openGym', webDir: 'dist' }) {
  const frontend = mkdtempSync(join(tmpdir(), 'ios-qa-'))
  t.after(() => rmSync(frontend, { recursive: true, force: true }))
  for (const path of IOS_NATIVE_BASELINE_PATHS) {
    const filename = join(frontend, path)
    if (path.endsWith('.xcworkspace') || path.endsWith('Assets.xcassets') || path.endsWith('OpenGymWidgets') || path.endsWith('AppUITests')) mkdirSync(filename, { recursive: true })
    else { mkdirSync(dirname(filename), { recursive: true }); writeFileSync(filename, 'fixture') }
  }
  writeFileSync(join(frontend, 'capacitor.config.json'), JSON.stringify(config))
  return frontend
}

test('valid original native iOS tree passes with branding warnings, not a fake signing claim', t => {
  const f = fixture(t)
  const result = inspectIOSBaseline(f)
  assert.equal(result.status, 'passed')
  assert.equal(result.checkedNativePaths, IOS_NATIVE_BASELINE_PATHS.length)
  assert.equal(result.errors.length, 0)
  assert.equal(result.warnings.length, 2)
})

test('RED Fit renamed ID and appName are accepted without claiming signing', t => {
  const f = fixture(t, { appId: 'com.redurbabat.redfit', appName: 'RED Fit', webDir: 'dist' })
  const result = inspectIOSBaseline(f)
  assert.equal(result.status, 'passed')
  assert.equal(result.warnings.length, 0)
})

test('missing native health component is a blocking error', async t => {
  const f = fixture(t)
  const { unlinkSync } = await import('node:fs')
  unlinkSync(join(f, 'ios/App/App/AppleHealthPlugin.swift'))
  assert.match(inspectIOSBaseline(f).errors.join(' '), /AppleHealthPlugin/)
})

test('Capacitor config must point to the real dist directory', t => {
  const f = fixture(t, { appId: 'com.redurbabat.redfit', appName: 'RED Fit', webDir: 'www' })
  assert.equal(inspectIOSBaseline(f).status, 'failed')
})

test('invalid JSON and malformed bundle ID are reported, not thrown', t => {
  const f = fixture(t, { appId: 'not an id', appName: 'RED Fit', webDir: 'dist' })
  assert.match(inspectIOSBaseline(f).errors.join(' '), /appId/)
  writeFileSync(join(f, 'capacitor.config.json'), '{bad')
  assert.match(inspectIOSBaseline(f).errors.join(' '), /cannot be parsed/)
})
