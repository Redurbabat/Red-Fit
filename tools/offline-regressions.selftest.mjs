import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const runner = join(dirname(fileURLToPath(import.meta.url)), 'offline-regressions.mjs');
function withFixture(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'redfit-offline-gate-'));
  try {
    mkdirSync(join(root, 'tools'));
    copyFileSync(runner, join(root, 'tools', 'offline-regressions.mjs'));
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(root, 'tools', name), content);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const passing = "import { test } from 'node:test';\ntest('ok', () => {});\n";
const failing = "import { test } from 'node:test';\ntest('fails', () => { throw Error('expected RED Fit failure'); });\n";
const run = (root, args = []) => spawnSync(process.execPath,
  [join(root, 'tools', 'offline-regressions.mjs'), ...args],
  { cwd: root, encoding: 'utf8' });

test('lists every selftest deterministically without executing it', () => withFixture({
  'z.selftest.mjs': failing,
  'a.selftest.mjs': passing,
}, (root) => {
  const result = run(root, ['--list']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.indexOf('a.selftest.mjs') < result.stdout.indexOf('z.selftest.mjs'));
  assert.match(result.stdout, /2 standalone test suites/);
  assert.doesNotMatch(result.stdout, /expected RED Fit failure/);
}));

test('runs every passing suite and signals success', () => withFixture({
  'a.selftest.mjs': passing,
  'b.selftest.mjs': passing,
}, (root) => {
  const result = run(root);
  assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  assert.match(result.stdout, /# tests 2/);
  assert.match(result.stdout, /# pass 2/);
  assert.match(result.stdout, /App and native release checks still required/);
}));

test('propagates a test failure as a nonzero exit code', () => withFixture({
  'a.selftest.mjs': passing,
  'z.selftest.mjs': failing,
}, (root) => {
  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /# fail 1/);
  assert.match(result.stderr, /Offline regression tests failed/);
}));

test('does not pass a repository with zero test suites', () => withFixture({}, (root) => {
  const result = run(root);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /No offline selftests found/);
}));

test('rejects unrecognized options before executing tests', () => withFixture({
  'x.selftest.mjs': passing,
}, (root) => {
  const result = run(root, ['--install']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
}));
