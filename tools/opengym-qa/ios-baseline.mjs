#!/usr/bin/env node
/** Read-only baseline gate for the original native openGym iOS project. */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const IOS_NATIVE_BASELINE_PATHS = Object.freeze([
  'ios/App/App.xcodeproj/project.pbxproj',
  'ios/App/App.xcworkspace',
  'ios/App/Podfile',
  'ios/App/App/AppDelegate.swift',
  'ios/App/App/Info.plist',
  'ios/App/App/App.entitlements',
  'ios/App/App/PrivacyInfo.xcprivacy',
  'ios/App/App/AppleHealthPlugin.swift',
  'ios/App/App/PhoneWorkoutPlugin.swift',
  'ios/App/App/LiveActivityPlugin.swift',
  'ios/App/App/Assets.xcassets',
  'ios/App/OpenGymWidgets',
  'ios/App/AppUITests',
])

export function inspectIOSBaseline(frontend) {
  const errors = []
  const warnings = []
  for (const path of IOS_NATIVE_BASELINE_PATHS) {
    if (!existsSync(join(frontend, path))) errors.push(`Missing original iOS component: ${path}`)
  }
  const configPath = join(frontend, 'capacitor.config.json')
  if (!existsSync(configPath)) errors.push('Missing original Capacitor config: capacitor.config.json')
  else {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      if (config.webDir !== 'dist') errors.push('Capacitor webDir must match the original frontend dist/')
      if (typeof config.appId !== 'string' || !/^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z0-9-]+)+$/.test(config.appId)) errors.push('Capacitor appId is missing or malformed')
      if (typeof config.appName !== 'string' || !config.appName.trim()) errors.push('Capacitor appName is missing')
      if (config.appId === 'ch.duartesantos.opengym') warnings.push('Original openGym bundle identifier still present; Agent 04 must coordinate private RED Fit signing and data migration')
      if (config.appName === 'openGym') warnings.push('Original openGym display name still present; Agent 04 owns branding changes')
    } catch (err) {
      errors.push(`Capacitor config cannot be parsed: ${err.message}`)
    }
  }
  return { status: errors.length ? 'failed' : 'passed', errors, warnings, checkedNativePaths: IOS_NATIVE_BASELINE_PATHS.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const frontend = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '../../vendor/opengym-upstream/frontend'))
  const result = inspectIOSBaseline(frontend)
  console.log(JSON.stringify(result, null, 2))
  if (result.status !== 'passed') process.exitCode = 1
}
