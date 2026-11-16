import { installLocalOnlyPolicy } from './local-only.js'

// First dependency of main.jsx. Runs before the store, routes and background work load.
installLocalOnlyPolicy(window)
