/* Left-panel scan waveform + 800ms HUD-metrics tick.
   v11 OPT 4: drawScan is gated to every-other-frame in main.js (still ~30 Hz).
   v11 OPT 6: querySelectorAll('#vec-list li') is cached at startup, not per-tick. */
(function () {
  /* ── scan waveform canvas ───────────────────────────────────────── */
  const scanCV = document.getElementById('scan-canvas');
  scanCV.width = 172; scanCV.height = 80;
  const sctx = scanCV.getContext('2d');
  const scanData = Array.from({ length: 60 }, () => Math.random());

  function drawScan(t) {
    sctx.clearRect(0, 0, 172, 80);
    sctx.fillStyle = 'rgba(0,20,35,0.6)';
    sctx.fillRect(0, 0, 172, 80);

    // grid
    sctx.strokeStyle = 'rgba(0,100,180,0.15)';
    sctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      sctx.beginPath(); sctx.moveTo(0, i * 20); sctx.lineTo(172, i * 20); sctx.stroke();
    }

    // waveform
    scanData.push(0.28 + 0.72 * Math.abs(Math.sin(t * 1.2 + Math.random() * 0.5)));
    if (scanData.length > 60) scanData.shift();

    sctx.beginPath();
    sctx.strokeStyle = 'rgba(0,200,255,0.75)';
    sctx.lineWidth = 1;
    scanData.forEach((v, i) => {
      const x = i * (172 / 60), y = 72 - v * 62;
      i === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
    });
    sctx.stroke();

    // fill under waveform
    sctx.lineTo(172, 80); sctx.lineTo(0, 80); sctx.closePath();
    sctx.fillStyle = 'rgba(0,120,200,0.12)';
    sctx.fill();

    // sweep line
    const scanHead = (t * 60) % 172;
    sctx.strokeStyle = 'rgba(0,200,255,0.55)';
    sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(scanHead, 0); sctx.lineTo(scanHead, 80); sctx.stroke();
  }

  /* ── 800ms HUD metrics tick ─────────────────────────────────────── */
  const dwellStart = Date.now();

  // Cache DOM refs once at startup (v11 OPT 6).
  const dtEl      = document.getElementById('dt');
  const sigConfEl = document.getElementById('sig-conf');
  const sigBarEl  = document.getElementById('sig-bar');
  const behIdxEl  = document.getElementById('beh-idx');
  const behBarEl  = document.getElementById('beh-bar');
  const rxEl      = document.getElementById('rx');
  const layNEl    = document.getElementById('lay-n');
  const vecListItems = Array.from(document.querySelectorAll('#vec-list li'));

  setInterval(() => {
    const s  = Math.floor((Date.now() - dwellStart) / 1000);
    const m  = Math.floor(s / 60), ss = s % 60;

    dtEl.textContent = String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');

    const conf = Math.min(99, Math.floor(15 + s * 0.6));
    sigConfEl.textContent = conf;
    sigBarEl.style.width = conf + '%';

    behIdxEl.textContent = (0.001 + s * 0.0045).toFixed(3);
    behBarEl.style.width = Math.min(99, s * 0.45) + '%';

    const rd = ((S3.group.rotation.y % (Math.PI * 2)) / (Math.PI * 2) * 360 + 360) % 360;
    rxEl.textContent = String(Math.floor(rd)).padStart(3, '0');

    for (let i = 0; i < vecListItems.length; i++) {
      vecListItems[i].classList.toggle('active', Math.random() > 0.35);
    }
    layNEl.textContent = String(Math.floor(1 + Math.random() * 6)).padStart(2, '0');
  }, 800);

  S3.drawScan = drawScan;
})();
