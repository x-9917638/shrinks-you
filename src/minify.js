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
import { exit } from "node:process";
import { minify as _gMinify } from "@plutotcool/glsl-bundler";
import { minify_sync as _tMinify } from "terser";

const enumValue = (name) => Object.freeze({ toString: () => name });

function error(...args) {
  console.error("\x1b[0;31merror:\x1b[0m", ...args);
}

function warn(...args) {
  console.warn("\x1b[0;33mwarning:\x1b[0m", ...args);
}

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
  const config = processArgs();

  let html = readFileSync(config.inputFile, "utf8");

  html = processScripts(html);
  html = processStyles(html);

  html = htmlMinify(html);

  html = await compress(config, html);

  const b64_uri = makeB64URI(html);
  const b64_size = b64_uri.length;

  if (config.forceBase64 === true) {
    finish(html, b64_uri, b64_size);
    return;
  }

  let normal_uri, normal_size;
  if (config.forceNoURLEncode) {
    normal_uri = makeUnsafeURI(html);
  } else {
    normal_uri = makeSafeURI(html);
  }
  normal_size = normal_uri.length;

  if (config.forceBase64 === false) {
    finish(html, normal_uri, normal_size);
    return;
  }

  const uri = b64_size <= normal_size ? b64_uri : normal_uri;
  const bytes = b64_size <= normal_size ? b64_size : normal_size;

  console.info("base64 encoded: ", b64_size, "normal: ", normal_size);

  finish(html, uri, bytes);
}

const Compression = Object.freeze({
  None: enumValue("Compression.None"),
  Brotli: enumValue("Compression.Brotli"),
  Deflate: enumValue("Compression.Deflate"),
  DeflateRaw: enumValue("Compression.DeflateRaw"),
  Gzip: enumValue("Compression.Gzip"),
});

function processArgs() {
  const out = {
    compress: undefined,
    forceBase64: undefined,
    forceNoURLEncode: false,
    inputFile: undefined,
  };

  let positional_args = 0;
  const args = process.argv.slice(2)[Symbol.iterator]();
  for (const arg of args) {
    switch (arg) {
      case "-h":
      case "--help":
        console.info(
          `${process.argv0} ${process.argv[1]} [options] <inputfile>\n`,
        );
        console.info(
          '-c, --compress <algorithm>\n\tCompress with the given <algorithm>\n\tOne of "brotli", "deflate", "deflate-raw", "gzip", "none"',
        );
        console.info(
          "-b, --b64\n\tForce base64 encoding\n\t[Default: whichever is smaller]",
        );
        console.info(
          "-B, --no-b64\n\tForce not base64 encoding\n\t[Default: whichever is smaller]",
        );
        console.info(
          "--non-compliant-uri\n\tDo not properly encode the URI.\n\tIn this case, the URI working is browser dependent.",
        );
        exit(0);
      case "-c":
      case "--compress":
        switch (args.next().value) {
          case "brotli":
            warn("there is limited browser support for brotli compresion");
            out.compress = Compression.Brotli;
            break;
          case "deflate":
            out.compress = Compression.Deflate;
            break;
          case "deflate-raw":
            out.compress = Compression.DeflateRaw;
            break;
          case "gzip":
            out.compress = Compression.Gzip;
            break;
          case "none":
            out.compress = Compression.None;
            break;
          case "zstd":
            error("zstd compression is non-standard and unsupported on node.");
            exit(1);
          case undefined:
            error("expected an argument to --compress");
            exit(1);
          default:
            error(`unknown algorithm`);
            exit(1);
        }
        break;
      case "-b":
      case "--b64":
        out.forceBase64 = true;
        break;
      case "-B":
      case "--no-b64":
        out.forceBase64 = false;
        break;
      case "--non-compliant-uri":
        out.forceNoURLEncode = true;
        break;
      default:
        positional_args++;
        if (positional_args > 1) {
          error(`unexpected argument: ${arg}`);
          exit(1);
        }
        out.inputFile = arg;
    }
  }

  if (out.inputFile === undefined) {
    error("<inputfile> is required");
    exit(1);
  }

  return out;
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

async function compress(config, html) {
  /** @type {ReadableStream} */
  const stream = ReadableStream.from(html);
  /** @type {ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>} */
  let stream_reader, algorithm;
  switch (config.compress) {
    case Compression.None:
      stream_reader = new Object();
      stream_reader.exhausted = false;
      stream_reader.read = async () => {
        if (stream_reader.exhausted) {
          return { done: true, value: undefined };
        } else {
          stream_reader.exhausted = true;
          return { done: false, value: new TextEncoder().encode(html) };
        }
      };
      break;
    case Compression.Brotli:
      algorithm = "brotli";
      stream_reader = stream
        .pipeThrough(new CompressionStream("brotli"))
        .getReader();
      break;
    case Compression.Deflate:
      algorithm = "deflate";
      stream_reader = stream
        .pipeThrough(new CompressionStream("deflate"))
        .getReader();
      break;
    case undefined:
    case Compression.DeflateRaw:
      algorithm = "deflate-raw";
      stream_reader = stream
        .pipeThrough(new CompressionStream("deflate-raw"))
        .getReader();
      break;
    case Compression.Gzip:
      algorithm = "gzip";
      stream_reader = stream
        .pipeThrough(new CompressionStream("gzip"))
        .getReader();
      break;
  }

  const chunks = [];

  while (true) {
    const { done, value } = await stream_reader.read();

    if (done) {
      break;
    }
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, value) => acc + value.length, 0);
  const compressed = new Uint8Array(totalLength);
  let length = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, length);
    length += chunk.length;
  }

  return algorithm
    ? `<!doctype html><title>_</title><script>a=Uint8Array,r=Response,new r(new r(a.from(atob("${Buffer.from(compressed).toString("base64")}"),c=>c.charCodeAt())).body.pipeThrough(new DecompressionStream("${algorithm}"))).text().then((t,d=document)=>(d.open(),d.write(t),d.close()))</script>`
    : Buffer.from(compressed).toString("utf-8");
}

/**
 * @param {string} html
 */
function makeB64URI(html) {
  return `data:text/html;charset=utf-8;base64,${Buffer.from(html).toString("base64")}`;
}

/**
 * @param {string} html
 */
function makeSafeURI(html) {
  return `data:text/html;charset=utf-8,${Array.from(html)
    .map((c) => RESERVED_CHARS.getOrInsert(c, c))
    .join("")}`;
}

/**
 * @param {string} html
 */
function makeUnsafeURI(html) {
  return `data:text/html;charset=utf-8,${html.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\n/g, "%0A")}`;
}

/**
 * @param {string} html
 * @param {string} uri
 * @param {number} bytes
 */
function finish(html, uri, bytes) {
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
