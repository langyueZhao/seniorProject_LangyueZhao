/* Builds everything attached to the central globe group:
   particle field, orbital rings, equator segments, pole markers, instrument stand.
   Target sprites live in targets.js (loaded from data/targets.json). */
(function () {
  const RADIUS = S3.RADIUS;
  const N = S3.N;

  /* ── geometry helpers ───────────────────────────────────────────── */
  function fibSphere(n, r) {
    const pts = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const theta = phi * i;
      pts.push(new THREE.Vector3(r * rad * Math.cos(theta), r * y, r * rad * Math.sin(theta)));
    }
    return pts;
  }

  function rndInSphere(r) {
    const u = Math.random(), v = Math.random();
    const th = 2 * Math.PI * u;
    const ph = Math.acos(2 * v - 1);
    const rr = r * Math.cbrt(Math.random()) * (0.25 + Math.random() * 0.75);
    return new THREE.Vector3(
      rr * Math.sin(ph) * Math.cos(th),
      rr * Math.sin(ph) * Math.sin(th),
      rr * Math.cos(ph)
    );
  }

  /* ── particle globe ─────────────────────────────────────────────── */
  const surfPts  = fibSphere(Math.floor(N * 0.68), RADIUS);
  const innerPts = Array.from({ length: Math.floor(N * 0.32) }, () => rndInSphere(RADIUS));
  const allPts   = [...surfPts, ...innerPts];

  function pickCol() {
    const r = Math.random();
    if (r < 0.55) return { r: 0, g: 200, b: 255 };
    if (r < 0.80) return { r: 0, g: 160, b: 220 };
    return { r: 0, g: 100, b: 180 };
  }

  S3.buildFieldTexPool();
  // prime each shared texture with its initial CAM_DATA value
  for (let i = 0; i < S3.CAM_FIELDS.length; i++) {
    const field = S3.CAM_FIELDS[i];
    const v = S3.CAM_DATA[field];
    const text = (typeof v === 'number' && !Number.isInteger(v)) ? v.toFixed(2) : String(v);
    S3.repaintFieldTex(S3.fieldTexPool[field], text);
  }

  const particles = [];
  allPts.forEach((pt, idx) => {
    const col   = pickCol();
    const field = S3.CAM_FIELDS[idx % S3.CAM_FIELDS.length];
    const mat   = new THREE.SpriteMaterial({
      map: S3.fieldTexPool[field].texture, transparent: true, depthWrite: false, depthTest: true,
      color: new THREE.Color(col.r / 255, col.g / 255, col.b / 255),
    });
    const sp = new THREE.Sprite(mat);
    const bs = 0.13 + Math.random() * 0.07;
    sp.scale.set(bs, bs, bs);
    sp.position.copy(pt);
    S3.group.add(sp);
    particles.push({
      sp, mat, localPos: pt.clone(), driftOff: Math.random() * 6.28,
      baseColor: col, baseScale: bs, field,
    });
  });

  // Refresh shared textures on a 200ms interval — 20 iterations, skips no-change writes.
  setInterval(() => {
    for (let i = 0; i < S3.CAM_FIELDS.length; i++) {
      const field = S3.CAM_FIELDS[i];
      const v = S3.CAM_DATA[field];
      const text = (typeof v === 'number' && !Number.isInteger(v)) ? v.toFixed(2) : String(v);
      S3.repaintFieldTex(S3.fieldTexPool[field], text);
    }
  }, 200);

  /* ── orbital rings (3 thin tilted lines) ────────────────────────── */
  function makeRing(tiltX, tiltZ, opacity, seg) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * RADIUS * 1.01, 0, Math.sin(a) * RADIUS * 1.01));
    }
    const geo  = new THREE.BufferGeometry().setFromPoints(pts);
    const mat  = new THREE.LineBasicMaterial({ color: 0x0088ff, transparent: true, opacity, depthWrite: false });
    const ring = new THREE.Line(geo, mat);
    ring.rotation.x = tiltX;
    ring.rotation.z = tiltZ;
    return ring;
  }
  S3.group.add(makeRing(Math.PI * 0.28, 0,             0.07, 80));
  S3.group.add(makeRing(Math.PI * 0.5,  Math.PI * 0.18, 0.07, 80));
  S3.group.add(makeRing(Math.PI * 0.5,  0,             0.06, 80));

  /* ── equator: 48 independently-shaded segments ──────────────────── */
  const equatorSegments = [];
  (function () {
    const N_SEG = 48;
    const ER = RADIUS * 1.015;
    for (let i = 0; i < N_SEG; i++) {
      const a0 = (i / N_SEG) * Math.PI * 2;
      const a1 = ((i + 1) / N_SEG) * Math.PI * 2;
      const p0 = new THREE.Vector3(Math.cos(a0) * ER, 0, Math.sin(a0) * ER);
      const p1 = new THREE.Vector3(Math.cos(a1) * ER, 0, Math.sin(a1) * ER);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const geo = new THREE.BufferGeometry().setFromPoints([p0, p1]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x00e5ff, transparent: true, opacity: 0.5,
        depthWrite: false, depthTest: true,
      });
      const seg = new THREE.Line(geo, mat);
      seg.userData.localMid = mid;
      S3.group.add(seg);
      equatorSegments.push(seg);
    }
  })();

  /* ── pole weld markers ──────────────────────────────────────────── */
  let poleNorth, poleSouth;
  (function () {
    function makePoleTex() {
      const cs = 128;
      const cv = document.createElement('canvas');
      cv.width = cs; cv.height = cs;
      const cx = cv.getContext('2d');
      cx.clearRect(0, 0, cs, cs);
      cx.strokeStyle = '#ffffff';
      cx.lineCap = 'round';
      cx.lineWidth = 6;
      cx.shadowColor = '#ffffff';
      cx.shadowBlur = 12;
      cx.beginPath();
      cx.moveTo(cs / 2, cs * 0.18); cx.lineTo(cs / 2, cs * 0.82);
      cx.moveTo(cs * 0.18, cs / 2); cx.lineTo(cs * 0.82, cs / 2);
      cx.stroke();
      return new THREE.CanvasTexture(cv);
    }
    const poleTex = makePoleTex();
    [+1, -1].forEach(sign => {
      const mat = new THREE.SpriteMaterial({
        map: poleTex, transparent: true, opacity: 0.95,
        depthWrite: false, depthTest: true,
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(0, sign * RADIUS * 1.01, 0);
      sp.scale.set(0.18, 0.18, 1);
      sp.raycast = function () {};
      S3.group.add(sp);
      if (sign > 0) poleNorth = sp; else poleSouth = sp;
    });
  })();

  /* ── globe stand: instrument armature ───────────────────────────── */
  (function () {
    const STAND_COLOR = 0x8899aa;
    const HILITE      = 0x00f5ff;
    const TILT        = -0.42;

    const mkLine = (pts, color, opacity) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity,
        depthWrite: false, depthTest: true,
      });
      return new THREE.Line(geo, mat);
    };

    // arc container (tilted with globe axis)
    const arcGroup = new THREE.Group();
    arcGroup.rotation.z = TILT;
    S3.scene.add(arcGroup);

    const R_OUT = RADIUS * 1.22;
    const R_IN  = RADIUS * 1.17;
    const A0    = -Math.PI * 0.1;
    const A1    =  Math.PI * 1.1;

    const arcPoint = (r, a) => new THREE.Vector3(Math.sin(a) * r, Math.cos(a) * r, 0);

    // outer solid arc
    (function () {
      const seg = 96;
      const pts = [];
      for (let i = 0; i <= seg; i++) {
        const a = A0 + (A1 - A0) * (i / seg);
        pts.push(arcPoint(R_OUT, a));
      }
      arcGroup.add(mkLine(pts, STAND_COLOR, 0.45));
    })();

    // inner dashed arc
    (function () {
      const totalSegs = 40;
      for (let i = 0; i < totalSegs; i++) {
        if (i % 2 === 1) continue; // skip every other → dashed
        const a0 = A0 + (A1 - A0) * (i / totalSegs);
        const a1 = A0 + (A1 - A0) * ((i + 1) / totalSegs);
        arcGroup.add(mkLine([arcPoint(R_IN, a0), arcPoint(R_IN, a1)], STAND_COLOR, 0.25));
      }
    })();

    // diamond tick sprites along outer arc
    const diamondTex = (function () {
      const cs = 32;
      const cv = document.createElement('canvas');
      cv.width = cs; cv.height = cs;
      const cx = cv.getContext('2d');
      cx.strokeStyle = '#aabbcc';
      cx.lineWidth = 1.5;
      cx.beginPath();
      cx.moveTo(cs / 2, 4);
      cx.lineTo(cs - 4, cs / 2);
      cx.lineTo(cs / 2, cs - 4);
      cx.lineTo(4, cs / 2);
      cx.closePath();
      cx.stroke();
      return new THREE.CanvasTexture(cv);
    })();

    for (let i = 0; i < 8; i++) {
      const a = A0 + (A1 - A0) * (i / 7);
      const p = arcPoint(R_OUT, a);
      const m = new THREE.SpriteMaterial({
        map: diamondTex, transparent: true, opacity: 0.85,
        depthWrite: false, depthTest: true,
      });
      const sp = new THREE.Sprite(m);
      sp.position.copy(p);
      sp.scale.set(0.07, 0.07, 1);
      sp.raycast = function () {};
      arcGroup.add(sp);
    }

    // cyan highlight arc segment (top portion)
    const HA0 = Math.PI * 0.1;
    const HA1 = Math.PI * 0.43;
    (function () {
      const seg = 32;
      const pts = [];
      for (let i = 0; i <= seg; i++) {
        const a = HA0 + (HA1 - HA0) * (i / seg);
        pts.push(arcPoint(R_OUT, a));
      }
      arcGroup.add(mkLine(pts, HILITE, 0.85));
    })();

    // angle labels at ends of highlight arc
    function makeLabelTex(text, color) {
      const cv = document.createElement('canvas');
      cv.width = 96; cv.height = 32;
      const cx = cv.getContext('2d');
      cx.font = '9px Courier New';
      cx.fillStyle = color;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(text, cv.width / 2, cv.height / 2);
      return new THREE.CanvasTexture(cv);
    }

    [
      { text: '087°', a: HA0 },
      { text: '274°', a: HA1 },
    ].forEach(o => {
      const p = arcPoint(R_OUT * 1.06, o.a);
      const m = new THREE.SpriteMaterial({
        map: makeLabelTex(o.text, '#00f5ff'),
        transparent: true, opacity: 0.7,
        depthWrite: false, depthTest: true,
      });
      const sp = new THREE.Sprite(m);
      sp.position.copy(p);
      sp.scale.set(0.18 * 3, 0.18, 1);
      sp.raycast = function () {};
      arcGroup.add(sp);
    });
  })();

  S3.surfPts = surfPts;
  S3.particles = particles;
  S3.equatorSegments = equatorSegments;
  S3.poleNorth = poleNorth;
  S3.poleSouth = poleSouth;
})();
