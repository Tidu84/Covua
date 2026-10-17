import * as THREE from 'three';

export interface CafeSceneBundle {
  group: THREE.Group;
  cafeLights: THREE.Light[];
  tableObstacles: { x: number; z: number; r: number; maxY: number }[];
  bistroLights: THREE.PointLight[];
  update: (timeNow: number) => void;
  dispose: () => void;
}

// =============================================================================
// Procedural Canvas Textures for Hanoi Sidewalk & French Colonial Shophouses
// =============================================================================

// 1. Hanoi Sidewalk Stone Paving Texture
function createHanoiSidewalkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Light grey-beige granite paver base
  ctx.fillStyle = '#a8a29e';
  ctx.fillRect(0, 0, 1024, 1024);

  const tileSize = 64;
  const cols = 1024 / tileSize;

  for (let r = 0; r < cols; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileSize;
      const y = r * tileSize;
      const noise = (Math.sin(r * 12.3 + c * 33.7) * 16) | 0;

      // Color variation between paving stones
      const grey = Math.min(235, Math.max(130, 168 + noise));
      ctx.fillStyle = `rgb(${grey + 4}, ${grey}, ${grey - 8})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // Subtle surface speckling / granite grain
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let s = 0; s < 4; s++) {
        const sx = x + 6 + (Math.sin(s * 7 + r) * 20 + 24);
        const sy = y + 6 + (Math.cos(s * 5 + c) * 20 + 24);
        ctx.fillRect(sx, sy, 3, 3);
      }

      // Mortar groove lines
      ctx.fillStyle = '#78716c';
      ctx.fillRect(x, y, tileSize, 2);
      ctx.fillRect(x, y, 2, tileSize);
    }
  }

  // Subtle natural pavement moss / patina spots near building base
  for (let m = 0; m < 60; m++) {
    const mx = Math.random() * 1024;
    const my = Math.random() * 1024;
    const mr = 15 + Math.random() * 45;
    const grad = ctx.createRadialGradient(mx, my, 2, mx, my, mr);
    grad.addColorStop(0, 'rgba(84, 110, 80, 0.22)');
    grad.addColorStop(1, 'rgba(84, 110, 80, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 2. French Colonial Ochre Yellow Stucco Wall Texture
function createHanoiColonialWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Classic Hanoi French colonial golden ochre base
  ctx.fillStyle = '#d9a74a';
  ctx.fillRect(0, 0, 1024, 1024);

  // Weathering, stucco strokes and aged patina
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const w = 40 + Math.random() * 120;
    const h = 8 + Math.random() * 30;
    const isDark = Math.random() > 0.45;
    ctx.fillStyle = isDark ? 'rgba(160, 110, 35, 0.12)' : 'rgba(255, 220, 130, 0.15)';
    ctx.fillRect(x, y, w, h);
  }

  // Stucco horizontal architectural rustication lines
  ctx.fillStyle = 'rgba(120, 80, 20, 0.35)';
  for (let y = 120; y < 1024; y += 128) {
    ctx.fillRect(0, y, 1024, 4);
    ctx.fillStyle = 'rgba(255, 235, 160, 0.3)';
    ctx.fillRect(0, y + 4, 1024, 2);
    ctx.fillStyle = 'rgba(120, 80, 20, 0.35)';
  }

  // Historic moss / water stain streaks dripping from roof
  for (let s = 0; s < 18; s++) {
    const sx = 40 + s * 55 + (Math.sin(s * 9) * 20);
    const grad = ctx.createLinearGradient(sx, 0, sx, 600);
    grad.addColorStop(0, 'rgba(40, 60, 35, 0.45)');
    grad.addColorStop(0.4, 'rgba(65, 85, 45, 0.25)');
    grad.addColorStop(1, 'rgba(90, 110, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, 0, 18 + (s % 3) * 8, 550);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 3. Hanoi Street Signs Texture (Phố Cổ Enamel Plate)
function createHanoiStreetSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep Hanoi Navy Blue Enamel
  ctx.fillStyle = '#0f2744';
  ctx.fillRect(0, 0, 1024, 512);

  // White enamel border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.strokeRect(32, 32, 960, 448);

  ctx.lineWidth = 3;
  ctx.strokeRect(46, 46, 932, 420);

  // Top header: District
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '700 38px "Inter", sans-serif';
  ctx.fillText('QUẬN HOÀN KIẾM • PHỐ CỔ HÀ NỘI', 512, 110);

  // Main street name
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 105px "Cinzel", "Times New Roman", serif';
  ctx.fillText('PHỐ ĐINH LIỆT', 512, 235);

  // Subtitle / Cafe Chess Guild
  ctx.fillStyle = '#fde047';
  ctx.font = '700 44px "Inter", sans-serif';
  ctx.fillText('☕ QUÁN CÀ PHÊ & CHÈ CHÉN CỜ TƯỚNG', 512, 325);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = 'italic 500 30px "Inter", sans-serif';
  ctx.fillText('Kỳ nghệ thăng hoa • Trà thơm bạn hiền bên hè phố cổ', 512, 385);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 4. Chalkboard Menu Texture
function createHanoiMenuTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Dark slate chalkboard
  ctx.fillStyle = '#1c221e';
  ctx.fillRect(0, 0, 512, 768);

  // Wooden frame
  ctx.strokeStyle = '#c68a4c';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 496, 752);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.font = '800 34px "Cinzel", serif';
  ctx.fillText('☕ CÀ PHÊ HÀ NỘI', 256, 68);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 18px "Inter", sans-serif';
  ctx.fillText('— THỰC ĐƠN VỈA HÈ —', 256, 102);

  const items = [
    { n: 'Cà phê Trứng Hà Nội', p: '35k' },
    { n: 'Nâu đá / Đen đá Phin', p: '25k' },
    { n: 'Bạc xỉu Sài Gòn', p: '28k' },
    { n: 'Trà sen Bách Diệp', p: '20k' },
    { n: 'Trà đá chanh sả', p: '15k' },
    { n: 'Đĩa hạt hướng dương', p: '15k' },
    { n: 'Kẹo lạc / Kẹo dồi', p: '10k' }
  ];

  ctx.textAlign = 'left';
  items.forEach((it, i) => {
    const y = 160 + i * 72;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.fillText(`• ${it.n}`, 48, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fde047';
    ctx.font = '800 22px "Cinzel", monospace';
    ctx.fillText(it.p, 464, y);
    ctx.textAlign = 'left';
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.font = 'italic 600 17px "Georgia", serif';
  ctx.fillText('✦ Cờ Úp & Cờ Tướng Giao Hữu ✦', 256, 700);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// =============================================================================
// Helper: Create Stylized Seated Human Figure (Customer / Chess Player)
// =============================================================================
interface PersonConfig {
  pos: THREE.Vector3;
  rotY: number;
  shirtColor: number;
  pantsColor: number;
  skinTone?: number;
  hasHat?: boolean;
  hatColor?: number;
  pose: 'playing_opponent' | 'watching_lean' | 'watching_relaxed' | 'drinking_tea';
}

function createSeatedPerson(cfg: PersonConfig): THREE.Group {
  const person = new THREE.Group();
  person.position.copy(cfg.pos);
  person.rotation.y = cfg.rotY;

  const skinMat = new THREE.MeshStandardMaterial({
    color: cfg.skinTone || 0xd8a27a,
    roughness: 0.65,
    metalness: 0.05
  });

  const shirtMat = new THREE.MeshStandardMaterial({
    color: cfg.shirtColor,
    roughness: 0.75,
    metalness: 0.02
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: cfg.pantsColor,
    roughness: 0.85,
    metalness: 0.02
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.55,
    metalness: 0.1
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x17120e,
    roughness: 0.8
  });

  // Pelvis / Hips (sitting on low stool at y = 0.42)
  const seatHeight = 0.42;
  const pelvisGeo = new THREE.BoxGeometry(0.34, 0.16, 0.32);
  const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvis.position.y = seatHeight + 0.08;
  person.add(pelvis);

  // Thighs (extending forward along Z)
  for (const sx of [-0.1, 0.1]) {
    const thighGeo = new THREE.BoxGeometry(0.12, 0.12, 0.36);
    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.position.set(sx, seatHeight + 0.08, 0.18);
    thigh.castShadow = true;
    person.add(thigh);

    // Lower Leg (calves dropping down to ground)
    const calfGeo = new THREE.CylinderGeometry(0.055, 0.048, seatHeight, 16);
    const calf = new THREE.Mesh(calfGeo, pantsMat);
    calf.position.set(sx, seatHeight * 0.5, 0.36);
    calf.castShadow = true;
    person.add(calf);

    // Shoes / Sandals
    const shoeGeo = new THREE.BoxGeometry(0.11, 0.065, 0.22);
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(sx, 0.035, 0.42);
    shoe.castShadow = true;
    person.add(shoe);
  }

  // Torso / Upper Body (slight forward lean for chess player concentration)
  const torsoLean = cfg.pose === 'playing_opponent' ? 0.14 : 0.06;
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, seatHeight + 0.15, 0);
  torsoGroup.rotation.x = torsoLean;

  const torsoGeo = new THREE.BoxGeometry(0.36, 0.42, 0.24);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.position.y = 0.21;
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Collar detail
  const collarGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.04, 16);
  const collar = new THREE.Mesh(collarGeo, shirtMat);
  collar.position.y = 0.42;
  torsoGroup.add(collar);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.1, 16);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 0.46;
  torsoGroup.add(neck);

  // Head
  const headGeo = new THREE.SphereGeometry(0.125, 20, 20);
  headGeo.scale(1.0, 1.15, 1.05);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 0.62;
  head.castShadow = true;
  torsoGroup.add(head);

  // Hair or Classic Hanoi Beret / Cap
  if (cfg.hasHat) {
    const hatMat = new THREE.MeshStandardMaterial({
      color: cfg.hatColor || 0x334155,
      roughness: 0.85
    });
    const capGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.07, 20);
    const cap = new THREE.Mesh(capGeo, hatMat);
    cap.position.set(0, 0.72, 0.02);
    cap.rotation.x = -0.1;
    torsoGroup.add(cap);

    const brimGeo = new THREE.BoxGeometry(0.16, 0.015, 0.09);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.set(0, 0.69, 0.14);
    brim.rotation.x = 0.15;
    torsoGroup.add(brim);
  } else {
    // Stylish combed short hair
    const hairGeo = new THREE.SphereGeometry(0.13, 16, 16);
    hairGeo.scale(1.02, 0.7, 1.05);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.69, -0.015);
    torsoGroup.add(hair);
  }

  // Arms and Hands according to Pose
  for (const sx of [-1, 1]) {
    const armGroup = new THREE.Group();
    armGroup.position.set(sx * 0.22, 0.38, 0);

    // Upper arm (shoulder to elbow)
    const upperArmGeo = new THREE.CylinderGeometry(0.048, 0.044, 0.24, 12);
    const upperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    upperArm.position.y = -0.12;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    // Forearm (elbow to wrist)
    const foreArmGroup = new THREE.Group();
    foreArmGroup.position.set(0, -0.24, 0);

    const foreArmGeo = new THREE.CylinderGeometry(0.042, 0.038, 0.22, 12);
    const foreArm = new THREE.Mesh(foreArmGeo, skinMat);
    foreArm.position.y = -0.11;
    foreArm.castShadow = true;
    foreArmGroup.add(foreArm);

    // Hand
    const handGeo = new THREE.SphereGeometry(0.045, 12, 12);
    handGeo.scale(1.0, 0.7, 1.3);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(0, -0.22, 0.02);
    foreArmGroup.add(hand);

    if (cfg.pose === 'playing_opponent') {
      // Opponent studying board: elbows bent resting forward on table/lap
      armGroup.rotation.x = 0.6;
      armGroup.rotation.z = -sx * 0.2;
      foreArmGroup.rotation.x = -1.1;
      foreArmGroup.rotation.y = sx * 0.25;
    } else if (cfg.pose === 'watching_lean') {
      // Spectator leaning in resting hands on chin or knee
      armGroup.rotation.x = 0.75;
      armGroup.rotation.z = -sx * 0.35;
      foreArmGroup.rotation.x = -1.25;
    } else {
      // Relaxed pose holding a drink or resting on knees
      armGroup.rotation.x = 0.35;
      armGroup.rotation.z = -sx * 0.15;
      foreArmGroup.rotation.x = -0.65;
    }

    armGroup.add(foreArmGroup);
    torsoGroup.add(armGroup);
  }

  person.add(torsoGroup);
  person.userData = { torsoGroup, baseLean: torsoLean };
  return person;
}

// =============================================================================
// Helper: Create Vintage Honda Super Cub 50 (Iconic Hanoi Street Motorcycle)
// =============================================================================
function createVintageHondaCub(): THREE.Group {
  const moto = new THREE.Group();
  moto.name = 'HondaSuperCub';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3d7068, // Classic retro seafoam teal / mint green
    roughness: 0.32,
    metalness: 0.65
  });

  const legShieldMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e6, // Ivory / cream plastic leg shield
    roughness: 0.45,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.12,
    metalness: 0.95
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x1e2022,
    roughness: 0.85
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x2b1c11,
    roughness: 0.75
  });

  // Wheels (Front at z = 0.65, Rear at z = -0.65)
  const wheelRadius = 0.28;
  const tireGeo = new THREE.TorusGeometry(wheelRadius, 0.045, 12, 32);
  const rimGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16);

  for (const z of [-0.65, 0.65]) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, wheelRadius + 0.02, z);

    const tire = new THREE.Mesh(tireGeo, rubberMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(rimGeo, chromeMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Spokes
    for (let sp = 0; sp < 8; sp++) {
      const spGeo = new THREE.CylinderGeometry(0.003, 0.003, wheelRadius * 1.9, 6);
      const spoke = new THREE.Mesh(spGeo, chromeMat);
      spoke.rotation.y = (sp * Math.PI) / 8;
      wheelGroup.add(spoke);
    }

    moto.add(wheelGroup);
  }

  // Underbone frame / Engine block
  const frameGeo = new THREE.BoxGeometry(0.14, 0.22, 0.85);
  const frame = new THREE.Mesh(frameGeo, bodyMat);
  frame.position.set(0, 0.42, 0);
  frame.castShadow = true;
  moto.add(frame);

  const engineGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 16);
  const engine = new THREE.Mesh(engineGeo, chromeMat);
  engine.rotation.z = Math.PI / 2;
  engine.position.set(0, 0.26, -0.05);
  moto.add(engine);

  // Chrome exhaust pipe running to rear
  const exhaustGeo = new THREE.CylinderGeometry(0.022, 0.028, 0.78, 12);
  const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0.11, 0.22, -0.32);
  moto.add(exhaust);

  // Iconic White Curved Leg Shield Apron
  const shieldGeo = new THREE.BoxGeometry(0.42, 0.48, 0.025);
  const shield = new THREE.Mesh(shieldGeo, legShieldMat);
  shield.position.set(0, 0.48, 0.28);
  shield.rotation.x = 0.25;
  shield.castShadow = true;
  moto.add(shield);

  // Two-tone leather split seat
  const seatGeo = new THREE.BoxGeometry(0.22, 0.08, 0.42);
  const seat = new THREE.Mesh(seatGeo, leatherMat);
  seat.position.set(0, 0.62, -0.15);
  seat.castShadow = true;
  moto.add(seat);

  // Chrome rear luggage rack
  const rackGeo = new THREE.BoxGeometry(0.24, 0.02, 0.35);
  const rack = new THREE.Mesh(rackGeo, chromeMat);
  rack.position.set(0, 0.58, -0.52);
  moto.add(rack);

  // Handlebars & Chrome Round Headlight
  const barGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.56, 12);
  const bars = new THREE.Mesh(barGeo, chromeMat);
  bars.rotation.z = Math.PI / 2;
  bars.position.set(0, 0.86, 0.52);
  moto.add(bars);

  const headLightGeo = new THREE.SphereGeometry(0.065, 16, 16);
  const headLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
  const headLight = new THREE.Mesh(headLightGeo, headLightMat);
  headLight.position.set(0, 0.86, 0.62);
  moto.add(headLight);

  // Dual round rear view mirrors
  for (const sx of [-0.25, 0.25]) {
    const mirrorStemGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8);
    const stem = new THREE.Mesh(mirrorStemGeo, chromeMat);
    stem.position.set(sx, 0.94, 0.52);
    stem.rotation.z = -sx * 0.3;
    moto.add(stem);

    const mirrorGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.01, 16), chromeMat);
    mirrorGlass.rotation.x = Math.PI / 2;
    mirrorGlass.position.set(sx * 1.15, 1.02, 0.52);
    moto.add(mirrorGlass);
  }

  // Kickstand parking tilt (tilted onto sidewalk curb)
  moto.rotation.z = 0.14;
  return moto;
}

// =============================================================================
// Helper: Create Ancient Hanoi Street Shade Tree (Cây Bàng / Cây Xà Cừ Cổ Thụ)
// =============================================================================
function createHanoiShadeTree(): THREE.Group {
  const tree = new THREE.Group();
  tree.name = 'HanoiShadeTree';

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.9,
    metalness: 0.05
  });

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2e6123,
    roughness: 0.45,
    metalness: 0.02,
    side: THREE.DoubleSide
  });

  const limeWashMat = new THREE.MeshStandardMaterial({
    color: 0xeee8dd,
    roughness: 0.8
  });

  // Whitewashed tree base curb (đặc trưng quét vôi trắng gốc cây Hà Nội)
  const baseCurbGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.32, 24);
  const baseCurb = new THREE.Mesh(baseCurbGeo, limeWashMat);
  baseCurb.position.y = 0.16;
  baseCurb.castShadow = true;
  tree.add(baseCurb);

  // Soil
  const soilGeo = new THREE.CylinderGeometry(0.82, 0.82, 0.05, 24);
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x24180d, roughness: 0.95 });
  const soil = new THREE.Mesh(soilGeo, soilMat);
  soil.position.y = 0.28;
  tree.add(soil);

  // Main gnarled winding trunk
  const trunkGeo = new THREE.CylinderGeometry(0.42, 0.58, 4.2, 16);
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.position.set(0, 2.1, 0);
  trunk.rotation.z = 0.06;
  trunk.rotation.x = -0.04;
  trunk.castShadow = true;
  tree.add(trunk);

  // Spreading boughs and branches extending across the sidewalk above the chess table
  const branchCoords = [
    { pos: [0, 3.8, 0], rot: [0.45, 0.2, 0.5], len: 3.8, r: 0.24 },
    { pos: [0, 3.8, 0], rot: [-0.35, 1.8, -0.4], len: 3.4, r: 0.22 },
    { pos: [0, 3.6, 0], rot: [0.1, -1.2, 0.6], len: 3.6, r: 0.25 }
  ];

  branchCoords.forEach((bc) => {
    const branchGeo = new THREE.CylinderGeometry(bc.r * 0.6, bc.r, bc.len, 12);
    const branch = new THREE.Mesh(branchGeo, barkMat);
    branch.position.set(bc.pos[0], bc.pos[1] + bc.len * 0.4, bc.pos[2]);
    branch.rotation.set(bc.rot[0], bc.rot[1], bc.rot[2]);
    branch.castShadow = true;
    tree.add(branch);
  });

  // Large leafy foliage canopies filtering dappled sunlight
  const foliageCoords = [
    { pos: [1.2, 5.2, 1.4], scl: [3.4, 1.6, 3.2] },
    { pos: [-1.4, 4.9, -1.2], scl: [3.0, 1.5, 3.0] },
    { pos: [0.2, 5.8, -0.2], scl: [4.2, 2.1, 4.0] },
    { pos: [2.2, 4.6, -0.8], scl: [2.8, 1.4, 2.8] }
  ];

  foliageCoords.forEach((fc) => {
    const folGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const foliage = new THREE.Mesh(folGeo, leafMat);
    foliage.position.fromArray(fc.pos);
    foliage.scale.fromArray(fc.scl);
    foliage.castShadow = true;
    tree.add(foliage);
  });

  return tree;
}

// =============================================================================
// Main Hanoi Sidewalk Cafe Scene Generator
// =============================================================================
export function createCafeSceneGroup(boardSurfaceY = 0.775): CafeSceneBundle {
  const group = new THREE.Group();
  group.name = 'HanoiSidewalkCafeRoot';

  const cafeLights: THREE.Light[] = [];
  const bistroLights: THREE.PointLight[] = [];
  const tableObstacles: { x: number; z: number; r: number; maxY: number }[] = [];

  // =========================================================================
  // 1. Textures & Materials
  // =========================================================================
  const sidewalkTex = createHanoiSidewalkTexture();
  const wallTex = createHanoiColonialWallTexture();
  const streetSignTex = createHanoiStreetSignTexture();
  const menuTex = createHanoiMenuTexture();

  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: sidewalkTex,
    roughness: 0.78,
    metalness: 0.05
  });

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.85,
    metalness: 0.04
  });

  const curbGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    roughness: 0.7,
    metalness: 0.08
  });

  const asphaltRoadMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.92,
    metalness: 0.02
  });

  const greenShutterMat = new THREE.MeshStandardMaterial({
    color: 0x1f4d2b, // Hanoi French colonial dark green shutters
    roughness: 0.45,
    metalness: 0.08
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x2b1c11,
    roughness: 0.45,
    metalness: 0.1
  });

  const teakTableMat = new THREE.MeshStandardMaterial({
    color: 0x4a2e18,
    roughness: 0.38,
    metalness: 0.12
  });

  const polishedBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.88
  });

  const clearGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.94,
    opacity: 0.9,
    transparent: true,
    roughness: 0.06,
    ior: 1.5,
    thickness: 0.05
  });

  const terracottaRoofMat = new THREE.MeshStandardMaterial({
    color: 0xa84824, // Terracotta Vietnamese curved tiles
    roughness: 0.85,
    metalness: 0.02
  });

  // =========================================================================
  // 2. Grounds: Hanoi Sidewalk Pavement & Asphalt Street Roadway
  // =========================================================================
  // Sidewalk (Width: 16m, Depth: 8m along Z from z = -6.0 to z = 2.0)
  const sidewalkGeo = new THREE.BoxGeometry(18.0, 0.18, 9.0);
  const sidewalkMesh = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sidewalkMesh.position.set(0, 0.09, -1.5);
  sidewalkMesh.receiveShadow = true;
  group.add(sidewalkMesh);

  // Granite Curb along road edge (at z = 3.0)
  const curbGeo = new THREE.BoxGeometry(18.0, 0.24, 0.35);
  const curbMesh = new THREE.Mesh(curbGeo, curbGraniteMat);
  curbMesh.position.set(0, 0.12, 3.0);
  curbMesh.receiveShadow = true;
  group.add(curbMesh);

  // Asphalt Street Roadway (extending outward beyond curb into foreground)
  const roadGeo = new THREE.PlaneGeometry(36.0, 16.0);
  const roadMesh = new THREE.Mesh(roadGeo, asphaltRoadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.set(0, 0.005, 11.0);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // =========================================================================
  // 3. Background: French Colonial Shophouse Facade (Nhà Cổ Phố Phường Hà Nội)
  // =========================================================================
  const facadeGroup = new THREE.Group();
  facadeGroup.position.set(0, 0, -6.0);

  // 2-Storey Shophouse Wall (Height: 7.2m, Width: 18.0m)
  const wallH = 7.4;
  const wallGeo = new THREE.BoxGeometry(18.0, wallH, 0.4);
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.position.set(0, wallH * 0.5, 0);
  wallMesh.receiveShadow = true;
  facadeGroup.add(wallMesh);

  // Ground Floor Shop Entrance & Wooden Accordion Doors (Cửa bức bàn / cửa gỗ)
  const shopDoorGeo = new THREE.BoxGeometry(4.2, 3.1, 0.1);
  const shopDoor = new THREE.Mesh(shopDoorGeo, darkWoodMat);
  shopDoor.position.set(0, 1.55, 0.22);
  shopDoor.castShadow = true;
  facadeGroup.add(shopDoor);

  // French Louvered Green Wooden Shutters (Cửa sổ chớp xanh lá đặc trưng)
  const windowPositions = [
    { x: -4.8, y: 5.0 },
    { x: -1.6, y: 5.0 },
    { x: 1.6, y: 5.0 },
    { x: 4.8, y: 5.0 },
    { x: -5.2, y: 2.1 },
    { x: 5.2, y: 2.1 }
  ];

  windowPositions.forEach((wp) => {
    const winGroup = new THREE.Group();
    winGroup.position.set(wp.x, wp.y, 0.22);

    // Dark window frame
    const frameGeo = new THREE.BoxGeometry(1.35, 1.85, 0.08);
    const frame = new THREE.Mesh(frameGeo, darkWoodMat);
    winGroup.add(frame);

    // Dual Green Louvered Shutters (one opened, one ajar)
    for (const sx of [-1, 1]) {
      const shutterGeo = new THREE.BoxGeometry(0.58, 1.75, 0.04);
      const shutter = new THREE.Mesh(shutterGeo, greenShutterMat);
      shutter.position.set(sx * 0.32, 0, 0.05);
      shutter.rotation.y = sx * 0.18;
      shutter.castShadow = true;
      winGroup.add(shutter);
    }

    // Small flower box on windowsill with red/pink bougainvillea blossoms
    const boxGeo = new THREE.BoxGeometry(1.25, 0.18, 0.22);
    const flowerBox = new THREE.Mesh(boxGeo, darkWoodMat);
    flowerBox.position.set(0, -0.92, 0.14);
    winGroup.add(flowerBox);

    const flowersGeo = new THREE.DodecahedronGeometry(0.18, 1);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const flowers = new THREE.Mesh(flowersGeo, flowerMat);
    flowers.position.set(0, -0.84, 0.14);
    flowers.scale.set(3.2, 0.8, 1.2);
    winGroup.add(flowers);

    facadeGroup.add(winGroup);
  });

  // Upper Floor Balcony with Wrought Iron Balustrade
  const balconyGeo = new THREE.BoxGeometry(14.0, 0.18, 0.95);
  const balcony = new THREE.Mesh(balconyGeo, darkWoodMat);
  balcony.position.set(0, 3.8, 0.5);
  balcony.castShadow = true;
  facadeGroup.add(balcony);

  const railingGeo = new THREE.BoxGeometry(14.0, 0.85, 0.05);
  const railing = new THREE.Mesh(railingGeo, darkWoodMat);
  railing.position.set(0, 4.3, 0.95);
  railing.castShadow = true;
  facadeGroup.add(railing);

  // Terracotta Overhanging Eaves Roof with Wooden Brackets
  const roofGeo = new THREE.BoxGeometry(18.4, 0.32, 1.6);
  const roof = new THREE.Mesh(roofGeo, terracottaRoofMat);
  roof.position.set(0, wallH + 0.1, 0.65);
  roof.rotation.x = 0.22;
  roof.castShadow = true;
  facadeGroup.add(roof);

  // Iconic Hanoi Street Sign ("PHỐ ĐINH LIỆT") Placed High on Wall
  const signGeo = new THREE.PlaneGeometry(2.8, 1.4);
  const signMat = new THREE.MeshBasicMaterial({ map: streetSignTex });
  const signMesh = new THREE.Mesh(signGeo, signMat);
  signMesh.position.set(-2.8, 3.4, 0.23);
  facadeGroup.add(signMesh);

  // Hanging Chalkboard Menu beside entrance
  const menuGeo = new THREE.PlaneGeometry(1.2, 1.8);
  const menuMeshMat = new THREE.MeshBasicMaterial({ map: menuTex });
  const menuMesh = new THREE.Mesh(menuGeo, menuMeshMat);
  menuMesh.position.set(2.6, 2.0, 0.23);
  facadeGroup.add(menuMesh);

  group.add(facadeGroup);

  // Solid obstacle collision for shophouse wall
  tableObstacles.push({ x: 0, z: -5.8, r: 4.5, maxY: wallH });

  // =========================================================================
  // 4. Ancient Hanoi Street Shade Tree (Cây Bàng / Cây Xà Cừ Cổ Thụ)
  // =========================================================================
  const shadeTree = createHanoiShadeTree();
  shadeTree.position.set(-3.8, 0.18, 0.6);
  group.add(shadeTree);
  tableObstacles.push({ x: -3.8, z: 0.6, r: 1.1, maxY: 4.5 });

  // Second smaller street tree on far right
  const rightTree = createHanoiShadeTree();
  rightTree.position.set(5.8, 0.18, 1.4);
  rightTree.scale.setScalar(0.85);
  group.add(rightTree);
  tableObstacles.push({ x: 5.8, z: 1.4, r: 0.95, maxY: 4.2 });

  // =========================================================================
  // 5. Classic Hanoi Street Motorcycle: Vintage Honda Super Cub 50
  // =========================================================================
  const hondaCub = createVintageHondaCub();
  hondaCub.position.set(-2.4, 0.18, 2.4);
  hondaCub.rotation.y = -0.35;
  group.add(hondaCub);
  tableObstacles.push({ x: -2.4, z: 2.4, r: 0.85, maxY: 1.2 });

  // =========================================================================
  // 6. Central Hero Chess Table & Seated Opponent
  // =========================================================================
  const mainTableGroup = new THREE.Group();
  mainTableGroup.position.set(0, 0, 0);

  // Rustic Sidewalk Wooden Table Top
  const tableTopW = 2.4;
  const tableTopD = 2.5;
  const tableTopH = 0.07;
  const tableTopY = boardSurfaceY - 0.038;

  const tableTopGeo = new THREE.BoxGeometry(tableTopW, tableTopH, tableTopD);
  const tableTop = new THREE.Mesh(tableTopGeo, teakTableMat);
  tableTop.position.y = tableTopY;
  tableTop.receiveShadow = true;
  tableTop.castShadow = true;
  mainTableGroup.add(tableTop);

  // Sturdy wooden legs
  const legH = tableTopY - 0.035 - 0.18;
  const legGeo = new THREE.BoxGeometry(0.1, legH, 0.1);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, teakTableMat);
      leg.position.set(sx * (tableTopW * 0.5 - 0.16), 0.18 + legH * 0.5, sz * (tableTopD * 0.5 - 0.16));
      leg.castShadow = true;
      mainTableGroup.add(leg);
    }
  }

  // Soft contact shadow beneath table
  const shadowGeo = new THREE.PlaneGeometry(2.8, 2.9);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x070605,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.185;
  mainTableGroup.add(shadowMesh);

  group.add(mainTableGroup);
  tableObstacles.push({ x: 0, z: 0, r: 1.6, maxY: 1.1 });

  // -------------------------------------------------------------------------
  // 6b. SEATED CUSTOMERS: Opponent & Spectators
  // -------------------------------------------------------------------------
  const customersToAnimate: THREE.Group[] = [];

  // (1) MAIN OPPONENT: Seated right across the board (z = -1.5), studying the game
  const opponentPlayer = createSeatedPerson({
    pos: new THREE.Vector3(0, 0.18, -1.48),
    rotY: 0, // Facing directly toward player (North to South)
    shirtColor: 0x1e3a8a, // Navy blue polo shirt
    pantsColor: 0xd6d3d1, // Light khaki trousers
    skinTone: 0xd8a27a,
    hasHat: false,
    pose: 'playing_opponent'
  });
  group.add(opponentPlayer);
  customersToAnimate.push(opponentPlayer);
  tableObstacles.push({ x: 0, z: -1.5, r: 0.65, maxY: 1.4 });

  // Opponent's wooden stool
  const stoolGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.42, 16);
  const oppStool = new THREE.Mesh(stoolGeo, darkWoodMat);
  oppStool.position.set(0, 0.18 + 0.21, -1.48);
  oppStool.castShadow = true;
  group.add(oppStool);

  // Player's stool on near side
  const playerStool = new THREE.Mesh(stoolGeo, darkWoodMat);
  playerStool.position.set(0, 0.18 + 0.21, 1.48);
  playerStool.castShadow = true;
  group.add(playerStool);

  // (2) SPECTATOR 1: Senior Chess Enthusiast watching closely from the right flank
  const spectator1 = createSeatedPerson({
    pos: new THREE.Vector3(1.45, 0.18, -0.45),
    rotY: -Math.PI * 0.42, // Tilted toward chess board
    shirtColor: 0xffffff, // Crisp white casual shirt
    pantsColor: 0x334155, // Charcoal slate trousers
    skinTone: 0xd49b72,
    hasHat: true, // Classic Hanoi beret
    hatColor: 0x1e293b,
    pose: 'watching_lean'
  });
  group.add(spectator1);
  customersToAnimate.push(spectator1);
  tableObstacles.push({ x: 1.45, z: -0.45, r: 0.65, maxY: 1.4 });

  const spec1Stool = new THREE.Mesh(stoolGeo, darkWoodMat);
  spec1Stool.position.set(1.45, 0.18 + 0.21, -0.45);
  group.add(spec1Stool);

  // (3) SPECTATOR 2: Fellow Friend watching from left flank sipping tea
  const spectator2 = createSeatedPerson({
    pos: new THREE.Vector3(-1.45, 0.18, -0.45),
    rotY: Math.PI * 0.42, // Tilted toward board
    shirtColor: 0x059669, // Forest emerald polo
    pantsColor: 0x57534e, // Brown pants
    skinTone: 0xdca880,
    hasHat: false,
    pose: 'watching_lean'
  });
  group.add(spectator2);
  customersToAnimate.push(spectator2);
  tableObstacles.push({ x: -1.45, z: -0.45, r: 0.65, maxY: 1.4 });

  const spec2Stool = new THREE.Mesh(stoolGeo, darkWoodMat);
  spec2Stool.position.set(-1.45, 0.18 + 0.21, -0.45);
  group.add(spec2Stool);

  // (4) NEIGHBORING TABLE PATRONS (Pair of customers chatting at second table)
  const secTableGroup = new THREE.Group();
  secTableGroup.position.set(3.8, 0.18, -2.6);

  const secTableMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 24), teakTableMat);
  secTableMesh.position.y = 0.58;
  secTableMesh.castShadow = true;
  secTableGroup.add(secTableMesh);

  const secLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.58, 12), darkWoodMat);
  secLeg.position.y = 0.29;
  secTableGroup.add(secLeg);

  group.add(secTableGroup);
  tableObstacles.push({ x: 3.8, z: -2.6, r: 1.2, maxY: 1.3 });

  // Two patrons chatting at neighboring table
  const patron1 = createSeatedPerson({
    pos: new THREE.Vector3(3.8, 0.18, -3.3),
    rotY: 0,
    shirtColor: 0xb91c1c, // Burgundy red shirt
    pantsColor: 0x1f2937,
    pose: 'drinking_tea'
  });
  group.add(patron1);
  customersToAnimate.push(patron1);

  const patron2 = createSeatedPerson({
    pos: new THREE.Vector3(3.8, 0.18, -1.9),
    rotY: Math.PI,
    shirtColor: 0xd97706, // Amber gold polo
    pantsColor: 0x374151,
    hasHat: true,
    hatColor: 0x475569,
    pose: 'watching_relaxed'
  });
  group.add(patron2);
  customersToAnimate.push(patron2);

  // =========================================================================
  // 7. Authentic Hanoi Sidewalk Table Drinks & Tea Accessories
  // =========================================================================
  const drinksGroup = new THREE.Group();
  drinksGroup.position.set(0, boardSurfaceY, 0);

  // 7a. Traditional Vietnamese Coffee Phin (Dripping dark coffee into sweet condensed milk)
  const phinGroup = new THREE.Group();
  phinGroup.position.set(-1.05, 0, 0.35);

  const phinGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.11, 20), clearGlassMat);
  phinGlass.position.y = 0.055;
  phinGlass.castShadow = true;
  phinGroup.add(phinGlass);

  const milkMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.044, 0.024, 20),
    new THREE.MeshStandardMaterial({ color: 0xfef9e7, roughness: 0.3 })
  );
  milkMesh.position.y = 0.015;
  phinGroup.add(milkMesh);

  const coffeeMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.048, 0.05, 20),
    new THREE.MeshStandardMaterial({ color: 0x1e1008, roughness: 0.15 })
  );
  coffeeMesh.position.y = 0.052;
  phinGroup.add(coffeeMesh);

  // Aluminum Phin Filter Assembly
  const aluMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.25, metalness: 0.85 });
  const phinSaucer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.008, 24), aluMat);
  phinSaucer.position.y = 0.114;
  phinSaucer.castShadow = true;
  phinGroup.add(phinSaucer);

  const phinCup = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.054, 0.065, 24), aluMat);
  phinCup.position.y = 0.15;
  phinCup.castShadow = true;
  phinGroup.add(phinCup);

  const phinLid = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 24), aluMat);
  phinLid.position.y = 0.188;
  phinGroup.add(phinLid);

  const phinKnob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 12), aluMat);
  phinKnob.position.y = 0.202;
  phinGroup.add(phinKnob);

  drinksGroup.add(phinGroup);

  // 7b. Iconic Hanoi Sidewalk Iced Green Tea (Cốc Trà Đá Vỉa Hè)
  const traDaGroup = new THREE.Group();
  traDaGroup.position.set(1.05, 0, 0.35);

  const traDaGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, 0.13, 20), clearGlassMat);
  traDaGlass.position.y = 0.065;
  traDaGlass.castShadow = true;
  traDaGroup.add(traDaGlass);

  const traDaLiquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.049, 0.041, 0.11, 20),
    new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.15 })
  );
  traDaLiquid.position.y = 0.06;
  traDaGroup.add(traDaLiquid);

  // Ice cubes in trà đá
  for (let i = 0; i < 3; i++) {
    const ice = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.024), clearGlassMat);
    ice.position.set(Math.sin(i * 2.2) * 0.018, 0.09 + i * 0.012, Math.cos(i * 2.2) * 0.018);
    traDaGroup.add(ice);
  }
  drinksGroup.add(traDaGroup);

  // 7c. Plate of Roasted Sunflower Seeds (Đĩa Hạt Hướng Dương Vỉa Hè)
  const sunflowerGroup = new THREE.Group();
  sunflowerGroup.position.set(1.05, 0, -0.35);

  const plateGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.02, 24);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 }); // Iconic blue plastic plate
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = 0.01;
  plate.castShadow = true;
  sunflowerGroup.add(plate);

  const seedsGeo = new THREE.ConeGeometry(0.09, 0.025, 16);
  const seedsMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.75 });
  const seeds = new THREE.Mesh(seedsGeo, seedsMat);
  seeds.position.y = 0.025;
  sunflowerGroup.add(seeds);

  drinksGroup.add(sunflowerGroup);

  // 7d. Wooden Box for Captured Pieces on Left
  const captBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.22), darkWoodMat);
  captBox.position.set(-1.05, 0.03, -0.35);
  captBox.castShadow = true;
  drinksGroup.add(captBox);

  group.add(drinksGroup);

  // =========================================================================
  // 8. Sidewalk Tea Vendor Station ("Quán Nước Chè Chén Vỉa Hè")
  // =========================================================================
  const teaStation = new THREE.Group();
  teaStation.position.set(2.6, 0.18, -4.5);

  // Low wooden serving table
  const stTable = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.7), teakTableMat);
  stTable.position.y = 0.275;
  stTable.castShadow = true;
  teaStation.add(stTable);

  // Iconic Blue Thermos Flask ("Phích Nước Rạng Đông")
  const flaskGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.38, 16);
  const flaskMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.3 });
  const flask = new THREE.Mesh(flaskGeo, flaskMat);
  flask.position.set(-0.35, 0.55 + 0.19, 0);
  flask.castShadow = true;
  teaStation.add(flask);

  const flaskCap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), polishedBrassMat);
  flaskCap.position.set(-0.35, 0.55 + 0.41, 0);
  teaStation.add(flaskCap);

  // Traditional Insulated Bamboo Tea Basket ("Ấm Tích Chè Xanh Giỏ Tre")
  const basketGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.22, 16);
  const basketMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
  const basket = new THREE.Mesh(basketGeo, basketMat);
  basket.position.set(0.15, 0.55 + 0.11, 0);
  basket.castShadow = true;
  teaStation.add(basket);

  // Glass candy jars with lids (Hũ kẹo lạc, kẹo dồi)
  for (const sx of [0.45]) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 16), clearGlassMat);
    jar.position.set(sx, 0.55 + 0.09, 0.1);
    teaStation.add(jar);

    const candyFill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.062, 0.14, 16),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 })
    );
    candyFill.position.set(sx, 0.55 + 0.08, 0.1);
    teaStation.add(candyFill);
  }

  group.add(teaStation);
  tableObstacles.push({ x: 2.6, z: -4.5, r: 1.1, maxY: 1.2 });

  // =========================================================================
  // 9. Overhead Street Lanterns & Warm String Lighting
  // =========================================================================
  const lanternCoords = [
    { x: -2.0, y: 3.4, z: -1.8 },
    { x: 1.8, y: 3.5, z: -1.8 },
    { x: 0, y: 3.6, z: 0 },
    { x: -1.8, y: 3.4, z: 1.6 },
    { x: 2.2, y: 3.4, z: 1.6 }
  ];

  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Warm amber silk lantern
    roughness: 0.6,
    emissive: 0xd97706,
    emissiveIntensity: 0.6
  });

  const wireGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.45, 8);

  lanternCoords.forEach((lc, idx) => {
    const wire = new THREE.Mesh(wireGeo, darkWoodMat);
    wire.position.set(lc.x, lc.y + 0.22, lc.z);
    group.add(wire);

    // Oval silk lantern body
    const lanternGeo = new THREE.SphereGeometry(0.14, 16, 16);
    lanternGeo.scale(1.0, 1.35, 1.0);
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(lc.x, lc.y, lc.z);
    lantern.castShadow = true;
    group.add(lantern);

    // Warm ambient street glow
    const pLight = new THREE.PointLight(0xffb03a, 1.7, 8.5, 1.5);
    pLight.position.set(lc.x, lc.y - 0.1, lc.z);
    group.add(pLight);
    bistroLights.push(pLight);
    cafeLights.push(pLight);
  });

  // =========================================================================
  // 10. Update & Cleanup
  // =========================================================================
  return {
    group,
    cafeLights,
    bistroLights,
    tableObstacles,
    update: (timeNow: number) => {
      // Subtle natural breathing / contemplation motion for seated chess players
      const breath = Math.sin(timeNow * 0.0018) * 0.015;
      customersToAnimate.forEach((c, idx) => {
        const torso = c.userData?.torsoGroup as THREE.Group | undefined;
        const baseLean = (c.userData?.baseLean as number) || 0;
        if (torso) {
          const personalOffset = idx * 1.3;
          torso.rotation.x = baseLean + Math.sin(timeNow * 0.0015 + personalOffset) * 0.018;
          torso.rotation.y = Math.sin(timeNow * 0.0012 + personalOffset) * 0.012;
        }
      });

      // Gentle lantern sway in the Hanoi evening breeze
      const sway = Math.sin(timeNow * 0.002) * 0.035;
      bistroLights.forEach((light, i) => {
        light.intensity = 1.7 + Math.sin(timeNow * 0.003 + i * 1.8) * 0.12;
      });
    },
    dispose: () => {
      sidewalkTex.dispose();
      wallTex.dispose();
      streetSignTex.dispose();
      menuTex.dispose();
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else if (m.material) {
            m.material.dispose();
          }
        }
      });
    }
  };
}
