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
