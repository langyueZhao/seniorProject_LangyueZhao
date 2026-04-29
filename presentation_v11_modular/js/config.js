/* Shared namespace + visual / data constants.
   Loaded first — every other module reads from window.S3. */
window.S3 = window.S3 || {};

(function () {
  S3.RADIUS = 2.3;
  S3.N = 950;
  S3.GLYPHS = '01アイウエオカキクケコサシスセタナニヌ∅∑∆∇∈⊕⊗∞∮ABCDEFGHabcdef0123456789#$%&@<>[]{}|';
  S3.LIGHT_DIR = new THREE.Vector3(0.6, 0.5, 1.0).normalize();

  // 20 behavioral fields shown on particles
  S3.CAM_FIELDS = [
    'HAND_VECTOR_ACTIVE', 'HAND_SIDE',
    'POINTER_X', 'POINTER_Y', 'POINTER_Z',
    'PINCH_DIST', 'PINCH_ACTIVE',
    'WRIST_X', 'WRIST_Y', 'FINGER_SPREAD',
    'FACE_LOCK', 'FACE_X', 'FACE_Y', 'FACE_SIZE', 'PROXIMITY_INDEX',
    'HEAD_YAW', 'HEAD_PITCH', 'EYE_OPENNESS', 'MOUTH_OPEN', 'FACE_STABILITY',
  ];

  // shared per-field texture canvas resolution (v11 OPT 1)
  S3.FIELD_TEX_SIZE = 96;
})();
