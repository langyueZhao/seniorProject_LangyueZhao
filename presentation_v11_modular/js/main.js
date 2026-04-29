/* Bootstrap + animation loop + window resize.
   Order:
     1. fetch data/targets.json → build target sprites
     2. schedule MediaPipe Hands init at +1200ms (matches v11 timing)
     3. start the requestAnimationFrame loop
   Everything else (renderer, sphere, HUD, audio, input, hands) was set up
   side-effectfully when its <script> tag executed at page load. */
(function () {
  const RADIUS = S3.RADIUS;

  const raycaster = new THREE.Raycaster();
  raycaster.params.Sprite = { threshold: 0.10 };

  let frameN = 0;
  const clock = new THREE.Clock();
  const frEl  = document.getElementById('fr');

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    frameN++;
    frEl.textContent = String(frameN).padStart(4, '0');

    // damped rotation (mouse drag + pinch drag both push into rotVel)
    S3.input.rotVel.x *= 0.88;
    S3.input.rotVel.y *= 0.88;
    S3.group.rotation.x += 0.00018 + S3.input.rotVel.x;
    S3.group.rotation.y += 0.00055 + S3.input.rotVel.y;

    // particle drift
    S3.particles.forEach((p, i) => {
      const wave = Math.sin(t * 0.25 + p.driftOff) * 0.04;
      p.sp.position.set(
        p.localPos.x + Math.sin(t * 0.3 + i * 0.07) * 0.018,
        p.localPos.y + wave,
        p.localPos.z + Math.cos(t * 0.28 + i * 0.06) * 0.015,
      );
    });

    // target drift
    S3.targetSprites.forEach(ts => {
      if (ts.collected) return;
      const wave = Math.sin(t * 0.18 + ts.driftOff) * 0.025;
      ts.sp.position.set(ts.localPos.x, ts.localPos.y + wave, ts.localPos.z);
    });

    // v11 OPT 3: per-particle lighting every 2nd frame
    if (frameN % 2 === 0) S3.updateLighting();

    /* ── equator + pole markers: per-frame face/back opacity ───── */
    {
      const camDirLocal = new THREE.Vector3(0, 0, 1).applyQuaternion(S3.camera.quaternion);

      const _mid = new THREE.Vector3();
      S3.equatorSegments.forEach(seg => {
        _mid.copy(seg.userData.localMid).applyQuaternion(S3.group.quaternion);
        const tt = Math.max(0, Math.min(1, (_mid.z + RADIUS) / (2 * RADIUS)));
        seg.material.opacity = 0.22 + tt * 0.68;
        const br = 0.45 + tt * 0.55;
        seg.material.color.setRGB(0, 0.898 * br, 1.0 * br);
      });

      const wp = new THREE.Vector3();
      [S3.poleNorth, S3.poleSouth].forEach(p => {
        p.getWorldPosition(wp);
        const nx = wp.x / RADIUS, ny = wp.y / RADIUS, nz = wp.z / RADIUS;
        const camDot = nx * camDirLocal.x + ny * camDirLocal.y + nz * camDirLocal.z;
        const camF = Math.max(0, (camDot + 0.35) / 1.35);
        p.material.opacity = 0.28 + camF * 0.62;
      });
    }

    // raycast hover detection + dwell collection
    const m2 = new THREE.Vector2(S3.input.mouseNorm.x, S3.input.mouseNorm.y);
    raycaster.setFromCamera(m2, S3.camera);
    S3.updateTargetCollection(raycaster);

    // v11 OPT 4: scan waveform every 2nd frame (~30 Hz, visually identical)
    if (frameN % 2 === 0) S3.drawScan(t);
    S3.renderer.render(S3.scene, S3.camera);
  }

  /* ── window resize ──────────────────────────────────────────── */
  window.addEventListener('resize', () => {
    S3.viewport.W = S3.wrap.offsetWidth;
    S3.viewport.H = S3.wrap.offsetHeight;
    S3.renderer.setSize(S3.viewport.W, S3.viewport.H);
    S3.camera.aspect = S3.viewport.W / S3.viewport.H;
    S3.camera.updateProjectionMatrix();
  });

  /* ── kickoff ────────────────────────────────────────────────── */
  (async function bootstrap() {
    await S3.loadTargets();
    setTimeout(S3.initHandTracking, 1200);
    animate();
  })();
})();
