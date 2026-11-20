# flowers-for-you

A tiny web app that shows a spinning 3D ASCII flower bouquet (daisies, tulips,
paper wrap, ribbon, baby's breath, sparkles, floating hearts) with a love quote
underneath. Every page load produces a new arrangement and a new quote. Built
for a mobile browser (Safari), so the art auto-scales to fit the screen with no
horizontal scrolling.

Ported from the terminal animation in
[alishsharma17/Ascii-Flower-Bouquet-](https://github.com/alishsharma17/Ascii-Flower-Bouquet-)
(rendered here with CSS colors instead of ANSI codes, and re-seeded on every
load so it never repeats).

Everything is static: plain HTML + JS, no server, no API keys, no dependencies.
Quotes are bundled, so it works offline and never shows an off-message quote.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page + styles |
| `bouquet.js` | The 3D bouquet generator and animation |
| `quotes.js` | The bundled love-quote list (edit freely) |
| `send_flowers.py` | Sends the daily link from your own Telegram account (userbot) |
| `deploy/docker-compose.yml` | nginx:alpine container for the VPS deploy |
| `test-bouquet.js` | Headless sanity test (`node test-bouquet.js`) |

## Make it yours

- The quotes: edit the `LOVE_QUOTES` array in `quotes.js`.
- Colors: the palette lists at the top of `bouquet.js` (xterm-256 codes, same
  as the original).

You can force a specific bouquet with `?seed=1234` on the URL (useful for
testing or keeping a particular one).

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to your VPS (free)

Live at https://flowers.example.com on the Hetzner box `SERVER_IP`
(Ubuntu 24.04, Docker), behind the existing Caddy reverse proxy. $0.

Layout on the server:

- `/root/flowers-for-you/site/` — the static files (`index.html`, `bouquet.js`, `quotes.js`).
- `/root/flowers-for-you/docker-compose.yml` — runs `nginx:alpine` (container `flowers_nginx`) on `xpose-network`.
- Caddy block `flowers.example.com` in `/root/astro-portfolio/XposePortfolio/Caddyfile.static`.

Update the site after pushing changes:

```bash
scp index.html bouquet.js quotes.js root@SERVER_IP:/root/flowers-for-you/site/
```

To change the Caddy config, append a block to `Caddyfile.static` then rebuild:

```bash
cd ~/astro-portfolio/XposePortfolio
docker compose -f docker-compose.static.yml up -d --build caddy
```

Caddy obtains and renews TLS automatically — no certbot.

## Daily Telegram message (free, from your own account)

The message is sent from YOUR Telegram account — a small "userbot" on the VPS —
so it arrives like a normal text from you. No bot, nothing for her to set up,
and she has no idea it's automated: a surprise good-morning with the link.

Setup (once):

1. Get API credentials: log in at https://my.telegram.org → "API development
   tools" → create an app. Note the `api_id` and `api_hash`.
2. On the VPS, request a login code:

   ```bash
   TG_API_ID=12345 TG_API_HASH=abc123 TG_PHONE=+34XXXXXXXXX \
     /root/flowers-for-you/venv/bin/python /root/flowers-for-you/send_flowers.py request
   ```

3. Telegram sends a code to your phone. Complete login (add `TG_2FA=...` if you
   have two-step verification enabled):

   ```bash
   TG_API_ID=12345 TG_API_HASH=abc123 TG_CODE=12345 \
     /root/flowers-for-you/venv/bin/python /root/flowers-for-you/send_flowers.py login
   ```

   This saves a session file, so steps 2–3 happen only once.

4. Test it (sends her a message immediately):

   ```bash
   TG_API_ID=12345 TG_API_HASH=abc123 TG_RECIPIENT=+34YYYYYYYYY \
     /root/flowers-for-you/venv/bin/python /root/flowers-for-you/send_flowers.py
   ```

   `TG_RECIPIENT` is her phone number or `@username`.

5. Schedule it. `crontab -e` and add (08:00 every morning, Madrid time):

   ```cron
   CRON_TZ=Europe/Madrid
   0 8 * * * TG_API_ID=12345 TG_API_HASH=abc123 TG_RECIPIENT=+34YYYYYYYYY /root/flowers-for-you/venv/bin/python /root/flowers-for-you/send_flowers.py
   ```

Honest note: automating a personal account is technically against Telegram's
ToS. For one message a day from a real account the risk is negligible; the
session file is stored root-only on the VPS.
