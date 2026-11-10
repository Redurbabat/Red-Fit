#!/usr/bin/env node
/**
 * RED Fit dependency-free regression gate (Node.js 22+).
 * Discovers every tools/*.selftest.mjs; no npm ci or network is required.
 * Source-backed tests exercise pure integration logic and fixture snapshots.
 * This does NOT replace TypeScript, Vitest, IndexedDB or native device builds.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--list')) {
  console.error('Usage: node tools/offline-regressions.mjs [--list]');
  process.exit(2);
}
if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('Offline RED Fit tests require Node.js >=22 for TypeScript stripping.');
  process.exit(2);
}
const files = readdirSync(join(root, 'tools'))
  .filter((name) => name.endsWith('.selftest.mjs'))
  .sort()
  .map((name) => join('tools', name));
if (files.length === 0) {
  console.error('No offline selftests found. Refusing to report an empty pass.');
  process.exit(2);
}
if (args[0] === '--list') {
  console.log(`RED Fit: ${files.length} standalone test suites:`);
  for (const file of files) console.log(`  ${file}`);
  process.exit(0);
}
console.log(`RED Fit: running ${files.length} offline regression suites (Node ${process.version}).`);
// Node's test runner marks its worker processes with NODE_TEST_CONTEXT.
// Do not inherit that flag when nesting this launcher in its own selftest.
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
const child = spawnSync(process.execPath,
  ['--experimental-strip-types', '--test', '--test-reporter=tap', '--test-concurrency=4', ...files],
  { cwd: root, stdio: 'inherit', shell: false, env: childEnv },
);
if (child.error) {
  console.error(`Could not execute offline regression tests: ${child.error.message}`);
  process.exit(1);
}
if (child.signal) {
  console.error(`Offline regression runner interrupted (${child.signal}).`);
  process.exit(1);
}
if (child.status !== 0) {
  console.error(`Offline regression tests failed (exit ${child.status ?? 'unknown'}).`);
  process.exit(child.status ?? 1);
}
console.log('Offline checks passed. App and native release checks still required.');
