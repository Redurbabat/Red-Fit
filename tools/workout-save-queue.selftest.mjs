import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSerializedWorkoutWriter } from '../src/services/workout/serializedWorkoutWriter.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

test('a second write cannot start until the older write completes', async () => {
  const gate = deferred();
  const events = [];
  const enqueue = createSerializedWorkoutWriter(async snapshot => {
    events.push(`start:${snapshot}`);
    if (snapshot === 'first') await gate.promise;
    events.push(`end:${snapshot}`);
  });
  const first = enqueue('first');
  const second = enqueue('second');
  await nextTurn();
  assert.deepEqual(events, ['start:first']);
  gate.resolve();
  await Promise.all([first, second]);
  assert.deepEqual(events, ['start:first', 'end:first', 'start:second', 'end:second']);
});

test('the final completed snapshot cannot be overwritten by an older active one', async () => {
  const gate = deferred();
  const writes = [];
  let stored;
  const enqueue = createSerializedWorkoutWriter(async snapshot => {
    if (snapshot.version === 1) await gate.promise;
    writes.push(snapshot.version);
    stored = snapshot;
  });
  const old = enqueue({ version: 1, status: 'active', sets: 3 });
  const finished = enqueue({ version: 2, status: 'completed', sets: 4 });
  await nextTurn();
  assert.equal(stored, undefined);
  gate.resolve();
  await Promise.all([old, finished]);
  assert.deepEqual(writes, [1, 2]);
  assert.deepEqual(stored, { version: 2, status: 'completed', sets: 4 });
});

test('the final cancelled snapshot also stays last', async () => {
  const writes = [];
  const enqueue = createSerializedWorkoutWriter(async value => { writes.push(value.status); });
  await Promise.all([enqueue({ status: 'active' }), enqueue({ status: 'cancelled' })]);
  assert.deepEqual(writes, ['active', 'cancelled']);
});

test('later saves proceed even when an earlier save fails', async () => {
  const writes = [];
  const enqueue = createSerializedWorkoutWriter(async value => {
    writes.push(value);
    if (value === 'broken') throw new Error('database error');
  });
  const failed = enqueue('broken');
  const fresh = enqueue('fresh');
  await assert.rejects(failed, /database error/);
  await fresh;
  assert.deepEqual(writes, ['broken', 'fresh']);
});

test('each caller waits for its own persist, not just queue registration', async () => {
  const gate = deferred();
  let secondDone = false;
  const enqueue = createSerializedWorkoutWriter(async value => {
    if (value === 1) await gate.promise;
  });
  const first = enqueue(1);
  const second = enqueue(2).then(() => { secondDone = true; });
  await nextTurn();
  assert.equal(secondDone, false);
  gate.resolve();
  await Promise.all([first, second]);
  assert.equal(secondDone, true);
});

test('a new queue does not share state with another workout', async () => {
  const gate = deferred();
  const writes = [];
  const a = createSerializedWorkoutWriter(async value => {
    await gate.promise;
    writes.push(`a:${value}`);
  });
  const b = createSerializedWorkoutWriter(async value => { writes.push(`b:${value}`); });
  const pending = a(1);
  await b(2);
  assert.deepEqual(writes, ['b:2']);
  gate.resolve();
  await pending;
  assert.deepEqual(writes, ['b:2', 'a:1']);
});
