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
  "usb-check.html",
  "src/usb-check.js",
  "src/usb-check.css",
  "src/core.js",
  "src/storage.js",
  "src/app.js",
  "src/presets.js",
  "src/styles.css",
  "src/landing.js",
  "src/garage.css",
  "src/guide.js",
  "src/dash.js",
  "src/ride-profiles.js",
  "src/ride-compare.js",
  "src/ride-garage.js",
  "src/ride-garage.css",
  "src/access-demo.js",
  "src/account-model.js",
  "src/account.js",
  "src/account.css",
  "assets/icon.svg",
  "assets/RussoOne-Regular.ttf",
  "assets/OFL-RussoOne.txt",
];
const hash = (bytes, file) =>
  crypto
    .createHash("sha256")
    .update(
      file.endsWith(".ttf")
        ? bytes
        : bytes.toString("utf8").replace(/\r\n/g, "\n"),
    )
    .digest("hex");
const attempts = Number(process.env.BBS_DEPLOY_ATTEMPTS || 24),
  pause = Number(process.env.BBS_DEPLOY_PAUSE_MS || 25000),
  expected = Object.fromEntries(
    files.map((f) => [f, hash(fs.readFileSync(path.join(root, f)), f)]),
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
          const actual = hash(Buffer.from(await response.arrayBuffer()), file);
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
    if ((await page.locator("#hudCurrent").innerText()) !== "18.0")
      throw Error("Garage HUD did not render the draft scenario");
    await page.locator("#openGuide").click();
    if (!(await page.locator("#guideAbout").innerText()).includes("Penoff"))
      throw Error("Missing source acknowledgement");
    await page.locator("#closeGuide").click();
    await page.locator('[data-panel="presets"]').click();
    if ((await page.locator("#rideCards article").count()) !== 17) throw Error("Ride catalogue missing");
    if ((await page.locator(".ride-trait").count()) !== 119) throw Error("Seven-value profile comparison missing");
    if ((await page.locator("#rideBaseline").getAttribute("data-basis")) !== "demo") throw Error("Demo values mistaken for motor settings");
    await page.locator('[data-ride="forward"]').click();
    await page.locator("#ridePreview").click();
    await page.locator("#rideReviewCancel").click();
    if ((await page.locator("#bas-LC").inputValue()) !== "18") throw Error("Preview mutated draft");
    await page.locator('[data-filter="new"]').click();
    if ((await page.locator("#rideCards article").count()) !== 2) throw Error("New ride filter missing");
    await page.locator('[data-ride="bread-eco"]').click();
    if (!(await page.locator("#rideActualCap").textContent()).includes("13,86")) throw Error("Actual current ceiling missing");
    await page.locator("#ridePasGuide summary").click();
    if ((await page.locator("#ridePasGuide strong").count()) !== 3) throw Error("PAS usage guide missing");
    if ((await page.locator("#ridePasTable tbody tr").count()) !== 9) throw Error("Nine-level PAS table missing");
    if (!(await page.locator("#ridePasGuide strong").first().textContent()).includes("PAS 1–4")) throw Error("Hill assistance bands missing");
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
    await page.goto(base + "usb-check.html");
    await page.waitForFunction(() => document.getElementById("capability").textContent.length > 0);
    if ((await page.locator("#report").inputValue()) !== "") throw Error("USB check must not inspect devices automatically");
    await page.locator("#language").selectOption("en");
    if ((await page.locator("h1").textContent()) !== "USB cable check") throw Error("USB check translation missing");
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw Error("USB check mobile overflow");
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
