// Turns src/index.html into one data URI. Run: node build.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { minify } from "./terser.js";

const LIMIT = 3072;
const src = readFileSync("main.js", "utf8");

// Squeeze whitespace in shaders written as glsl`...` (terser leaves strings alone).
function glsl(code) {
  return code
    .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([-+*\/=<>(){}\[\];,!&|?:])\s*/g, "$1")
    .trim();
}

let html = "<!doctype html><body>";

const js = src.replace(/glsl`([^`]*)`/g, (_, s) => JSON.stringify(glsl(s)));
const { code } = await minify(js, {
  toplevel: true,
  compress: { passes: 3 },
});
html += `<script>${code}</script>`;

html += "</body>";

// Only these three break a data URI. Encoding anything else costs bytes for nothing.
const uri =
  "data:text/html," +
  html.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\n/g, "%0A");

writeFileSync("uri.txt", uri);

const bytes = Buffer.byteLength(uri);
console.log(
  bytes +
    " / " +
    LIMIT +
    " bytes, " +
    (bytes > LIMIT ? `${bytes - LIMIT} over` : `${LIMIT - bytes} left`),
);
