/** Standalone Cloudflare deployment configuration checks.
 * Run with Node.js 22+: node --test tools/cloudflare-deploy.selftest.mjs
 *
 * Cannot inspect settings stored only in Cloudflare Workers Builds.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const wrangler = JSON.parse(readFileSync(resolve(root, "wrangler.jsonc"), "utf8"));

test("Cloudflare deploy script builds first and then runs Wrangler", () => {
  const deploy = manifest.scripts?.["deploy:cloudflare"];
  assert.equal(deploy, "npm run build && npx wrangler deploy");
  assert.equal(manifest.scripts?.["deploy:workers"],
    "npm run build && npx wrangler deploy --config wrangler.jsonc");
  assert.equal(manifest.scripts?.build, "tsc && vite build");
});

test("Worker static assets target the Vite dist directory", () => {
  assert.equal(wrangler.assets?.directory, "./dist");
  assert.equal(wrangler.assets?.not_found_handling, "single-page-application");
});

test("Cloudflare setup guide explains both dashboard build settings and deploy script", () => {
  const doc = readFileSync(resolve(root, "docs/CLOUDFLARE-DEPLOY.md"), "utf8");
  assert.match(doc, /Build command.*`npm run build`/);
  assert.match(doc, /Deploy command.*`npx wrangler deploy`/);
  assert.match(doc, /npm run deploy:cloudflare/);
  assert.match(doc, /Cloudflare Workers Builds.*nicht.*Wrangler.*build.command/i);
});
