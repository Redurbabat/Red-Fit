import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialDockScrollState,
  updateDockScrollState,
  isDockTabActive,
} from '../src/components/layout/dockBehavior.ts';

test('starts expanded even after route changes at nonzero scroll offset', () => {
  assert.deepEqual(initialDockScrollState(450), {lastY:450,travel:0,compact:false});
});

test('touch sized small scroll events eventually compact the dock', () => {
  let s = initialDockScrollState(0);
  for (let y = 5; y <= 160; y += 5) s = updateDockScrollState(s, y);
  assert.equal(s.compact, true);
});

test('small jitters do not expand a compact dock', () => {
  let s = {lastY:300,travel:0,compact:true};
  s = updateDockScrollState(s, 292);
  assert.equal(s.compact, true);
  s = updateDockScrollState(s, 296);
  assert.equal(s.compact, true);
});

test('scrolling up expands again after accumulated upward travel', () => {
  let s = {lastY:300,travel:0,compact:true};
  for (let y=295;y>=275;y-=5) s=updateDockScrollState(s,y);
  assert.equal(s.compact,false);
});

test('returning near top forces expanded dock and handles overscroll', () => {
  const before = {lastY:500,travel:0,compact:true};
  assert.equal(updateDockScrollState(before,55).compact,false);
  assert.equal(updateDockScrollState(before,-30).lastY,0);
});

test('training, nutrition, and body child screens keep their selected tab', () => {
  assert.equal(isDockTabActive('/training/plans/12','/training'),true);
  assert.equal(isDockTabActive('/nutrition/meals/add','/nutrition'),true);
  assert.equal(isDockTabActive('/body/photos','/body'),true);
});

test('legacy progress routes select body and no unrelated tabs', () => {
  assert.equal(isDockTabActive('/progress','/body'),true);
  assert.equal(isDockTabActive('/progress/body','/body'),true);
  assert.equal(isDockTabActive('/training','/today'),false);
  assert.equal(isDockTabActive('/bodybuilder','/body'),false);
});
