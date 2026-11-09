// Run from the original openGym frontend: node scripts/check-red-fit-dock-event-integration.mjs
// Dependency-free execution of the REAL TabBar.jsx useEffect body with DOM event stubs.
// This is not a React render or an iPhone WebKit integration test.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RedFitDockDirectionTracker, RedFitDockGestureAxis, canCompactRedFitDock } from '../src/components/red-fit-dock-direction.js'

const source = readFileSync(new URL('../src/components/TabBar.jsx', import.meta.url), 'utf8')
const opening = '  useEffect(() => {\n'
const closing = '\n  }, [loc.pathname])'
const start = source.indexOf(opening)
assert.ok(start >= 0, 'Cannot find original dock effect')
assert.equal(source.indexOf(opening, start + opening.length), -1, 'Expected one dock effect')
const end = source.indexOf(closing, start + opening.length)
assert.ok(end > start, 'Cannot find effect end')
const effectBody = source.slice(start + opening.length, end)

// Only EventTarget + MediaQueryList behavior is stubbed; the event callbacks are
// compiled from exactly the current production TabBar.jsx effect body.
const emitter = () => {
  const listeners = new Map()
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn) },
    emit(type, event = {}) { for (const fn of [...(listeners.get(type) || [])]) fn(event) },
    count(type) { return listeners.get(type)?.size || 0 },
  }
}
const phone = Object.assign(emitter(), { matches: true })
const reducedMotion = Object.assign(emitter(), { matches: false })
const windowStub = Object.assign(emitter(), {
  scrollY: 80,
  matchMedia(query) { return query.includes('prefers-reduced-motion') ? reducedMotion : phone },
})
const documentStub = emitter()
let compact = false
const changes = []
const setCompact = value => {
  compact = typeof value === 'function' ? value(compact) : value
  changes.push(compact)
}
const makeEffect = new Function('window', 'document', 'setCompact', 'RedFitDockDirectionTracker',
  'RedFitDockGestureAxis', 'canCompactRedFitDock', effectBody)
const cleanup = makeEffect(windowStub, documentStub, setCompact, RedFitDockDirectionTracker,
  RedFitDockGestureAxis, canCompactRedFitDock)
assert.equal(typeof cleanup, 'function', 'Effect must supply its own cleanup')
const normalTarget = { closest: () => null }
const excludedTarget = { closest: () => '#tabbar' }
const touch = (x, y, count = 1, excluded = false) => ({
  touches: Array.from({ length: count }, () => ({ clientX: x, clientY: y })),
  target: excluded ? excludedTarget : normalTarget,
})
const emit = (type, event) => documentStub.emit(type, event)
const scroll = y => { windowStub.scrollY = y; windowStub.emit('scroll') }
let tests = 0
const check = (label, expected) => {
  assert.equal(compact, expected, label)
  tests++
}
const checkListeners = (expected, label) => {
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    assert.equal(documentStub.count(type), expected, label + ' document ' + type)
  }
  assert.equal(windowStub.count('scroll'), expected, label + ' window scroll')
  assert.equal(phone.count('change'), expected, label + ' phone media query')
  assert.equal(reducedMotion.count('change'), expected, label + ' reduced-motion media query')
  tests++
}

checkListeners(1, 'active listeners')
emit('touchstart', touch(20, 400)); emit('touchmove', touch(23, 355)); scroll(110)
check('vertical down compacts', true)
emit('touchmove', touch(23, 395)); scroll(80)
check('same-touch up reversal restores', false)
emit('touchend', {})
emit('touchstart', touch(20, 400)); emit('touchmove', touch(120, 405)); scroll(150)
check('horizontal carousel keeps expanded', false)
emit('touchend', {})
emit('touchstart', touch(20, 400)); emit('touchmove', touch(25, 350)); scroll(180)
check('vertical after horizontal still works', true)
reducedMotion.matches = true; reducedMotion.emit('change')
check('reduce motion expands immediately', false)
emit('touchmove', touch(25, 310)); scroll(220)
check('reduce motion prevents compact', false)
emit('touchend', {})
reducedMotion.matches = false; reducedMotion.emit('change')
emit('touchstart', touch(20, 400)); emit('touchmove', touch(25, 350)); scroll(250)
check('motion reenabled', true)
phone.matches = false; phone.emit('change')
check('landscape/wide expands', false)
phone.matches = true; phone.emit('change')
emit('touchstart', touch(20, 400)); emit('touchmove', touch(25, 350)); scroll(280)
check('portrait/narrow reenabled', true)
emit('touchend', {}); scroll(0)
check('scroll to top expands', false)
emit('touchstart', touch(20, 400, 2)); emit('touchmove', touch(25, 320, 2)); scroll(80)
check('multi-touch ignored', false)
emit('touchend', {})
emit('touchstart', touch(20, 400, 1, true)); emit('touchmove', touch(25, 320)); scroll(150)
check('dock-origin gesture ignored', false)
cleanup()
checkListeners(0, 'after cleanup')
const before = changes.length
emit('touchstart', touch(20, 400)); emit('touchmove', touch(25, 320)); scroll(210)
assert.equal(changes.length, before, 'No DOM updates after unmount')
tests++
console.log('RED Fit dock: ' + tests + ' production-effect DOM event contracts passed')
