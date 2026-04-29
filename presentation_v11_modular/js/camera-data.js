/* Live store for MediaPipe Hands + FaceMesh outputs.
   Hands.js / FaceMesh writes; texture-pool reads on a 200ms interval. */
(function () {
  S3.CAM_DATA = {
    HAND_VECTOR_ACTIVE: 0, HAND_SIDE: 0,
    POINTER_X: 0, POINTER_Y: 0, POINTER_Z: 0,
    PINCH_DIST: 0, PINCH_ACTIVE: 0,
    WRIST_X: 0, WRIST_Y: 0, FINGER_SPREAD: 0,
    FACE_LOCK: 0, FACE_X: 0, FACE_Y: 0, FACE_SIZE: 0, PROXIMITY_INDEX: 0,
    HEAD_YAW: 0, HEAD_PITCH: 0, EYE_OPENNESS: 0, MOUTH_OPEN: 0, FACE_STABILITY: 0,
  };
})();
