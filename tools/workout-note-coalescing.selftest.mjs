import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoalescedNoteWriter } from '../src/services/workout/coalescedNoteWriter.ts';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('initial unchanged notes do not touch the revision or database', async () => {
  const written = [];
  const save = createCoalescedNoteWriter(async (value) => { written.push(value); }, 'Original');
  await save('Original');
  assert.deepEqual(written, []);
});

test('debounce, blur, and pagehide share the same pending save promise', async () => {
  const gate = deferred();
  const written = [];
  const save = createCoalescedNoteWriter(async (value) => {
    written.push(value);
    await gate.promise;
  }, 'Original');
  const debounce = save('Edited');
  const blur = save('Edited');
  const pagehide = save('Edited');
  assert.strictEqual(debounce, blur);
  assert.strictEqual(blur, pagehide);
  gate.resolve();
  await Promise.all([debounce, blur, pagehide]);
  assert.deepEqual(written, ['Edited']);
});

test('repeated same-text submissions after success are no-ops', async () => {
  const written = [];
  const save = createCoalescedNoteWriter(async (v) => { written.push(v); });
  await save('First');
  await save('First');
  await save('First');
  assert.deepEqual(written, ['First']);
});

test('different submitted notes save in order, not in completion order', async () => {
  const gate = deferred();
  const written = [];
  const save = createCoalescedNoteWriter(async (v) => {
    if (v === 'A') await gate.promise;
    written.push(v);
  });
  const first = save('A');
  const second = save('B');
  gate.resolve();
  await Promise.all([first, second]);
  assert.deepEqual(written, ['A', 'B']);
});

test('A -> B -> A before flushing persists the final A, even if A was committed', async () => {
  const gate = deferred();
  let stored = 'A';
  const written = [];
  const save = createCoalescedNoteWriter(async (v) => {
    if (v === 'B') await gate.promise;
    stored = v;
    written.push(v);
  }, 'A');
  const b = save('B');
  const revert = save('A');
  assert.notStrictEqual(b, revert);
  gate.resolve();
  await Promise.all([b, revert]);
  assert.equal(stored, 'A');
  assert.deepEqual(written, ['B', 'A']);
});

test('Fertig waits for the already pending debounce instead of navigating early', async () => {
  const gate = deferred();
  let saved = false;
  const save = createCoalescedNoteWriter(async () => {
    await gate.promise;
    saved = true;
  });
  const debounce = save('Workout complete');
  let navigated = false;
  const finish = save('Workout complete').then(() => { navigated = true; });
  await Promise.resolve();
  assert.equal(navigated, false);
  gate.resolve();
  await Promise.all([debounce, finish]);
  assert.equal(saved, true);
  assert.equal(navigated, true);
});

test('one failed write rejects all same-note callers and is retryable', async () => {
  let attempts = 0;
  const save = createCoalescedNoteWriter(async () => {
    attempts++;
    if (attempts === 1) throw new Error('offline');
  });
  const p1 = save('Retry');
  const p2 = save('Retry');
  assert.strictEqual(p1, p2);
  await assert.rejects(p1, /offline/);
  await save('Retry');
  assert.equal(attempts, 2);
});

test('failed latest edit permits unchanged original text without stale rejection', async () => {
  let attempts = 0;
  const save = createCoalescedNoteWriter(async () => {
    attempts++;
    throw new Error('offline');
  }, 'Original');
  await assert.rejects(save('New'), /offline/);
  await assert.doesNotReject(save('Original'));
  assert.equal(attempts, 1);
});

test('a failed earlier edit does not poison a newer queued edit', async () => {
  const written = [];
  const save = createCoalescedNoteWriter(async (value) => {
    written.push(value);
    if (value === 'First') throw new Error('first failed');
  });
  const first = save('First');
  const second = save('Second');
  const results = await Promise.allSettled([first, second]);
  assert.deepEqual(results.map((r) => r.status), ['rejected', 'fulfilled']);
  assert.deepEqual(written, ['First', 'Second']);
  await save('Second');
  assert.equal(written.length, 2);
});

test('trimmed equivalents coalesce rather than incrementing revision twice', async () => {
  const written = [];
  const save = createCoalescedNoteWriter(async (v) => { written.push(v); }, '  Notes  ');
  await save('Notes');
  const first = save('Updated');
  const second = save('  Updated \n');
  assert.strictEqual(first, second);
  await first;
  assert.deepEqual(written, ['Updated']);
});

test('two different workouts own independent pending writes and revisions', async () => {
  const results = new Map();
  const a = createCoalescedNoteWriter(async (text) => { results.set('A', text); }, 'A-old');
  const b = createCoalescedNoteWriter(async (text) => { results.set('B', text); }, 'B-old');
  await Promise.all([a('A-new'), b('B-new')]);
  assert.equal(results.get('A'), 'A-new');
  assert.equal(results.get('B'), 'B-new');
});

test('clearing a note after another edit saves an empty string last', async () => {
  const writes = [];
  const save = createCoalescedNoteWriter(async (text) => { writes.push(text); }, 'Before');
  await Promise.all([save('Draft'), save('')]);
  assert.deepEqual(writes, ['Draft', '']);
});
