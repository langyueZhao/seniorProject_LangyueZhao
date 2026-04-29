/* Three.js renderer / scene / camera / globe group + viewport tracking. */
(function () {
  const wrap = document.getElementById('s3');
  function getWH() { return { W: wrap.offsetWidth, H: wrap.offsetHeight }; }
  const initial = getWH();

  const mainCanvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas: mainCanvas, alpha: false, antialias: true });
  renderer.setSize(initial.W, initial.H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // v11 OPT 5: cap 2 → 1.5
  renderer.setClearColor(0x00080f, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x00080f, 0.022);

  const camera = new THREE.PerspectiveCamera(42, initial.W / initial.H, 0.1, 200);
  camera.position.set(0, 0, 10.5);

  const group = new THREE.Group();
  scene.add(group);
  group.rotation.z = -0.42;

  S3.wrap = wrap;
  S3.renderer = renderer;
  S3.scene = scene;
  S3.camera = camera;
  S3.group = group;
  S3.getWH = getWH;
  // Mutable viewport — main.js's resize handler updates W/H in place
  S3.viewport = { W: initial.W, H: initial.H };
})();
