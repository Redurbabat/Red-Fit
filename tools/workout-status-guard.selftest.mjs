import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPersistWorkoutStatus } from '../src/services/workout/workoutStatusGuard.ts';

test('new workouts may be persisted', () => {
  for (const target of ['planned', 'active', 'completed', 'cancelled']) {
    assert.equal(canPersistWorkoutStatus(undefined, target), true);
  }
});
test('active workouts may be updated and finalized', () => {
  for (const target of ['planned', 'active', 'completed', 'cancelled']) {
    assert.equal(canPersistWorkoutStatus('active', target), true);
  }
});
test('completed workouts cannot be revived by stale active snapshots', () => {
  assert.equal(canPersistWorkoutStatus('completed', 'active'), false);
});
test('cancelled workouts cannot be revived by stale active snapshots', () => {
  assert.equal(canPersistWorkoutStatus('cancelled', 'active'), false);
});
test('terminal states cannot be converted into a different terminal status', () => {
  assert.equal(canPersistWorkoutStatus('completed', 'cancelled'), false);
  assert.equal(canPersistWorkoutStatus('cancelled', 'completed'), false);
});
test('same-status updates remain possible for finalized workouts', () => {
  assert.equal(canPersistWorkoutStatus('completed', 'completed'), true);
  assert.equal(canPersistWorkoutStatus('cancelled', 'cancelled'), true);
});

test('planned workouts can start, but completed ones cannot become planned', () => {
  assert.equal(canPersistWorkoutStatus('planned', 'active'), true);
  assert.equal(canPersistWorkoutStatus('completed', 'planned'), false);
  assert.equal(canPersistWorkoutStatus('cancelled', 'planned'), false);
});
