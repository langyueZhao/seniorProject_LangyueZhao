/* MediaPipe Hands + FaceMesh.
   Hands runs every frame; FaceMesh runs every 3rd frame at 240×180 (v11 OPT 2).
   Writes into S3.CAM_DATA; pinch-drag mutates S3.input.rotVel. */
(function () {
  const videoEl = document.createElement('video');
  videoEl.style.display = 'none';
  document.body.appendChild(videoEl);

  const camPreview = document.getElementById('cam-preview');
  const pctx = camPreview.getContext('2d');
  camPreview.width = 96;
  camPreview.height = 72;

  let lastPinchState = false;
  let pinchStartX = null, pinchStartY = null;

  function initHandTracking() {
    if (typeof Hands === 'undefined') { console.warn('MediaPipe Hands not loaded'); return; }

    const hands = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    hands.setOptions({
      maxNumHands: 1, modelComplexity: 0,
      minDetectionConfidence: 0.7, minTrackingConfidence: 0.6,
    });

    hands.onResults(results => {
      // mirrored preview
      pctx.clearRect(0, 0, 96, 72);
      if (results.image) {
        pctx.save();
        pctx.scale(-1, 1);
        pctx.drawImage(results.image, -96, 0, 96, 72);
        pctx.restore();
      }

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // hand detected — switch to hand input mode
        if (!S3.input.handActive) {
          S3.input.handActive = true;
          S3.input.handDot.style.display = 'block';
          S3.input.ch.style.display = 'none';
          S3.input.inputModeEl.textContent = 'INPUT: HAND TRACKING';
          S3.ensureAudio(); S3.startAmbientHum();
        }

        const lm   = results.multiHandLandmarks[0];
        const tip  = lm[8];                                       // index finger tip
        const px   = (1 - tip.x) * S3.viewport.W;                 // mirror X
        const py   = tip.y * S3.viewport.H;

        // pinch detection: thumb tip (4) vs index tip (8)
        const thumb = lm[4];
        const dx2 = (tip.x - thumb.x) * S3.viewport.W;
        const dy2 = (tip.y - thumb.y) * S3.viewport.H;
        const pinchDist  = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const isPinching = pinchDist < S3.viewport.W * 0.045;

        // ── hand fields → CAM_DATA ──
        const wrist = lm[0];
        const tipsIdx = [4, 8, 12, 16, 20];
        let spreadSum = 0, spreadN = 0;
        for (let i = 0; i < tipsIdx.length; i++) {
          for (let j = i + 1; j < tipsIdx.length; j++) {
            const a = lm[tipsIdx[i]], b = lm[tipsIdx[j]];
            spreadSum += Math.hypot(a.x - b.x, a.y - b.y);
            spreadN++;
          }
        }
        const handedness = (results.multiHandedness && results.multiHandedness[0] && results.multiHandedness[0].label) || 'Right';
        S3.CAM_DATA.HAND_VECTOR_ACTIVE = 1;
        S3.CAM_DATA.HAND_SIDE = handedness === 'Right' ? 1 : 0;
        S3.CAM_DATA.POINTER_X = +tip.x.toFixed(2);
        S3.CAM_DATA.POINTER_Y = +tip.y.toFixed(2);
        S3.CAM_DATA.POINTER_Z = +(tip.z || 0).toFixed(2);
        S3.CAM_DATA.PINCH_DIST = +(Math.hypot(tip.x - thumb.x, tip.y - thumb.y)).toFixed(2);
        S3.CAM_DATA.PINCH_ACTIVE = isPinching ? 1 : 0;
        S3.CAM_DATA.WRIST_X = +wrist.x.toFixed(2);
        S3.CAM_DATA.WRIST_Y = +wrist.y.toFixed(2);
        S3.CAM_DATA.FINGER_SPREAD = +(spreadSum / spreadN).toFixed(2);

        if (isPinching) {
          S3.input.handDot.style.borderColor = '#00ffcccc';
          if (!lastPinchState) {
            pinchStartX = px; pinchStartY = py;
            S3.playRotateWhoosh();
            lastPinchState = true;
          } else if (pinchStartX !== null) {
            const ddx = px - pinchStartX, ddy = py - pinchStartY;
            S3.input.rotVel.y += ddx * 0.002;
            S3.input.rotVel.x += ddy * 0.002;
            pinchStartX = px; pinchStartY = py;
          }
        } else {
          S3.input.handDot.style.borderColor = '#44aaff66';
          lastPinchState = false;
          pinchStartX = null;
          pinchStartY = null;
        }

        S3.setPointer(px, py);

      } else {
        // no hand — fall back to mouse
        if (S3.input.handActive) {
          S3.input.handActive = false;
          S3.input.handDot.style.display = 'none';
          S3.input.ch.style.display = 'block';
          S3.input.inputModeEl.textContent = 'INPUT: MOUSE';
        }
        S3.CAM_DATA.HAND_VECTOR_ACTIVE = 0;
        S3.CAM_DATA.HAND_SIDE = 0;
        S3.CAM_DATA.POINTER_X = 0; S3.CAM_DATA.POINTER_Y = 0; S3.CAM_DATA.POINTER_Z = 0;
        S3.CAM_DATA.PINCH_DIST = 0; S3.CAM_DATA.PINCH_ACTIVE = 0;
        S3.CAM_DATA.WRIST_X = 0; S3.CAM_DATA.WRIST_Y = 0; S3.CAM_DATA.FINGER_SPREAD = 0;
      }
    });

    /* ── FaceMesh (parallel to Hands) ──────────────────────── */
    let faceMesh = null;
    if (typeof FaceMesh !== 'undefined') {
      faceMesh = new FaceMesh({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      const stabWin = [];
      let lastFaceCx = null, lastFaceCy = null;

      faceMesh.onResults(res => {
        if (res.multiFaceLandmarks && res.multiFaceLandmarks.length > 0) {
          const lm = res.multiFaceLandmarks[0];

          let sx = 0, sy = 0, minX = 1, maxX = 0, minY = 1, maxY = 0;
          for (let i = 0; i < lm.length; i++) {
            sx += lm[i].x; sy += lm[i].y;
            if (lm[i].x < minX) minX = lm[i].x;
            if (lm[i].x > maxX) maxX = lm[i].x;
            if (lm[i].y < minY) minY = lm[i].y;
            if (lm[i].y > maxY) maxY = lm[i].y;
          }
          const cxF = sx / lm.length;
          const cyF = sy / lm.length;
          const sizeF = Math.max(maxX - minX, maxY - minY);
          const proximity = Math.max(0, Math.min(1, (sizeF - 0.15) / 0.45));

          // head yaw via cheeks (234 left, 454 right)
          const lc = lm[234], rc = lm[454];
          const eyeMidX = (lc.x + rc.x) / 2;
          const yaw = Math.max(-1, Math.min(1, (cxF - eyeMidX) * 8));

          // head pitch via forehead (10) vs chin (152)
          const fh = lm[10], chin = lm[152];
          const faceH = Math.max(0.001, chin.y - fh.y);
          const pitch = Math.max(-1, Math.min(1, ((cyF - fh.y) / faceH - 0.5) * 4));

          // eye openness — left eye (159 top, 145 bottom), right eye (386 top, 374 bottom)
          const eyeL = Math.abs(lm[159].y - lm[145].y);
          const eyeR = Math.abs(lm[386].y - lm[374].y);
          const eyeOpen = ((eyeL + eyeR) / 2) / faceH;

          // mouth open — upper lip 13, lower lip 14
          const mouth = Math.abs(lm[13].y - lm[14].y) / faceH;

          // stability — sliding window of center delta
          if (lastFaceCx !== null) {
            const d = Math.hypot(cxF - lastFaceCx, cyF - lastFaceCy);
            stabWin.push(d);
            if (stabWin.length > 10) stabWin.shift();
          }
          lastFaceCx = cxF; lastFaceCy = cyF;
          const stab = stabWin.length ? (stabWin.reduce((a, b) => a + b, 0) / stabWin.length) : 0;

          S3.CAM_DATA.FACE_LOCK = 1;
          S3.CAM_DATA.FACE_X = +cxF.toFixed(2);
          S3.CAM_DATA.FACE_Y = +cyF.toFixed(2);
          S3.CAM_DATA.FACE_SIZE = +sizeF.toFixed(2);
          S3.CAM_DATA.PROXIMITY_INDEX = +proximity.toFixed(2);
          S3.CAM_DATA.HEAD_YAW = +yaw.toFixed(2);
          S3.CAM_DATA.HEAD_PITCH = +pitch.toFixed(2);
          S3.CAM_DATA.EYE_OPENNESS = +eyeOpen.toFixed(2);
          S3.CAM_DATA.MOUTH_OPEN = +mouth.toFixed(2);
          S3.CAM_DATA.FACE_STABILITY = +stab.toFixed(2);
        } else {
          stabWin.length = 0;
          lastFaceCx = null; lastFaceCy = null;
          S3.CAM_DATA.FACE_LOCK = 0;
          S3.CAM_DATA.FACE_X = 0; S3.CAM_DATA.FACE_Y = 0;
          S3.CAM_DATA.FACE_SIZE = 0; S3.CAM_DATA.PROXIMITY_INDEX = 0;
          S3.CAM_DATA.HEAD_YAW = 0; S3.CAM_DATA.HEAD_PITCH = 0;
          S3.CAM_DATA.EYE_OPENNESS = 0; S3.CAM_DATA.MOUTH_OPEN = 0;
          S3.CAM_DATA.FACE_STABILITY = 0;
        }
      });
    }

    if (typeof Camera !== 'undefined') {
      // v11 OPT 2: Hands every frame, FaceMesh every 3rd frame, camera 240×180
      let camFrameN = 0;
      const cam = new Camera(videoEl, {
        onFrame: async () => {
          camFrameN++;
          await hands.send({ image: videoEl });
          if (faceMesh && camFrameN % 3 === 0) await faceMesh.send({ image: videoEl });
        },
        width: 240, height: 180,
      });
      cam.start()
        .then(() => { S3.input.inputModeEl.textContent = 'INPUT: HAND TRACKING READY'; })
        .catch(e => { console.warn('Camera error', e); });
    }
  }

  S3.initHandTracking = initHandTracking;
})();
