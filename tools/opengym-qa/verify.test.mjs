import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verify } from './verify.mjs'

const fixture = (t, name = 'opengym-frontend') => {
  const root = mkdtempSync(join(tmpdir(), 'openGym-qa-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const frontend = join(root, 'vendor', 'opengym-upstream', 'frontend')
  mkdirSync(frontend, { recursive: true })
  writeFileSync(join(frontend, 'package.json'), JSON.stringify({ name, version: '1.4.4', scripts: { test: 'vitest run', build: 'vite build' }, devDependencies: { vite: '^8.3.4', vitest: '^4.1.12' } }))
  writeFileSync(join(frontend, 'package-lock.json'), '{}')
  // A stand-in for the npm executable, not a mock of any app test passing.
  const mock = join(root, 'fake-npm.mjs')
  writeFileSync(mock, `#!/usr/bin/env node\nimport { appendFileSync } from 'node:fs'\nappendFileSync(process.env.QA_CALLS, process.cwd() + '|' + process.argv.slice(2).join(' ') + '\\n')\nif (process.argv[2] === process.env.QA_FAIL) process.exit(17)\nif (process.argv[2] === 'run' && process.argv[3] === process.env.QA_FAIL) process.exit(17)\n`)
  return { root, frontend, mock, calls: join(root, 'calls.txt') }
}

test('runs npm ci, original tests and build in the ORIGINAL frontend; records JSON and logs', async (t) => {
  if (process.platform === 'win32') return t.skip('fixture uses POSIX executable shebang')
  const x = fixture(t)
  const { chmodSync } = await import('node:fs')
  chmodSync(x.mock, 0o755)
  const result = await verify({ repoRoot: x.root, npmBinary: x.mock, env: { ...process.env, QA_CALLS: x.calls } })
  assert.equal(result.status, 'passed')
  assert.deepEqual(result.steps.map(s => s.id), ['install', 'test', 'build'])
  assert.ok(result.steps.every(s => s.status === 'passed'))
  const calls = readFileSync(x.calls, 'utf8').trim().split('\n')
  assert.equal(calls.length, 3)
  assert.ok(calls.every(s => s.startsWith(x.frontend + '|')))
  assert.match(calls[0], /ci --ignore-scripts --no-audit --no-fund/)
  assert.match(calls[1], /run test/)
  assert.match(calls[2], /run build/)
  assert.equal(JSON.parse(readFileSync(join(x.root, 'artifacts', 'opengym-qa', 'report.json'))).status, 'passed')
})

test('records a test failure, then still builds for independent diagnosis', async (t) => {
  if (process.platform === 'win32') return t.skip('fixture uses POSIX executable shebang')
  const x = fixture(t); const { chmodSync } = await import('node:fs'); chmodSync(x.mock, 0o755)
  const report = await verify({ repoRoot: x.root, npmBinary: x.mock, env: { ...process.env, QA_CALLS: x.calls, QA_FAIL: 'test' } })
  assert.equal(report.status, 'failed')
  assert.deepEqual(report.steps.map(s => s.status), ['passed', 'failed', 'passed'])
  assert.equal(report.steps[1].exitCode, 17)
})

test('failed installation stops dependent checks and labels them skipped', async (t) => {
  if (process.platform === 'win32') return t.skip('fixture uses POSIX executable shebang')
  const x = fixture(t); const { chmodSync } = await import('node:fs'); chmodSync(x.mock, 0o755)
  const report = await verify({ repoRoot: x.root, npmBinary: x.mock, env: { ...process.env, QA_CALLS: x.calls, QA_FAIL: 'ci' } })
  assert.equal(report.status, 'failed')
  assert.deepEqual(report.steps.map(s => s.status), ['failed', 'skipped', 'skipped'])
  assert.equal(readFileSync(x.calls, 'utf8').trim().split('\n').length, 1)
})

test('refuses to accidentally verify the legacy RED Fit PWA', async (t) => {
  const x = fixture(t, 'red-fit')
  const report = await verify({ repoRoot: x.root, npmBinary: x.mock })
  assert.equal(report.status, 'failed')
  assert.match(report.preflightError, /non-original/)
  assert.equal(report.steps.length, 0)
})
