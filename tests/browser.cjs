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
let primeLegacyCache = false;
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
async function mock(page, { unknown = false, initial = frames, format = "additive" } = {}) {
  await page.addInitScript(
    ({ initial, unknown, format }) => {
      const checksum = (bytes, reading = false) => [
        ...bytes,
        (bytes.reduce((n, b) => (n + b) % 256, 0) + (reading && format === "legacy" ? 258 - bytes[1] : 0)) % 256,
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
        motor.frames[81] = checksum(gen, true);
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
                if (motor.fault !== "noPersist") motor.frames[f[1]] = checksum([f[1], f[2], ...f.slice(3, -1)], true);
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
    { initial, unknown, format },
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
  assert.equal(await page.locator("#backupEl").isDisabled(), false);
  assert.equal(await page.evaluate(async () => !!(await BBSStore.latest())?.el), true);
}
async function toPanel(page, id) {
  await page.locator(`[data-panel="${id}"]`).click();
}
(async () => {
  try {
    server = http.createServer((req, res) => {
      if (primeLegacyCache && req.url === "/cache-prime.html") {
        res.setHeader("Content-Type", "text/html");
        res.end('<link rel="icon" href="/assets/icon.svg"><script src="/src/ride-garage.js"></script>');
        return;
      }
      if (primeLegacyCache && req.url === "/src/ride-garage.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.end("window.__legacyGarageCached = true;");
        return;
      }
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
    await check("updated app bypasses an incompatible module retained in the browser cache", async () => {
      const {page, context} = await newPage();
      primeLegacyCache = true;
      try {
        await page.goto(base + "/cache-prime.html");
        assert.equal(await page.evaluate(() => window.__legacyGarageCached), true);
        await ready(page);
        assert.equal(await page.evaluate(() => window.__legacyGarageCached), undefined);
        assert.equal(await page.evaluate(() => typeof BBSRideGarage.init), "function");
        assert.equal(await page.locator(".garage-start").getAttribute("data-setup-state"), "offline");
      } finally { primeLegacyCache = false; await context.close(); }
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
    await check("Russian labels, units and profile evidence remain accurate after a language roundtrip", async () => {
      const {page,context}=await newPage();
      await ready(page);
      assert.equal(await page.locator('#language').getAttribute('aria-label'),'Язык');
      assert.match(await page.title(),/Настройка мотора/);
      await toPanel(page,'basic');
      assert.match(await page.locator('label[for="bas-LBP"]').innerText(),/Защита от разряда, В/);
      assert.match(await page.locator('label[for="bas-LC"]').innerText(),/лимит тока, А/);
      assert.equal(await page.locator('#bas-LBP').inputValue(),'41');
      await toPanel(page,'throttle');
      assert.match(await page.locator('label[for="thr-SV"]').innerText(),/×0,1 В/);
      assert.equal(await page.locator('#thr-SV').inputValue(),'11');
      await toPanel(page,'presets');
      await page.locator('[data-ride="forward"]').click();
      assert.match(await page.locator('#rideDetail').innerText(),/Владелец подтвердил запись и заезд на 3\.4\.2/i);
      for(const lang of ['en','ru']) await page.locator('#language').selectOption(lang);
      assert.equal(await page.locator('[data-t="cadenceUnit"]').innerText(),'об/мин');
      assert.match(await page.locator('[data-hud-pas="2"]').getAttribute('aria-label'),/Уровень помощи 2/);
      const missing=await page.locator('[data-t]').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()||n.textContent===n.dataset.t).map(n=>n.dataset.t));
      assert.deepEqual(missing,[]);
      assert.doesNotMatch(await page.locator('body').innerText(),/SETUP LAB|Reality Check|RPM|checksum/);
      await context.close();
    });
    await check(
      "360/390/640/768/1024/1280/1366/1440: no page overflow; all navigation visible",
      async () => {
        for (const width of [360, 390, 640, 768, 1024, 1280, 1366, 1440]) {
          const { page, context } = await newPage({
            viewport: { width, height: 720 },
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
      "compact top ride panel: laptop profile actions fit, accordion is keyboard accessible and sends no UART",
      async () => {
        for (const width of [360, 768, 1280, 1366]) {
          const { page, context } = await newPage({ viewport: { width, height: 720 }, reducedMotion: "reduce" });
          await mock(page); await ready(page); await toPanel(page, "presets");
          for (const language of ["ru", "en"]) {
            await page.locator("#language").selectOption(language);
            await page.evaluate(() => scrollTo(0, 0));
            const geometry = await page.evaluate(() => {
              const hud = document.getElementById("raceHud"), tabs = document.getElementById("tabs");
              return {
                hudBeforeTabs: !!(hud.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING),
                hudBottom: hud.getBoundingClientRect().bottom,
                tabsTop: tabs.getBoundingClientRect().top,
                cardButtonBottom: document.querySelector("#rideCards article button").getBoundingClientRect().bottom,
                overflow: document.documentElement.scrollWidth > innerWidth + 1,
              };
            });
            assert.equal(geometry.hudBeforeTabs, true);
            assert.ok(geometry.hudBottom <= geometry.tabsTop);
            assert.equal(geometry.overflow, false);
            if (width >= 1280) assert.ok(geometry.cardButtonBottom <= 720, `${width}/${language}: ${geometry.cardButtonBottom}`);
          }
          const summary = page.locator(".hud-controls summary");
          assert.equal(await page.locator("#previewToggle").isVisible(), false);
          await summary.focus(); await page.keyboard.press("Enter");
          assert.equal(await page.locator("#previewToggle").isVisible(), true);
          await page.locator('[data-hud-pas="2"]').click();
          assert.equal(await page.locator("#sim-level").inputValue(), "2");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
          await summary.focus(); await page.keyboard.press("Enter");
          assert.equal(await page.locator("#previewToggle").isVisible(), false);
          await page.locator("#language").selectOption("ru");
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({path: path.join(output, `compact-profiles-${width}.png`), animations: "disabled"});
          if (width === 1280) {
            await page.locator("#theme").click();
            await page.screenshot({path: path.join(output, "compact-profiles-light.png"), animations: "disabled"});
          }
          assert.deepEqual(await page.evaluate(() => __motor.sent), []);
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
        await page.locator(".hud-controls summary").click();
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
        await page.locator(".hud-controls summary").click();
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
        await page.locator(".legacy-templates > summary").click();
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
            .textContent.includes("профиль из файла"),
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
          /недоступно/,
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
    await check("seven profile values compare actual drafts, update after edits, and clear invalid input", async () => {
      const {page,context}=await newPage(); await mock(page); await ready(page); await toPanel(page,"presets");
      const card=page.locator('.ride-card').filter({has:page.locator('[data-ride="forward"]')});
      const value=(id,side)=>card.locator(`[data-metric="${id}"] .trait-${side}`).getAttribute('data-value');
      assert.equal(await page.locator('#rideBaseline').getAttribute('data-basis'),'demo');
      assert.equal(await page.locator('.ride-trait').count(),12*7);
      assert.equal(await value('pickup','before'),'10'); assert.equal(await value('pickup','after'),'20');
      assert.equal(await value('peak','before'),'18'); assert.equal(await value('peak','after'),'18');
      const original=await page.locator('#pas-SC').inputValue();
      await page.locator('[data-ride="forward"]').click();
      assert.equal(await page.locator('.ride-comparison-item').count(),7);
      assert.match(await page.locator('#rideDetail').textContent(),/не время разгона/);
      assert.equal(await page.locator('#pas-SC').inputValue(),original);
      await page.locator('#ridePreview').click(); await page.locator('#rideReviewApply').click();
      assert.equal(await page.locator('#rideBaseline').getAttribute('data-basis'),'draft');
      assert.match(await page.locator('#rideBaseline').textContent(),/Полный вперёд/);
      assert.equal(await value('pickup','before'),'20');
      assert.equal(await card.locator('[data-changed="true"]').count(),0);
      await page.locator('#garageUndo').click(); assert.equal(await value('pickup','before'),'10');
      await toPanel(page,'basic'); await page.locator('#bas-LC').fill('12'); await toPanel(page,'presets');
      assert.equal(await value('peak','after'),'12');
      await toPanel(page,'basic'); await page.locator('#bas-LC').fill(''); await toPanel(page,'presets');
      assert.equal(await page.locator('#rideBaseline').getAttribute('data-basis'),'invalid');
      assert.equal(await page.locator('.ride-trait').count(),0);
      await toPanel(page,'basic'); await page.locator('#bas-LC').fill('18'); await toPanel(page,'presets');
      await page.locator('#language').selectOption('en');
      assert.ok(!/[А-Яа-яЁё]/.test(await page.locator('#panel-presets').innerText()));
      await page.locator('#language').selectOption('ru'); assert.equal(await page.locator('.ride-trait').count(),84);
      assert.deepEqual(await page.evaluate(()=>__motor.sent),[]);
      await context.close();
    });
    await check("motor comparison stays anchored through draft selection and follows verified writes and reconnect", async () => {
      const {page,context}=await newPage(); await mock(page); await ready(page); await connectRead(page);
      await toPanel(page,'presets');
      const card=page.locator('.ride-card').filter({has:page.locator('[data-ride="forward"]')});
      const before=()=>card.locator('[data-metric="pickup"] .trait-before').getAttribute('data-value');
      assert.equal(await page.locator('#rideBaseline').getAttribute('data-basis'),'motor');
      await page.locator('[data-ride="forward"]').click(); await page.locator('#ridePreview').click(); await page.locator('#rideReviewApply').click();
      assert.equal(await before(),'10');
      assert.match(await page.locator('#rideBaseline').textContent(),/ещё не записаны/);
      assert.equal(await page.evaluate(()=>__motor.sent.filter(f=>f[0]===22).length),0);
      await page.setViewportSize({width:1280,height:900});
      await page.locator('#rideBaseline').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,'profile-comparison-motor.png'),animations:'disabled'});
      await toPanel(page,'connection'); await page.locator('#bench').check(); await page.locator('#writeAll').click();
      await page.waitForFunction(()=>document.getElementById('writeDialog').open);
      await page.locator('#confirmSafety').check(); await page.locator('#confirmWrite').click();
      await page.waitForFunction(()=>document.getElementById('status').textContent.includes('подтверждена'));
      assert.equal(await before(),'20');
      assert.match(await page.locator('#rideBaseline').textContent(),/Черновик совпадает/);
      await page.locator('#disconnect').click(); await page.waitForFunction(()=>!document.getElementById('connect').disabled);
      assert.equal(await page.locator('#rideBaseline').getAttribute('data-basis'),'draft');
      await page.locator('#connect').click(); await page.waitForFunction(()=>!document.getElementById('readAll').disabled);
      assert.equal(await page.locator('#rideBaseline').getAttribute('data-basis'),'draft');
      assert.match(await page.locator('#rideBaseline').textContent(),/не считан/);
      await context.close();
    });
    await check("guided setup distinguishes drafts, reading and verified writes without automatic UART actions", async () => {
      const {page, context} = await newPage(); await mock(page); await ready(page);
      const state = () => page.locator(".garage-start").getAttribute("data-setup-state");
      assert.equal(await state(), "offline");
      await page.locator("#setupNext").click();
      assert.equal(await page.evaluate(() => document.activeElement.id), "connect");
      assert.deepEqual(await page.evaluate(() => __motor.sent), []);
      await toPanel(page,"presets"); await page.locator('[data-ride="economy"]').click();
      await page.locator("#ridePreview").click(); await page.locator("#rideReviewApply").click();
      assert.equal(await state(), "draft-offline");
      await page.locator("#garageNext").click();
      assert.equal(await page.evaluate(() => document.activeElement.id), "connect");
      assert.deepEqual(await page.evaluate(() => __motor.sent), []);
      await page.locator("#connect").click();
      await page.waitForFunction(() => !document.getElementById("readAll").disabled);
      assert.equal(await state(), "read");
      assert.match(await page.locator("#setupHint").textContent(), /заменит редактор/);
      await page.locator("#setupNext").click();
      assert.equal(await page.evaluate(() => document.activeElement.id), "readAll");
      page.once("dialog", d => d.accept()); await page.locator("#readAll").click();
      await page.waitForFunction(() => document.getElementById("status").textContent.includes("считаны"));
      assert.equal(await state(), "ready");
      assert.equal(await page.locator("#garageMessage").textContent(), "");
      assert.equal(await page.locator('[data-setup-step][data-complete="true"]').count(), 2);
      assert.match(await page.locator("#setupHint").textContent(), /чтение их не меняет/);
      await page.locator("#setupNext").click();
      assert.equal(await page.locator("#panel-presets").isVisible(), true);
      await page.locator('[data-ride="forward"]').click();
      await page.locator("#ridePreview").click(); await page.locator("#rideReviewApply").click();
      assert.equal(await state(), "draft");
      assert.equal(await page.locator('#rideBaseline').getAttribute('data-basis'),'motor');
      const sent = await page.evaluate(() => __motor.sent.length);
      await page.locator("#garageNext").click();
      assert.equal(await page.evaluate(() => document.activeElement.id), "bench");
      assert.equal(await page.locator("#bench").isChecked(), false);
      assert.equal(await page.locator("#writeAll").isDisabled(), true);
      await page.locator("#bench").check(); await page.locator("#setupNext").click();
      assert.equal(await page.evaluate(() => document.activeElement.id), "writeAll");
      assert.equal(await page.evaluate(() => __motor.sent.length), sent);
      await page.locator("#writeAll").click();
      await page.waitForFunction(() => document.getElementById("writeDialog").open);
      assert.equal(await state(), "busy");
      assert.equal(await page.locator("#setupNext").isDisabled(), true);
      await page.locator("#cancelWrite").click();
      await page.waitForFunction(() => !document.getElementById("writeAll").disabled);
      assert.equal(await state(), "draft");
      assert.equal(await page.evaluate(() => __motor.sent.filter(f => f[0] === 22).length), 0);
      await page.locator("#writeAll").click();
      await page.waitForFunction(() => document.getElementById("writeDialog").open);
      await page.locator("#confirmSafety").check(); await page.locator("#confirmWrite").click();
      await page.waitForFunction(() => document.getElementById("status").textContent.includes("подтверждена"));
      assert.equal(await state(), "verified");
      assert.equal(await page.locator('[data-setup-step][data-complete="true"]').count(), 4);
      assert.equal(await page.locator("#garageMessage").textContent(), "");
      assert.equal(await page.locator("#garageUndo").isDisabled(), true);
      assert.equal(await page.locator("#garageNext").isVisible(), false);
      await page.locator("#language").selectOption("en");
      assert.equal(await page.locator("#startTitle").textContent(), "Write verified");
      await page.locator("#language").selectOption("ru");
      await toPanel(page,"basic"); await page.locator("#bas-LC").fill("");
      assert.equal(await state(), "invalid");
      await page.locator("#setupNext").click();
      assert.equal(await page.evaluate(() => document.activeElement.id), "bas-LC");
      await page.locator("#bas-LC").fill("17");
      assert.equal(await state(), "draft");
      assert.equal(await page.locator('[data-setup-step="3"]').getAttribute("data-complete"), "false");
      await page.screenshot({path:path.join(output,"guided-draft.png"), fullPage:false, animations:"disabled"});
      await context.close();
    });
    await check("saved backups cannot complete setup steps after reconnect or reload", async () => {
      const {page, context} = await newPage(); await mock(page); await ready(page); await connectRead(page);
      await page.locator("#disconnect").click();
      await page.waitForFunction(() => !document.getElementById("connect").disabled);
      assert.equal(await page.locator('[data-setup-step][data-complete="true"]').count(), 0);
      assert.equal(await page.locator("#backupEl").isDisabled(), false);
      await page.locator("#connect").click();
      await page.waitForFunction(() => !document.getElementById("readAll").disabled);
      assert.equal(await page.locator(".garage-start").getAttribute("data-setup-state"), "read");
      assert.equal(await page.locator('[data-setup-step][data-complete="true"]').count(), 1);
      assert.equal(await page.locator("#writeAll").isDisabled(), true);
      await page.reload();
      await page.waitForFunction(() => !document.getElementById("backupEl").disabled);
      assert.equal(await page.locator(".garage-start").getAttribute("data-setup-state"), "offline");
      assert.equal(await page.locator('[data-setup-step][data-complete="true"]').count(), 0);
      await context.close();
    });
    await check("initial backup failure cannot expose new controller data as an editable baseline", async () => {
      const {page, context} = await newPage();
      const initial = structuredClone(frames); initial[82][3] = 16;
      initial[82] = require("./helpers.cjs").checksumFrame(initial[82].slice(0,-1));
      await mock(page,{initial}); await ready(page);
      await page.evaluate(() => { BBSStore.saveBackup = async () => { throw Error("STORAGE"); }; });
      await page.locator("#connect").click();
      await page.waitForFunction(() => !document.getElementById("readAll").disabled);
      await page.locator("#readAll").click();
      await page.waitForFunction(() => document.getElementById("status").textContent.includes("сохранить"));
      assert.equal(await page.locator("#bas-LC").inputValue(), "18");
      assert.equal(await page.locator("#backupEl").isDisabled(), true);
      assert.equal(await page.locator("#writeAll").isDisabled(), true);
      assert.equal(await page.locator(".garage-start").getAttribute("data-setup-state"), "storage");
      assert.equal(await page.evaluate(() => BBSCore.isWriteReady(null)), false);
      assert.ok((await page.evaluate(() => __motor.sent)).every(f => f[0] === 17));
      await context.close();
    });
    await check("Read All cannot silently discard a ride draft; cancel sends no UART commands", async () => {
      const {page, context} = await newPage(); await mock(page); await ready(page); await connectRead(page);
      await toPanel(page,"presets"); await page.locator('[data-ride="forward"]').click();
      await page.locator("#ridePreview").click(); await page.locator("#rideReviewApply").click();
      const draft = await page.locator("#ALC-2").inputValue();
      await toPanel(page,"connection");
      const count = await page.evaluate(() => __motor.sent.length);
      page.once("dialog", dialog => dialog.dismiss()); await page.locator("#readAll").click();
      await page.waitForFunction(() => !document.getElementById("readAll").disabled);
      assert.equal(await page.locator("#ALC-2").inputValue(), draft);
      assert.equal(await page.evaluate(() => __motor.sent.length), count);
      page.once("dialog", dialog => dialog.accept()); await page.locator("#readAll").click();
      await page.waitForFunction(() => document.getElementById("status").textContent.includes("считаны"));
      assert.equal(await page.locator("#ALC-2").inputValue(), "22");
      assert.equal(await page.evaluate(() => __motor.sent.filter(f => f[0] === 22).length),0);
      await context.close();
    });
    await check("single-block write preserves other draft edits; a subsequent write uses verified baseline", async () => {
      const {page, context} = await newPage(); await mock(page); await ready(page); await connectRead(page);
      await page.locator("#bench").check();
      await toPanel(page,"pas"); await page.locator("#pas-KC").fill("55");
      await toPanel(page,"basic"); await page.locator("#bas-LC").fill("17");
      await page.locator('[data-block="82"]').click();
      await page.waitForFunction(() => document.getElementById("writeDialog").open);
      await page.locator("#confirmSafety").check(); await page.locator("#confirmWrite").click();
      await page.waitForFunction(() => document.getElementById("status").textContent.includes("подтверждена"));
      assert.equal(await page.locator("#pas-KC").inputValue(),"55");
      assert.equal(await page.evaluate(() => __motor.frames[83][12]),60);
      assert.equal(await page.locator('.ride-card').first().locator('[data-metric="cruise"] .trait-before').getAttribute('data-value'),'60');
      assert.equal(await page.locator('.ride-card').first().locator('[data-metric="peak"] .trait-before').getAttribute('data-value'),'17');
      assert.match(await page.locator("#source").textContent(), /ещё не записанные/);
      assert.equal(await page.locator(".garage-start").getAttribute("data-setup-state"), "draft");
      await toPanel(page,"connection"); await page.locator("#writeAll").click();
      await page.waitForFunction(() => document.getElementById("writeDialog").open);
      await page.locator("#confirmSafety").check(); await page.locator("#confirmWrite").click();
      await page.waitForFunction(() => document.getElementById("status").textContent.includes("подтверждена"));
      assert.deepEqual(await page.evaluate(() => __motor.sent.filter(f=>f[0]===22).map(f=>f[1])),[82,83]);
      assert.equal(await page.evaluate(() => __motor.frames[83][12]),55);
      assert.equal(await page.locator('.ride-card').first().locator('[data-metric="cruise"] .trait-before').getAttribute('data-value'),'55');
      await context.close();
    });
    await check("ACK without persistence closes the session and reports an unverified partial write", async () => {
      const {page, context} = await newPage(); await mock(page); await ready(page); await connectRead(page);
      await page.locator("#bench").check(); await toPanel(page,"basic"); await page.locator("#bas-LC").fill("17");
      await page.evaluate(() => { __motor.fault = "noPersist"; });
      await page.locator('[data-block="82"]').click();
      await page.waitForFunction(() => document.getElementById("writeDialog").open);
      await page.locator("#confirmSafety").check(); await page.locator("#confirmWrite").click();
      await page.waitForFunction(() => document.getElementById("connect").disabled === false);
      assert.equal(await page.locator("#writeAll").isDisabled(),true);
      assert.equal(await page.locator("#readAll").isDisabled(),true);
      assert.equal(await page.evaluate(() => __motor.sent.filter(f=>f[0]===22).length),1);
      assert.ok(!(await page.locator("#status").textContent()).includes("Запись подтверждена"));
      assert.equal(await page.locator(".garage-start").getAttribute("data-setup-state"), "partial");
      assert.equal(await page.locator('#rideBaseline').getAttribute('data-basis'),'draft');
      assert.equal(await page.locator('[data-setup-step][data-complete="true"]').count(), 0);
      assert.equal(await page.locator("#backupEl").isDisabled(),false);
      await context.close();
    });
    await check("owner full legacy capture: backup, apply Full ahead, write and verify; throttle remains unchanged", async () => {
      const {page, context} = await newPage();
      const cap = require("./fixtures/legacy-rx.json");
      const hex = s => s.split(" ").map(b=>parseInt(b,16));
      const initial = {81:require("./fixtures/szz9-general-capture.json").chunks.flat(),82:hex(cap.ownerBasic),83:hex(cap.ownerPAS),84:hex(cap.ownerThrottle)};
      await mock(page,{initial,format:"legacy"}); await ready(page); await connectRead(page);
      assert.equal(await page.locator("#bas-LC").inputValue(),"24");
      await page.locator("#bench").check(); await toPanel(page,"presets");
      await page.locator('[data-ride="forward"]').click(); await page.locator("#ridePreview").click(); await page.locator("#rideReviewApply").click();
      await toPanel(page,"connection"); await page.locator("#writeAll").click();
      await page.waitForFunction(() => document.getElementById("writeDialog").open);
      assert.equal(await page.evaluate(() => __motor.sent.filter(f=>f[0]===22).length),0);
      assert.deepEqual(await page.evaluate(async () => (await BBSStore.latest()).raw.thr), initial[84]);
      await page.locator("#confirmSafety").check(); await page.locator("#confirmWrite").click();
      await page.waitForFunction(() => document.getElementById("status").textContent.includes("подтверждена"));
      assert.deepEqual(await page.evaluate(() => __motor.sent.filter(f=>f[0]===22).map(f=>f[1])),[82,83]);
      assert.deepEqual(await page.evaluate(() => __motor.frames[84]),initial[84]);
      assert.deepEqual(await page.evaluate(() => __motor.frames[83].slice(2,-1)),[3,255,255,20,3,3,255,20,7,0,70]);
      await toPanel(page,"presets"); await page.locator('[data-ride="acceleration"]').click();
      await page.locator("#ridePreview").click(); await page.locator("#rideReviewApply").click();
      assert.match(await page.locator("#status").textContent(), /ещё не записаны/);
      assert.equal(await page.evaluate(() => __motor.sent.filter(f=>f[0]===22).length),2);
      await toPanel(page,"basic"); await page.locator("#bas-LC").fill("23");
      assert.match(await page.locator("#status").textContent(), /ещё не записаны/);
      await context.close();
    });
    await check("owner General capture connects with two reads, displays identity and keeps writes gated", async () => {
      const {page, context} = await newPage();
      const { checksumFrame } = require("./helpers.cjs");
      const initial = Object.fromEntries(Object.entries(frames).map(([b, f]) => [b, checksumFrame(f.slice(0, -1), "legacy")]));
      initial[81] = require("./fixtures/szz9-general-capture.json").chunks.flat();
      initial[82] = require("./fixtures/legacy-rx.json").ownerBasic.split(" ").map(b => parseInt(b, 16));
      await mock(page, {initial, format:"legacy"}); await ready(page);
      await page.locator("#connect").click();
      await page.waitForFunction(() => !document.getElementById("readAll").disabled);
      assert.match(await page.locator("#device").textContent(), /HW 1\.1 · FW 2\.0\.1\.1/);
      assert.match(await page.locator("#device").textContent(), /Контроллер: 48 В · 25 А/);
      assert.match(await page.locator("#device").textContent(), /двумя чтениями/);
      assert.equal(await page.locator("#writeAll").isDisabled(), true);
      assert.equal(await page.locator("#bench").isChecked(), false);
      assert.deepEqual(await page.evaluate(() => __motor.sent.map(f => f[1])), [81,81]);
      await page.locator("#readAll").click();
      await page.waitForFunction(() => document.getElementById("source").textContent.includes("контроллер"));
      assert.equal(await page.locator("#bas-LC").inputValue(), "24");
      assert.equal(await page.locator("#writeAll").isDisabled(), true);
      assert.ok((await page.evaluate(() => __motor.sent)).every(f => f[0] === 17));
      await page.locator("#language").selectOption("en");
      assert.match(await page.locator("#device").textContent(), /confirmed twice/);
      await context.close();
    });
    await check("ride cards preview before apply, respect limits, undo, filters and never send serial commands", async () => {
      const { page, context } = await newPage();
      await mock(page); await ready(page);
      await page.locator("#startBrowse").click();
      assert.equal(await page.locator("#rideCards article").count(), 12);
      assert.equal(await page.locator('[data-filter="all"]').textContent(), "Все 12");
      assert.equal(await page.locator("#sim-ah").inputValue(), "19.2");
      const before = await page.locator("#ALC-1").inputValue();
      await page.locator('[data-ride="economy"]').click();
      await page.locator("#ridePreview").click();
      assert.equal(await page.locator("#ALC-1").inputValue(), before);
      await page.locator("#rideReviewCancel").click();
      assert.equal(await page.locator("#ALC-1").inputValue(), before);
      for (const id of ["acceleration","climb","technical","touring","training","economy","smooth","city","park","trail","forward","speed"]) {
        await page.locator(`[data-ride="${id}"]`).click();
        await page.locator("#ridePreview").click();
        await page.locator("#rideReviewApply").click();
        assert.equal(await page.locator("#bas-LC").inputValue(), "18");
        assert.equal(await page.locator("#thr-EV").inputValue(), "35");
      }
      assert.equal(await page.locator("#ALBP-1").inputValue(), "100");
      await page.locator("#garageUndo").click();
      assert.equal(await page.locator("#ALBP-1").inputValue(), "65");
      assert.equal(await page.locator("#garageUndo").isDisabled(), true);
      await page.locator('[data-filter="calm"]').click();
      assert.equal(await page.locator("#rideCards article").count(), 3);
      await page.locator('[data-filter="all"]').click();
      await page.locator('[data-filter="active"]').click();
      assert.equal(await page.locator("#rideCards article").count(), 6);
      await page.locator('[data-filter="daily"]').click();
      assert.equal(await page.locator("#rideCards article").count(), 3);
      await page.locator('[data-filter="all"]').click();
      await page.locator("#language").selectOption("en");
      assert.equal(await page.locator('[data-filter="all"]').textContent(), "All 12");
      await page.locator('[data-ride="acceleration"]').click();
      assert.equal(await page.locator("#rideDetail h3").textContent(), "Come on! Acceleration");
      await page.locator("#language").selectOption("ru");
      assert.equal(await page.locator("#rideDetail h3").textContent(), "Камон! Ускорение");
      assert.deepEqual(await page.evaluate(() => __motor.sent), []);
      await page.screenshot({path: path.join(output, "ride-garage-desktop.png"), fullPage: true});
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), true);
      await page.screenshot({path: path.join(output, "ride-garage-mobile.png"), fullPage: true});
      await context.close();
    });
    await check("named drafts persist across reload, are escaped, download and load through review", async () => {
      const { page, context } = await newPage(); await ready(page);
      await toPanel(page,"presets");
      await page.waitForFunction(() => !document.getElementById("garageSave").disabled);
      await page.locator("#garageName").fill("<b>Roscoe economy</b>");
      await page.locator("#garageNote").fill("48 V / 19.2 Ah · test ride");
      await page.locator("#garageSave").click();
      await page.waitForFunction(() => document.querySelectorAll("#garageSaved article").length === 1);
      assert.equal(await page.locator("#garageSaved b").count(), 0);
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#garageSaved").getByRole("button", {name:"Скачать .el",exact:true}).click();
      const downloaded = await downloadPromise;
      assert.match(fs.readFileSync(await downloaded.path(),"utf8"), /\[Basic\]/);
      const archivePromise = page.waitForEvent("download");
      await page.locator("#garageArchive").click();
      const archiveDownload = await archivePromise;
      const archive = JSON.parse(fs.readFileSync(await archiveDownload.path(),"utf8"));
      assert.equal(archive.format,"bbs-flash-garage");
      assert.equal(archive.profiles.length,1);
      assert.equal(archive.profiles[0].name,"<b>Roscoe economy</b>");
      await page.reload(); await page.waitForFunction(() => document.querySelectorAll("#garageSaved article").length === 1);
      await toPanel(page,"basic"); await page.locator("#bas-LC").fill("14");
      await toPanel(page,"presets");
      await page.locator("#garageSaved").getByRole("button", {name:"Сравнить и загрузить",exact:true}).click();
      assert.equal(await page.locator("#bas-LC").inputValue(),"14");
      await page.locator("#rideReviewApply").click();
      assert.equal(await page.locator("#bas-LC").inputValue(),"18");
      assert.match(await page.locator("#source").textContent(), /черновик из гаража/);
      assert.equal(await page.locator("#writeAll").isDisabled(),true);
      await context.close();
    });
    await check("compare a supplied Penoff file without changing the draft; malformed file leaves comparison intact", async () => {
      const { page, context } = await newPage(); await ready(page);
      await toPanel(page,"simulator");
      await page.locator("#compareFile").setInputFiles(path.join(__dirname,"fixtures/penoff-supplied.el"));
      await page.waitForFunction(() => document.getElementById("compare").value === "my-file");
      assert.equal(await page.locator("#bas-LC").inputValue(),"18");
      const comparison = await page.locator("#simRows").textContent();
      assert.match(await page.locator("#compareDiff").textContent(), /25/);
      await page.locator("#compareFile").setInputFiles({name:"broken.el",mimeType:"text/plain",buffer:Buffer.from("[Basic]\nLC=99")});
      await page.waitForFunction(() => document.getElementById("compareFile").value === "");
      assert.equal(await page.locator("#simRows").textContent(),comparison);
      assert.equal(await page.locator("#bas-LC").inputValue(),"18");
      await context.close();
    });
    await check("IndexedDB v1 upgrade preserves backups/preferences and exposes complete backup history", async () => {
      const { page, context } = await newPage();
      await page.goto(base+"/");
      const seed = {id:"legacy-1",sessionId:"old",at:"2026-09-17T00:00:00Z",device:{manufacturer:"HZXT",model:"SZZ9",fw:"2.0.1.1",hw:"1.0",nominalCode:2,maxCurrent:25},profile:require("./helpers.cjs").profile,raw:frames};
      await page.evaluate(async (seed) => {
        await new Promise((resolve,reject) => {
          const req = indexedDB.open("bbsflash-release",1);
          req.onupgradeneeded = () => {req.result.createObjectStore("prefs");req.result.createObjectStore("backups",{keyPath:"id"});};
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db=req.result, tx=db.transaction(["prefs","backups"],"readwrite");
            tx.objectStore("backups").put(seed);
            tx.objectStore("prefs").put(seed.id,"latestBackup");
            tx.objectStore("prefs").put("light","theme");
            tx.oncomplete=()=>{db.close();resolve();}; tx.onerror=()=>reject(tx.error);
          };
        });
      },seed);
      await ready(page);
      await page.waitForFunction(() => document.querySelectorAll("#garageBackups article").length === 1);
      assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
      assert.deepEqual(await page.evaluate(async()=> (await BBSStore.latest()).profile),seed.profile);
      assert.equal(await page.evaluate(async()=> (await BBSStore.ready).version),2);
      await toPanel(page,"presets");
      await page.locator(".garage-library details > summary").click();
      await page.locator("#garageBackups").getByRole("button",{name:"Сравнить и загрузить",exact:true}).click();
      assert.equal(await page.locator("#rideReviewDialog").isVisible(),true);
      await page.locator("#rideReviewCancel").click();
      await context.close();
    });
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
