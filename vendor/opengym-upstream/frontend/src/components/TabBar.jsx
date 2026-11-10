import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutineIds, effectiveRoutines } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import Elapsed from './Elapsed.jsx'
import { useConnectionTrouble } from './SyncBanner.jsx'
import { retapTab } from '../lib/scroll-top.js'

// Module scope, not TabBar's render body. Declared inside it, `Tab` was a new function on every
// render, so React saw a different component type each time and threw the button away and built a
// fresh one — on a bar that is fixed on screen, and once a second for the whole of a rest. The
// state it took with it is the DOM node itself: focus, the :active tint, any in-flight transition.
function Tab({ active, icon, label, onClick, dot, tour }) {
  return (
    <button className={active ? 'on' : ''} onClick={onClick} data-tour={tour} aria-label={dot ? label + ', ' + t('Connection problem') : undefined}>
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
  const canShow = !!user || isGuest
  const nativeDock = typeof window !== 'undefined' && !!window.webkit?.messageHandlers?.redFitDock
  const cur = loc.pathname.split('/')[1] || 'home'
  // A screen without a tab of its own lights the tab it is opened from (Muscles from both).
  const PARENT = { history: 'stats', 'structural-balance': 'stats', 'progress-photos': 'stats', measurements: 'stats', settings: 'home', checkin: 'home', muscles: 'library' }
  const parent = cur === 'muscles' && loc.state?.from === '/stats' ? 'stats' : PARENT[cur]
  const on = k => cur === k || parent === k

  // Root tabs are peers, not another level to unwind with Android Back. The tab you are already
  // on takes you to the top of its page instead (lib/scroll-top.js).
  const switchTab = path => {
    if (loc.pathname !== path || loc.search) nav(path, { replace: true })
    else retapTab(path)
  }

  const running = !!S.active && cur !== 'workout' && !S.active.editingWorkoutId && !S.active.backfill && S.active.start > 0
  const startWorkout = () => {
    if (!S.active) {
      // A weekday can hold several routines; start the combined session if any of them has
      // exercises, otherwise fall through to the picker.
      if (effectiveRoutines(S, todayISO()).some(r => r.ex.length)) { onStart(effectiveRoutineIds(S, todayISO())); return }
    }
    nav('/workout')
  }

  // RED Fit on iOS 26 uses Apple's original UIKit UITabBar in
  // MainViewController.swift, not an HTML/SwiftUI imitation.
  // React Router remains the sole navigation and workout state owner.
  // Keep the original single WKWebView and all saved workout data.
  // This event is sent only by the native dock; desktop/Android keep this bar.
  useEffect(() => {
    if (!nativeDock) return
    const onNativeTap = (event) => {
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
    // The native dock is installed only on supported iPhones. Never suppress
    // the original HTML bar unless the native message channel exists.
    document.documentElement.dataset.redfitNativeDock = 'true'
    return () => {
      bridge.postMessage({ visible: false })
      delete document.documentElement.dataset.redfitNativeDock
    }
  }, [nativeDock])

  useEffect(() => {
    if (!nativeDock) return
    const bridge = window.webkit.messageHandlers.redFitDock
    const selected = on('home') ? 'home' : on('plan') ? 'plan' : on('stats') ? 'stats'
      : on('library') ? 'library' : cur === 'workout' ? 'start' : 'home'
    const startLabel = S.active
      ? (cur === 'workout' ? t('Workout') : S.active.editingWorkoutId ? t('Edit workout') : t('Resume'))
      : t('Start')
    let lastVisible
    const send = () => {
      // Modals.jsx creates #modal-root only when a sheet opens; observing an
      // initially missing portal would leave native buttons over Save/Close.
      const modal = !!document.querySelector('#modal-root .mback, #modal-root .sheet, #modal-root [role="dialog"]')
      // RED-Bit's native bar stays clear of the iPhone keyboard.
      const typing = document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]')
      const visible = canShow && !modal && !typing
      // Body observation sees new portals and their removal. Deduplicate
      // updates: scrolling exercise lists can change many DOM nodes.
      if (visible === lastVisible) return
      lastVisible = visible
      bridge.postMessage({ visible, selected, running: !!S.active, startLabel })
    }
    send()
    const observer = new MutationObserver(send)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'role'] })
    const onFocusOut = () => queueMicrotask(send) // activeElement changes after blur dispatch
    document.addEventListener('focusin', send, true)
    document.addEventListener('focusout', onFocusOut, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', send, true)
      document.removeEventListener('focusout', onFocusOut, true)
    }
  }, [nativeDock, canShow, cur, parent, S.active])

  if (!canShow) return null
  return (
    <nav id="tabbar">
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
        aria-label={running ? t('Resume') : undefined}>
        <span className="cir"><Icon name="play" /></span>
        {running ? <span className="tab-time"><Elapsed start={S.active.start} /></span>
          : <span>{S.active ? (cur === 'workout' ? t('Workout') : S.active.editingWorkoutId ? t('Edit workout') : t('Resume')) : t('Start')}</span>}
      </button>
      <Tab active={on('stats')} icon="chart" label={t('Stats')} onClick={() => switchTab('/stats')} tour="tab-stats" />
      <Tab active={on('library')} icon="dumbbell" label={t('Exercises')} onClick={() => switchTab('/library')} tour="tab-library" />
    </nav>
  )
}
