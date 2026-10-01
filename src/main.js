/**
 * @typedef {keyof HTMLElementTagNameMap} K
 * @param {K} type
 * @returns {HTMLElementTagNameMap[K]}
 */
function createElement(type) {
  /*
  TODO: Minify this function manually to
    `ident2=ident1=>document.createElement(ident1)`,
  because for some reason terser doesn't do that.
  */
  return document.createElement(type);
}

function main() {
  /** @type {HTMLCanvasElement} */
  const CANVAS = createElement("canvas");
  CANVAS.width = CANVAS.clientWidth;
  CANVAS.height = CANVAS.clientHeight;
  document.body.appendChild(CANVAS);

  const GL2 = CANVAS.getContext("webgl2");

  GL2 instanceof WebGL2RenderingContext
    ? null
    : alert("failed to create webgl2 context");

  GL2.viewport(0, 0, GL2.drawingBufferWidth, GL2.drawingBufferHeight);
  GL2.enable(GL2.SCISSOR_TEST);
  GL2.scissor(30, 10, 60, 60);
  GL2.clearColor(1.0, 1.0, 0.0, 1.0);
  GL2.clear(GL2.COLOR_BUFFER_BIT);
}

main();
