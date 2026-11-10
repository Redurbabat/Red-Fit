#!/usr/bin/env node
/** Checks the ORIGINAL openGym frontend. Does not build the legacy root RED Fit PWA. */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, createWriteStream } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { finished } from 'node:stream/promises'
import { checkMobileWebDist } from './mobile-web.mjs'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function writeReport(path, report) {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(report, null, 2) + '\n')
  renameSync(tmp, path)
}

async function runCommand(bin, args, cwd, logFile, env) {
  const started = Date.now()
  const log = createWriteStream(logFile, { flags: 'w' })
  const result = await new Promise((done) => {
    let completed = false
    const finish = (code, error) => {
      if (completed) return
      completed = true
      if (error) log.write(`\n[launcher] ${error.message}\n`)
      log.end()
      done({ exitCode: code, error: error?.message ?? null })
    }
    try {
      // npm.cmd requires a shell on Windows. No user-supplied argument is passed to that shell.
      const child = spawn(bin, args, {
        cwd,
        env: { ...env, CI: '1' },
        // Only .cmd/.bat wrappers need a command shell on Windows. Direct Node executables do not.
        shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(bin),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      child.stdout.pipe(log, { end: false })
      child.stderr.pipe(log, { end: false })
      child.once('error', (error) => finish(null, error))
      child.once('close', (code, signal) => finish(code, signal ? new Error(`signal ${signal}`) : null))
    } catch (error) { finish(null, error) }
  })
  await finished(log)
  return { ...result, durationMs: Date.now() - started }
}

/** npmBinary, npmArgsPrefix and env can be injected for dependency-free, cross-platform fixture tests. */
export async function verify({ repoRoot = defaultRoot, npmBinary = process.platform === 'win32' ? 'npm.cmd' : 'npm', npmArgsPrefix = [], skipInstall = false, env = process.env } = {}) {
  const root = resolve(repoRoot)
  const frontend = join(root, 'vendor', 'opengym-upstream', 'frontend')
  const output = join(root, 'artifacts', 'opengym-qa')
  mkdirSync(output, { recursive: true })
  const reportPath = join(output, 'report.json')
  const report = {
    schemaVersion: 1,
    project: 'original-openGym-frontend',
    workingDirectory: relative(root, frontend).replaceAll('\\', '/'),
    startedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    status: 'running',
    dependencies: null,
    steps: []
  }
  const save = () => writeReport(reportPath, report)
  try {
    const manifestPath = join(frontend, 'package.json')
    const lockPath = join(frontend, 'package-lock.json')
    if (!existsSync(manifestPath) || !existsSync(lockPath)) throw new Error('Original frontend manifest or lockfile missing')
    const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (pkg.name !== 'opengym-frontend' || !pkg.scripts?.build || !pkg.scripts?.test) {
      throw new Error('Refusing a non-original or untestable frontend (expected opengym-frontend with test/build)')
    }
    report.dependencies = {
      name: pkg.name, version: pkg.version,
      vite: pkg.devDependencies?.vite ?? null,
      vitest: pkg.devDependencies?.vitest ?? null,
      capacitor: pkg.dependencies?.['@capacitor/core'] ?? null
    }
    save()
    const steps = [
      { id: 'install', args: ['ci', '--ignore-scripts', '--no-audit', '--no-fund'] },
      { id: 'test', args: ['run', 'test'] },
      { id: 'build', args: ['run', 'build'] },
      // Compile the iPhone-flavoured web payload, without cap sync or iOS file writes.
      { id: 'mobile-web-build', args: ['run', 'build'], stepEnv: { VITE_MOBILE: '1' } }
    ]
    let installed = true
    for (const step of steps) {
      const logPath = join(output, `${step.id}.log`)
      const current = { id: step.id, command: `npm ${step.args.join(' ')}`, log: `artifacts/opengym-qa/${step.id}.log` }
      if (step.id === 'install' && skipInstall) {
        report.steps.push({ ...current, status: 'skipped', reason: '--skip-install' }); save(); continue
      }
      if (!installed) {
        report.steps.push({ ...current, status: 'skipped', reason: 'npm ci failed' }); save(); continue
      }
      console.log(`[openGym QA] ${current.command} (${report.workingDirectory})`)
      const result = await runCommand(npmBinary, [...npmArgsPrefix, ...step.args], frontend, logPath, { ...env, ...step.stepEnv })
      const issues = step.id === 'mobile-web-build' && result.exitCode === 0
        ? checkMobileWebDist(join(frontend, 'dist')) : []
      const passed = result.exitCode === 0 && issues.length === 0
      report.steps.push({ ...current, status: passed ? 'passed' : 'failed', exitCode: result.exitCode, durationMs: result.durationMs, ...(step.stepEnv ? { buildMode: 'mobile' } : {}), ...(issues.length ? { validationErrors: issues } : {}), ...(result.error ? { error: result.error } : {}) })
      if (step.id === 'install' && result.exitCode !== 0) installed = false
      save()
    }
    report.status = report.steps.some(s => s.status === 'failed') ? 'failed' : 'passed'
  } catch (error) {
    report.status = 'failed'
    report.preflightError = error.message
  }
  report.finishedAt = new Date().toISOString()
  save()
  console.log(`[openGym QA] ${report.status}; ${reportPath}`)
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flags = process.argv.slice(2)
  if (flags.some(f => f !== '--skip-install')) {
    console.error('Usage: node tools/opengym-qa/verify.mjs [--skip-install]')
    process.exitCode = 2
  } else {
    const result = await verify({ skipInstall: flags.includes('--skip-install') })
    if (result.status !== 'passed') process.exitCode = 1
  }
}
