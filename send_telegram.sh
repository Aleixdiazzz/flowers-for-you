#!/usr/bin/env bash
# Sends today's flower link to your girlfriend via a Telegram bot.
# Called daily from cron. Free, official Telegram Bot API — no limits that
# matter for one message a day.
set -euo pipefail

# ---- configure these (see README.md) ----
BOT_TOKEN="REPLACE_WITH_BOT_TOKEN"   # from @BotFather
CHAT_ID="REPLACE_WITH_CHAT_ID"       # her Telegram chat id
URL="https://YOUR-DOMAIN-OR-IP"      # where the app is hosted
# ------------------------------------------

GREETINGS=(
  "Buenos días, amor ♥"
  "Buenos días, preciosa ♥"
  "Despierta, que hoy también hay flores para ti ♥"
  "Para que empieces el día con una sonrisa ♥"
)
GREETING="${GREETINGS[$((RANDOM % ${#GREETINGS[@]}))]}"

# Real newlines; --data-urlencode will URL-encode them for the API.
TEXT="$(printf '%s\n\nTe he traído flores:\n%s' "$GREETING" "$URL")"

curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${CHAT_ID}" \
  --data-urlencode "text=${TEXT}" \
  -o /tmp/flowers-telegram-response.json

# One-line log so cron mail / debugging shows what happened.
printf '%s sent: %s\n' "$(date '+%F %T')" "$URL" >> "${HOME}/flowers-telegram.log"
