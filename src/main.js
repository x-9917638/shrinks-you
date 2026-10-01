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

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} type
 * @returns {HTMLElementTagNameMap[K]}
 */
const createElement = (type) => {
  return document.createElement(type);
};

/**
 * @template {Node} T
 * @param {T} node
 * @returns {T}
 */
const appendChild = (node) => {
  return document.body.appendChild(node);
};

class Editor {
  /**
   * @param {string?} placeholder
   */
  constructor(placeholder) {
    const TEXTAREA = createElement("textarea");
    TEXTAREA.style = "font:monospace;color:#444";
    TEXTAREA.placeholder = placeholder ? placeholder : "";

    this.el = TEXTAREA;
  }

  asHTMLElement() {
    return this.el;
  }
}

function main() {
  const TITLE = appendChild(createElement("h1"));
  const VERTEX_BUFFER = appendChild(
    new Editor("Enter vertex code here...").asHTMLElement(),
  );
  const FRAGMENT_BUFFER = appendChild(
    new Editor("Enter fragment code here...").asHTMLElement(),
  );
  const CANVAS = appendChild(createElement("canvas"));

  TITLE.textContent = "GLSL Tester";

  CANVAS.width = CANVAS.clientWidth;
  CANVAS.height = CANVAS.clientHeight;
  CANVAS.style = "background-color:white;border:1px solid;";

  const GL2 = CANVAS.getContext("webgl2");

  if (!(GL2 instanceof WebGL2RenderingContext)) {
    alert("failed to create webgl2 context");
  }
}

main();
