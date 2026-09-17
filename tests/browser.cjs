/* End-to-end tests use a synthetic Web Serial port. No physical device access. */
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const { frames } = require("./helpers.cjs");
const root = path.resolve(__dirname, ".."),
  output = process.env.BBS_ARTIFACT_DIR || path.join(root, "test-results");
fs.mkdirSync(output, { recursive: true });
const results = [],
  errors = [];
let browser, server, base;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
async function newPage(options = {}) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      ...options,
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return { context, page };
}
async function check(name, fn) {
  const start = Date.now();
  await fn();
  results.push({ name, status: "pass", ms: Date.now() - start });
  console.log("PASS", name);
}
async function ready(page) {
  await page.goto(base + "/bbs-flash.html");
  await page.waitForFunction(() =>
    document.getElementById("storageStatus").textContent.includes("готово"),
  );
}
async function mock(page, { unknown = false } = {}) {
  await page.addInitScript(
    ({ initial, unknown }) => {
      const checksum = (bytes) => [
        ...bytes,
        bytes.reduce((n, b) => (n + b) % 256, 0),
      ];
      const motor = {
        frames: structuredClone(initial),
        sent: [],
        fault: null,
        closed: false,
      };
      if (unknown) {
        const gen = motor.frames[81].slice(0, -1);
        gen[6] = 88;
        motor.frames[81] = checksum(gen);
      }
      const port = {
        async open() {
          motor.closed = false;
          this.readable = new ReadableStream({
            start: (c) => (motor.controller = c),
            cancel: () => (motor.closed = true),
          });
          this.writable = new WritableStream({
            write: (bytes) => {
              const f = [...bytes];
              motor.sent.push(f);
              let response;
              if (f[0] === 17) response = motor.frames[f[1]];
              else {
                motor.frames[f[1]] = checksum([f[1], f[2], ...f.slice(3, -1)]);
                response = checksum([f[1], f[2]]);
              }
              if (motor.fault === "checksum") {
                response = [...response];
                response[response.length - 1] ^= 1;
              }
              queueMicrotask(() => {
                if (!motor.closed)
                  motor.controller.enqueue(new Uint8Array(response));
              });
            },
          });
        },
        async close() {
          motor.closed = true;
        },
      };
      const serial = new EventTarget();
      serial.requestPort = async () => port;
      Object.defineProperty(navigator, "serial", {
        value: serial,
        configurable: true,
      });
      window.__motor = motor;
    },
    { initial: frames, unknown },
  );
}
async function connectRead(page) {
  await page.locator("#connect").click();
  await page.waitForFunction(
    () => !document.getElementById("readAll").disabled,
  );
  assert.equal(await page.locator("#writeAll").isDisabled(), true);
  await page.locator("#readAll").click();
  await page.waitForFunction(() =>
    document.getElementById("status").textContent.includes("считаны"),
  );
}
async function toPanel(page, id) {
  await page.locator(`[data-panel="${id}"]`).click();
}
(async () => {
  try {
    server = http.createServer((req, res) => {
      let file;
      try {
        file = path.resolve(
          root,
          "." + decodeURIComponent(req.url.split("?")[0]),
        );
        if (file === root) file = path.join(root, "index.html");
        if (!file.startsWith(root + path.sep)) throw Error("path");
        const data = fs.readFileSync(file);
        res.setHeader(
          "Content-Type",
          types[path.extname(file)] || "application/octet-stream",
        );
        res.end(data);
      } catch {
        res.statusCode = 404;
        res.end("Not found");
      }
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({
      headless: true,
      ...(process.env.BROWSER_CHANNEL
        ? { channel: process.env.BROWSER_CHANNEL }
        : {}),
    });
    await check(
      "fresh IndexedDB startup; dark default; every tab accessible",
      async () => {
        for (let i = 0; i < 3; i++) {
          const { page, context } = await newPage();
          await ready(page);
          assert.equal(
            await page.locator("html").getAttribute("data-theme"),
            "dark",
          );
          assert.equal(await page.locator("#writeAll").isDisabled(), true);
          for (const id of [
            "basic",
            "pas",
            "throttle",
            "presets",
            "simulator",
            "connection",
          ]) {
            await toPanel(page, id);
            assert.equal(await page.locator("#panel-" + id).isVisible(), true);
          }
          if (i === 0)
            await page.screenshot({
              path: path.join(output, "app-desktop.png"),
              fullPage: true,
            });
          await context.close();
        }
      },
    );
    await check(
      "complete dynamic RU/EN and persistent language/theme",
      async () => {
        const { page, context } = await newPage();
        await ready(page);
        await page.locator("#language").selectOption("en");
        for (const id of [
          "connection",
          "basic",
          "pas",
          "throttle",
          "presets",
          "simulator",
        ]) {
          await toPanel(page, id);
          const text = await page.locator("#panel-" + id).innerText();
          assert.ok(!/[А-Яа-яЁё]/.test(text), `Russian remains in ${id}`);
        }
        await page.locator("#theme").click();
        // Preferences are asynchronous IndexedDB writes. Verify the commit,
        // not an arbitrary delay, before testing persistence across reload.
        await page.waitForFunction(
          async () => (await BBSStore.get("prefs", "theme")) === "light",
        );
        await page.reload();
        await page.waitForFunction(
          () => document.documentElement.lang === "en",
        );
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          "light",
        );
        await toPanel(page, "simulator");
        await page.screenshot({
          path: path.join(output, "simulator-light-en.png"),
          fullPage: true,
        });
        await context.close();
      },
    );
    await check(
      "mobile 360/390/768 and desktop: no page overflow; all navigation visible",
      async () => {
        for (const width of [360, 390, 768, 1440]) {
          const { page, context } = await newPage({
            viewport: { width, height: 900 },
            reducedMotion: "reduce",
          });
          await ready(page);
          for (const id of [
            "connection",
            "basic",
            "pas",
            "throttle",
            "presets",
            "simulator",
          ]) {
            await toPanel(page, id);
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              true,
              `${width}/${id}`,
            );
          }
          if (width === 390)
            await page.screenshot({
              path: path.join(output, "simulator-mobile.png"),
              fullPage: true,
            });
          await context.close();
        }
      },
    );
    await check(
      "Penoff guide covers every controller field in RU/EN and restores keyboard focus",
      async () => {
        const { page, context } = await newPage();
        await ready(page);
        for (const panel of ["basic", "pas", "throttle"]) {
          await toPanel(page, panel);
          const fields = page.locator(
            `#${panel === "basic" ? "basic" : panel}Fields .field`,
          );
          assert.ok((await fields.count()) > 0);
          for (const field of await fields.all())
            assert.equal(await field.locator(".help-button").count(), 1);
        }
        await toPanel(page, "basic");
        const button = page.locator('[data-help="bas.LC"]');
        await button.focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#guideDialog").isVisible(), true);
        assert.match(await page.locator("#guideDetail").innerText(), /General/);
        await page.keyboard.press("Escape");
        assert.equal(
          await button.evaluate((el) => el === document.activeElement),
          true,
        );
        for (const language of ["ru", "en"]) {
          await page.locator("#language").selectOption(language);
          await page.locator("#openGuide").click();
          assert.match(
            await page.locator("#guideAbout").innerText(),
            /Bafang.*Stefan Penov \(Penoff\)/s,
          );
          const keys = await page
            .locator("#guideSelect option")
            .evaluateAll((options) =>
              options.map((o) => o.value).filter(Boolean),
            );
          assert.equal(keys.length, 23);
          for (const key of keys) {
            await page.locator("#guideSelect").selectOption(key);
            const text = await page.locator("#guideDetail").innerText();
            assert.ok(text.length > 140, key);
            assert.equal(await page.locator("#guideDetail section").count(), 3);
            if (language === "en") assert.ok(!/[А-Яа-яЁё]/.test(text), key);
          }
          await page.locator("#closeGuide").click();
          if (language === "en")
            assert.ok(
              !/[А-Яа-яЁё]/.test(await page.locator("#raceHud").innerText()),
            );
        }
        await context.close();
      },
    );
    await check(
      "race HUD follows estimates, clears invalid input and never sends motor commands",
      async () => {
        const { page, context } = await newPage();
        await mock(page);
        await ready(page);
        await connectRead(page);
        const count = await page.evaluate(() => __motor.sent.length);
        await toPanel(page, "simulator");
        await page.locator('[data-hud-pas="2"]').click();
        assert.equal(await page.locator("#sim-level").inputValue(), "2");
        assert.equal(
          await page.locator("#hudRange").innerText(),
          await page.locator("#rangeKm").innerText(),
        );
        assert.equal(
          await page.locator("#hudCurrent").innerText(),
          await page.locator("#levelCurrent").innerText(),
        );
        const climb = Number(await page.locator("#hudSpeed").innerText());
        await page.locator('button[data-terrain="flat"]').click();
        const flat = Number(await page.locator("#hudSpeed").innerText());
        assert.ok(flat >= climb);
        assert.ok(
          Math.abs(
            Number(await page.locator("#hudCadence").innerText()) -
              ((flat / 3.6) * 60 * 11) / (32 * 2.194),
          ) < 1,
        );
        await page.locator('[data-hud-pas="0"]').click();
        assert.equal(
          await page
            .locator('button[data-terrain="flat"]')
            .getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(
          await page
            .locator('button[data-terrain="climb"]')
            .getAttribute("aria-pressed"),
          "false",
        );
        assert.equal(await page.locator("#hudSpeed").innerText(), "0.0");
        assert.equal(await page.locator("#hudRange").innerText(), "—");
        await page.locator('[data-hud-pas="9"]').click();
        await page.locator("#sim-cog").fill("");
        for (const id of ["hudSpeed", "hudRange", "hudCurrent", "hudCadence"])
          assert.equal(await page.locator("#" + id).innerText(), "—");
        assert.equal(
          await page.locator("#raceHud").getAttribute("data-running"),
          "false",
        );
        assert.equal(await page.evaluate(() => __motor.sent.length), count);
        await context.close();
      },
    );
    await check(
      "ride animation is opt-in and pauses for zero speed, visibility and reduced motion",
      async () => {
        const { page, context } = await newPage({
          reducedMotion: "no-preference",
        });
        await ready(page);
        const hud = page.locator("#raceHud"),
          wheel = page.locator(".rear-wheel");
        assert.equal(await hud.getAttribute("data-running"), "false");
        assert.equal(
          await wheel.evaluate((el) => getComputedStyle(el).animationPlayState),
          "paused",
        );
        await page.locator("#previewToggle").click();
        assert.equal(await hud.getAttribute("data-running"), "true");
        assert.equal(
          await wheel.evaluate((el) => getComputedStyle(el).animationPlayState),
          "running",
        );
        await page.locator('[data-hud-pas="0"]').click();
        assert.equal(await hud.getAttribute("data-running"), "false");
        await page.locator('[data-hud-pas="9"]').click();
        // Model browser visibility signals independently of headless window focus.
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", {
            value: true,
            configurable: true,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        assert.equal(await hud.getAttribute("data-running"), "false");
        await page.evaluate(() => {
          delete document.hidden;
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await page.waitForFunction(
          () => document.getElementById("raceHud").dataset.running === "true",
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForFunction(
          () => document.getElementById("raceHud").dataset.running === "false",
        );
        assert.equal(
          await wheel.evaluate((el) => getComputedStyle(el).animationName),
          "none",
        );
        await context.close();
      },
    );
    await check(
      "presets preserve cutoff, wheel, sensor, throttle and total current ceiling",
      async () => {
        const { page, context } = await newPage();
        await ready(page);
        await toPanel(page, "basic");
        await page.locator("#bas-LBP").fill("40");
        await page.locator("#bas-WD").selectOption("4");
        await page.locator("#bas-SMSig").fill("5");
        await page.locator("#bas-LC").fill("15");
        await toPanel(page, "throttle");
        await page.locator("#thr-EV").fill("42");
        await toPanel(page, "presets");
        for (const id of ["eco", "balanced", "torque"]) {
          await page.locator(`[data-preset=${id}]`).click();
          assert.equal(await page.locator("#bas-LBP").inputValue(), "40");
          assert.equal(await page.locator("#bas-WD").inputValue(), "4");
          assert.equal(await page.locator("#bas-SMSig").inputValue(), "5");
          assert.equal(await page.locator("#thr-EV").inputValue(), "42");
          assert.equal(await page.locator("#bas-LC").inputValue(), "15");
        }
        await context.close();
      },
    );
    await check(
      "simulator/range react to PAS, zero battery, mass, efficiency, hills and gearing",
      async () => {
        const { page, context } = await newPage();
        await ready(page);
        await toPanel(page, "simulator");
        assert.equal(await page.locator("#gearLimit").innerText(), "46.0");
        const old = await page.locator("#rangeKm").innerText();
        await page.locator("#sim-level").fill("2");
        assert.notEqual(await page.locator("#rangeKm").innerText(), old);
        await page.locator("#sim-level").fill("0");
        assert.equal(await page.locator("#rangeKm").innerText(), "—");
        await page.locator("#sim-level").fill("9");
        await page.locator("#sim-ah").fill("0");
        assert.equal(await page.locator("#rangeKm").innerText(), "0.0");
        await page.locator("#sim-ah").fill("10");
        await page.locator("#sim-mass").fill("150");
        assert.notEqual(await page.locator("#rangeKm").innerText(), old);
        await page.locator("#sim-cog").fill("22");
        assert.equal(await page.locator("#gearLimit").innerText(), "23.0");
        await page.locator("#sim-cog").fill("");
        assert.equal(await page.locator("#rangeKm").innerText(), "—");
        await context.close();
      },
    );
    await check(
      ".el import/export retains Penoff offsets; malformed import is atomic",
      async () => {
        const { page, context } = await newPage();
        await ready(page);
        await page
          .locator("#importFile")
          .setInputFiles(path.join(__dirname, "fixtures/penoff-default.el"));
        await page.waitForFunction(() =>
          document
            .getElementById("source")
            .textContent.includes("импортированный"),
        );
        assert.equal(await page.locator("#pas-SSM").inputValue(), "6");
        assert.equal(await page.locator("#pas-WM").inputValue(), "10");
        assert.equal(await page.locator("#thr-SL").inputValue(), "17");
        await page.locator("#importFile").setInputFiles({
          name: "bad.el",
          mimeType: "text/plain",
          buffer: Buffer.from("[Basic]\nLC=NaN"),
        });
        await page.waitForFunction(() =>
          document.getElementById("status").classList.contains("error"),
        );
        assert.equal(await page.locator("#pas-SSM").inputValue(), "6");
        const download = page.waitForEvent("download");
        await page.locator("#export").click();
        const file = await download;
        const contents = fs.readFileSync(await file.path(), "utf8");
        assert.match(contents, /SSM=5/);
        assert.match(contents, /WM=1/);
        assert.match(contents, /SL=3/);
        await context.close();
      },
    );
    await check(
      "IndexedDB denied: application works, no runtime errors, writes disabled",
      async () => {
        const { page, context } = await newPage();
        await page.addInitScript(() =>
          Object.defineProperty(window, "indexedDB", {
            get() {
              throw new DOMException("denied", "SecurityError");
            },
          }),
        );
        await page.goto(base + "/bbs-flash.html");
        await page.waitForFunction(() =>
          document
            .getElementById("storageStatus")
            .textContent.includes("недоступно"),
        );
        await toPanel(page, "simulator");
        assert.equal(await page.locator("#gearLimit").innerText(), "46.0");
        assert.equal(await page.locator("#writeAll").isDisabled(), true);
        await context.close();
      },
    );
    await check(
      "Web Serial unavailable: editor, simulation and landing remain usable",
      async () => {
        const { page, context } = await newPage();
        await page.addInitScript(() => {
          delete Navigator.prototype.serial;
        });
        await ready(page);
        assert.match(
          await page.locator("#capability").innerText(),
          /недоступен/,
        );
        assert.equal(await page.locator("#connect").isDisabled(), true);
        await toPanel(page, "simulator");
        assert.equal(await page.locator("#gearLimit").innerText(), "46.0");
        await context.close();
      },
    );
    await check(
      "mock serial: all 3 block buttons and Write All use durable backup + preview + verified readback",
      async () => {
        const { page, context } = await newPage();
        await mock(page);
        await ready(page);
        await connectRead(page);
        await page.locator("#bench").check();
        for (const [panel, input, value, block] of [
          ["basic", "bas-LC", "17", 82],
          ["pas", "pas-KC", "55", 83],
          ["throttle", "thr-SC", "8", 84],
          ["basic", "bas-LC", "16", null],
        ]) {
          await toPanel(page, panel);
          await page.locator("#" + input).fill(value);
          const writes = await page.evaluate(
            () => __motor.sent.filter((f) => f[0] === 22).length,
          );
          if (block) await page.locator(`[data-block="${block}"]`).click();
          else {
            await toPanel(page, "connection");
            await page.locator("#writeAll").click();
          }
          await page.waitForFunction(
            () => document.getElementById("writeDialog").open,
          );
          assert.equal(
            await page.evaluate(
              () => __motor.sent.filter((f) => f[0] === 22).length,
            ),
            writes,
          );
          const stored = await page.evaluate(
            async () => !!(await BBSStore.latest())?.raw?.general,
          );
          assert.equal(stored, true);
          assert.equal(await page.locator("#confirmWrite").isDisabled(), true);
          await page.locator("#confirmSafety").check();
          await page.locator("#confirmWrite").click();
          await page.waitForFunction(() =>
            document
              .getElementById("status")
              .textContent.includes("подтверждена"),
          );
          assert.equal(
            await page.evaluate(
              () => __motor.sent.filter((f) => f[0] === 22).length,
            ),
            writes + 1,
          );
        }
        await toPanel(page, "connection");
        await page.locator("#disconnect").click();
        await page.waitForFunction(
          () => document.getElementById("connect").disabled === false,
        );
        assert.equal(await page.locator("#writeAll").isDisabled(), true);
        await page.reload();
        await page.waitForFunction(
          () => !document.getElementById("backupEl").disabled,
        );
        assert.match(await page.locator("#backupInfo").innerText(), /SZZ9/);
        await context.close();
      },
    );
    await check(
      "mock serial: failed durable backup blocks every transmission",
      async () => {
        const { page, context } = await newPage();
        await mock(page);
        await ready(page);
        await connectRead(page);
        await page.locator("#bench").check();
        await toPanel(page, "basic");
        await page.locator("#bas-LC").fill("17");
        await page.evaluate(() => {
          BBSStore.saveBackup = async () => {
            throw new DOMException("full", "QuotaExceededError");
          };
        });
        await page.locator('[data-block="82"]').click();
        await page.waitForFunction(() =>
          document.getElementById("status").textContent.includes("сохранить"),
        );
        assert.equal(
          await page.evaluate(
            () => __motor.sent.filter((f) => f[0] === 22).length,
          ),
          0,
        );
        assert.equal(await page.locator("#writeAll").isDisabled(), true);
        await context.close();
      },
    );
    await check(
      "mock serial: corrupt response disconnects and unknown identity cannot opt into writes",
      async () => {
        const { page, context } = await newPage();
        await mock(page, { unknown: true });
        await ready(page);
        await connectRead(page);
        assert.equal(await page.locator("#bench").isDisabled(), true);
        assert.equal(await page.locator("#writeAll").isDisabled(), true);
        await page.evaluate(() => (__motor.fault = "checksum"));
        await page.locator("#readAll").click();
        await page.waitForFunction(() =>
          document.getElementById("status").textContent.includes("сумма"),
        );
        assert.equal(await page.locator("#readAll").isDisabled(), true);
        assert.match(
          await page.locator("#connectionState").innerText(),
          /Не подключено/i,
        );
        await context.close();
      },
    );
    await check(
      "landing root/legacy URL, bilingual copy, calculator direction, invalid input and responsive layout",
      async () => {
        const { page, context } = await newPage();
        for (const url of ["/", "/landing.html"]) {
          await page.goto(base + url);
          assert.equal(await page.locator("#cOut").innerText(), "46.0");
          await page.locator("#cFront").fill("48");
          assert.equal(await page.locator("#cOut").innerText(), "68.9");
          await page.locator("#cRear").fill("22");
          assert.equal(await page.locator("#cOut").innerText(), "34.5");
          await page.locator("#cRear").fill("0");
          assert.equal(await page.locator("#cOut").innerText(), "—");
          await page.locator("#language").selectOption("en");
          assert.ok(!/[А-Яа-яЁё]/.test(await page.locator("main").innerText()));
          assert.equal(
            await page.locator("a.primary").getAttribute("href"),
            "./bbs-flash.html",
          );
        }
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          true,
        );
        await page.screenshot({
          path: path.join(output, "landing-mobile.png"),
          fullPage: true,
        });
        await context.close();
      },
    );
    assert.deepEqual(errors, [], "Browser console/runtime errors");
    console.log(
      `PASS ${results.length} browser scenarios; no console/runtime errors`,
    );
  } catch (error) {
    results.push({ status: "fail", error: error.stack });
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((r) => server.close(r));
    fs.writeFileSync(
      path.join(output, "browser-results.json"),
      JSON.stringify({ results, errors }, null, 2),
    );
  }
})();
