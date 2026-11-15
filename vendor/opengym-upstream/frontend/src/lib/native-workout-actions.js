// One set of live workout actions for React, SwiftUI, timers and the watch.
// A native request is never allowed to act on a different/newer workout.
let binding = null
export function bindNativeWorkoutActions(actions) {
  binding = actions
  return () => { if (binding === actions) binding = null }
}
export async function nativeWorkoutAction(workoutId, action, payload = {}) {
  for (let n = 0; n < 60 && (!binding || binding.workoutId() !== workoutId); n++)
    await new Promise(resolve => setTimeout(resolve, 50))
  if (!binding || binding.workoutId() !== workoutId) throw new Error('Training ist nicht mehr aktiv. Bitte erneut öffnen.')
  if (!['toggle', 'patch', 'addSet', 'removeSet', 'note'].includes(action)) throw new Error('Unbekannte Trainingsaktion.')
  return binding[action](payload)
}
