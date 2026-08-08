/**
 * E2E-Smoke-Test: die kritischen RED-Fit-Flows in einem echten Chromium.
 *
 *   1. Dev-Server starten:   npm run dev
 *   2. Test laufen lassen:   npm run test:e2e
 *
 * Browser-Auflösung: CHROME_PATH-Umgebungsvariable, sonst installiertes
 * Chrome/Chromium über die üblichen Pfade.
 */
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].filter(Boolean);

async function launch() {
  for (const executablePath of CHROME_CANDIDATES) {
    try {
      return await chromium.launch({ executablePath, headless: true });
    } catch {
      /* nächster Kandidat */
    }
  }
  throw new Error(
    "Kein Chrome/Chromium gefunden. Setze CHROME_PATH auf den Browser-Pfad.",
  );
}

let failures = 0;
function check(label, condition) {
  console.log(`${condition ? "OK  " : "FAIL"} ${label}`);
  if (!condition) failures++;
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 200)));

// ===== Onboarding mit Demo-Daten =====
await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Demo-Daten verwenden" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Muskelaufbau/ }).click();
for (let i = 0; i < 3; i++) {
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.waitForTimeout(250);
}
await page.getByRole("button", { name: /RED Fit starten/ }).click();
await page.waitForTimeout(3000);
check("Onboarding → /today", page.url().endsWith("/today"));

// ===== Workout: Satz loggen, Reload überleben =====
await page.getByRole("button", { name: /Training starten/ }).first().click();
await page.waitForTimeout(2000);
const workoutUrl = page.url();
check("Workout-Route erreicht", /\/training\/workout\//.test(workoutUrl));
await page.getByRole("button", { name: /Satz \d+ fertig/ }).first().click();
await page.waitForTimeout(1000);
check("Rest-Timer sichtbar", /\d{1,2}:\d{2}/.test(await page.textContent("body")));

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
check("Reload: Workout intakt", /Satz/.test(await page.textContent("body")));

await page.goto(`${BASE}/today`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
check("Resume-Banner auf Today", /fortsetzen/i.test(await page.textContent("body")));

// ===== Mahlzeit: 80 g Haferflocken = 296 kcal =====
await page.goto(`${BASE}/nutrition/meals/add`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.locator("input").first().fill("Haferflocken");
await page.waitForTimeout(800);
await page.getByText(/^Haferflocken$/).first().click();
await page.waitForTimeout(600);
await page.locator('input[inputmode="decimal"]').last().fill("80");
await page.waitForTimeout(500);
check("80 g → 296 kcal live", /296/.test(await page.textContent("body")));

check("Keine Page-Errors", pageErrors.length === 0);
if (pageErrors.length > 0) console.log("Errors:", pageErrors.slice(0, 5));

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nAlle Smoke-Checks bestanden.");
