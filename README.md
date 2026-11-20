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
| `send_telegram.sh` | Sends the daily link to a Telegram chat |
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

## Daily Telegram message (free)

Telegram is used instead of WhatsApp because the Bot API is official, free, and
needs no business verification, no template approval, and no third-party
sign-up by the recipient. The only trade-off: the message arrives from a bot
you name, not from your personal number.

Setup (once):

1. In Telegram, message [@BotFather](https://t.me/BotFather) → `/newbot`,
   pick a name (e.g. `Flores para ti`), copy the token it gives you.
2. Your girlfriend opens the bot (search its username) and taps **Start**. This
   is required — a bot can't message someone who hasn't started it first.
3. Get her chat id — run this on any machine:

   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | python3 -m json.tool
   ```

   Her `chat` → `id` is the number you want.
4. Edit `send_telegram.sh` and fill in `BOT_TOKEN`, `CHAT_ID`, and `URL`.
   Then:

   ```bash
   chmod +x send_telegram.sh
   ./send_telegram.sh          # test it — she should get a message now
   ```

5. Schedule it. `crontab -e` and add (8:00 every morning, Madrid time —
   change the timezone/hour to taste):

   ```cron
   CRON_TZ=Europe/Madrid
   0 8 * * * /root/flowers-for-you/send_telegram.sh
   ```

That's the whole system: reload-friendly static site + one cron line.
