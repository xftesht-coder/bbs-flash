/* Verify the committed static files over HTTPS before publishing a release.
 * No serial port requests, personal data or authenticated browser are used. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."),
  base =
    process.env.BBS_DEPLOY_URL || "https://xftesht-coder.github.io/bbs-flash/";
const files = [
  "index.html",
  "landing.html",
  "bbs-flash.html",
  "src/core.js",
  "src/storage.js",
  "src/app.js",
  "src/presets.js",
  "src/styles.css",
  "src/landing.js",
  "assets/icon.svg",
];
const hash = (text) =>
  crypto.createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
const attempts = Number(process.env.BBS_DEPLOY_ATTEMPTS || 24),
  pause = Number(process.env.BBS_DEPLOY_PAUSE_MS || 25000),
  expected = Object.fromEntries(
    files.map((f) => [f, hash(fs.readFileSync(path.join(root, f), "utf8"))]),
  );
(async () => {
  let matched = false,
    evidence = [];
  for (let i = 0; i < attempts; i++) {
    evidence = await Promise.all(
      files.map(async (file) => {
        try {
          const response = await fetch(
            new URL(file + "?release=" + Date.now(), base),
            { signal: AbortSignal.timeout(15000), cache: "no-store" },
          );
          const actual = hash(await response.text());
          return {
            file,
            status: response.status,
            expected: expected[file],
            actual,
            match: response.ok && actual === expected[file],
          };
        } catch (error) {
          return { file, match: false, error: error.message };
        }
      }),
    );
    if (evidence.every((e) => e.match)) {
      matched = true;
      break;
    }
    console.log(
      `Deployment attempt ${i + 1}: pending ${evidence
        .filter((e) => !e.match)
        .map((e) => e.file)
        .join(", ")}`,
    );
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, pause));
  }
  if (!matched)
    throw new Error(
      "Live deployment does not match the release commit: " +
        JSON.stringify(evidence),
    );
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL
      ? { channel: process.env.BROWSER_CHANNEL }
      : {}),
  });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(base + "?release=" + Date.now());
    await page.waitForFunction(
      () => document.getElementById("cOut")?.textContent === "46.0",
    );
    await page.locator("a.primary").click();
    await page.waitForFunction(() =>
      document.getElementById("storageStatus")?.textContent.includes("готово"),
    );
    if (!(await page.locator("#writeAll").isDisabled()))
      throw Error("Disconnected write button is enabled");
    await page.locator('[data-panel="simulator"]').click();
    if ((await page.locator("#gearLimit").innerText()) !== "46.0")
      throw Error("Simulator gearing regression");
    await page.locator("#language").selectOption("en");
    if ((await page.locator("html").getAttribute("lang")) !== "en")
      throw Error("Language failed");
    await page.setViewportSize({ width: 390, height: 844 });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      )
    )
      throw Error("Mobile overflow");
    if (errors.length) throw Error(errors.join("\n"));
  } finally {
    await browser.close();
  }
  fs.mkdirSync(path.join(root, "test-results"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "test-results/deployment.json"),
    JSON.stringify(
      {
        base,
        verifiedAt: new Date().toISOString(),
        files: evidence,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "Live HTTPS deployment verified: all file hashes and browser smoke checks passed.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
