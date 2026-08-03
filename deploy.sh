#!/bin/bash
set -e

echo "=== BBS Flash deploy: раскладка проектов по каталогам ==="

# --- 1. Каталоги ---
mkdir -p /var/www/html/bafang/docs
echo "[ok] каталоги созданы"

# --- 2. Перенос Room Scope на 9090 (если ещё не перенесён) ---
if grep -q "listen 80 default_server" /etc/nginx/sites-available/roomscope 2>/dev/null; then
  sed -i 's/listen 80 default_server;/listen 9090;/' /etc/nginx/sites-available/roomscope
  echo "[ok] roomscope переведён на порт 9090"
else
  echo "[skip] roomscope уже не на 80 (или файла нет — проверьте вручную)"
fi

# --- 3. Конфиг для BBS Flash на порту 80 ---
cat > /etc/nginx/sites-available/bbsflash <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.md$ {
        add_header Content-Type text/plain;
    }
}
EOF
ln -sf /etc/nginx/sites-available/bbsflash /etc/nginx/sites-enabled/bbsflash
echo "[ok] конфиг bbsflash создан и включён"

# --- 4. Разложить файлы, если они лежат в корне /var/www/html ---
cd /var/www/html

if [ -f bbs-flash.html ]; then
  mv -f bbs-flash.html bafang/index.html
  echo "[ok] bbs-flash.html -> bafang/index.html"
else
  echo "[warn] bbs-flash.html не найден в /var/www/html — залейте его туда вручную"
fi

for f in bafang_intelligence.md ROADMAP.md CLAUDE_CODE_PROMPTS.md bafang_intelligence_reader.html; do
  if [ -f "$f" ]; then
    mv -f "$f" "bafang/docs/$f"
    echo "[ok] $f -> bafang/docs/"
  fi
done

# --- 5. Главная страница-навигация ---
cat > /var/www/html/index.html <<'HTML'
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Проекты</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{--paper:#f4f2ed;--ink:#16181c;--dim:#5d6470;--red:#d92b1f;--rule:#d8d4cb;--card:#fff}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--paper);color:var(--ink);font-family:'Inter',sans-serif;padding:60px 24px;min-height:100vh}
  .wrap{max-width:720px;margin:0 auto}
  h1{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:40px;text-transform:uppercase;letter-spacing:.02em;margin-bottom:8px}
  h1 span{color:var(--red)}
  .sub{color:var(--dim);font-size:14px;margin-bottom:36px}
  .card{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:20px 22px;margin-bottom:14px;text-decoration:none;display:block;color:var(--ink);transition:.15s}
  .card:hover{border-color:var(--red);transform:translateY(-2px)}
  .card b{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px}
  .card span{font-size:13px;color:var(--dim)}
  .note{margin-top:32px;font-size:12px;color:var(--dim);border-left:3px solid var(--red);padding-left:12px;line-height:1.5}
</style>
</head>
<body>
<div class="wrap">
  <h1>Проекты<span>.</span></h1>
  <div class="sub">Антон — сервер 5.181.23.24</div>

  <a class="card" href="/bafang/">
    <b>BBS Flash</b>
    <span>Конфигуратор Bafang BBS02 через Web Serial API — read/write, симулятор, профили</span>
  </a>

  <a class="card" href="/bafang/docs/">
    <b>Документация проекта</b>
    <span>Intelligence report, roadmap, промты для Claude Code</span>
  </a>

  <a class="card" href="http://5.181.23.24:9090/">
    <b>Room Scope</b>
    <span>Отдельный проект — порт 9090</span>
  </a>

  <div class="note">Подключение к мотору (кнопка Connect) работает только по HTTPS или при открытии файла локально с диска — по обычному http:// браузер блокирует Web Serial API.</div>
</div>
</body>
</html>
HTML
echo "[ok] главная страница создана"

# --- 6. Страница-список в docs ---
cat > /var/www/html/bafang/docs/index.html <<'HTML'
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Документация — BBS Flash</title>
<style>
  body{background:#f4f2ed;color:#16181c;font-family:sans-serif;padding:50px 24px;max-width:640px;margin:0 auto}
  h1{margin-bottom:24px}
  a{display:block;background:#fff;border:1px solid #d8d4cb;border-radius:8px;padding:14px 18px;margin-bottom:10px;color:#16181c;text-decoration:none}
  a:hover{border-color:#d92b1f}
</style>
</head>
<body>
<h1>Документация BBS Flash</h1>
<a href="bafang_intelligence_reader.html">Intelligence Report (читаемая HTML-версия)</a>
<a href="bafang_intelligence.md">Intelligence Report (markdown)</a>
<a href="ROADMAP.md">Roadmap</a>
<a href="CLAUDE_CODE_PROMPTS.md">Промты для Claude Code</a>
<a href="../">← BBS Flash</a>
</body>
</html>
HTML
echo "[ok] индекс docs создан"

# --- 7. Проверка и запуск ---
nginx -t
if [ $? -eq 0 ]; then
  systemctl reload nginx
  echo "[ok] nginx перезагружен"
else
  echo "[FAIL] ошибка в конфиге nginx — смотри вывод выше, reload НЕ выполнен"
  exit 1
fi

echo ""
echo "=== ГОТОВО ==="
echo "http://5.181.23.24/              — навигация"
echo "http://5.181.23.24/bafang/       — приложение"
echo "http://5.181.23.24/bafang/docs/  — документация"
echo "http://5.181.23.24:9090/         — Room Scope"
