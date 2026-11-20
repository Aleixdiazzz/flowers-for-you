// Headless sanity test for bouquet.js — renders frames and prints plain ASCII.
const B = require("./bouquet.js");

function strip(html) { return html.replace(/<[^>]*>/g, ""); }

function frame(seed, t, cols, rows) {
  const scene = B.buildScene(B.mulberry32(seed));
  const hearts = B.makeHearts();
  return strip(B.render(scene, t, cols, rows, hearts));
}

const a = frame(12345, 0.0, 48, 34);
const b = frame(99999, 0.0, 48, 34);

console.log("=== seed 12345, t=0 (48x34) ===");
console.log(a);
const lines = a.split("\n");
console.log("=== rows=" + lines.length + " maxlen=" + Math.max(...lines.map(l => l.length)) + " ===");
console.log("=== seed 99999 differs from 12345: " + (a !== b) + " ===");

// Ensure hearts glyph and message render.
const c = frame(12345, 2.5, 48, 34);
console.log("=== t=2.5 (hearts/sparkles should differ) differs from t=0: " + (c !== a) + " ===");
