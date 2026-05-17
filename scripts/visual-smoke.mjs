import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appUrl = process.env.RALPH_LEDGER_URL ?? "http://127.0.0.1:5173/?speed=fast";
const ledgerDir = path.join(process.cwd(), "ledger");

if (!fs.existsSync(chromePath)) {
  console.error(`Chrome executable not found at ${chromePath}`);
  process.exit(1);
}

fs.mkdirSync(ledgerDir, { recursive: true });
["visual-smoke.png", "visual-smoke-desktop.png", "visual-smoke-mobile.png"].forEach((file) => {
  const target = path.join(ledgerDir, file);
  if (fs.existsSync(target)) {
    fs.rmSync(target);
  }
});

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

const consoleErrors = [];

const runViewport = async (name, viewport) => {
  const page = await browser.newPage({ viewport });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`${name}: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(`${name}: ${error.message}`);
  });

  await page.goto(appUrl, { waitUntil: "networkidle", timeout: 15000 });
  await page.getByRole("heading", { name: "Ralph Ledger" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Fast replay" }).waitFor({ timeout: 5000 });
  if ((await page.getByLabel("Demo fixture").count()) !== 0) {
    consoleErrors.push(`${name}: primary intake still exposes the demo fixture dropdown`);
  }
  await page.getByText("Full roster").waitFor({ timeout: 5000 });
  await page.locator(".bench-row em", { hasText: "Scoring now" }).first().waitFor({
    timeout: 5000,
  });
  await page.getByLabel("Evaluation track").selectOption("Impact Track");
  await page.getByText("Impact evidence first").waitFor({ timeout: 5000 });
  await page.getByLabel("Evaluation track").selectOption("Harness / Skills Track");
  await page.getByText("Harness evidence first").waitFor({ timeout: 5000 });
  await page.getByText("Panel details").click();
  await page.getByText("5 active lenses").waitFor({ timeout: 5000 });
  await page.getByLabel("Panel override").selectOption("Phase 0 Split Demo");
  await page.getByText("2 active lenses").waitFor({ timeout: 5000 });
  await page.getByLabel("Panel override").selectOption("Harness / Skills Track");
  await page.getByText("5 active lenses").waitFor({ timeout: 5000 });
  await page.getByText("Panel details").click();
  await page.getByText("Local static fallback").click();
  await page.getByLabel("Local repo path").fill(process.cwd());
  await page.getByRole("button", { name: /Inspect static path/i }).click();
  await page.locator(".local-status", { hasText: "Static inspection ready." }).waitFor({
    timeout: 8000,
  });
  await page.getByRole("button", { name: /Start evaluation/i }).click();
  await page.waitForFunction(
    () => document.body.textContent?.includes("Static local inspection complete"),
    undefined,
    { timeout: 15000 },
  );
  await page.getByRole("tab", { name: /Compare fixtures/i }).click();
  await page.getByText("Calibration across strong, medium, and weak replays").waitFor({
    timeout: 5000,
  });
  await page
    .locator(".comparison-card", { hasText: "Strong Harness Replay" })
    .getByRole("button", { name: /Use fixture/i })
    .click();
  await page.getByRole("button", { name: /Run safe replay demo/i }).click();
  await page.waitForFunction(
    () => document.body.textContent?.includes("Replay evaluation complete"),
    undefined,
    { timeout: 15000 },
  );
  await page.getByRole("tab", { name: /Rubric/i }).click();
  await page.getByText("Confidence model").waitFor({ timeout: 5000 });
  await page.getByRole("tab", { name: /Compare fixtures/i }).click();
  await page.getByText("Calibration across strong, medium, and weak replays").waitFor({
    timeout: 5000,
  });
  let hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  if (hasHorizontalOverflow) {
    consoleErrors.push(`${name}: comparison view has horizontal overflow`);
  }
  await page.getByRole("tab", { name: /Judge report/i }).click();
  const jsonExport = page.getByRole("button", { name: /JSON/i });
  await jsonExport.waitFor({ timeout: 5000 });
  await page.waitForFunction(
    () => document.body.textContent?.includes("Final score: 74.9 / 100"),
    undefined,
    { timeout: 5000 },
  );
  const download = await Promise.all([page.waitForEvent("download"), jsonExport.click()]).then(
    ([result]) => result,
  );
  if (!download.suggestedFilename().endsWith(".json")) {
    consoleErrors.push(`${name}: JSON export suggested ${download.suggestedFilename()}`);
  }
  hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  if (hasHorizontalOverflow) {
    consoleErrors.push(`${name}: report view has horizontal overflow`);
  }
  await page.screenshot({
    path: path.join(ledgerDir, `visual-smoke-${name}.png`),
    fullPage: true,
  });
  await page.close();
};

try {
  await runViewport("desktop", { width: 1440, height: 1100 });
  await runViewport("mobile", { width: 390, height: 900 });

  if (consoleErrors.length > 0) {
    console.error("Visual smoke test saw console errors:");
    consoleErrors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Visual smoke passed. Screenshots: ${path.join(ledgerDir, "visual-smoke-*.png")}`);
} finally {
  await browser.close();
}
