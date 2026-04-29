/* Mouse pointer + drag-to-rotate. Hands.js takes over once a hand is detected.
   Shared state on S3.input: handActive, rotVel (mutated each frame), mouseNorm. */
(function () {
  const ch          = document.getElementById('ch');
  const handDot     = document.getElementById('hand-dot');
  const inputModeEl = document.getElementById('input-mode');

  let isDrag = false;
  let lastMX = { x: 0, y: 0 };

  // shared cross-module state — never reassign these objects, only mutate fields
  S3.input = {
    handActive: false,
    rotVel:    { x: 0, y: 0 },
    mouseNorm: { x: 0, y: 0 },
    ch, handDot, inputModeEl,
  };

  function setPointer(px, py) {
    S3.input.mouseNorm.x =  (px / S3.viewport.W) * 2 - 1;
    S3.input.mouseNorm.y = -((py / S3.viewport.H) * 2 - 1);
    ch.style.left     = px + 'px';
    ch.style.top      = py + 'px';
    handDot.style.left = px + 'px';
    handDot.style.top  = py + 'px';
  }
  S3.setPointer = setPointer;

  /* ── MOUSE EVENTS (fallback when no hand detected) ─────────── */
  S3.wrap.addEventListener('mousedown', e => {
    if (S3.input.handActive) return;
    S3.ensureAudio(); S3.startAmbientHum(); S3.playRotateWhoosh();
    isDrag = true;
    const r = S3.wrap.getBoundingClientRect();
    lastMX = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  S3.wrap.addEventListener('mouseup',    () => { isDrag = false; });
  S3.wrap.addEventListener('mouseleave', () => { isDrag = false; });
  S3.wrap.addEventListener('mousemove', e => {
    if (S3.input.handActive) return;
    const r  = S3.wrap.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    setPointer(mx, my);
    if (isDrag) {
      const dx = mx - lastMX.x, dy = my - lastMX.y;
      S3.input.rotVel.y += dx * 0.004;
      S3.input.rotVel.x += dy * 0.004;
      lastMX = { x: mx, y: my };
    }
  });
  S3.wrap.addEventListener('click', () => {
    S3.ensureAudio(); S3.startAmbientHum();
  }, { once: true });
})();
