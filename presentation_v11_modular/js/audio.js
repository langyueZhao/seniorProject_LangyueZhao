/* Web-Audio synth: ambient hum, hover ticks, target acquisition, all-clear chord. */
(function () {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let actx = null;

  function ensureAudio() {
    if (!actx) actx = new AudioCtx();
    if (actx.state === 'suspended') actx.resume();
  }

  function startAmbientHum() {
    ensureAudio();
    const osc    = actx.createOscillator();
    const gain   = actx.createGain();
    const filter = actx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 8;
    gain.gain.value = 0.04;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(actx.destination);
    osc.start();

    // slow pulse modulation
    const lfo     = actx.createOscillator();
    const lfoGain = actx.createGain();
    lfo.frequency.value = 0.25;
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
  }

  function playHoverTick(pitch = 880) {
    ensureAudio();
    const osc  = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'square';
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0.08, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 0.06);
  }

  function playExtractSound() {
    ensureAudio();
    const t = actx.currentTime;
    [440, 660, 880, 1100].forEach((f, i) => {
      const osc  = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, t + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.2);
    });

    // bandpass-filtered noise burst
    const bufSize = actx.sampleRate * 0.15;
    const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.06;

    const src = actx.createBufferSource();
    const flt = actx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 2200;
    flt.Q.value = 2;
    const gn = actx.createGain();
    gn.gain.setValueAtTime(0.3, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    src.buffer = buf;
    src.connect(flt);
    flt.connect(gn);
    gn.connect(actx.destination);
    src.start(t);
  }

  function playRotateWhoosh() {
    ensureAudio();
    const osc  = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, actx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.05, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 0.3);
  }

  function playAllClearSound() {
    ensureAudio();
    const t = actx.currentTime;
    [220, 330, 440, 550, 660, 880].forEach((f, i) => {
      const osc  = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.5);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.55);
    });
  }

  let hoverTickCooldown = 0;
  function maybePlayHoverTick(isHit) {
    if (isHit && Date.now() > hoverTickCooldown) {
      playHoverTick(660 + Math.random() * 440);
      hoverTickCooldown = Date.now() + 120;
    }
  }

  S3.ensureAudio        = ensureAudio;
  S3.startAmbientHum    = startAmbientHum;
  S3.playHoverTick      = playHoverTick;
  S3.playExtractSound   = playExtractSound;
  S3.playRotateWhoosh   = playRotateWhoosh;
  S3.playAllClearSound  = playAllClearSound;
  S3.maybePlayHoverTick = maybePlayHoverTick;
})();
