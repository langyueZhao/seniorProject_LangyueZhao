/* The 6 collectable target labels.
   Definitions live in data/targets.json — this module fetches them, builds the
   sprites on the globe surface, and runs the per-frame dwell-collection logic. */
(function () {
  // S3.targetSprites holds the live array used by lighting.js + main.js.
  // It MUST be the same reference forever (don't reassign), or lighting will iterate stale data.
  S3.targetSprites = [];
  let collected = 0;

  const colList    = document.getElementById('col-list');
  const tcEl       = document.getElementById('tc');
  const extMeterEl = document.getElementById('ext-meter');
  const profStEl   = document.getElementById('prof-st');

  async function loadTargets() {
    const res = await fetch('data/targets.json');
    const data = await res.json();
    const TARGETS = data.targets;

    TARGETS.forEach((t, ti) => {
      const idx = Math.floor((ti / TARGETS.length) * S3.surfPts.length) + 40;
      const pt  = S3.surfPts[idx];
      const tex = S3.makeWordTex(t.label, t.color, t.glow, 13);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
      const sp  = new THREE.Sprite(mat);

      const aspect = tex.image.width / tex.image.height;
      const h = 0.17;
      sp.scale.set(h * aspect, h, h);
      sp.position.copy(pt);
      S3.group.add(sp);

      const li = document.createElement('li');
      li.textContent = '[ ' + t.label + ' ]';
      colList.appendChild(li);

      S3.targetSprites.push({
        sp, mat, localPos: pt.clone(), driftOff: Math.random() * 6.28,
        baseColor: { r: t.rgb[0], g: t.rgb[1], b: t.rgb[2] },
        baseScale: h, aspect, data: t,
        hover: 0, collected: false, li,
      });
    });
  }

  function updateCollection(raycaster) {
    const meshes = S3.targetSprites.filter(ts => !ts.collected).map(ts => ts.sp);
    const hits   = raycaster.intersectObjects(meshes);

    S3.targetSprites.forEach(ts => {
      if (ts.collected) return;
      const isHit = hits.length > 0 && hits[0].object === ts.sp;

      if (isHit) {
        S3.maybePlayHoverTick(true);
        ts.hover = Math.min(1, ts.hover + 0.035);

        if (ts.hover >= 1) {
          ts.collected = true;
          collected++;
          ts.li.classList.add('done');
          ts.mat.opacity = 0.12;

          tcEl.textContent = collected;
          extMeterEl.style.width = (collected / 6 * 100) + '%';
          profStEl.textContent = collected >= 6 ? 'COMPLETE' : 'BUILDING';

          if (collected === 6) S3.playAllClearSound();
          else                 S3.playExtractSound();
        }
      } else {
        ts.hover = Math.max(0, ts.hover - 0.025);
      }
    });
  }

  S3.loadTargets = loadTargets;
  S3.updateTargetCollection = updateCollection;
})();
