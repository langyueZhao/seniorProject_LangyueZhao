/* Canvas-texture factories + the v11 shared per-field texture pool.
   v11 OPT 1: instead of 950 per-particle textures we keep ONE canvas/CanvasTexture
   per CAM_FIELD (20 total) and only repaint+upload when the value string changes. */
(function () {
  const texCache = {};

  function makeCharTex(char, sz) {
    const key = 'W|' + char + '|' + sz;
    if (texCache[key]) return texCache[key];

    const cs = Math.ceil(sz * 3);
    const cv = document.createElement('canvas');
    cv.width = cs; cv.height = cs;

    const cx = cv.getContext('2d');
    cx.font = `${Math.ceil(cs * 0.65)}px Courier New`;
    cx.fillStyle = '#ffffff';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(char, cs / 2, cs / 2);

    const tex = new THREE.CanvasTexture(cv);
    texCache[key] = tex;
    return tex;
  }

  function makeWordTex(word, color, glow, charH) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(word.length * charH * 1.72 + 14);
    cv.height = Math.ceil(charH * 2.6);

    const cx = cv.getContext('2d');
    cx.clearRect(0, 0, cv.width, cv.height);

    // glow pass
    cx.shadowColor = glow;
    cx.shadowBlur = charH * 0.85;
    cx.font = `bold ${Math.ceil(charH * 1.72)}px Courier New`;
    cx.fillStyle = glow;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(word, cv.width / 2, cv.height / 2);

    // crisp pass
    cx.shadowBlur = 0;
    cx.fillStyle = color;
    cx.fillText(word, cv.width / 2, cv.height / 2);

    return new THREE.CanvasTexture(cv);
  }

  // ── shared per-field pool ──
  const fieldTexPool = {}; // field → { canvas, ctx, texture, lastText }

  function buildFieldTexPool() {
    S3.CAM_FIELDS.forEach(field => {
      const cv = document.createElement('canvas');
      cv.width = S3.FIELD_TEX_SIZE; cv.height = S3.FIELD_TEX_SIZE;
      const cx = cv.getContext('2d');
      const tex = new THREE.CanvasTexture(cv);
      fieldTexPool[field] = { canvas: cv, ctx: cx, texture: tex, lastText: null };
    });
  }

  function repaintFieldTex(entry, text) {
    if (entry.lastText === text) return; // skip when value hasn't changed
    entry.lastText = text;
    const cs = S3.FIELD_TEX_SIZE;
    const cx = entry.ctx;
    cx.clearRect(0, 0, cs, cs);
    let fontPx = Math.ceil(cs * 0.55);
    cx.font = `${fontPx}px Courier New`;
    while (cx.measureText(text).width > cs * 0.92 && fontPx > 6) {
      fontPx -= 1;
      cx.font = `${fontPx}px Courier New`;
    }
    cx.fillStyle = '#ffffff';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, cs / 2, cs / 2);
    entry.texture.needsUpdate = true;
  }

  S3.makeCharTex = makeCharTex;
  S3.makeWordTex = makeWordTex;
  S3.fieldTexPool = fieldTexPool;
  S3.buildFieldTexPool = buildFieldTexPool;
  S3.repaintFieldTex = repaintFieldTex;
})();
