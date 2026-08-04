#!/bin/bash
# ============================================================
# BBS Flash -> neochoice.ru/bafang deploy script
# Тянет файлы напрямую с GitHub (raw), не зависит от того,
# что уже лежит на сервере.
# Запускать на сервере 5.181.23.24 под root.
# Безопасно перезапускать несколько раз (идемпотентно).
# Рекомендуется запускать внутри tmux.
# ============================================================
set -e

# ---- НАСТРОЙКА: поправьте под свой репозиторий, если нужно ----
GH_USER="xftesht-coder"
GH_REPO="bbs-flash"
GH_BRANCH="main"
RAW_BASE="https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}"
# -----------------------------------------------------------------

echo "=== 1/7: Проверка окружения ==="

if ! command -v tmux &> /dev/null; then
  echo "tmux не найден, ставлю..."
  apt update -qq && apt install -y tmux
fi

if [ -z "$TMUX" ]; then
  echo "⚠️  Вы не внутри tmux-сессии."
  echo "    Рекомендуется прервать (Ctrl+C) и запустить: tmux new -s work"
  echo "    Продолжаю через 5 секунд без tmux..."
  sleep 5
fi

echo "=== 2/7: Создание структуры папок ==="

mkdir -p /var/www/neochoice.ru/bafang/docs
echo "✅ /var/www/neochoice.ru/bafang/docs создана"

echo "=== 3/7: Скачивание файлов с GitHub ($RAW_BASE) ==="

download() {
  local url="$1"
  local dest="$2"
  local min_size="$3"
  echo "  → $url"
  if curl -fsSL "$url" -o "$dest.tmp"; then
    local size
    size=$(stat -c%s "$dest.tmp")
    if [ "$size" -lt "$min_size" ]; then
      echo "  ⚠️  Файл подозрительно маленький (${size} байт) — возможно 404 или заглушка GitHub."
      echo "      Содержимое начала файла:"
      head -c 200 "$dest.tmp"
      echo ""
      read -p "      Всё равно использовать? (y/n): " confirm
      if [ "$confirm" != "y" ]; then
        rm -f "$dest.tmp"
        echo "  Пропущено: $dest"
        return 1
      fi
    fi
    mv "$dest.tmp" "$dest"
    echo "  ✅ Сохранено: $dest (${size} байт)"
  else
    echo "  ❌ Не удалось скачать $url (проверьте имя файла/ветку в репозитории)"
    rm -f "$dest.tmp"
    return 1
  fi
}

download "$RAW_BASE/bbs-flash.html" "/var/www/neochoice.ru/bafang/index.html" 60000
download "$RAW_BASE/bafang_intelligence.md" "/var/www/neochoice.ru/bafang/docs/bafang_intelligence.md" 5000
download "$RAW_BASE/ROADMAP.md" "/var/www/neochoice.ru/bafang/docs/ROADMAP.md" 2000
download "$RAW_BASE/CLAUDE_CODE_PROMPTS.md" "/var/www/neochoice.ru/bafang/docs/CLAUDE_CODE_PROMPTS.md" 2000
download "$RAW_BASE/bafang_intelligence_reader.html" "/var/www/neochoice.ru/bafang/docs/report.html" 20000

echo "=== 4/7: Простая страница-список в /docs ==="

cat > /var/www/neochoice.ru/bafang/docs/index.html << 'DOCEOF'
<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>BBS Flash — документация</title>
<style>body{font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px;color:#16181c;background:#f4f2ed}
a{color:#d92b1f;text-decoration:none;font-weight:600} a:hover{text-decoration:underline}
li{margin-bottom:12px;font-size:16px}</style></head>
<body>
<h1>BBS Flash — документация</h1>
<ul>
<li><a href="report.html">Bafang Intelligence Report (читаемая версия)</a></li>
<li><a href="bafang_intelligence.md">bafang_intelligence.md (исходник)</a></li>
<li><a href="ROADMAP.md">ROADMAP.md</a></li>
<li><a href="CLAUDE_CODE_PROMPTS.md">CLAUDE_CODE_PROMPTS.md</a></li>
</ul>
<p><a href="../">← Назад к приложению</a></p>
</body></html>
DOCEOF
echo "✅ docs/index.html создан"

echo "=== 5/7: Настройка nginx ==="

NGINX_CONF="/etc/nginx/sites-available/neochoice.ru"
if [ -f "$NGINX_CONF" ]; then
  if ! grep -q '\\.md\$' "$NGINX_CONF"; then
    python3 - "$NGINX_CONF" <<'PYEOF'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
insertion = '\n    location ~ \\.md$ {\n        add_header Content-Type text/plain;\n    }\n'
idx = content.find('server {')
if idx != -1:
    i = content.find('{', idx)
    depth = 1
    i += 1
    while depth > 0 and i < len(content):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
        i += 1
    end = i - 1
    content = content[:end] + insertion + content[end:]
    with open(path, 'w') as f:
        f.write(content)
    print("✅ location ~ \\.md$ добавлен")
else:
    print("⚠️  Не нашёл server{} блок, пропускаю правку .md")
PYEOF
  else
    echo "✅ Правило для .md уже есть в конфиге"
  fi
else
  echo "❌ ОШИБКА: $NGINX_CONF не найден"
  exit 1
fi

echo "=== 6/7: Проверка и перезагрузка nginx ==="

if nginx -t; then
  systemctl reload nginx
  echo "✅ nginx перезагружен"
else
  echo "❌ ОШИБКА в конфиге nginx. НЕ перезагружаю. Проверьте вывод выше."
  exit 1
fi

echo "=== 7/7: HTTPS-сертификат ==="

if command -v certbot &> /dev/null; then
  echo "certbot уже установлен"
else
  echo "Устанавливаю certbot..."
  apt install -y certbot python3-certbot-nginx
fi

if [ -d /etc/letsencrypt/live/neochoice.ru ]; then
  echo "✅ Сертификат для neochoice.ru уже существует, пропускаю"
else
  echo "Получаю сертификат (потребуется email)..."
  certbot --nginx -d neochoice.ru -d www.neochoice.ru
fi

echo ""
echo "============================================================"
echo "ГОТОВО. Проверьте ссылки:"
echo "  https://neochoice.ru/bafang/"
echo "  https://neochoice.ru/bafang/docs/"
echo "  https://neochoice.ru/bafang/docs/report.html"
echo "============================================================"

curl -sI https://neochoice.ru/bafang/ 2>/dev/null | head -1 || echo "(curl-проверка не удалась, проверьте вручную в браузере)"

NGINX_CONF="/etc/nginx/sites-available/neochoice.ru"
if [ -f "$NGINX_CONF" ]; then
  if ! grep -q '\\.md\$' "$NGINX_CONF"; then
    # Вставляем location для .md перед последней закрывающей скобкой первого server{}
    python3 - "$NGINX_CONF" <<'PYEOF'
import sys, re
path = sys.argv[1]
with open(path) as f:
    content = f.read()
# Добавляем location ~ \.md$ внутрь первого server{} блока, перед его закрывающей }
insertion = '\n    location ~ \\.md$ {\n        add_header Content-Type text/plain;\n    }\n'
idx = content.find('server {')
if idx != -1:
    # находим конец этого блока по балансу скобок
    depth = 0
    i = content.find('{', idx)
    start = i
    depth = 1
    i += 1
    while depth > 0 and i < len(content):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
        i += 1
    end = i - 1  # позиция закрывающей }
    content = content[:end] + insertion + content[end:]
    with open(path, 'w') as f:
        f.write(content)
    print("✅ location ~ \\.md$ добавлен")
else:
    print("⚠️  Не нашёл server{} блок, пропускаю правку .md")
PYEOF
  else
    echo "✅ Правило для .md уже есть в конфиге"
  fi
else
  echo "❌ ОШИБКА: $NGINX_CONF не найден"
  exit 1
fi

echo "=== 6/7: Проверка и перезагрузка nginx ==="

if nginx -t; then
  systemctl reload nginx
  echo "✅ nginx перезагружен"
else
  echo "❌ ОШИБКА в конфиге nginx. НЕ перезагружаю. Проверьте вывод выше."
  exit 1
fi

echo "=== 7/7: HTTPS-сертификат ==="

if command -v certbot &> /dev/null; then
  echo "certbot уже установлен"
else
  echo "Устанавливаю certbot..."
  apt install -y certbot python3-certbot-nginx
fi

if [ -d /etc/letsencrypt/live/neochoice.ru ]; then
  echo "✅ Сертификат для neochoice.ru уже существует, пропускаю"
else
  echo "Получаю сертификат (потребуется email)..."
  certbot --nginx -d neochoice.ru -d www.neochoice.ru
fi

echo ""
echo "============================================================"
echo "ГОТОВО. Проверьте ссылки:"
echo "  https://neochoice.ru/bafang/"
echo "  https://neochoice.ru/bafang/docs/"
echo "  https://neochoice.ru/bafang/docs/report.html"
echo "============================================================"

curl -sI https://neochoice.ru/bafang/ 2>/dev/null | head -1 || echo "(curl-проверка не удалась, проверьте вручную в браузере)"
