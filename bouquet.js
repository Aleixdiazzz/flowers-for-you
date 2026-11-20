/* bouquet.js — spinning 3D ASCII flower bouquet for the browser.
 * Ported from bouquet3d.py by alishsharma17 (Ascii-Flower-Bouquet-).
 * Renders daisies, tulips, paper wrap, ribbon, baby's breath, sparkles and
 * floating hearts with per-character color. Every load re-seeds the scene so
 * the arrangement and colors change.
 */
(function () {
  "use strict";

  // ---------- Configuration ----------
  const CONFIG = {
    message: "for you ♥",   // <-- put her name here, e.g. "para ti ♥"
    fps: 22,
    spinSpeed: 0.6,
    tilt: 0.3,
    camDist: 4.0,
    minHearts: 12,
    maxHearts: 22,
  };

  // 256-color terminal palette indices (same meaning as the Python original).
  const WHITE = [244, 248, 251, 254, 255, 231];
  const PINK = [125, 162, 168, 205, 211, 218, 225];
  const RED = [52, 88, 124, 160, 196, 203];
  const PURPLE = [54, 91, 97, 134, 140, 183];
  const YELLOW = [136, 178, 214, 220, 226, 229];
  const ORANGE = [130, 166, 202, 208, 214, 216];
  const GOLD_CENTER = [94, 136, 178, 214, 220];
  const DARK_CENTER = [52, 58, 94, 130, 136];
  const GREENS = [22, 28, 28, 34, 35, 71, 77, 114];
  const PAPER = [101, 144, 187, 223, 230, 231];
  const RIBBON = [88, 125, 161, 197, 204, 211];
  const HEART_COLORS = [161, 197, 204, 205, 211, 218];
  const MSG_COLORS = [161, 168, 205, 211, 218, 225, 218, 211, 205, 168];

  const SHADE = ".:-=+*%@";
  const PETAL_SHADE = "+*#%";
  const PIVOT_Y = 0.2;

  const BASE_DISC_TYPES = [
    [WHITE, GOLD_CENTER, 13],
    [PINK, GOLD_CENTER, 8],
    [RED, DARK_CENTER, 6],
    [PURPLE, GOLD_CENTER, 7],
    [YELLOW, DARK_CENTER, 12],
    [ORANGE, DARK_CENTER, 9],
  ];
  const BASE_TULIP_COLORS = [RED, PINK, YELLOW];

  // Light direction, normalized.
  const _n = Math.hypot(-0.45, 0.6, 0.66);
  const LX = -0.45 / _n, LY = 0.6 / _n, LZ = 0.66 / _n;

  // ---------- xterm 256 -> CSS color ----------
  const CSS_COLORS = (function () {
    const t = [];
    const ansi = [
      0x000000, 0x800000, 0x008000, 0x808000, 0x000080, 0x800080, 0x008080, 0xc0c0c0,
      0x808080, 0xff0000, 0x00ff00, 0xffff00, 0x0000ff, 0xff00ff, 0x00ffff, 0xffffff,
    ];
    for (let i = 0; i < 16; i++) t.push("rgb(" + (ansi[i] >> 16 & 255) + "," + (ansi[i] >> 8 & 255) + "," + (ansi[i] & 255) + ")");
    const levels = [0, 95, 135, 175, 215, 255];
    for (let r = 0; r < 6; r++)
      for (let g = 0; g < 6; g++)
        for (let b = 0; b < 6; b++)
          t.push("rgb(" + levels[r] + "," + levels[g] + "," + levels[b] + ")");
    for (let i = 232; i <= 255; i++) {
      const v = 8 + 10 * (i - 232);
      t.push("rgb(" + v + "," + v + "," + v + ")");
    }
    return t;
  })();

  // ---------- small math helpers ----------
  function norm(v) {
    const m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1.0;
    return [v[0] / m, v[1] / m, v[2] / m];
  }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function add(p, d, k) {
    return [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
  }
  function clamp01(x) { return Math.min(0.999, Math.max(0.0, x)); }

  // Deterministic PRNG so a seed reproduces the same bouquet.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ---------- scene construction ----------
  function buildScene(rnd) {
    const pts = [];
    const neck = [0.0, -0.12, 0.0];

    const C = [0.0, 0.12, 0.0], D = 0.64;
    const N = 10;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const heads = [];
    for (let i = 0; i < N; i++) {
      const el = (88 - 60 * Math.sqrt(i / (N - 1))) * Math.PI / 180;
      const az = i * golden;
      const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
      const pos = add(C, d, D * (0.92 + rnd() * 0.13));
      heads.push([pos, norm(d)]);
    }

    // Randomize which two heads are tulips, and shuffle the palettes.
    const tulipSlots = new Set();
    while (tulipSlots.size < 2) tulipSlots.add(Math.floor(rnd() * N));
    const DISC_TYPES = shuffle(BASE_DISC_TYPES, rnd);
    const TULIP_COLORS = shuffle(BASE_TULIP_COLORS, rnd);

    const flowers = [];
    let discI = 0;
    for (let idx = 0; idx < heads.length; idx++) {
      const pos = heads[idx][0], axis = heads[idx][1];
      const base = add(pos, axis, -0.03);
      for (let j = 0; j < 70; j++) {
        const t = j / 69;
        const p = [
          base[0] + (neck[0] - base[0]) * t,
          base[1] + (neck[1] - base[1]) * t,
          base[2] + (neck[2] - base[2]) * t,
        ];
        pts.push([p[0], p[1], p[2], axis[0], 0.0, axis[2], GREENS, -0.15, true, null]);
      }
      if (tulipSlots.has(idx)) {
        const nT = [...tulipSlots].filter(k => k < idx).length;
        flowers.push([pos, "tulip", TULIP_COLORS[nT % TULIP_COLORS.length], null, 0, 0.11, rnd() * 6.28]);
      } else {
        const [petals, center, nPet] = DISC_TYPES[discI % DISC_TYPES.length];
        discI++;
        flowers.push([pos, "disc", petals, center, nPet, 0.12 + rnd() * 0.02, rnd() * 6.28]);
      }
    }

    // Leaves
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.4) / 8 * 2 * Math.PI;
      const c = Math.cos(a), s = Math.sin(a);
      const base = [0.26 * c, 0.30, 0.26 * s];
      const d = norm([c, 0.15, s]);
      const side = [-s, 0.0, c];
      const n = norm(cross(side, d));
      const L = 0.30, W = 0.07;
      for (let ti = 0; ti < 32; ti++) {
        const t = ti / 31;
        for (let wi = -5; wi <= 5; wi++) {
          const w = wi / 5;
          const curl = 0.025 * w * w;
          const p = [
            base[0] + d[0] * L * t + side[0] * W * Math.sin(Math.PI * t) * w + n[0] * curl,
            base[1] + d[1] * L * t - 0.10 * t * t + n[1] * curl,
            base[2] + d[2] * L * t + side[2] * W * Math.sin(Math.PI * t) * w + n[2] * curl,
          ];
          const rib = wi === 0 ? -0.25 : 0.0;
          pts.push([p[0], p[1], p[2], n[0], n[1], n[2], GREENS, rib, true, null]);
        }
      }
    }

    // Paper wrap (cone with folds)
    const y0 = -0.20, y1 = 0.30, r0 = 0.06, r1 = 0.36;
    const k = (r1 - r0) / (y1 - y0);
    const rings = 50;
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      const r = r0 + (r1 - r0) * t;
      const count = Math.max(8, Math.floor(170 * r));
      for (let j = 0; j < count; j++) {
        const ph = (j + rnd()) / count * 2 * Math.PI;
        const c = Math.cos(ph), s = Math.sin(ph);
        let y = y0 + (y1 - y0) * t;
        if (t > 0.9) y += 0.03 * Math.sin(9 * ph);
        const fold = 0.3 * (Math.abs(Math.sin(5 * ph)) - 0.6);
        const nn = norm([c, -k, s]);
        pts.push([r * c, y, r * s, nn[0], nn[1], nn[2], PAPER, fold, false, null]);
      }
    }

    // Stems below the wrap
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * 2 * Math.PI;
      const sx = 0.025 * Math.cos(a), sz = 0.025 * Math.sin(a);
      for (let j = 0; j < 40; j++) {
        const t = j / 39;
        pts.push([sx * (1 + 1.2 * t), -0.20 - 0.30 * t, sz * (1 + 1.2 * t), Math.cos(a), 0.0, Math.sin(a), GREENS, -0.1, true, null]);
      }
    }

    // Ribbon band + knot + bow
    const by = -0.12;
    const br = r0 + k * (by - y0) + 0.01;
    for (let j = 0; j < 90; j++) {
      const ph = j / 90 * 2 * Math.PI;
      for (const dy of [-0.012, 0.0, 0.012]) {
        pts.push([br * Math.cos(ph), by + dy, br * Math.sin(ph), Math.cos(ph), 0.0, Math.sin(ph), RIBBON, 0.0, false, null]);
      }
    }
    const knot = [0.0, by, br + 0.01];
    for (const side of [-1, 1]) {
      for (let j = 0; j < 70; j++) {
        const a = j / 70 * 2 * Math.PI;
        const lx = side * (0.07 + 0.07 * Math.cos(a));
        const ly = 0.04 * Math.sin(a) + 0.02 * (0.07 + 0.07 * Math.cos(a)) / 0.14;
        for (const fill of [1.0, 0.7]) {
          pts.push([knot[0] + lx * fill, knot[1] + ly * fill, knot[2] + 0.01, side * 0.3, 0.2, 0.93, RIBBON, 0.1, true, null]);
        }
      }
      for (let j = 0; j < 30; j++) {
        const t = j / 29;
        pts.push([knot[0] + side * 0.06 * t, knot[1] - 0.15 * t, knot[2] + 0.015, side * 0.2, 0.0, 0.98, RIBBON, -0.05 + 0.05 * Math.sin(t * 9), true, null]);
      }
    }
    for (const dx of [-0.01, 0.0, 0.01]) {
      pts.push([dx, by, knot[2] + 0.02, 0, 0, 1, RIBBON, 0.2, true, "@"]);
    }

    // Baby's breath
    const babies = [];
    const nBabies = 70 + Math.floor(rnd() * 41);
    for (let i = 0; i < nBabies; i++) {
      const a = rnd() * 2 * Math.PI;
      const el = 0.3 + rnd() * 1.1;
      const rr = 0.40 + rnd() * 0.18;
      babies.push([rr * Math.cos(a) * Math.cos(el), C[1] + rr * Math.sin(el), rr * Math.sin(a) * Math.cos(el), rnd() * 6.28]);
    }

    // Sparkles
    const sparkles = [];
    const nSparkles = 20 + Math.floor(rnd() * 21);
    for (let i = 0; i < nSparkles; i++) {
      const a = rnd() * 2 * Math.PI;
      const rr = 0.75 + rnd() * 0.20;
      sparkles.push([rr * Math.cos(a), -0.3 + rnd() * 1.3, rr * Math.sin(a), rnd() * 6.28, 1.5 + rnd() * 2.5]);
    }

    return { pts, flowers, babies, sparkles };
  }

  // ---------- rendering ----------
  function render(scene, t, cols, rows, hearts) {
    const { pts, flowers, babies, sparkles } = scene;
    const chars = Array.from({ length: rows }, () => new Array(cols).fill(" "));
    const colors = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const zbuf = Array.from({ length: rows }, () => new Array(cols).fill(-1e9));

    const viewRows = rows - 2;
    const scale = Math.max(1.0, Math.min((viewRows - 2) / 1.45, (cols - 2) / 2.7));
    const sxScale = scale * 2.0;
    const cx = cols / 2;
    const cy = 1 + 0.78 * scale;

    const ang = t * CONFIG.spinSpeed;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const ct = Math.cos(CONFIG.tilt), st = Math.sin(CONFIG.tilt);

    function project(x, y, z) {
      const xr = x * ca - z * sa;
      const zr = x * sa + z * ca;
      const yp = y - PIVOT_Y;
      const yt = yp * ct - zr * st;
      const zt = yp * st + zr * ct;
      const f = CONFIG.camDist / (CONFIG.camDist - zt);
      return [Math.floor(cx + xr * f * sxScale), Math.floor(cy - yt * f * scale), zt];
    }
    function projectF(x, y, z) {
      const xr = x * ca - z * sa;
      const zr = x * sa + z * ca;
      const yp = y - PIVOT_Y;
      const yt = yp * ct - zr * st;
      const zt = yp * st + zr * ct;
      const f = CONFIG.camDist / (CONFIG.camDist - zt);
      return [cx + xr * f * sxScale, cy - yt * f * scale, zt, f];
    }
    function plot(col, row, z, ch, color) {
      if (row >= 0 && row < viewRows && col >= 0 && col < cols && z > zbuf[row][col]) {
        zbuf[row][col] = z;
        chars[row][col] = ch;
        colors[row][col] = color;
      }
    }

    // Floating hearts
    for (const h of hearts) {
      const col = Math.floor((h[0] + 0.015 * Math.sin(t * 1.2 + h[3])) * cols) % cols;
      plot(col, Math.floor(h[1] * viewRows), -50, "♥", h[4]);
    }

    // Point cloud (stems, leaves, wrap, ribbon, etc.)
    for (const p of pts) {
      const [x, y, z, nx, ny, nz, pal, tone, twoSided, override] = p;
      const pr = project(x, y, z);
      const col = pr[0], row = pr[1], zt = pr[2];
      const nxr = nx * ca - nz * sa;
      const nzr = nx * sa + nz * ca;
      const nyt = ny * ct - nzr * st;
      const nzt = ny * st + nzr * ct;
      let dot = nxr * LX + nyt * LY + nzt * LZ;
      if (twoSided && dot < 0) dot = -dot * 0.55;
      let b = 0.25 + 0.75 * Math.max(0.0, dot) + tone;
      b = clamp01(b);
      let ch;
      if (override === "P") ch = PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)];
      else ch = override || SHADE[Math.floor(b * SHADE.length)];
      plot(col, row, zt, ch, pal[Math.floor(b * pal.length)]);
    }

    // Flower heads (disc daisies + tulips)
    for (const fl of flowers) {
      const [pos, kind, pal, cpal, nPet, R, seed] = fl;
      const pf = projectF(pos[0], pos[1], pos[2]);
      const fx = pf[0], fy = pf[1], zt = pf[2], f = pf[3];
      const rx = R * f * sxScale, ry = R * f * scale;
      const dim = -0.4 * (1 - Math.min(1.0, Math.max(0.0, (zt + 0.6) / 1.2)));
      const rot = seed + ang * 0.7;

      for (let row = Math.floor(fy - ry) - 1; row <= Math.floor(fy + ry) + 1; row++) {
        const dy = (row + 0.5 - fy) / ry;
        for (let col = Math.floor(fx - rx) - 1; col <= Math.floor(fx + rx) + 1; col++) {
          const dx = (col + 0.5 - fx) / rx;
          if (kind === "disc") {
            const s = Math.sqrt(dx * dx + dy * dy);
            if (s > 1.0) continue;
            if (s < 0.3) {
              let b = clamp01(0.55 - 0.35 * dx - 0.35 * dy + dim);
              plot(col, row, zt + 0.06, s < 0.17 ? "@" : "o", cpal[Math.floor(b * cpal.length)]);
              continue;
            }
            const ph = Math.atan2(dy, dx);
            const reach = 0.32 + 0.68 * Math.pow(Math.abs(Math.cos(nPet * (ph + rot) / 2)), 0.7);
            if (s > reach) continue;
            const edge = s > reach - 0.14 ? -0.22 : 0.0;
            let b = clamp01(0.62 - 0.22 * dx - 0.28 * dy + 0.12 * s + edge + dim);
            plot(col, row, zt + 0.04 * (1 - s), PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)], pal[Math.floor(b * pal.length)]);
          } else {
            const v = (1 - dy) / 2;
            if (v < 0 || v > 1) continue;
            const hw = 0.62 * Math.sin(Math.PI * 0.5 * Math.min(1.0, v * 1.5 + 0.05));
            if (hw <= 0 || Math.abs(dx) > hw) continue;
            const xn = dx / hw;
            if (v > 0.72 + 0.28 * Math.pow(Math.cos(1.5 * Math.PI * xn), 2)) continue;
            const seam = Math.abs(Math.abs(xn) - 0.33) < 0.12 && v > 0.3 ? -0.25 : 0.0;
            let b = clamp01(0.55 - 0.3 * xn + 0.1 * v + seam + dim);
            plot(col, row, zt + 0.03, PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)], pal[Math.floor(b * pal.length)]);
          }
        }
      }
    }

    // Baby's breath
    for (const b of babies) {
      const pr = project(b[0], b[1], b[2]);
      const star = Math.sin(t * 2 + b[3]) > 0.6;
      plot(pr[0], pr[1], pr[2] + 0.02, star ? "*" : "·", star ? 231 : 255);
    }

    // Sparkles
    for (const sp of sparkles) {
      const pr = project(sp[0], sp[1], sp[2]);
      const tw = Math.sin(t * sp[4] + sp[3]);
      if (tw > 0.85) plot(pr[0], pr[1], pr[2], "*", 231);
      else if (tw > 0.4) plot(pr[0], pr[1], pr[2], "+", 225);
      else if (tw > 0.0) plot(pr[0], pr[1], pr[2], "·", 218);
    }

    // Message row (animated color gradient)
    const msg = CONFIG.message;
    const mrow = rows - 2;
    const start = Math.max(0, Math.floor((cols - msg.length) / 2));
    const shift = Math.floor(t * 6);
    for (let i = 0; i < msg.length; i++) {
      if (start + i < cols) {
        chars[mrow][start + i] = msg[i];
        colors[mrow][start + i] = MSG_COLORS[(i + shift) % MSG_COLORS.length];
      }
    }

    // Build HTML string.
    let html = "";
    for (let r = 0; r < rows; r++) {
      const rc = chars[r], rcol = colors[r];
      let last = -1;
      for (let c = 0; c < cols; c++) {
        const ch = rc[c];
        if (ch !== " " && rcol[c] !== last) {
          if (last !== -1) html += "</span>";
          last = rcol[c];
          html += '<span style="color:' + CSS_COLORS[last] + '">';
        }
        html += ch === "<" ? "&lt;" : ch === "&" ? "&amp;" : ch;
      }
      if (last !== -1) html += "</span>";
      if (r < rows - 1) html += "\n";
    }
    return html;
  }

  // ---------- hearts state ----------
  function makeHearts() {
    const target = CONFIG.minHearts + Math.floor(Math.random() * (CONFIG.maxHearts - CONFIG.minHearts + 1));
    const hearts = [];
    for (let i = 0; i < target; i++) {
      hearts.push([
        Math.random(),
        1.0 + Math.random(),
        0.03 + Math.random() * 0.05,
        Math.random() * 6.28,
        HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      ]);
    }
    return hearts;
  }
  function updateHearts(hearts, dt) {
    for (const h of hearts) {
      h[1] -= h[2] * dt;
      if (h[1] < 0) {
        h[0] = Math.random();
        h[1] = 1.0;
        h[4] = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
      }
    }
  }

  // ---------- DOM wiring ----------
  function start() {
    const pre = document.getElementById("bouquet");
    const quoteEl = document.getElementById("quote");

    // Pick a random quote on load.
    const q = LOVE_QUOTES[Math.floor(Math.random() * LOVE_QUOTES.length)];
    quoteEl.textContent = "\u201C" + q.text + "\u201D";
    const authorEl = document.getElementById("quote-author");
    authorEl.textContent = q.author ? "— " + q.author : "";

    let seed = Math.floor(Math.random() * 1e9);
    const qs = new URLSearchParams(window.location.search);
    if (qs.has("seed")) seed = parseInt(qs.get("seed"), 10) || seed;

    const scene = buildScene(mulberry32(seed));
    const hearts = makeHearts();

    let cols, rows, fontPx;
    function measure() {
      const vw = Math.max(320, Math.min(window.innerWidth, 720));
      const maxCols = 80;
      cols = Math.max(28, Math.min(maxCols, Math.floor(vw / 10)));
      rows = Math.max(22, Math.min(40, Math.round(cols * 0.78)));
      // 0.6 em per column is the typical monospace advance width.
      fontPx = Math.floor(((vw - 16) / cols) / 0.6);
      if (fontPx < 7) fontPx = 7;
      pre.style.fontSize = fontPx + "px";
      pre.style.lineHeight = "1";
    }

    let last = performance.now();
    let acc = 0;
    const frame = 1000 / CONFIG.fps;
    let t = 0;

    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt * 1000;
      if (acc >= frame) {
        acc %= frame;
        updateHearts(hearts, dt);
        t += dt;
        pre.innerHTML = render(scene, t, cols, rows, hearts);
      }
      requestAnimationFrame(loop);
    }

    measure();
    pre.innerHTML = render(scene, 0, cols, rows, hearts);
    requestAnimationFrame(loop);

    let resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        measure();
        pre.innerHTML = render(scene, t, cols, rows, hearts);
      }, 120);
    });

    // Re-roll everything without a full page reload.
    document.getElementById("refresh").addEventListener("click", function () {
      const q2 = LOVE_QUOTES[Math.floor(Math.random() * LOVE_QUOTES.length)];
      quoteEl.textContent = "\u201C" + q2.text + "\u201D";
      authorEl.textContent = q2.author ? "— " + q2.author : "";
      seed = Math.floor(Math.random() * 1e9);
      Object.assign(scene, buildScene(mulberry32(seed)));
      hearts.length = 0;
      const target = CONFIG.minHearts + Math.floor(Math.random() * (CONFIG.maxHearts - CONFIG.minHearts + 1));
      for (let i = 0; i < target; i++) {
        hearts.push([Math.random(), 1.0 + Math.random(), 0.03 + Math.random() * 0.05, Math.random() * 6.28, HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)]]);
      }
      t = 0;
      pre.innerHTML = render(scene, t, cols, rows, hearts);
    });
  }

  if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else if (typeof document !== "undefined") {
    start();
  }

  // Export for Node-based tests.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { buildScene, render, mulberry32, makeHearts, CONFIG };
  }
})();
