// Reuse the existing procedural motion definitions, sampled for the native renderer.
import { getPose, getSceneProps, SEGMENTS } from '../../../../src/components/exercise3d/humanoid.ts'
import { writeFileSync } from 'node:fs'
const types = ['push', 'pull', 'squat', 'hinge', 'press', 'curl', 'crunch', 'plank', 'raise', 'lunges']
const movements = Object.fromEntries(types.map(type => [type, { ...getSceneProps(type),
  frames: Array.from({ length: 61 }, (_, i) => getPose(type, i / 60)) }]))
writeFileSync(new URL('../ios/App/App/redfit-poses.json', import.meta.url), JSON.stringify({ version: 1, source: 'src/components/exercise3d/humanoid.ts', segments: SEGMENTS, movements }))
console.log('Native poses: 10 original movement patterns, 61 samples each')
