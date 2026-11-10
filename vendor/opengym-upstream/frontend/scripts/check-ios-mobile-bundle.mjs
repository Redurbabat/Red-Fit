#!/usr/bin/env node
// Ensure the ORIGINAL openGym iOS shell receives the just-built mobile assets.
// Intentionally do not inspect Android: it is not part of an iOS-only build.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCopy } from './check-mobile-bundle.mjs'

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

export function checkIOSMobileBundle(root) {
  const dist = join(root, 'dist')
  const ios = join(root, 'ios/App/App/public')
  const problems = [...checkCopy(dist), ...checkCopy(ios)]
  if (problems.length) return problems

  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const references = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)]
    .map((match) => match[1])
  const compared = new Set(['index.html', ...references])
  for (const file of compared) {
    const from = join(dist, file)
    const to = join(ios, file)
    if (!existsSync(from) || !existsSync(to)) {
      problems.push('Missing iOS mobile asset: ' + file)
    } else if (digest(from) !== digest(to)) {
      problems.push('Stale/mismatched iOS mobile asset: ' + file)
    }
  }
  return problems
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)))
  const problems = checkIOSMobileBundle(root)
  if (problems.length > 0) {
    for (const problem of problems) console.error('✗ ' + problem)
    process.exitCode = 1
  } else {
    console.log('iOS mobile bundle verified: original openGym dist and native iOS web assets match.')
  }
}
