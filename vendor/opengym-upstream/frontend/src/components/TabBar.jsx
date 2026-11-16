import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutineIds, effectiveRoutines } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import Elapsed from './Elapsed.jsx'
import { useConnectionTrouble } from './SyncBanner.jsx'
import { retapTab } from '../lib/scroll-top.js'
import './red-fit-dock.css'
import { resolveDockRoute } from './red-fit-dock-route.js'
import { RedFitDockDirectionTracker, RedFitDockGestureAxis, canCompactRedFitDock } from './red-fit-dock-direction.js'

// Module scope, not TabBar's render body. Declared inside it, `Tab` was a new function on every
// render, so React saw a different component type each time and threw the button away and built a
// fresh one — on a bar that is fixed on screen, and once a second for the whole of a rest. The
// state it took with it is the DOM node itself: focus, the :active tint, any in-flight transition.
function Tab({ active, icon, label, onClick, dot, tour }) {
  return (
    <button className={active ? 'on' : ''} onClick={onClick} data-tour={tour} aria-current={active ? 'page' : undefined} aria-label={dot ? label + ', ' + t('Connection problem') : label}>
      <span className="tab-ic"><Icon name={icon} />{dot && <span className="tab-dot" aria-hidden="true" />}</span><span>{label}</span>
    </button>
  )
}

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  // With the connection banner switched off, a sync problem shows as a dot on Home, the tab
  // Settings lives under (#369, #330).
  const trouble = useConnectionTrouble()
  const [compact, setCompact] = useState(false)
  const canShow = !!user || isGuest
  // The native iOS 26 UIKit bar is installed by Agent 04's MainViewController.
  // A channel exists only on supported iPhones. The WKWebView retains the real
  // buttons and React Router; its web bar must not paint over the native bar.
  const nativeChannel = typeof window !== 'undefined' ? window.webkit?.messageHandlers?.redFitDock : null
  const [nativeReady, setNativeReady] = useState(() => typeof window !== 'undefined' && window.__REDFitNativeDockReady === true)
  const nativeDock = !!nativeChannel && nativeReady

  useEffect(() => {
    if (!nativeChannel) return
    const ready = () => setNativeReady(window.__REDFitNativeDockReady === true)
    window.addEventListener('redfit:native-dock-ready', ready)
    nativeChannel.postMessage({ type: 'hello' })
    return () => window.removeEventListener('redfit:native-dock-ready', ready)
  }, [nativeChannel])

  // RED-Bit uses a native iOS 26 TabView. This WebView keeps its real RED Fit
  // buttons, but adapts the same 13px touch-direction hysteresis on compact phones.
  useEffect(() => {
    setCompact(false)
    if (typeof window === 'undefined' || !window.matchMedia || nativeDock) return
    const phoneQuery = window.matchMedia('(max-width: 767px) and (pointer: coarse)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const tracker = new RedFitDockDirectionTracker()
    const gesture = new RedFitDockGestureAxis()
    const isEnabled = () => canCompactRedFitDock(phoneQuery, reducedMotionQuery)
    const onPolicyChange = () => {
      if (!isEnabled()) { tracker.end(); gesture.end(); setCompact(false) }
    }
    const onTouchStart = event => {
      if (!isEnabled() || event.touches?.length !== 1 || event.target?.closest?.('#tabbar, input, textarea, select, [role="dialog"]')) {
        tracker.end()
        gesture.end()
        return
      }
      const touch = event.touches[0]
      gesture.begin(touch.clientX, touch.clientY)
      tracker.begin(window.scrollY)
    }
    // Do not react to a horizontal week strip, carousel or chip rail.
    // Keep the browser's native touch gesture entirely unmodified.
    const onTouchMove = event => {
      if (!tracker.active) return
      if (event.touches?.length !== 1) { tracker.end(); gesture.end(); return }
      const touch = event.touches[0]
      if (gesture.sample(touch.clientX, touch.clientY) === 'horizontal') tracker.end()
    }
    const onTouchEnd = () => { tracker.end(); gesture.end() }
    const onScroll = () => {
      if (!isEnabled()) return
      if (window.scrollY < 20) { setCompact(false); return }
      if (gesture.direction !== 'vertical') return
      const direction = tracker.sample(window.scrollY)
      if (direction) setCompact(direction === 'down')
    }
    phoneQuery.addEventListener?.('change', onPolicyChange)
    reducedMotionQuery.addEventListener?.('change', onPolicyChange)
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      phoneQuery.removeEventListener?.('change', onPolicyChange)
      reducedMotionQuery.removeEventListener?.('change', onPolicyChange)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('scroll', onScroll)
    }
  }, [loc.pathname, nativeDock])

  // Preserve original parent-tab semantics, including Muscles opened from Stats.
  // Four tabs share a moving selection; Start keeps its original raised disc.
  const { cur, parent, activeIndex } = resolveDockRoute(loc.pathname, loc.state)
  const on = k => cur === k || parent === k

  // Root tabs are peers, not another level to unwind with Android Back. The tab you are already
  // on takes you to the top of its page instead (lib/scroll-top.js).
  const switchTab = path => {
    if (loc.pathname !== path || loc.search) nav(path, { replace: true })
    else retapTab(path)
  }

  const running = !!S.active && cur !== 'workout' && !S.active.editingWorkoutId && !S.active.backfill && S.active.start > 0
  const startLabel = S.active ? (cur === 'workout' ? t('Workout') : S.active.editingWorkoutId ? t('Edit workout') : t('Resume')) : t('Start')
  const startWorkout = () => {
    if (!S.active) {
      // A weekday can hold several routines; start the combined session if any of them has
      // exercises, otherwise fall through to the picker.
      if (effectiveRoutines(S, todayISO()).some(r => r.ex.length)) { onStart(effectiveRoutineIds(S, todayISO())); return }
    }
    nav('/workout')
  }


  // Agent 04's native UIKit bar sends tab intentions to the original React
  // router. This mirrors the already implemented iOS message protocol, not a
  // second navigation state machine or a replacement for the RED Fit WKWebView.
  useEffect(() => {
    if (!nativeDock) return
    const onNativeTap = event => {
      const tab = event.detail?.tab
      if (tab === 'start') startWorkout()
      else if (tab === 'home') switchTab('/home')
      else if (tab === 'plan') switchTab('/plan')
      else if (tab === 'stats') switchTab('/stats')
      else if (tab === 'library') switchTab('/library')
    }
    window.addEventListener('redfit:native-dock', onNativeTap)
    return () => window.removeEventListener('redfit:native-dock', onNativeTap)
  })

  useEffect(() => {
    if (!nativeDock) return
    const bridge = window.webkit.messageHandlers.redFitDock
    document.documentElement.dataset.redfitNativeDock = 'true'
    return () => {
      bridge.postMessage({ visible: false })
      delete document.documentElement.dataset.redfitNativeDock
    }
  }, [nativeDock])

  useEffect(() => {
    if (!nativeDock) return
    const bridge = window.webkit.messageHandlers.redFitDock
    const selected = cur === 'workout' ? 'start'
      : activeIndex === 0 ? 'home' : activeIndex === 1 ? 'plan'
        : activeIndex === 3 ? 'stats' : activeIndex === 4 ? 'library' : 'home'
    let lastVisible
    const send = () => {
      // UIKit must be behind web modal sheets and the on-screen keyboard.
      // Modal portals may be inserted after the first render.
      const modal = !!document.querySelector('#modal-root .mback, #modal-root .sheet, #modal-root [role="dialog"], [role="dialog"][aria-modal="true"]')
      const typing = document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]')
      const visible = canShow && !modal && !typing
      if (visible === lastVisible) return
      lastVisible = visible
      bridge.postMessage({
        visible, selected, running: !!S.active, startLabel,
        labels: { home: t('Home'), plan: t('Plan'), stats: t('Stats'), library: t('Exercises') },
        connectionTrouble: !!trouble,
      })
    }
    send()
    const observer = new MutationObserver(send)
    observer.observe(document.body, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'role'],
    })
    const onFocusOut = () => queueMicrotask(send)
    document.addEventListener('focusin', send, true)
    document.addEventListener('focusout', onFocusOut, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', send, true)
      document.removeEventListener('focusout', onFocusOut, true)
    }
  }, [nativeDock, canShow, cur, parent, activeIndex, S.active, startLabel, trouble])

  // Every React hook above must run even before login; only the markup is gated.
  if (!canShow) return null
  return (
    <nav id="tabbar" className="redfit-morph-dock" aria-label={t('Navigation')} aria-hidden={nativeDock ? true : undefined}
      data-redfit-selection={activeIndex === -1 ? 'hidden' : 'visible'}
      data-redfit-compact={compact ? 'true' : 'false'}
      style={{ '--rf-dock-index': Math.max(0, activeIndex) }}>
      <Tab active={on('home')} icon="house" label={t('Home')} dot={trouble} onClick={() => switchTab('/home')} tour="tab-home" />
      <Tab active={on('plan')} icon="calendar" label={t('Plan')} onClick={() => switchTab('/plan')} tour="tab-plan" />
      {/* On the workout screen itself there is nothing to resume, so the button reads as the
          tab it is and stays lit (#29); anywhere else it brings you back to the exercise you
          were on — the marker is kept in S.active.cur and never moves on its own (#21). The
          glyph is always play: start and resume are one concept, and an exercise is a dumbbell.
          A live session you stepped away from shows its running time instead of a word, the
          button still named Resume; a past workout being edited or logged after the fact has no
          clock to run. */}
      <button data-tour="start" className={'start' + (S.active ? ' rec' : '') + (S.active && cur === 'workout' ? ' on' : '')} onClick={startWorkout}
        aria-label={startLabel} aria-current={cur === 'workout' ? 'page' : undefined}>
        <span className="cir"><Icon name="play" /></span>
        {running ? <span className="tab-time"><Elapsed start={S.active.start} /></span>
          : <span>{startLabel}</span>}
      </button>
      <Tab active={on('stats')} icon="chart" label={t('Stats')} onClick={() => switchTab('/stats')} tour="tab-stats" />
      <Tab active={on('library')} icon="dumbbell" label={t('Exercises')} onClick={() => switchTab('/library')} tour="tab-library" />
    </nav>
  )
}
