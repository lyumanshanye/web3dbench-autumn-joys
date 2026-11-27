import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.TEST_URL || "http://localhost:4173/";
const executablePath = process.env.CHROMIUM_PATH || "/opt/web3dbench/browsers/chromium-1252/chrome-linux64/chrome";

test("browser UI and stormLab timeline", async (t) => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader"],
  });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const consoleErrors = [];
  const requests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  const initial = await page.evaluate(() => window.stormLab.getState());
  assert.equal(initial.seed, 0);
  assert.equal(initial.phase, "idle");
  assert.equal(initial.mainPoints.length, 0);
  assert.equal(await page.locator("#scene").getAttribute("width"), "800");
  assert.equal(await page.locator("#scene").getAttribute("height"), "600");

  await page.locator("#seed-input").fill("not-a-seed");
  await page.locator("#generate-button").click();
  assert.equal(await page.locator("#seed-message").textContent(), "Invalid seed");
  assert.deepEqual(await page.evaluate(() => window.stormLab.getState()), initial);

  await page.locator("#seed-input").fill("42");
  await page.locator("#generate-button").click();
  assert.equal(await page.locator("#seed-message").textContent(), "Generated seed 42");
  const generated = await page.evaluate(() => window.stormLab.getState());
  assert.equal(generated.seed, 42);
  assert.equal(generated.mainPoints.length, 17);
  assert.equal(generated.segmentCount, 20);
  assert.equal(generated.phase, "idle");

  await page.locator("#seed-input").fill("42");
  await page.locator("#strike-button").click();
  let state = await page.evaluate(() => window.stormLab.getState());
  assert.equal(state.phase, "drawing");
  assert.equal(state.time, 0);
  assert.equal(state.opacity, 1);
  assert.equal(state.drawRangeCount, 0);
  assert.equal(state.crackleCount, 0);

  await page.locator("#step-button").click();
  await page.waitForTimeout(250);
  state = await page.evaluate(() => window.stormLab.getState());
  assert.equal(state.time, 200);
  assert.equal(state.drawRangeCount, 20);
  assert.equal(state.crackleCount, 0);

  await page.locator("#step-button").click();
  await page.waitForTimeout(250);
  state = await page.evaluate(() => window.stormLab.getState());
  assert.equal(state.time, 400);
  assert.equal(state.drawRangeCount, 40);
  assert.equal(state.crackleCount, 12);

  await page.locator("#step-button").click();
  await page.waitForTimeout(250);
  state = await page.evaluate(() => window.stormLab.getState());
  assert.equal(state.time, 600);
  assert.ok(Math.abs(state.impactScale - 8) < 1e-9);

  await page.locator("#step-button").click();
  await page.waitForTimeout(250);
  state = await page.evaluate(() => window.stormLab.getState());
  assert.equal(state.time, 800, `state ${JSON.stringify(state)}`);
  assert.equal(state.opacity, 0.5, `state ${JSON.stringify(state)}`);
  assert.equal(state.phase, "fading");

  const clamped = await page.evaluate(() => {
    window.stormLab.strike(7);
    const fresh = window.stormLab.getState();
    const final = window.stormLab.step(5000);
    return { fresh, final };
  });
  assert.equal(clamped.fresh.time, 0);
  assert.equal(clamped.fresh.phase, "drawing");
  assert.equal(clamped.final.time, 800);
  assert.equal(clamped.final.phase, "idle");
  assert.equal(clamped.final.drawRangeCount, 0);
  assert.equal(clamped.final.impactScale, 0);
  assert.equal(clamped.final.crackleCount, 0);

  await page.locator("#seed-input").fill("999999999999");
  await page.locator("#strike-button").click();
  assert.equal(await page.locator("#seed-message").textContent(), "Invalid seed");
  assert.equal((await page.evaluate(() => window.stormLab.getState())).time, 800);

  await page.locator("#reset-button").click();
  state = await page.evaluate(() => window.stormLab.getState());
  assert.equal(state.seed, 0);
  assert.equal(state.time, 0);
  assert.equal(state.phase, "idle");
  assert.equal(state.opacity, 1);
  assert.equal(state.crackleCount, 0);
  assert.equal(await page.locator("#seed-message").textContent(), "");
  assert.equal(await page.locator("#seed-input").inputValue(), "0");

  const externalRequests = requests.filter((url) => !url.startsWith("http://localhost:4173/"));
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(consoleErrors, []);
  await page.screenshot({ path: "artifacts/lightning-fracture-lab.png", fullPage: true });
});
