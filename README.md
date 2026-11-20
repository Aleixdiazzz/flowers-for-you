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
| `send_flowers.py` | Optional: send a daily link to the app from a Telegram account |
| `deploy/docker-compose.yml` | Example nginx:alpine container for serving the static site |
| `test-bouquet.js` | Headless sanity test (`node test-bouquet.js`) |

## Make it yours

- The quotes: edit the `LOVE_QUOTES` array in `quotes.js`.
- The Telegram greeting: edit `GREETING` in `send_flowers.py`.
- Colors: the palette lists at the top of `bouquet.js` (xterm-256 codes, same
  as the original).

You can force a specific bouquet with `?seed=1234` on the URL.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
