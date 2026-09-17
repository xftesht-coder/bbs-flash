const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  read = (p) => fs.readFileSync(path.join(root, p), "utf8");
test("root landing is tracked, identical to legacy landing, and opens current app", () => {
  assert.equal(read("index.html"), read("landing.html"));
  assert.ok(!read(".gitignore").split(/\r?\n/).includes("index.html"));
  assert.match(read("index.html"), /href="\.\/bbs-flash.html"/);
});
test("release pages reference existing local assets and have no inline script or stale production domains", () => {
  for (const file of ["index.html", "landing.html", "bbs-flash.html"]) {
    const html = read(file);
    for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g))
      assert.ok(
        fs.existsSync(path.join(root, match[1])),
        `${file}: ${match[1]}`,
      );
    assert.ok(!/<script>(?!\s*<)/.test(html));
    assert.ok(
      !/bbsflash\.neochoice|без спецкабелей|окирпичить|Telegram: @bbsflash/.test(
        html,
      ),
    );
    assert.match(html, /Content-Security-Policy/);
  }
});
test("no localStorage or service worker; legacy app URLs cannot run old write paths", () => {
  for (const file of ["src/app.js", "src/storage.js", "src/landing.js"])
    assert.ok(!/localStorage|serviceWorker\.register/.test(read(file)));
  for (const file of [
    "assets/bbs-flash.html",
    "docs-v3/bbs-flash.html",
    "docs-v3/bbs-flash_1.html",
    "docs-v3/bbs-flash_2.html",
    "docs-v3/bbs-flash_3.html",
  ]) {
    assert.match(read(file), /url=\.\.\/bbs-flash.html/);
    assert.ok(!/<script/.test(read(file)));
  }
});
test("version labels and release documentation agree", () => {
  const version = JSON.parse(read("package.json")).version;
  for (const file of [
    "bbs-flash.html",
    "index.html",
    "README.md",
    "CHANGELOG.md",
    "docs/RELEASE.md",
  ])
    assert.ok(read(file).includes(version), file);
  assert.match(
    read("ROADMAP.md"),
    /\[ \] Чтение\/запись каждого блока на физическом/,
  );
});
