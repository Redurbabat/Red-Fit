import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { createCommandQueue, finiteNumber, safeJSON, PROTOCOL_VERSION } from './protocol.js'
import { allExercises, EXIDX, searchExercises, imgSrc, gifSrc, figureOf } from '../lib/exercises.js'
import { exerciseNameFor, t } from '../lib/i18n.js'
import { musclesOf, MUSCLES, MUSCLE_NAME } from '../lib/muscles.js'
import { sessionVolume, setsDoneActive, setUnitsTotal, defaultConfig, modeOf } from '../lib/history.js'
import { viewEntry, exUnitOf } from '../lib/ex-unit.js'
import { buildSessionEntries } from '../lib/session-start.js'
import { nativeWorkoutAction } from '../lib/native-workout-actions.js'
import { beginWorkout, finishWorkoutNow } from '../sheets.jsx'
import { addWeighIn } from '../lib/weigh-ins.js'
import { localDateKey, makeMealEntry, makePlannedMeal, makeRecipeFood, totalsOf, shoppingListOf, validateBackup } from '../nutrition/model.js'
import * as nutrition from '../nutrition/repository.js'
import { nutritionScope } from '../nutrition/scope.js'
import { loadExtras, changeExtras, extrasPath, validateExtras } from '../nutrition/extras.js'
import { MOBILE } from '../lib/mobile.js'
import { readBackupFile, storeBackupMedia } from '../lib/backup-media.js'
import { clipSources } from '../lib/anim-quality.js'
import { installedBases, getState as packState, readPrefs } from '../lib/anim-packs.js'

const uid = () => crypto.randomUUID()
const state = () => useStore.getState()
const scope = () => nutritionScope({ userId: state().localProfile?.userId ?? state().user?.id,
  server: state().localProfile?.server ?? state().sync?.server, origin: MOBILE ? null : location.origin })
let nutritionData = { foods: [], entries: [], plans: [] }, extras = { water: [], goals: [], shopping: [] }
let currentScope = null, revision = 0, publishTimer, preview = null, nutritionLoaded = false
let refreshPromise = Promise.resolve()
const navigation = path => {
  if (!/^\/(home|plan|workout|stats|library|nutrition|settings|history|measurements|photos|muscles|routine|programmes|modules|integrations)(\/[^?#]*)?$/.test(path))
    throw new Error('Unbekanntes App-Ziel.')
  if (location.hash !== '#' + path) location.hash = path
}
function refreshNutrition() {
  const target = scope()
  if (currentScope !== target) nutritionLoaded = false
  currentScope = target
  const run = async () => {
    const loaded = await nutrition.loadNutrition(target), added = await loadExtras(target)
    if (currentScope === target) { nutritionData = loaded; extras = added; nutritionLoaded = true }
  }
  refreshPromise = refreshPromise.catch(() => {}).then(run)
  return refreshPromise
}
function exerciseRecord(ex) {
  const S = state().S, figure = figureOf(S)
  const clips = clipSources({ ex, figure, choice: readPrefs().choice,
    device: { shortSide: 430 }, installed: installedBases(packState()), builtin: ex.gif ? gifSrc(ex, figure) : null })
  return { id: String(ex.id), name: exerciseNameFor(ex), equipment: t(ex.eq || ''), target: t(ex.tg || ''),
    muscles: musclesOf(ex), image: ex.img ? imgSrc(ex, figure) : null, clips: clips.sources, still: clips.still,
    description: ex.desc || '', custom: !!ex.custom, mode: modeOf({ id: ex.id }) }
}
export function nativeSnapshot() {
  const st = state(), S = st.S, today = localDateKey()
  const describe = entry => ({ ...viewEntry(S, entry), name: EXIDX[entry.id] ? exerciseNameFor(EXIDX[entry.id]) : entry.id,
    unit: exUnitOf(S, entry.id), mode: modeOf({ ...entry.target, id: entry.id }) })
  const active = S.active ? { ...S.active, entries: S.active.entries.map(describe),
    done: setsDoneActive(S.active), total: setUnitsTotal(S.active.entries), volume: sessionVolume(S.active, S) } : null
  const goal = extras.goals?.filter(x => x.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0] || null
  return { v: PROTOCOL_VERSION, revision: ++revision, ready: st.ready && nutritionLoaded, date: today,
    language: S.lang, unit: S.unit, theme: S.theme, restSec: S.restSec, sound: S.sound, effort: S.effort,
    workoutView: S.workoutView, active, timer: useUI.getState().timer,
    routines: (S.routines || []).map(r => ({ ...r, exercises: (r.ex || []).map((e, nativeSlot) => ({ ...e, nativeSlot, name: EXIDX[e.id] ? exerciseNameFor(EXIDX[e.id]) : e.id })) })),
    workouts: (S.workouts || []).slice(-100).reverse().map(w => ({ ...w, volume: sessionVolume(w, S), entries: (w.entries || []).map(describe) })),
    workoutCount: (S.workouts || []).length, bodyweight: S.bodyweight || [], measurements: S.measurements || [],
    muscles: MUSCLES.map(id => ({ id, name: t(MUSCLE_NAME[id]) })),
    nutrition: nutritionData, extras, goal, totals: totalsOf(nutritionData.entries.filter(e => e.date === today)),
    waterToday: (extras.water || []).filter(e => e.date === today).reduce((n, e) => n + e.ml, 0),
    shopping: shoppingListOf(nutritionData.plans.filter(p => p.date >= today)),
    toast: useUI.getState().toastMsg || '', hasOriginalSheet: useUI.getState().sheets.length > 0 }
}
function publish() {
  if (!window.webkit?.messageHandlers?.redFitApp) return
  window.webkit.messageHandlers.redFitApp.postMessage({ v: 1, type: 'state', payload: nativeSnapshot() })
}
const schedulePublish = () => { clearTimeout(publishTimer); publishTimer = setTimeout(publish, 40) }
async function durable() {
  await state().saveNow({ strict: true })
}
async function saveExtraMirror() {
  if (!MOBILE) return
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const path = await extrasPath(scope())
  await Filesystem.writeFile({ path: path + '.next', directory: Directory.Data, data: JSON.stringify(extras), encoding: Encoding.UTF8 })
  await Filesystem.rename({ from: path + '.next', to: path, directory: Directory.Data, toDirectory: Directory.Data })
}
async function saveNutritionMirror() {
  if (!MOBILE) return
  // Keep the original nutrition recovery file format; extras get their own additive mirror.
  const { writeNutritionDocumentBackup } = await import('../nutrition/native-backup.js')
  await writeNutritionDocumentBackup(scope(), await nutrition.exportNutrition(scope()))
  await saveExtraMirror()
}
function requireActive(p) {
  const A = state().S.active
  if (!A || A.id !== p.workoutId) throw new Error('Das Training hat sich geändert. Bitte erneut öffnen.')
  return A
}
export async function executeNativeCommand(action, p) {
  if (!state().ready) throw new Error('Die lokalen Daten werden noch geladen.')
  if (currentScope !== scope()) await refreshNutrition()
  await refreshPromise
  let result = {}
  if (action === 'refresh') { await refreshNutrition() }
  else if (action === 'flush') { await durable(); await saveNutritionMirror() }
  else if (action === 'search') {
    let list = allExercises(state().S)
    if (p.muscle) list = list.filter(ex => musclesOf(ex)[p.muscle])
    list = searchExercises(list, String(p.query || '').slice(0, 200))
    return { items: list.slice(0, 100).map(exerciseRecord), count: list.length }
  } else if (action === 'exercise') {
    const ex = EXIDX[p.id]
    if (!ex) throw new Error('Übung nicht gefunden.')
    return { exercise: exerciseRecord(ex) }
  } else if (action === 'route') { navigation(p.path) }
  else if (action === 'start') {
    if (!state().S.active) beginWorkout(p.routineIds || [], p.bodyweight || null)
    navigation('/workout'); await durable()
  } else if (action === 'finish') {
    requireActive(p); navigation('/workout'); finishWorkoutNow(); await durable()
    useUI.getState().closeAll()
  } else if (action === 'workout') {
    requireActive(p); navigation('/workout')
    if (p.operation === 'addSet' && (!Number.isInteger(p.entry) || !state().S.active.entries[p.entry])) throw new Error('Übung nicht gefunden.')
    if (p.operation === 'toggle' || p.operation === 'patch' || p.operation === 'removeSet') {
      const A = state().S.active, entry = A.entries[p.entry]
      if (!Number.isInteger(p.entry) || !Number.isInteger(p.set) || !entry?.sets?.[p.set]) throw new Error('Satz nicht gefunden.')
      if (p.side != null && !['L', 'R'].includes(p.side)) throw new Error('Ungültige Seite.')
      if (p.operation === 'patch') {
        if (!['w', 'r', 'sec', 'min', 'speed', 'rpe', 'rir'].includes(p.field)) throw new Error('Ungültiges Satzfeld.')
        finiteNumber(p.value, 0, p.field === 'w' ? 2000 : 10000)
      }
    }
    await nativeWorkoutAction(p.workoutId, p.operation, p)
    await durable()
  } else if (action === 'addExercise') {
    const A = requireActive(p), ex = EXIDX[p.id]
    if (!ex) throw new Error('Übung nicht gefunden.')
    const entries = buildSessionEntries(state().S, { id: '', ex: [{ id: ex.id, ...defaultConfig(ex.id) }] })
    state().update(S => { if (S.active?.id === A.id) S.active.entries.push(...entries) })
    await durable()
  } else if (action === 'routine') {
    const name = String(p.name || '').trim().slice(0, 120)
    if (!name) throw new Error('Bitte den Plannamen eingeben.')
    const slots = p.exerciseSlots
    const ids = slots ? slots.map(x => x.id) : p.exerciseIds || []
    if (!Array.isArray(ids) || ids.length > 200 || ids.some(id => !EXIDX[id])) throw new Error('Ungültige Übungsliste.')
    const existing = state().S.routines.find(r => r.id === p.id)
    const remaining = [...(existing?.ex || [])], used = new Set()
    const routine = { ...(existing || {}), id: existing?.id || p.id || uid(), name,
      ex: ids.map((id, i) => {
        if (slots && Number.isInteger(slots[i].sourceIndex) && slots[i].sourceIndex >= 0) {
          const index = slots[i].sourceIndex, cfg = existing?.ex?.[index]
          if (!cfg || cfg.id !== id || used.has(index)) throw new Error('Der Trainingsplan hat sich geändert. Bitte erneut öffnen.')
          used.add(index); return cfg
        }
        const index = slots ? -1 : remaining.findIndex(e => e.id === id)
        return index >= 0 ? remaining.splice(index, 1)[0] : { id, ...defaultConfig(id) }
      }) }
    state().update(S => { const i = S.routines.findIndex(r => r.id === routine.id); if (i < 0) S.routines.push(routine); else S.routines[i] = routine })
    await durable(); result = { id: routine.id }
  } else if (action === 'rest') {
    const ui = useUI.getState()
    if (p.operation === 'stop') ui.stopRest()
    else if (p.operation === 'pause') ui.pauseRest()
    else if (p.operation === 'resume') ui.resumeRest()
    else if (p.operation === 'start') ui.startRest(finiteNumber(p.seconds, 1, 3600))
    else throw new Error('Unbekannte Timeraktion.')
  } else if (action === 'weight') {
    finiteNumber(p.weight, 1, 700)
    state().update(S => { addWeighIn(S, { d: localDateKey(), w: p.weight }) })
    await durable()
  } else if (action === 'settings') {
    const allowed = { theme: ['dark', 'light', 'system'], unit: ['kg', 'lb'], effort: ['none', 'rpe', 'rir'], workoutView: ['cards', 'list', 'compact'], lang: ['de', 'en'] }
    if (p.key === 'restSec') finiteNumber(p.value, 0, 3600)
    else if (p.key === 'sound') { if (typeof p.value !== 'boolean') throw new Error('Ungültige Einstellung.') }
    else if (!allowed[p.key]?.includes(p.value)) throw new Error('Ungültige Einstellung.')
    if (p.key === 'unit') state().setUnit(p.value)
    else state().update(S => { S[p.key] = p.value })
    await durable()
  } else if (action === 'food') { result = { food: await nutrition.saveFood(scope(), p.food) }; await refreshNutrition(); await saveNutritionMirror() }
  else if (action === 'recipe') {
    const food = makeRecipeFood({ ...p, ingredients: p.ingredients.map(i => ({ grams: i.grams, food: nutritionData.foods.find(f => f.id === i.foodId) })) })
    await nutrition.saveFood(scope(), food); await refreshNutrition(); await saveNutritionMirror()
  } else if (action === 'meal' || action === 'planMeal') {
    const food = nutritionData.foods.find(f => f.id === p.foodId)
    const factor = finiteNumber(p.yieldFactor ?? 1, 0.1, 10)
    const grams = finiteNumber(p.grams, 0.01, 100000) / factor
    const make = action === 'meal' ? makeMealEntry : makePlannedMeal
    const entry = make(food, grams, p.mealType, p.date, p.id)
    if (p.cooked || factor !== 1) Object.assign(entry, { weighedAs: 'cooked', weighedAmountG: p.grams, cookingYieldFactor: factor })
    if (action === 'meal') await nutrition.saveMealEntry(scope(), entry)
    else await nutrition.savePlannedMeal(scope(), entry)
    await refreshNutrition(); await saveNutritionMirror()
  } else if (action === 'completePlan') {
    await nutrition.completePlannedMeal(scope(), p.planId, p.entryId); await refreshNutrition(); await saveNutritionMirror()
  } else if (action === 'removeMeal') {
    await nutrition.removeMealEntry(scope(), p.id); await refreshNutrition(); await saveNutritionMirror()
  } else if (['water', 'goals', 'shopping'].includes(action)) {
    extras = await changeExtras(scope(), action, p); await saveExtraMirror()
  } else if (action === 'export') {
    const backup = { format: 'redfit-ios', version: 1, training: state().S,
      nutrition: safeJSON(await nutrition.exportNutrition(scope())), extras: await loadExtras(scope()) }
    result = { text: JSON.stringify(backup, null, 2) }
  } else if (action === 'previewImport') {
    const raw = safeJSON(p.text)
    const training = raw.format === 'redfit-ios' ? raw.training : raw.workouts ? raw : null
    const meals = raw.format === 'redfit-ios' ? raw.nutrition : raw.format === 'redfit-nutrition' ? raw : null
    const extra = raw.format === 'redfit-ios' ? validateExtras(raw.extras) : null
    if (!training && !meals) throw new Error('Keine unterstützte RED-Fit-/openGym-Sicherung.')
    if (meals) validateBackup(meals)
    let checked = null
    if (training) checked = await readBackupFile(new File([JSON.stringify(training)], 'backup.json', { type: 'application/json' }))
    preview = { token: uid(), checked, meals, extra }
    result = { token: preview.token, workouts: training?.workouts?.length || 0, routines: training?.routines?.length || 0, meals: meals?.entries?.length || 0 }
  } else if (action === 'import') {
    if (!preview || preview.token !== p.token) throw new Error('Bitte die Sicherung erneut prüfen.')
    // Keep a durable before-copy, then only merge. Existing active sessions are preserved.
    await durable()
    if (MOBILE) {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
      await Filesystem.writeFile({ path: 'RED Fit/Migration/before-' + preview.token + '.json', directory: Directory.Data,
        data: JSON.stringify({ format: 'redfit-ios', version: 1, training: state().S,
          nutrition: safeJSON(await nutrition.exportNutrition(scope())), extras: await loadExtras(scope()) }),
        encoding: Encoding.UTF8, recursive: true })
    }
    if (preview.checked) {
      await storeBackupMedia(preview.checked.files)
      state().importBackup(preview.checked.state, { mergeWith: { device: true, state: state().S } })
      await durable()
    }
    if (preview.meals) await nutrition.importNutrition(scope(), preview.meals)
    if (preview.extra) extras = await changeExtras(scope(), 'import', preview.extra)
    await refreshNutrition(); await saveNutritionMirror(); preview = null
  } else throw new Error('Diese Aktion wird nicht unterstützt.')
  publish()
  return result
}
export function installNativeBridge() {
  if (!window.__REDFitSwiftUI || !window.webkit?.messageHandlers?.redFitApp) return
  const request = createCommandQueue(async (action, payload) => {
    try { return await executeNativeCommand(action, payload) } finally { publish() }
  })
  window.redFitNative = { v: 1, request }
  useStore.subscribe(() => {
    if (state().ready && currentScope !== scope()) refreshNutrition().then(publish).catch(error => {
      window.webkit.messageHandlers.redFitApp.postMessage({ v: 1, type: 'error', message: error.message })
    })
    schedulePublish()
  })
  let timerKey = ''
  useUI.subscribe(s => {
    const key = JSON.stringify([s.timer?.endsAt, s.timer?.paused, s.timer?.ready, s.sheets.length, s.toastMsg])
    if (key !== timerKey) { timerKey = key; schedulePublish() }
  })
  schedulePublish()
}
