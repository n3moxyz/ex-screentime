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
  await page.getByText("Full roster").waitFor({ timeout: 5000 });
  await page.locator(".bench-row em", { hasText: "Scoring now" }).first().waitFor({
    timeout: 5000,
  });
  await page.locator(".bench-row em", { hasText: "Available" }).first().waitFor({
    timeout: 5000,
  });
  await page.getByLabel("Panel preset").selectOption("Harness / Skills Track");
  await page.getByText("5 active lenses").waitFor({ timeout: 5000 });
  await page.getByLabel("Panel preset").selectOption("Phase 0 Split Demo");
  await page.getByText("2 active lenses").waitFor({ timeout: 5000 });
  await page.getByLabel("Local repo path").fill(process.cwd());
  await page.getByRole("button", { name: /Inspect static path/i }).click();
  await page.getByText("Static inspection ready").waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: /Start inspection/i }).click();
  await page.waitForFunction(
    () => document.body.textContent?.includes("Static local inspection complete"),
    undefined,
    { timeout: 15000 },
  );
  await page.getByLabel("Demo fixture").selectOption("weak-submission-replay");
  await page.getByText("Expected 0-45").waitFor({ timeout: 5000 });
  await page.getByText("Low-end guardrail").waitFor({ timeout: 5000 });
  await page.getByLabel("Demo fixture").selectOption("strong-harness-replay");
  await page.getByText("Expected 70-90").waitFor({ timeout: 5000 });
  await page.getByText("Main demo").waitFor({ timeout: 5000 });
  await page.getByLabel("Panel preset").selectOption("Phase 0 Split Demo");
  await page.getByText("2 active lenses").waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /Start replay/i }).click();
  await page.waitForFunction(
    () => document.body.textContent?.includes("Replay evaluation complete"),
    undefined,
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /Rubric/i }).click();
  await page.getByText("Confidence model").waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /Compare fixtures/i }).click();
  await page.getByText("Calibration across strong, medium, and weak replays").waitFor({
    timeout: 5000,
  });
  let hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  if (hasHorizontalOverflow) {
    consoleErrors.push(`${name}: rubric view has horizontal overflow`);
  }
  await page.getByRole("button", { name: /Judge report/i }).click();
  const jsonExport = page.getByRole("button", { name: /JSON/i });
  await jsonExport.waitFor({ timeout: 5000 });
  await page.waitForFunction(
    () => document.body.textContent?.includes("Final score: 72.7 / 100"),
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
