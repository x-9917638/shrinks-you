// Copyright (C) 2026 Valerie
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { minify as _gMinify } from "@plutotcool/glsl-bundler";
import { minify_sync as _tMinify } from "terser";

// RFC 3986 Sec. 2.2, and " "
const RESERVED_CHARS = new Map([
  [":", "%3A"],
  ["/", "%2F"],
  ["?", "%3F"],
  ["#", "%23"],
  ["[", "%5B"],
  ["]", "%5D"],
  ["@", "%40"],
  ["!", "%21"],
  ["$", "%24"],
  ["&", "%26"],
  ["'", "%27"],
  ["(", "%28"],
  [")", "%29"],
  ["*", "%2A"],
  ["+", "%2B"],
  [",", "%2C"],
  [";", "%3B"],
  ["=", "%3D"],
  ["%", "%25"],
  [" ", "%20"],
]);

const LIMIT = 3072;

/* <script (any attributes)? (type attribute)? (any attributes)?>(content)</script>
  Group 1: initial attributes
  Group 2,3: script type
  Group 4: additional attributes
  Group 5: script content */
const SCRIPT_PATTERN =
  /<script\b(?:([^>]*?)type\s*=\s*(?:"([^"]*)"|'([^']*)'))?([^>]*)?>([\s\S]*?)<\/script\s*?>/gi;

/* <style (any attributes)?>(content)</style>
  Group 1: attributes
  Group 2: content */
const STYLE_PATTERN = /<style\b([^>]*?)>([\s\S]*?)<\/style\s*?>/gi;

const JAVASCRIPT_TYPES = [
  undefined,
  "",
  "text/javascript",
  // Below are deprecated
  "application/javascript",
  "application/ecmascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
];

async function main() {
  let html = readFileSync("src/index.html", "utf8");

  html = processScripts(html);
  html = processStyles(html);

  html = htmlMinify(html);

  const b64_uri = makeB64URI(html);
  const b64_size = b64_uri.length;

  const normal_uri = makeSafeURI(html);
  const normal_size = normal_uri.length;

  const uri = b64_size <= normal_size ? b64_uri : normal_uri;
  const bytes = b64_size <= normal_size ? b64_size : normal_size;

  console.info("base64 encoded: ", b64_size, "normal: ", normal_size);

  writeOutputs(html, uri);

  console.info(
    bytes +
      " / " +
      LIMIT +
      " bytes, " +
      (bytes >= LIMIT ? `${bytes - LIMIT} over` : `${LIMIT - bytes} left`),
  );
}

/**
 * @param {string} html
 */
function processScripts(html) {
  return html.replaceAll(SCRIPT_PATTERN, (_, p1, p2, p3, p4, p5) => {
    const [init_attrs, type1, type2, addi_attrs, script] = [p1, p2, p3, p4, p5];
    const type = type1 !== undefined ? type1 : type2;

    let frag = "<script";
    frag += init_attrs ? ` ${init_attrs.trim()}` : "";

    if (!JAVASCRIPT_TYPES.includes(type)) {
      frag += ` type="${type}"`;
    }

    frag += addi_attrs ? ` ${addi_attrs.trim()}` : "";
    frag += ">";

    if (JAVASCRIPT_TYPES.includes(type)) {
      frag += jsMinify(script);
    } else {
      // From <https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/>, all examples
      // use "x-shader/*"
      frag += type.startsWith("x-shader") ? glslMinify(script) : script;
    }

    frag += "</script>";

    return frag;
  });
}

/**
 * @param {string} src
 */
function processStyles(src) {
  return src.replaceAll(STYLE_PATTERN, (_, p1, p2) => {
    const [attrs, css] = [p1, p2];
    let frag = "<style";
    frag += attrs ? ` ${attrs.trim()}` : "";
    frag += ">";

    frag += cssMinify(css);

    frag += "</style>";

    return frag;
  });
}

/**
 * @param {string} html
 */
function makeB64URI(html) {
  return `data:text/html;base64,${Buffer.from(html).toString("base64")}`;
}

/**
 * @param {string} html
 */
function makeSafeURI(html) {
  return `data:text/html,${Array.from(html)
    .map((c) => RESERVED_CHARS.getOrInsert(c, c))
    .join("")}`;
}

/**
 * @param {string} html
 * @param {string} uri
 */
function writeOutputs(html, uri) {
  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/index.html", html);
  writeFileSync("dist/uri.txt", uri);
}

/**
 * @param {string} script
 * @returns {string}
 */
function jsMinify(script) {
  const { code } = _tMinify(script, {
    toplevel: true,
    compress: { passes: 3 },
  });
  return code;
}

/**
 * @param {string} code
 * @returns {string}
 */
function glslMinify(code) {
  return _gMinify(code);
}

/**
 * @param {string} code
 * @returns {string}
 */
function cssMinify(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,>])\s*/g, "$1")
    .replace(/;}/g, "}");
}

/**
 * @param {string} code
 * @returns {string}
 */
function htmlMinify(code) {
  return code
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

await main();
