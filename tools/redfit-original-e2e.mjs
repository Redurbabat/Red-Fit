// Smoke-check the actual original-based RED Fit mobile bundle in Chromium.
// Start a VITE_MOBILE=1 preview first. Native UIKit rendering requires Xcode separately.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const base = process.env.E2E_BASE_URL || 'http://localhost:4173'
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']})
const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
const page = await context.newPage(), errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto(base)
  assert.equal(await page.title(),'RED Fit')
  await page.getByRole('heading',{name:'RED Fit',exact:true}).waitFor()
  assert.equal(await page.locator('.redfit-brand-icon').evaluate(img => img.complete && img.naturalWidth > 0),true)
  await page.getByRole('button',{name:'Use on this device',exact:true}).click()
  await page.getByRole('button',{name:/^Today/}).waitFor()
  const skip = page.getByRole('button',{name:'Skip',exact:true})
  await skip.waitFor({timeout:7000})
  await skip.click()
  console.log('PASS first-run onboarding and real Home button')
  for (const width of [320,390,430,1024]) {
    await page.setViewportSize({width,height:844})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,`horizontal overflow at ${width}px`)
    const dock = page.locator('#tabbar')
    assert.equal(await dock.locator('button').count(),5)
    for (const box of await dock.locator('button').evaluateAll(buttons=>buttons.map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})))) {
      assert.ok(box.w>=44 && box.h>=44,`touch target too small at ${width}px`)
    }
  }
  await page.setViewportSize({width:390,height:844})
  for (const [label,route] of [['Plan','/plan'],['Stats','/stats'],['Exercises','/library'],['Home','/home']]) {
    await page.locator('#tabbar').getByRole('button',{name:label,exact:true}).click()
    await page.waitForURL('**/#'+route)
  }
  console.log('PASS dock destinations and 320/390/430/1024px layouts')
  await page.getByRole('button',{name:'Ernährung',exact:true}).click()
  await page.getByRole('heading',{name:'Tagesübersicht'}).waitFor()
  await page.getByLabel('Name',{exact:true}).fill('Test-Haferflocken')
  for (const [name,value] of [['kcal / 100 g','370'],['Protein / 100 g','13'],['Kohlenhydrate / 100 g','60'],['Fett / 100 g','7']]) await page.getByLabel(name,{exact:true}).fill(value)
  await page.getByRole('button',{name:'Lebensmittel speichern',exact:true}).click()
  await page.getByRole('region',{name:'Mahlzeit eintragen'}).getByRole('combobox').first().selectOption({label:'Test-Haferflocken'})
  await page.getByRole('region',{name:'Mahlzeit eintragen'}).getByLabel('Menge (g)',{exact:true}).fill('80')
  await page.getByRole('button',{name:'Mahlzeit speichern',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.nutrition-totals strong')?.textContent.includes('296'))
  await page.reload()
  await page.waitForFunction(()=>document.querySelector('.nutrition-totals strong')?.textContent.includes('296'))
  assert.equal(await page.locator('#tabbar button').first().getAttribute('aria-current'),'page')
  console.log('PASS 80g × 370kcal/100g = 296kcal, persisted after reload, Home selected')
  await context.setOffline(true)
  await page.getByRole('button',{name:'Zur Startseite'}).click()
  await page.locator('#tabbar').getByRole('button',{name:'Start',exact:true}).click()
  await page.waitForURL('**/#/workout')
  await page.getByText('Start workout',{exact:true}).waitFor()
  console.log('PASS offline in-app navigation and original workout picker')
  await context.setOffline(false)
  await page.locator('#tabbar').getByRole('button',{name:'Home',exact:true}).click()
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.screenshot({path:process.env.E2E_SCREENSHOT || '/workspace/scratch/redfit-home-final.png',fullPage:true})
  assert.deepEqual(errors,[])
  console.log('PASS no browser exceptions; reduced-motion screenshot recorded')
} catch (error) {
  console.error(await page.locator('body').innerText())
  throw error
} finally {await browser.close()}
