import { readFileSync, writeFileSync } from "node:fs";
import { minify } from "./terser.js";

const LIMIT = 3072;
const src = readFileSync("main.js", "utf8");

let html = "<!doctype html><body>";
const { code } = await minify(src, {
  toplevel: true,
  compress: { passes: 3 },
});
html += `<script>${code}</script>`;
html += "</body>";

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
    (bytes >= LIMIT ? `${bytes - LIMIT} over` : `${LIMIT - bytes} left`),
);
