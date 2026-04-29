/* Per-particle and per-target face/back-face shading.
   Called every 2nd animation frame (v11 OPT 3) — halves the 950-particle cost. */
(function () {
  const _wpos   = new THREE.Vector3();
  const _camDir = new THREE.Vector3();
  const RADIUS = S3.RADIUS;

  function updateLighting() {
    _camDir.set(0, 0, 1).applyQuaternion(S3.camera.quaternion);

    S3.particles.forEach(p => {
      p.sp.getWorldPosition(_wpos);
      const nx = _wpos.x / RADIUS, ny = _wpos.y / RADIUS, nz = _wpos.z / RADIUS;

      const camDot   = nx * _camDir.x + ny * _camDir.y + nz * _camDir.z;
      const camF     = Math.max(0, (camDot + 0.35) / 1.35);
      const camFS    = Math.pow(camF, 1.6);
      const litDot   = nx * S3.LIGHT_DIR.x + ny * S3.LIGHT_DIR.y + nz * S3.LIGHT_DIR.z;
      const litF     = Math.max(0, litDot * 0.5 + 0.5);
      const combined = camFS * (0.3 + 0.7 * litF);

      p.mat.opacity = 0.20 + combined * 0.80;
      const s = p.baseScale * (0.88 + camFS * 0.28);
      p.sp.scale.set(s, s, s);
      const br = 0.55 + combined * 0.75;
      p.mat.color.setRGB((p.baseColor.r / 255) * br, (p.baseColor.g / 255) * br, (p.baseColor.b / 255) * br);
    });

    S3.targetSprites.forEach(ts => {
      if (ts.collected) return;
      ts.sp.getWorldPosition(_wpos);
      const nx = _wpos.x / RADIUS, ny = _wpos.y / RADIUS, nz = _wpos.z / RADIUS;

      const camDot   = nx * _camDir.x + ny * _camDir.y + nz * _camDir.z;
      const camF     = Math.max(0, (camDot + 0.35) / 1.35);
      const camFS    = Math.pow(camF, 1.4);
      const litDot   = nx * S3.LIGHT_DIR.x + ny * S3.LIGHT_DIR.y + nz * S3.LIGHT_DIR.z;
      const litF     = Math.max(0, litDot * 0.4 + 0.6);
      const combined = camFS * (0.4 + 0.6 * litF);

      ts.mat.opacity = 0.18 + combined * 0.82;
      const h = ts.baseScale * (1 + ts.hover * 0.12);
      ts.sp.scale.set(h * ts.aspect, h, h);
    });
  }

  S3.updateLighting = updateLighting;
})();
