// ==========================================
// 1. PROCEDURAL LO-FI TEXTURE GENERATOR
// ==========================================
function createBrutalistTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (type === 'ground') {
    ctx.fillStyle = '#474b45';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3600; i++) {
      const shade = 52 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade - 3})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    ctx.fillStyle = 'rgba(20, 22, 19, 0.55)';
    ctx.fillRect(0, 0, 128, 2);
    ctx.fillRect(0, 0, 2, 128);
    ctx.fillRect(64, 0, 1, 128);
    ctx.fillRect(0, 64, 128, 1);
  } else if (type === 'building') {
    ctx.fillStyle = '#383b36';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2400; i++) {
      const shade = 40 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade - 2})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    ctx.fillStyle = '#181a17';
    for (let y = 12; y < 120; y += 28) {
      for (let x = 10; x < 120; x += 24) {
        if (Math.random() > 0.22) {
          ctx.fillRect(x, y, 12, 14);
        }
      }
    }
  } else if (type === 'hazard') {
    ctx.fillStyle = '#69552b';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#1e201d';
    for (let i = -128; i < 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i - 48, 128);
      ctx.lineTo(i - 64, 128);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

// ==========================================
// 2. THREE.JS SCENE, CAMERA & SKINS
// ==========================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const SKIN_CONFIGS = {
  default: { fog: 0x2b2e29, ambient: 0x959c90, dir: 0xdbe3d5, token: 0xd4b459, bodyClass: '' },
  sodium:  { fog: 0x3b311e, ambient: 0xb89f6e, dir: 0xffd27d, token: 0xfff099, bodyClass: 'skin-sodium' },
  rust:    { fog: 0x38201d, ambient: 0xa8716b, dir: 0xff9d94, token: 0xffd166, bodyClass: 'skin-rust' },
  void:    { fog: 0x0d120f, ambient: 0x4d735c, dir: 0x8cffb8, token: 0x8cffb8, bodyClass: 'skin-void' }
};

scene.background = new THREE.Color(SKIN_CONFIGS.default.fog);
scene.fog = new THREE.FogExp2(SKIN_CONFIGS.default.fog, 0.023);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 140);
const EYE_HEIGHT = 1.45;
camera.position.set(0, EYE_HEIGHT, 0);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x959c90, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xdbe3d5, 0.65);
dirLight.position.set(15, 35, 12);
scene.add(dirLight);

// Materials
const groundTex = createBrutalistTexture('ground');
groundTex.repeat.set(60, 60);
const buildingTex = createBrutalistTexture('building');
buildingTex.repeat.set(2, 4);
const hazardTex = createBrutalistTexture('hazard');

const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 });
const buildingMat = new THREE.MeshStandardMaterial({ map: buildingTex, roughness: 0.9 });
const hazardMat = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.85 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a4d47, roughness: 0.9 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x222421, roughness: 0.9 });
const figureMat = new THREE.MeshStandardMaterial({ color: 0x161715, roughness: 1.0 });
const lightBulbMat = new THREE.MeshBasicMaterial({ color: 0xe3ebd5 });
const trainWindowMat = new THREE.MeshBasicMaterial({ color: 0xc9d4b8 });
const tokenMat = new THREE.MeshStandardMaterial({
  color: 0xd4b459,
  emissive: 0x594716,
  roughness: 0.35,
  metalness: 0.6
});

function applySkin(skinId) {
  const cfg = SKIN_CONFIGS[skinId] || SKIN_CONFIGS.default;
  scene.background.setHex(cfg.fog);
  scene.fog.color.setHex(cfg.fog);
  ambientLight.color.setHex(cfg.ambient);
  dirLight.color.setHex(cfg.dir);
  tokenMat.color.setHex(cfg.token);
  document.body.className = cfg.bodyClass;
}

// Infinite Ground Plane
const groundGeo = new THREE.PlaneGeometry(340, 340);
groundGeo.rotateX(-Math.PI / 2);
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
scene.add(groundMesh);

// ==========================================
// 3. OBJECT & WORLD SPAWNERS
// ==========================================
const LOOP_WIDTH = 180;
const HALF_LOOP = LOOP_WIDTH / 2;
const Z_DEPTH = 140;

let props = [];
let coins = [];
let monorailTrains = [];

function wrapX(val) {
  let wrapped = (val + HALF_LOOP) % LOOP_WIDTH;
  if (wrapped < 0) wrapped += LOOP_WIDTH;
  return wrapped - HALF_LOOP;
}

function createBystanderSilhouette() {
  const fig = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.15, 0.32), figureMat);
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.32), figureMat);
  head.position.y = 1.98;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.28), figureMat);
  legs.position.y = 0.32;
  fig.add(torso, head, legs);
  return fig;
}

function createConcreteUtilityPole() {
  const poleGroup = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 11, 8), poleMat);
  shaft.position.y = 5.5;
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.22), darkMetalMat);
  crossbar.position.y = 9.8;
  const ins1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.18), lightBulbMat);
  ins1.position.set(-0.95, 10.05, 0);
  const ins2 = ins1.clone();
  ins2.position.set(0.95, 10.05, 0);

  poleGroup.add(shaft, crossbar, ins1, ins2);
  return poleGroup;
}

function createProp(x, z) {
  const roll = Math.random();
  let mesh;

  if (roll < 0.24) {
    const w = 5 + Math.random() * 8;
    const d = 5 + Math.random() * 8;
    const h = 18 + Math.random() * 28;
    mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
    mesh.position.y = h / 2;
    mesh.userData = { halfW: w / 2, halfD: d / 2, topY: h, isSolid: true };
  } else if (roll < 0.56) {
    const w = 3.8 + Math.random() * 3.5;
    const h = 1.15;
    const d = 1.2;
    mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hazardMat);
    mesh.position.y = h / 2;
    mesh.userData = { halfW: w / 2, halfD: d / 2, topY: h, isSolid: true };
  } else if (roll < 0.80) {
    mesh = createConcreteUtilityPole();
    mesh.userData = { halfW: 0.38, halfD: 0.38, topY: 11, isSolid: true };
  } else if (roll < 0.90) {
    mesh = createBystanderSilhouette();
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.userData = { halfW: 0.3, halfD: 0.3, topY: 2.1, isSolid: true };
  } else {
    mesh = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 8.5, 0.22), darkMetalMat);
    pole.position.y = 4.25;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.16), darkMetalMat);
    arm.position.set(0.8, 8.4, 0);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.25), lightBulbMat);
    lamp.position.set(1.3, 8.3, 0);
    mesh.add(pole, arm, lamp);
    mesh.rotation.z = (Math.random() - 0.5) * 0.14;
    mesh.userData = { halfW: 0.25, halfD: 0.25, topY: 8.5, isSolid: true };
  }

  mesh.userData.baseX = x;
  mesh.position.set(x, mesh.position.y, z);
  scene.add(mesh);
  props.push(mesh);
}

const tokenGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.14, 12);
tokenGeo.rotateX(Math.PI / 2);

function spawnTokenLine(baseX, startZ) {
  const isHighLine = Math.random() < 0.35;
  const yHeight = isHighLine ? 2.4 : 1.05;

  for (let i = 0; i < 4; i++) {
    const coin = new THREE.Mesh(tokenGeo, tokenMat);
    const zPos = startZ - i * 3.8;
    coin.position.set(baseX, yHeight, zPos);
    coin.userData = {
      baseX: baseX,
      baseY: yHeight,
      active: true,
      phase: i * 0.5
    };
    scene.add(coin);
    coins.push(coin);
  }
}

function createOverheadMonorail(zPos, speedDir) {
  const viaduct = new THREE.Group();
  const track = new THREE.Mesh(new THREE.BoxGeometry(340, 1.4, 2.6), buildingMat);
  track.position.y = 14.5;
  viaduct.add(track);

  const train = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 2.1), darkMetalMat);
  body.position.y = 16.3;
  train.add(body);

  for (let wx = -7; wx <= 7; wx += 2.8) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.16), trainWindowMat);
    win.position.set(wx, 16.5, 0);
    train.add(win);
  }

  train.userData = {
    baseX: (Math.random() - 0.5) * LOOP_WIDTH,
    velX: speedDir * (18 + Math.random() * 14)
  };
  viaduct.add(train);
  viaduct.position.z = zPos;
  scene.add(viaduct);
  monorailTrains.push({ viaduct, train });
}

function populateWorld() {
  props.forEach(p => scene.remove(p));
  props = [];
  coins.forEach(c => scene.remove(c));
  coins = [];
  monorailTrains.forEach(m => scene.remove(m.viaduct));
  monorailTrains = [];

  for (let i = 0; i < 140; i++) {
    const x = (Math.random() - 0.5) * LOOP_WIDTH;
    const z = -24 - Math.random() * (Z_DEPTH - 24);
    createProp(x, z);
  }

  for (let i = 0; i < 16; i++) {
    const x = (Math.random() - 0.5) * LOOP_WIDTH;
    const z = -25 - Math.random() * (Z_DEPTH - 25);
    spawnTokenLine(x, z);
  }

  createOverheadMonorail(-55, 1);
  createOverheadMonorail(-115, -1);
}
