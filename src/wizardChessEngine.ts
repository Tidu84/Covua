import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  createInitialCoUpBoard,
  getLegalPieceMoves as getCoUpLegalMoves,
  getAIMove as getCoUpAIMove,
  isKingInCheck as isCoUpKingInCheck,
  PIECE_NAMES as CO_UP_PIECE_NAMES,
  type CoUpPiece,
  type BoardGrid as CoUpBoardGrid,
  type PieceColor as CoUpPieceColor,
  type Move as CoUpMove
} from './coUpLogic';
import {
  WesternChessEngine,
  coordToSquare,
  squareToCoord,
  CHESS_PIECE_NAMES,
  type WesternPiece
} from './westernChessLogic';
import { type Color as ChessColor, type Square } from 'chess.js';
import { coUpAudio } from './coUpAudio';
import { createCafeSceneGroup, type CafeSceneBundle } from './cafeEnvironment';

export type GameType = 'co_up' | 'western_chess';
export type GameEnvironment = 'cathedral' | 'cafe';

export function initWizardChess() {
  // =========================================================================
  // Game Mode State: 'co_up' (Cờ Úp 3D) vs 'western_chess' (Cờ Vua Gốc)
  // Environment State: 'cathedral' (Thánh Đường) vs 'cafe' (Quán Cà Phê)
  // =========================================================================
  let currentGameType: GameType = 'co_up';
  let currentEnvironment: GameEnvironment = 'cathedral';
  let cathedralSceneObj: THREE.Group | null = null;

  // Constants
  const BOARD_SURFACE_Y = 0.775;

  // Xiangqi / Cờ Úp Board Geometry
  const XIANGQI_COLS = 9;
  const XIANGQI_ROWS = 10;
  const XIANGQI_COL_STEP = 0.28;
  const XIANGQI_ROW_STEP = 0.28;
  const CO_UP_PIECE_RADIUS = 0.124; // Tournament stone puck radius
  const CO_UP_PIECE_HEIGHT = 0.086; // Increased by 10% for substantial stone weight and feel

  // Western Chess Board Geometry
  const CHESS_SIZE = 8;
  const CHESS_SQ_SIZE = 0.34;

  function coUpBoardToWorld(r: number, c: number): THREE.Vector3 {
    return new THREE.Vector3(
      (c - 4) * XIANGQI_COL_STEP,
      BOARD_SURFACE_Y + CO_UP_PIECE_HEIGHT * 0.5,
      (r - 4.5) * XIANGQI_ROW_STEP
    );
  }

  function worldToCoUpBoard(x: number, z: number): { r: number; c: number } | null {
    const c = Math.round(x / XIANGQI_COL_STEP + 4);
    const r = Math.round(z / XIANGQI_ROW_STEP + 4.5);
    if (r >= 0 && r < XIANGQI_ROWS && c >= 0 && c < XIANGQI_COLS) {
      const worldPos = coUpBoardToWorld(r, c);
      const dist = Math.hypot(x - worldPos.x, z - worldPos.z);
      if (dist < XIANGQI_COL_STEP * 0.65) {
        return { r, c };
      }
    }
    return null;
  }

  function chessBoardToWorld(r: number, c: number): THREE.Vector3 {
    return new THREE.Vector3(
      (c - 3.5) * CHESS_SQ_SIZE,
      BOARD_SURFACE_Y,
      (r - 3.5) * CHESS_SQ_SIZE
    );
  }

  function worldToChessBoard(x: number, z: number): { r: number; c: number } | null {
    const c = Math.round(x / CHESS_SQ_SIZE + 3.5);
    const r = Math.round(z / CHESS_SQ_SIZE + 3.5);
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      return { r, c };
    }
    return null;
  }

  function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }

  // =========================================================================
  // Scene, Camera, Renderer, and Cathedral Lighting
  // =========================================================================
  const container = document.getElementById('canvas-container') || document.getElementById('viewport-container');
  if (container) container.innerHTML = '';
  const isAutomatedTest = Boolean(
    navigator.webdriver || new URLSearchParams(window.location.search).get('autotest') === '1'
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: isAutomatedTest
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (container) container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a12);
  scene.fog = new THREE.FogExp2(0x080b14, 0.015);

  // PMREM Environment
  function createCathedralPMREMEnvironment(glRenderer: THREE.WebGLRenderer) {
    const pmremGen = new THREE.PMREMGenerator(glRenderer);
    pmremGen.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x161412);
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const addPanel = (colorHex: number, intensity: number, pos: number[], scl: number[]) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorHex).multiplyScalar(intensity)
      });
      const m = new THREE.Mesh(boxGeo, mat);
      m.position.fromArray(pos);
      m.scale.fromArray(scl);
      envScene.add(m);
    };
    addPanel(0xdce6f7, 2.4, [0, 9.5, -12.0], [10.0, 2.0, 1.5]);
    addPanel(0xffe0b5, 2.2, [0, 9.5, 12.0], [10.0, 2.0, 1.5]);
    addPanel(0xd4deee, 1.8, [-9.0, 6.5, 0.0], [1.2, 4.5, 16.0]);
    addPanel(0xd4deee, 1.8, [9.0, 6.5, 0.0], [1.2, 4.5, 16.0]);
    addPanel(0xff9438, 3.2, [-4.5, 1.6, 0.0], [2.2, 2.2, 4.0]);
    addPanel(0xff9438, 3.2, [4.5, 1.6, 0.0], [2.2, 2.2, 4.0]);
    addPanel(0x6e5c49, 0.9, [0, -4.0, 0.0], [16.0, 1.0, 24.0]);
    const envTex = pmremGen.fromScene(envScene, 0.04).texture;
    boxGeo.dispose();
    pmremGen.dispose();
    return envTex;
  }

  scene.environment = createCathedralPMREMEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.22, 65);
  camera.position.set(0, 2.35, 2.75);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.16;
  orbitControls.maxPolarAngle = Math.PI * 0.94;
  orbitControls.minPolarAngle = 0.02;
  orbitControls.minDistance = 0.2;
  orbitControls.maxDistance = 48.0;
  orbitControls.enablePan = true;
  orbitControls.screenSpacePanning = true;
  orbitControls.target.set(0, BOARD_SURFACE_Y, 0.15);
  orbitControls.update();

  // Cathedral Free Roam / Tour Navigation State
  // Cathedral Free Roam / Tour Navigation State
  // WASD / QE controls walking and elevation
  const moveKeys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  };

  // Arrow Keys control viewing angle (Look Up, Down, Left, Right)
  const lookKeys = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  let tourModeActive = false;
  let tourSpeedLevel: 'slow' | 'normal' | 'fast' = 'normal';
  const tourSpeeds = {
    slow: 2.2,
    normal: 4.6,
    fast: 10.5
  };

  // Shift + Mouse Drag Axis Lock
  let isShiftKeyDown = false;
  const shiftDragState = {
    active: false,
    startX: 0,
    startY: 0,
    lockedAxis: null as 'x' | 'y' | null
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') isShiftKeyDown = true;

    // Ignore movement shortcuts if user is typing in input
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

    const k = e.key.toLowerCase();
    // WASD: Walking & Elevation
    if (k === 'w') moveKeys.forward = true;
    if (k === 's') moveKeys.backward = true;
    if (k === 'a') moveKeys.left = true;
    if (k === 'd') moveKeys.right = true;
    if (k === 'e' || e.key === ' ') moveKeys.up = true;
    if (k === 'q' || k === 'c') moveKeys.down = true;

    // Arrow keys: Change camera viewing angle
    if (e.key === 'ArrowUp') {
      lookKeys.up = true;
      e.preventDefault();
    }
    if (e.key === 'ArrowDown') {
      lookKeys.down = true;
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft') {
      lookKeys.left = true;
      e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
      lookKeys.right = true;
      e.preventDefault();
    }

    if (k === 'v') {
      toggleTourMode();
    }
    if (e.key === 'Escape' && tourModeActive) {
      setTourMode(false);
      setCameraPreset('player');
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      isShiftKeyDown = false;
      shiftDragState.lockedAxis = null;
    }

    const k = e.key.toLowerCase();
    // WASD: Walking & Elevation
    if (k === 'w') moveKeys.forward = false;
    if (k === 's') moveKeys.backward = false;
    if (k === 'a') moveKeys.left = false;
    if (k === 'd') moveKeys.right = false;
    if (k === 'e' || e.key === ' ') moveKeys.up = false;
    if (k === 'q' || k === 'c') moveKeys.down = false;

    // Arrow keys: Change camera viewing angle
    if (e.key === 'ArrowUp') lookKeys.up = false;
    if (e.key === 'ArrowDown') lookKeys.down = false;
    if (e.key === 'ArrowLeft') lookKeys.left = false;
    if (e.key === 'ArrowRight') lookKeys.right = false;
  });

  renderer.domElement.addEventListener(
    'pointerdown',
    (e) => {
      shiftDragState.active = true;
      shiftDragState.startX = e.clientX;
      shiftDragState.startY = e.clientY;
      shiftDragState.lockedAxis = null;
      if (e.shiftKey) {
        isShiftKeyDown = true;
        if (e.button === 0) {
          try {
            Object.defineProperty(e, 'shiftKey', {
              get: () => false,
              configurable: true
            });
          } catch {}
        }
      }
    },
    { capture: true }
  );

  window.addEventListener('pointerup', () => {
    shiftDragState.active = false;
    shiftDragState.lockedAxis = null;
  });

  // Chiaroscuro Cathedral & Board Lighting
  const hemiLight = new THREE.HemisphereLight(0xd8ccb8, 0x261d14, 0.65);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff0d6, 2.6);
  keyLight.position.set(3.8, 8.5, 4.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 22.0;
  const d = 3.5;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xd8cbb8, 0.75);
  rimLight.position.set(-4.5, 6.0, -6.5);
  scene.add(rimLight);

  const southFillLight = new THREE.DirectionalLight(0xffe4c0, 0.55);
  southFillLight.position.set(4.2, 5.8, 7.5);
  scene.add(southFillLight);

  // Twin Flickering Brazier Point Lights
  const brazierCoords = [
    { pos: [-3.65, 1.08, 0.0], baseIntensity: 4.35, dist: 18.0 },
    { pos: [3.65, 1.08, 0.0], baseIntensity: 4.35, dist: 18.0 }
  ];
  const brazierLights: THREE.PointLight[] = [];
  for (const cfg of brazierCoords) {
    const pLight = new THREE.PointLight(0xff8e32, cfg.baseIntensity, cfg.dist, 1.4);
    pLight.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    pLight.userData.baseIntensity = cfg.baseIntensity;
    scene.add(pLight);
    brazierLights.push(pLight);
  }

  // =========================================================================
  // Environments: 1. Cathedral (Gothic Altar) & 2. Cafe (Open Garden Terrace)
  // =========================================================================
  const cafeBundle: CafeSceneBundle = createCafeSceneGroup(BOARD_SURFACE_Y);
  cafeBundle.group.visible = false;
  scene.add(cafeBundle.group);

  // Cathedral boundary limits & column collision
  const CATHEDRAL_BOUNDS = {
    minX: -6.65,
    maxX: 6.65,
    minY: 0.34,
    maxY: 8.85,
    minZ: -18.1,
    maxZ: 18.1
  };

  const CATHEDRAL_COLUMN_ROWS = [
    { z: -16.65, xAbs: 4.25 },
    { z: -11.85, xAbs: 4.25 },
    { z: -6.85, xAbs: 4.65 },
    { z: 6.85, xAbs: 4.65 },
    { z: 11.85, xAbs: 4.25 },
    { z: 16.65, xAbs: 4.25 }
  ];

  const CATHEDRAL_SOLID_PILLARS = [
    ...CATHEDRAL_COLUMN_ROWS.flatMap(({ z, xAbs }) => [
      { x: -xAbs, z, r: 0.86, maxY: 9.65, isColumn: true },
      { x: xAbs, z, r: 0.86, maxY: 9.65, isColumn: true }
    ]),
    { x: -3.65, z: 0.0, r: 0.68, maxY: 1.95, isColumn: false },
    { x: 3.65, z: 0.0, r: 0.68, maxY: 1.95, isColumn: false }
  ];

  // Open-air Cafe Terrace Boundary Limits & Collision
  const CAFE_BOUNDS = {
    minX: -8.4,
    maxX: 8.4,
    minY: 0.35,
    maxY: 6.2,
    minZ: -8.4,
    maxZ: 8.4
  };

  function clampPointToCathedralRoom(pt: THREE.Vector3, isTarget = false) {
    const margin = isTarget ? 0.15 : 0.0;
    pt.x = Math.max(CATHEDRAL_BOUNDS.minX - margin, Math.min(CATHEDRAL_BOUNDS.maxX + margin, pt.x));
    pt.z = Math.max(CATHEDRAL_BOUNDS.minZ - margin, Math.min(CATHEDRAL_BOUNDS.maxZ + margin, pt.z));
    const aisleDrop = Math.max(0, Math.abs(pt.x) - 4.15) * 0.55;
    const localMaxY = Math.min(CATHEDRAL_BOUNDS.maxY, 9.05 - aisleDrop);
    const localMinY = isTarget ? 0.2 : CATHEDRAL_BOUNDS.minY;
    pt.y = Math.max(localMinY, Math.min(localMaxY, pt.y));
  }

  function clampPointToCafeRoom(pt: THREE.Vector3, isTarget = false) {
    const margin = isTarget ? 0.15 : 0.0;
    pt.x = Math.max(CAFE_BOUNDS.minX - margin, Math.min(CAFE_BOUNDS.maxX + margin, pt.x));
    pt.z = Math.max(CAFE_BOUNDS.minZ - margin, Math.min(CAFE_BOUNDS.maxZ + margin, pt.z));
    const localMinY = isTarget ? 0.2 : CAFE_BOUNDS.minY;
    pt.y = Math.max(localMinY, Math.min(CAFE_BOUNDS.maxY, pt.y));
  }

  function enforceCathedralBoundsAndSolidColumns(prevPos: THREE.Vector3 | null, curPos: THREE.Vector3, targetPos: THREE.Vector3) {
    clampPointToCathedralRoom(targetPos, true);
    clampPointToCathedralRoom(curPos, false);

    const x0 = prevPos ? prevPos.x : curPos.x;
    const z0 = prevPos ? prevPos.z : curPos.z;
    let x1 = curPos.x;
    let z1 = curPos.z;
    const moveDx = x1 - x0;
    const moveDz = z1 - z0;
    const moveLenSq = moveDx * moveDx + moveDz * moveDz;
    const moveLen = Math.sqrt(moveLenSq);
    const isContinuousStep = Boolean(prevPos) && moveLen > 1e-5 && moveLen < 8.0;

    for (const p of CATHEDRAL_SOLID_PILLARS) {
      if (curPos.y > p.maxY) continue;

      let tClosest = 1.0;
      if (isContinuousStep) {
        tClosest = ((p.x - x0) * moveDx + (p.z - z0) * moveDz) / moveLenSq;
        tClosest = Math.max(0.0, Math.min(1.0, tClosest));
      }
      const cxSeg = x0 + moveDx * tClosest;
      const czSeg = z0 + moveDz * tClosest;
      const dSeg = isContinuousStep ? Math.hypot(cxSeg - p.x, czSeg - p.z) : Infinity;
      const dEnd = Math.hypot(x1 - p.x, z1 - p.z);

      if (dSeg < p.r || dEnd < p.r) {
        const radX = x1 - p.x;
        const radZ = z1 - p.z;
        const radLen = Math.hypot(radX, radZ);
        if (radLen > 1e-4) {
          x1 = p.x + (radX / radLen) * p.r;
          z1 = p.z + (radZ / radLen) * p.r;
        } else {
          x1 = p.x + (p.x >= 0 ? -p.r : p.r);
          z1 = p.z;
        }
      }
    }

    const ALTAR_TOP_Y = 0.722;
    const ALTAR_HALF_X = 2.48;
    const ALTAR_HALF_Z = 2.38;
    if (Math.abs(x1) < ALTAR_HALF_X && Math.abs(z1) < ALTAR_HALF_Z) {
      const solidAltarTopY = BOARD_SURFACE_Y + 0.25;
      if (curPos.y < solidAltarTopY) {
        curPos.y = Math.max(curPos.y, solidAltarTopY);
      }
    }

    curPos.x = x1;
    curPos.z = z1;
    clampPointToCathedralRoom(curPos, false);
  }

  function enforceCafeBoundsAndObstacles(prevPos: THREE.Vector3 | null, curPos: THREE.Vector3, targetPos: THREE.Vector3) {
    clampPointToCafeRoom(targetPos, true);
    clampPointToCafeRoom(curPos, false);

    const x0 = prevPos ? prevPos.x : curPos.x;
    const z0 = prevPos ? prevPos.z : curPos.z;
    let x1 = curPos.x;
    let z1 = curPos.z;
    const moveDx = x1 - x0;
    const moveDz = z1 - z0;
    const moveLenSq = moveDx * moveDx + moveDz * moveDz;
    const moveLen = Math.sqrt(moveLenSq);
    const isContinuousStep = Boolean(prevPos) && moveLen > 1e-5 && moveLen < 8.0;

    for (const p of cafeBundle.tableObstacles) {
      if (curPos.y > p.maxY) continue;

      let tClosest = 1.0;
      if (isContinuousStep) {
        tClosest = ((p.x - x0) * moveDx + (p.z - z0) * moveDz) / moveLenSq;
        tClosest = Math.max(0.0, Math.min(1.0, tClosest));
      }
      const cxSeg = x0 + moveDx * tClosest;
      const czSeg = z0 + moveDz * tClosest;
      const dSeg = isContinuousStep ? Math.hypot(cxSeg - p.x, czSeg - p.z) : Infinity;
      const dEnd = Math.hypot(x1 - p.x, z1 - p.z);

      if (dSeg < p.r || dEnd < p.r) {
        const radX = x1 - p.x;
        const radZ = z1 - p.z;
        const radLen = Math.hypot(radX, radZ);
        if (radLen > 1e-4) {
          x1 = p.x + (radX / radLen) * p.r;
          z1 = p.z + (radZ / radLen) * p.r;
        } else {
          x1 = p.x + (p.x >= 0 ? -p.r : p.r);
          z1 = p.z;
        }
      }
    }

    // Keep camera above table if right over it
    if (Math.abs(x1) < 1.7 && Math.abs(z1) < 1.8) {
      const solidTableTopY = BOARD_SURFACE_Y + 0.22;
      if (curPos.y < solidTableTopY) {
        curPos.y = Math.max(curPos.y, solidTableTopY);
      }
    }

    curPos.x = x1;
    curPos.z = z1;
    clampPointToCafeRoom(curPos, false);
  }

  function enforceBoundsAndObstacles(prevPos: THREE.Vector3 | null, curPos: THREE.Vector3, targetPos: THREE.Vector3) {
    if (currentEnvironment === 'cathedral') {
      enforceCathedralBoundsAndSolidColumns(prevPos, curPos, targetPos);
    } else {
      enforceCafeBoundsAndObstacles(prevPos, curPos, targetPos);
    }
  }

  // =========================================================================
  // GLTF Asset Loader (Cathedral & 6 Rigged Chess Piece Models)
  // =========================================================================
  const gltfLoader = new GLTFLoader();
  const clock = new THREE.Clock();
  const westernPieceTemplates: Record<string, THREE.Group> = {};

  async function loadGltfAsset(baseName: string): Promise<THREE.Group | null> {
    try {
      const resB64 = await fetch(`./assets/glb/${baseName}.glb.gz.b64`);
      if (!resB64.ok) return null;
      const b64Text = (await resB64.text()).trim();
      if (b64Text.length <= 64) return null;

      const binStr = atob(b64Text);
      const gzBytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        gzBytes[i] = binStr.charCodeAt(i);
      }
      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(gzBytes);
        writer.close();
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        return await new Promise((resolve) => {
          gltfLoader.parse(decompressedBuf, '', (gltf) => {
            resolve(gltf.scene);
          }, () => resolve(null));
        });
      }
    } catch (err) {
      console.warn(`Asset ${baseName} load warning:`, err);
    }
    return null;
  }

  async function loadAllAssets() {
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    if (loaderText) loaderText.textContent = 'Đang triệu hồi Thánh đường & Bộ quân 3D...';

    // 1. Load Cathedral
    const cathedralScene = await loadGltfAsset('option8_cathedral');
    if (cathedralScene) {
      cathedralSceneObj = cathedralScene;
      cathedralScene.position.set(0, 0, -0.65);
      cathedralScene.traverse((child: any) => {
        if (child.isMesh) child.receiveShadow = true;
      });
      cathedralScene.visible = (currentEnvironment === 'cathedral');
      scene.add(cathedralScene);
    }

    // 2. Load 6 Western Chess Piece Templates
    const pieceNames = [
      { key: 'p', file: 'pawn_white' },
      { key: 'r', file: 'rook_white' },
      { key: 'n', file: 'knight_white' },
      { key: 'b', file: 'bishop_white' },
      { key: 'q', file: 'queen_white' },
      { key: 'k', file: 'king_white' }
    ];

    for (let i = 0; i < pieceNames.length; i++) {
      const p = pieceNames[i];
      if (loaderBar) loaderBar.style.width = `${((i + 1) / pieceNames.length) * 100}%`;
      const pScene = await loadGltfAsset(p.file);
      if (pScene) {
        westernPieceTemplates[p.key] = pScene;
      }
    }

    if (loaderBar) loaderBar.style.width = '100%';
    setTimeout(() => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 400);
      }
    }, 300);
  }

  loadAllAssets();

  // =========================================================================
  // CỜ ÚP (XIANGQI) 3D BOARD & PROCEDURAL PIECES
  // =========================================================================
  const coUpBoardGroup = new THREE.Group();
  scene.add(coUpBoardGroup);

  const pieceTextureCache = new Map<string, THREE.CanvasTexture>();

  function createCoUpFaceTexture(
    char: string,
    subVi: string,
    color: CoUpPieceColor,
    isUp: boolean
  ): THREE.CanvasTexture {
    const key = `${color}_${char}_${isUp ? 'up' : 'rev'}`;
    if (pieceTextureCache.has(key)) {
      return pieceTextureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const cx = 512;
    const cy = 512;
    const r = 494;

    if (isUp) {
      // Úp mystery seal
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, r);
      bgGrad.addColorStop(0, '#1c202a');
      bgGrad.addColorStop(0.55, '#10141d');
      bgGrad.addColorStop(0.85, '#0a0c12');
      bgGrad.addColorStop(1, '#040508');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Outer gold rim
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 26;
      ctx.stroke();

      // Inset accent ring
      ctx.strokeStyle = 'rgba(245, 215, 110, 0.45)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 42, 0, Math.PI * 2);
      ctx.stroke();

      // 16 Decorative gold studs
      for (let i = 0; i < 16; i++) {
        const ang = (i * Math.PI * 2) / 16;
        const px = cx + Math.cos(ang) * (r - 68);
        const py = cy + Math.sin(ang) * (r - 68);
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#f5d76e';
        ctx.fill();
      }

      // Diamond talisman rotated frame
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
      ctx.lineWidth = 10;
      ctx.strokeRect(-180, -180, 360, 360);
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f5d76e';
      ctx.font = '900 280px "Cinzel", "Times New Roman", serif';
      ctx.shadowColor = 'rgba(245, 215, 110, 0.85)';
      ctx.shadowBlur = 32;
      ctx.fillText('ÚP', cx, cy - 25);

      ctx.shadowBlur = 0;
      ctx.font = '700 78px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
      ctx.fillText('ẨN BÍ', cx, cy + 185);
    } else {
      // Revealed Han face: Muted antique palette (warm, comfortable, zero harsh glare)
      const isRed = color === 'r';
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, r);
      if (isRed) {
        // Red piece: Warm mellow aged boxwood / antique honey parchment
        bgGrad.addColorStop(0, '#decbb1');
        bgGrad.addColorStop(0.35, '#d4c0a5');
        bgGrad.addColorStop(0.7, '#c6b093');
        bgGrad.addColorStop(0.92, '#b79e80');
        bgGrad.addColorStop(1, '#a88e70');
      } else {
        // Black piece: Soft neutral aged bone / driftwood linen (muted and gentle on eyes)
        bgGrad.addColorStop(0, '#cec6b6');
        bgGrad.addColorStop(0.35, '#c3bbaa');
        bgGrad.addColorStop(0.7, '#b4ab99');
        bgGrad.addColorStop(0.92, '#a39987');
        bgGrad.addColorStop(1, '#928876');
      }
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Outer border ring:
      // Red: Rich warm burnished imperial gold; Black: Deep polished slate obsidian
      ctx.strokeStyle = isRed ? '#a67c24' : '#2c3545';
      ctx.lineWidth = 22;
      ctx.stroke();

      // Secondary fine inset border ring
      ctx.strokeStyle = isRed ? 'rgba(166, 124, 36, 0.45)' : 'rgba(44, 53, 69, 0.45)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 34, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Traditional corner diamond filigree accents
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + Math.PI / 4;
        const px = cx + Math.cos(ang) * (r - 64);
        const py = cy + Math.sin(ang) * (r - 64);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.fillStyle = isRed ? '#b8860b' : '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Grand Chinese calligraphy character (630px, weight 900 + rounded stroke for bold, thick strokes)
      ctx.font = '900 630px "Noto Serif SC", "STKaiti", "KaiTi", "Songti SC", "Cinzel", serif';

      const charColor = isRed ? '#b91325' : '#070a11';
      ctx.fillStyle = charColor;
      ctx.strokeStyle = charColor;
      ctx.lineWidth = 14;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      if (isRed) {
        ctx.shadowColor = 'rgba(140, 16, 32, 0.45)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 3;
      }

      // Dual pass: thick rounded stroke + solid fill for deep calligraphic body
      ctx.strokeText(char, cx, cy - 35);
      ctx.fillText(char, cx, cy - 35);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = '800 78px "Cinzel", "Inter", sans-serif';
      ctx.fillStyle = isRed ? '#70101c' : '#1a2332';
      ctx.fillText(subVi, cx, cy + 320);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    pieceTextureCache.set(key, tex);
    return tex;
  }

  const coUpSharedUpFaceTex = createCoUpFaceTexture('ÚP', 'ẨN BÍ', 'r', true);

  function buildXiangqiBoardMesh() {
    const bW = (XIANGQI_COLS - 1) * XIANGQI_COL_STEP + 0.32;
    const bD = (XIANGQI_ROWS - 1) * XIANGQI_ROW_STEP + 0.32;

    const slabGeo = new THREE.BoxGeometry(bW, 0.045, bD);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x11141c,
      roughness: 0.35,
      metalness: 0.22
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, BOARD_SURFACE_Y - 0.022, 0);
    slab.receiveShadow = true;
    coUpBoardGroup.add(slab);

    const goldRimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.85
    });
    const rimW = 0.04;
    const rimH = 0.05;
    const hBarGeo = new THREE.BoxGeometry(bW + rimW * 2, rimH, rimW);
    const vBarGeo = new THREE.BoxGeometry(rimW, rimH, bD);

    for (const s of [-1, 1]) {
      const hBar = new THREE.Mesh(hBarGeo, goldRimMat);
      hBar.position.set(0, BOARD_SURFACE_Y - 0.015, s * (bD * 0.5 + rimW * 0.5));
      hBar.receiveShadow = true;
      coUpBoardGroup.add(hBar);

      const vBar = new THREE.Mesh(vBarGeo, goldRimMat);
      vBar.position.set(s * (bW * 0.5 + rimW * 0.5), BOARD_SURFACE_Y - 0.015, 0);
      vBar.receiveShadow = true;
      coUpBoardGroup.add(vBar);
    }

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xd4af37,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    const linePoints: THREE.Vector3[] = [];

    // Horizontal Lines
    for (let r = 0; r < XIANGQI_ROWS; r++) {
      const pLeft = coUpBoardToWorld(r, 0);
      const pRight = coUpBoardToWorld(r, XIANGQI_COLS - 1);
      linePoints.push(
        new THREE.Vector3(pLeft.x, BOARD_SURFACE_Y + 0.001, pLeft.z),
        new THREE.Vector3(pRight.x, BOARD_SURFACE_Y + 0.001, pRight.z)
      );
    }

    // Vertical Lines
    for (let c = 0; c < XIANGQI_COLS; c++) {
      if (c === 0 || c === XIANGQI_COLS - 1) {
        const pTop = coUpBoardToWorld(0, c);
        const pBottom = coUpBoardToWorld(XIANGQI_ROWS - 1, c);
        linePoints.push(
          new THREE.Vector3(pTop.x, BOARD_SURFACE_Y + 0.001, pTop.z),
          new THREE.Vector3(pBottom.x, BOARD_SURFACE_Y + 0.001, pBottom.z)
        );
      } else {
        const pTop = coUpBoardToWorld(0, c);
        const pRiverTop = coUpBoardToWorld(4, c);
        const pRiverBot = coUpBoardToWorld(5, c);
        const pBottom = coUpBoardToWorld(XIANGQI_ROWS - 1, c);
        linePoints.push(
          new THREE.Vector3(pTop.x, BOARD_SURFACE_Y + 0.001, pTop.z),
          new THREE.Vector3(pRiverTop.x, BOARD_SURFACE_Y + 0.001, pRiverTop.z),
          new THREE.Vector3(pRiverBot.x, BOARD_SURFACE_Y + 0.001, pRiverBot.z),
          new THREE.Vector3(pBottom.x, BOARD_SURFACE_Y + 0.001, pBottom.z)
        );
      }
    }

    // Palaces Diagonals
    const b03 = coUpBoardToWorld(0, 3);
    const b25 = coUpBoardToWorld(2, 5);
    const b05 = coUpBoardToWorld(0, 5);
    const b23 = coUpBoardToWorld(2, 3);
    linePoints.push(
      new THREE.Vector3(b03.x, BOARD_SURFACE_Y + 0.001, b03.z),
      new THREE.Vector3(b25.x, BOARD_SURFACE_Y + 0.001, b25.z),
      new THREE.Vector3(b05.x, BOARD_SURFACE_Y + 0.001, b05.z),
      new THREE.Vector3(b23.x, BOARD_SURFACE_Y + 0.001, b23.z)
    );

    const r73 = coUpBoardToWorld(7, 3);
    const r95 = coUpBoardToWorld(9, 5);
    const r75 = coUpBoardToWorld(7, 5);
    const r93 = coUpBoardToWorld(9, 3);
    linePoints.push(
      new THREE.Vector3(r73.x, BOARD_SURFACE_Y + 0.001, r73.z),
      new THREE.Vector3(r95.x, BOARD_SURFACE_Y + 0.001, r95.z),
      new THREE.Vector3(r75.x, BOARD_SURFACE_Y + 0.001, r75.z),
      new THREE.Vector3(r93.x, BOARD_SURFACE_Y + 0.001, r93.z)
    );

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    coUpBoardGroup.add(new THREE.LineSegments(lineGeo, lineMat));

    // River Calligraphy
    const riverCanvas = document.createElement('canvas');
    riverCanvas.width = 1024;
    riverCanvas.height = 128;
    const rCtx = riverCanvas.getContext('2d')!;
    rCtx.fillStyle = '#f5d76e';
    rCtx.font = 'bold 58px "STKaiti", "KaiTi", "Cinzel", serif';
    rCtx.textAlign = 'center';
    rCtx.textBaseline = 'middle';
    rCtx.shadowColor = 'rgba(212, 175, 55, 0.8)';
    rCtx.shadowBlur = 8;
    rCtx.fillText('楚   河', 280, 64);
    rCtx.fillText('漢   界', 744, 64);

    const riverTex = new THREE.CanvasTexture(riverCanvas);
    riverTex.colorSpace = THREE.SRGBColorSpace;
    const riverGeo = new THREE.PlaneGeometry((XIANGQI_COLS - 1) * XIANGQI_COL_STEP * 0.92, XIANGQI_ROW_STEP * 0.88);
    const riverMat = new THREE.MeshBasicMaterial({ map: riverTex, transparent: true, opacity: 0.9 });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.set(0, BOARD_SURFACE_Y + 0.002, 0);
    coUpBoardGroup.add(riverMesh);
  }

  buildXiangqiBoardMesh();

  // Cờ Úp Piece Meshes Map
  const coUpPieceMeshMap = new Map<string, THREE.Group>();

  // Smooth Rounded Tournament Xiangqi Piece Body Geometry (Lathe with generous curved corner fillets)
  function createSmoothPieceGeometry(radius: number, height: number, bevelRadius: number): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const R = radius;
    const H = height;
    const rB = bevelRadius; // 0.020 for a very generous, organic rounded curve
    const bevelSteps = 12;

    // 1. Center of bottom
    points.push(new THREE.Vector2(0, -H * 0.5));
    // 2. Flat bottom inner area
    points.push(new THREE.Vector2(Math.max(0, R - rB), -H * 0.5));

    // 3. Smooth bottom fillet arc (quarter circle from -PI/2 to 0)
    for (let i = 1; i <= bevelSteps; i++) {
      const angle = -Math.PI * 0.5 + (i / bevelSteps) * (Math.PI * 0.5);
      const x = (R - rB) + Math.cos(angle) * rB;
      const y = (-H * 0.5 + rB) + Math.sin(angle) * rB;
      points.push(new THREE.Vector2(x, y));
    }

    // 4. Smooth barrel side: single continuous contour with subtle tactile bulge (NO dividing cut or waist ring)
    const sideSteps = 6;
    for (let i = 1; i < sideSteps; i++) {
      const t = i / sideSteps;
      const y = (-H * 0.5 + rB) + t * (H - 2 * rB);
      const bulge = Math.sin(t * Math.PI) * 0.0012;
      points.push(new THREE.Vector2(R + bulge, y));
    }

    // 5. Smooth top shoulder fillet arc (quarter circle from 0 to PI/2)
    for (let i = 0; i <= bevelSteps; i++) {
      const angle = (i / bevelSteps) * (Math.PI * 0.5);
      const x = (R - rB) + Math.cos(angle) * rB;
      const y = (H * 0.5 - rB) + Math.sin(angle) * rB;
      points.push(new THREE.Vector2(x, y));
    }

    // 6. Top face leading gently inward to a subtle concave dish
    points.push(new THREE.Vector2(Math.max(0, R - rB - 0.006), H * 0.5 - 0.0006));
    points.push(new THREE.Vector2(0, H * 0.5 - 0.001));

    const geo = new THREE.LatheGeometry(points, 64);
    geo.computeVertexNormals();
    return geo;
  }

  const coUpSmoothPieceGeo = createSmoothPieceGeometry(CO_UP_PIECE_RADIUS, CO_UP_PIECE_HEIGHT, 0.020);

  // Luxury Red Piece Body: Rich Imperial Red Sandalwood / Mahogany lacquer (unmistakably vibrant RED)
  const coUpRedPieceBodyMat = new THREE.MeshStandardMaterial({
    color: 0x942226,
    roughness: 0.22,
    metalness: 0.12
  });

  // Luxury Black Piece Body: Deep Midnight Ebony / Black Obsidian (unmistakably stark BLACK)
  const coUpBlackPieceBodyMat = new THREE.MeshStandardMaterial({
    color: 0x0c0f14,
    roughness: 0.16,
    metalness: 0.22
  });

  // Top/Bottom Face Medallion Disc Geometries
  const coUpFaceDiscRadius = CO_UP_PIECE_RADIUS - 0.013; // Sits neatly inside the rounded shoulder
  const coUpFaceDiscGeo = new THREE.CircleGeometry(coUpFaceDiscRadius, 60);

  // Inlaid Brass / Gold Accent Wire Ring (framing the face medallion)
  const coUpInlayWireGeo = new THREE.TorusGeometry(coUpFaceDiscRadius, 0.0016, 12, 60);
  const coUpInlayWireMat = new THREE.MeshStandardMaterial({
    color: 0xe5c158,
    roughness: 0.2,
    metalness: 0.92
  });

  // 3D Nắp Úp (Authentic Vietnamese Cờ Úp Mystery Cover Caps) Materials
  const redCapMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.22,
    metalness: 0.45
  });
  const blackCapMat = new THREE.MeshStandardMaterial({
    color: 0x0c0f14,
    roughness: 0.18,
    metalness: 0.65
  });
  const capGoldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf5d76e,
    roughness: 0.2,
    metalness: 0.95
  });
  const redJewelMat = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    roughness: 0.12,
    metalness: 0.2,
    emissive: 0xd90429,
    emissiveIntensity: 0.75
  });
  const cyanJewelMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    roughness: 0.12,
    metalness: 0.2,
    emissive: 0x00b4d8,
    emissiveIntensity: 0.75
  });

  // Authentic Vietnamese Nắp Úp: An inverted lacquer/bronze bell dome cup
  // that sits on the board and completely encases the mystery piece!
  function createCoUpCapGroup(color: CoUpPieceColor): THREE.Group {
    const cap = new THREE.Group();
    const isRed = color === 'r';
    const mainMat = isRed ? redCapMat : blackCapMat;
    const jewelMat = isRed ? redJewelMat : cyanJewelMat;

    const baseLocalY = -CO_UP_PIECE_HEIGHT * 0.5; // Touches board surface

    // 1. Bottom Flared Weighted Base Collar
    const baseCollarGeo = new THREE.CylinderGeometry(0.138, 0.144, 0.0145, 36);
    const baseCollarMesh = new THREE.Mesh(baseCollarGeo, capGoldTrimMat);
    baseCollarMesh.position.y = baseLocalY + 0.0072;
    baseCollarMesh.castShadow = true;
    baseCollarMesh.receiveShadow = true;
    cap.add(baseCollarMesh);

    // 2. Main Flared Bell Dome Shell (smooth contoured bell)
    const domeShellGeo = new THREE.CylinderGeometry(0.116, 0.138, 0.0864, 36);
    const domeShellMesh = new THREE.Mesh(domeShellGeo, mainMat);
    domeShellMesh.position.y = baseLocalY + 0.0145 + 0.0864 * 0.5;
    domeShellMesh.castShadow = true;
    domeShellMesh.receiveShadow = true;
    cap.add(domeShellMesh);

    // 3. Stepped Upper Crown Ring
    const crownRingGeo = new THREE.CylinderGeometry(0.098, 0.116, 0.0144, 36);
    const crownRingMesh = new THREE.Mesh(crownRingGeo, capGoldTrimMat);
    crownRingMesh.position.y = baseLocalY + 0.108;
    crownRingMesh.castShadow = true;
    cap.add(crownRingMesh);

    // 4. Embossed Golden "ÚP" Medallion Seal Plaque on Top of the Dome
    const sealDiscGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.0054, 36);
    const sealDiscMat = new THREE.MeshStandardMaterial({
      map: coUpSharedUpFaceTex,
      roughness: 0.25,
      metalness: 0.85
    });
    const sealDiscMesh = new THREE.Mesh(sealDiscGeo, [capGoldTrimMat, sealDiscMat, capGoldTrimMat]);
    sealDiscMesh.position.y = baseLocalY + 0.115;
    sealDiscMesh.castShadow = true;
    cap.add(sealDiscMesh);

    // 5. Sculpted Pagoda / Lotus Knob on Top
    const pedestalGeo = new THREE.CylinderGeometry(0.02, 0.038, 0.016, 24);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, capGoldTrimMat);
    pedestalMesh.position.y = baseLocalY + 0.124;
    pedestalMesh.castShadow = true;
    cap.add(pedestalMesh);

    // 6. Crown Lotus Jewel
    const knobBudGeo = new THREE.SphereGeometry(0.016, 20, 20);
    const knobBudMesh = new THREE.Mesh(knobBudGeo, jewelMat);
    knobBudMesh.position.y = baseLocalY + 0.136;
    knobBudMesh.castShadow = true;
    cap.add(knobBudMesh);

    return cap;
  }

  // Sculpted luxury tournament Xiangqi piece with seamless rounded bevels & carved calligraphy
  function createCoUp3DPieceMesh(piece: CoUpPiece): THREE.Group {
    const group = new THREE.Group();
    const info = CO_UP_PIECE_NAMES[piece.color][piece.trueType];
    const isRed = piece.color === 'r';
    const revTex = createCoUpFaceTexture(info.han, info.vi, piece.color, false);

    // 1. Solid lathe-turned hardwood body (smooth beveled rounded corners, NO dividing line)
    const bodyMat = isRed ? coUpRedPieceBodyMat : coUpBlackPieceBodyMat;
    const bodyMesh = new THREE.Mesh(coUpSmoothPieceGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // 2. Top Inset Face Disc with carved calligraphy (soft matte antique finish, zero harsh specular glare)
    const topMat = new THREE.MeshStandardMaterial({
      map: revTex,
      roughness: 0.45,
      metalness: 0.04
    });
    const topFaceMesh = new THREE.Mesh(coUpFaceDiscGeo, topMat);
    topFaceMesh.rotation.x = -Math.PI / 2;
    topFaceMesh.position.y = CO_UP_PIECE_HEIGHT * 0.5 + 0.0003;
    topFaceMesh.receiveShadow = true;
    group.add(topFaceMesh);

    // 3. Top Delicate Inlaid Gold Wire Accent Ring (framing the calligraphy disc)
    const topInlayMesh = new THREE.Mesh(coUpInlayWireGeo, coUpInlayWireMat);
    topInlayMesh.rotation.x = Math.PI / 2;
    topInlayMesh.position.y = CO_UP_PIECE_HEIGHT * 0.5 + 0.0005;
    group.add(topInlayMesh);

    // 4. Bottom Inset Face Disc (for realism during flips & lifts)
    const botMat = new THREE.MeshStandardMaterial({
      map: coUpSharedUpFaceTex,
      roughness: 0.48,
      metalness: 0.04
    });
    const botFaceMesh = new THREE.Mesh(coUpFaceDiscGeo, botMat);
    botFaceMesh.rotation.x = Math.PI / 2;
    botFaceMesh.position.y = -CO_UP_PIECE_HEIGHT * 0.5 - 0.0003;
    group.add(botFaceMesh);

    // 5. Bottom Delicate Inlaid Gold Wire Accent Ring
    const botInlayMesh = new THREE.Mesh(coUpInlayWireGeo, coUpInlayWireMat);
    botInlayMesh.rotation.x = Math.PI / 2;
    botInlayMesh.position.y = -CO_UP_PIECE_HEIGHT * 0.5 - 0.0005;
    group.add(botInlayMesh);

    // 6. Supreme Commander Imperial Crown for King (TƯỚNG)
    if (piece.trueType === 'K') {
      const crownGeo = new THREE.TorusGeometry(coUpFaceDiscRadius - 0.016, 0.0035, 16, 48);
      const crownMesh = new THREE.Mesh(crownGeo, coUpInlayWireMat);
      crownMesh.rotation.x = Math.PI / 2;
      crownMesh.position.y = CO_UP_PIECE_HEIGHT * 0.5 + 0.0028;
      crownMesh.castShadow = true;
      group.add(crownMesh);
    }

    // 7. If piece is ÚP, completely encase it within the traditional 3D Nắp Úp!
    if (!piece.isRevealed) {
      const cap = createCoUpCapGroup(piece.color);
      group.add(cap);
      group.userData.cap = cap;
    }

    group.position.copy(coUpBoardToWorld(piece.row, piece.col));
    group.userData.pieceId = piece.id;
    coUpBoardGroup.add(group);
    coUpPieceMeshMap.set(piece.id, group);
    return group;
  }

  // =========================================================================
  // WESTERN CHESS 3D BOARD & RIGGED 3D GLB PIECES
  // =========================================================================
  const westernBoardGroup = new THREE.Group();
  scene.add(westernBoardGroup);
  westernBoardGroup.visible = false; // Initially hidden

  const westernPieceMeshMap = new Map<string, THREE.Group>();
  const westernChessEngine = new WesternChessEngine();

  function buildWesternBoardGrid() {
    const tileH = 0.036;
    const sqGeo = new THREE.BoxGeometry(CHESS_SQ_SIZE * 0.985, tileH, CHESS_SQ_SIZE * 0.985);
    const lightSqMat = new THREE.MeshStandardMaterial({
      color: 0xdcd3c2,
      roughness: 0.38,
      metalness: 0.06
    });
    const darkSqMat = new THREE.MeshStandardMaterial({
      color: 0x14171f,
      roughness: 0.28,
      metalness: 0.18
    });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        const sqMesh = new THREE.Mesh(sqGeo, isLight ? lightSqMat : darkSqMat);
        const pos = chessBoardToWorld(r, c);
        sqMesh.position.set(pos.x, BOARD_SURFACE_Y - tileH * 0.5, pos.z);
        sqMesh.receiveShadow = true;
        westernBoardGroup.add(sqMesh);
      }
    }

    const halfB = 4.0 * CHESS_SQ_SIZE;
    const rimW = 0.06;
    const rimH = 0.042;
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 });
    const horizGeo = new THREE.BoxGeometry(halfB * 2 + rimW * 2, rimH, rimW);
    const vertGeo = new THREE.BoxGeometry(rimW, rimH, halfB * 2);

    for (const s of [-1, 1]) {
      const hBar = new THREE.Mesh(horizGeo, goldTrimMat);
      hBar.position.set(0, BOARD_SURFACE_Y - rimH * 0.45, s * (halfB + rimW * 0.5));
      hBar.receiveShadow = true;
      westernBoardGroup.add(hBar);

      const vBar = new THREE.Mesh(vertGeo, goldTrimMat);
      vBar.position.set(s * (halfB + rimW * 0.5), BOARD_SURFACE_Y - rimH * 0.45, 0);
      vBar.receiveShadow = true;
      westernBoardGroup.add(vBar);
    }
  }

  buildWesternBoardGrid();

  const whiteMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf2ede4,
    roughness: 0.35,
    metalness: 0.12
  });
  const blackObsidianMat = new THREE.MeshStandardMaterial({
    color: 0x161a22,
    roughness: 0.28,
    metalness: 0.25
  });

  function createWesternPieceMesh(p: WesternPiece): THREE.Group {
    const group = new THREE.Group();
    const template = westernPieceTemplates[p.type];

    if (template) {
      const cloned = cloneSkeleton(template);
      cloned.scale.set(CHESS_SQ_SIZE, CHESS_SQ_SIZE, CHESS_SQ_SIZE);
      const mat = p.color === 'w' ? whiteMarbleMat : blackObsidianMat;
      cloned.traverse((child: any) => {
        if (child.isMesh) {
          child.material = mat;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // Rotate Black pieces 180 deg so they face White
      if (p.color === 'b') {
        cloned.rotation.y = Math.PI;
      }
      group.add(cloned);
    } else {
      // Fallback cylinder if GLB still loading
      const fallbackGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.32, 24);
      const fallbackMat = p.color === 'w' ? whiteMarbleMat : blackObsidianMat;
      const m = new THREE.Mesh(fallbackGeo, fallbackMat);
      m.position.y = 0.16;
      m.castShadow = true;
      group.add(m);
    }

    const worldPos = chessBoardToWorld(p.row, p.col);
    group.position.copy(worldPos);
    group.userData = { pieceId: p.id, square: p.square };

    westernBoardGroup.add(group);
    westernPieceMeshMap.set(p.id, group);
    return group;
  }

  function initWesternPieces() {
    westernPieceMeshMap.forEach((m) => westernBoardGroup.remove(m));
    westernPieceMeshMap.clear();

    const board = westernChessEngine.getBoardState();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          createWesternPieceMesh(p);
        }
      }
    }
  }

  // =========================================================================
  // Legal Move Indicators & Selection Rings
  // =========================================================================
  const highlightGroup = new THREE.Group();
  scene.add(highlightGroup);

  const selectedRingGeo = new THREE.RingGeometry(CO_UP_PIECE_RADIUS * 1.05, CO_UP_PIECE_RADIUS * 1.25, 32);
  const selectedRingMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  const selectedRing = new THREE.Mesh(selectedRingGeo, selectedRingMat);
  selectedRing.rotation.x = -Math.PI / 2;
  selectedRing.visible = false;
  highlightGroup.add(selectedRing);

  const checkRingGeo = new THREE.RingGeometry(CO_UP_PIECE_RADIUS * 1.15, CO_UP_PIECE_RADIUS * 1.45, 32);
  const checkRingMat = new THREE.MeshBasicMaterial({ color: 0xff0033, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  const checkRing = new THREE.Mesh(checkRingGeo, checkRingMat);
  checkRing.rotation.x = -Math.PI / 2;
  checkRing.visible = false;
  highlightGroup.add(checkRing);

  const targetDiscs: THREE.Mesh[] = [];
  const targetDiscGeo = new THREE.RingGeometry(0.035, 0.065, 24);
  const targetCaptureDiscGeo = new THREE.RingGeometry(CO_UP_PIECE_RADIUS * 0.88, CO_UP_PIECE_RADIUS * 1.15, 32);
  const targetDiscMat = new THREE.MeshBasicMaterial({ color: 0x48cae4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  const targetCaptureMat = new THREE.MeshBasicMaterial({ color: 0xe63946, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });

  function clearHighlights() {
    for (const d of targetDiscs) d.visible = false;
    selectedRing.visible = false;
  }

  function showHighlights(moves: { r: number; c: number; isCapture: boolean }[], selectedPos: THREE.Vector3) {
    selectedRing.position.set(selectedPos.x, BOARD_SURFACE_Y + 0.003, selectedPos.z);
    selectedRing.visible = true;

    while (targetDiscs.length < moves.length) {
      const disc = new THREE.Mesh(targetDiscGeo, targetDiscMat);
      disc.rotation.x = -Math.PI / 2;
      highlightGroup.add(disc);
      targetDiscs.push(disc);
    }

    moves.forEach((m, idx) => {
      const disc = targetDiscs[idx];
      const pos = currentGameType === 'co_up' ? coUpBoardToWorld(m.r, m.c) : chessBoardToWorld(m.r, m.c);
      disc.position.set(pos.x, BOARD_SURFACE_Y + 0.003, pos.z);
      if (m.isCapture) {
        disc.geometry = targetCaptureDiscGeo;
        disc.material = targetCaptureMat;
      } else {
        disc.geometry = targetDiscGeo;
        disc.material = targetDiscMat;
      }
      disc.visible = true;
    });
  }

  // =========================================================================
  // Cinematic Melee Combat Effects, Flying Caps, Shockwaves & Shatter Physics
  // =========================================================================
  interface FlyingCap {
    group: THREE.Group;
    startPos: THREE.Vector3;
    startTime: number;
    duration: number;
  }
  const activeFlyingCaps: FlyingCap[] = [];

  interface ShockwaveEffect {
    mesh: THREE.Mesh;
    startTime: number;
    duration: number;
    maxScale: number;
  }
  const activeShockwaves: ShockwaveEffect[] = [];
  const shockwaveGeo = new THREE.RingGeometry(0.04, 0.16, 32);
  const shockwaveMat = new THREE.MeshBasicMaterial({
    color: 0xf5d76e,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  let cameraShakeTrauma = 0;
  const impactFlashLight = new THREE.PointLight(0xfff2c2, 0, 9.0, 1.8);
  scene.add(impactFlashLight);

  interface ShatterDebris {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    rotVel: THREE.Vector3;
    life: number;
    maxLife: number;
    isSpark?: boolean;
  }
  const activeShatterDebris: ShatterDebris[] = [];
  const debrisGeoStone = new THREE.DodecahedronGeometry(0.024, 0);
  const debrisGeoTetra = new THREE.TetrahedronGeometry(0.028, 0);
  const debrisGeoSpark = new THREE.SphereGeometry(0.008, 8, 8);

  const sparkMatGold = new THREE.MeshBasicMaterial({ color: 0xffdd55 });
  const sparkMatCrimson = new THREE.MeshBasicMaterial({ color: 0xff3355 });

  function triggerImpactEffects(worldPos: THREE.Vector3, isDark: boolean, hasCap = false) {
    // 1. Point Light Flash
    impactFlashLight.position.set(worldPos.x, worldPos.y + 0.22, worldPos.z);
    impactFlashLight.intensity = 16.0;
    impactFlashLight.color.setHex(isDark ? 0x38bdf8 : 0xff3838);

    // 2. Powerful Camera Trauma Shake
    cameraShakeTrauma = 0.16;

    // 3. Multi-Tier Concentric Energy Shockwaves
    // 3a. Fast High-Energy Inner Shockwave Ring
    const swMat1 = shockwaveMat.clone();
    swMat1.color.setHex(isDark ? 0x38bdf8 : 0xf5d76e);
    const swMesh1 = new THREE.Mesh(shockwaveGeo, swMat1);
    swMesh1.rotation.x = -Math.PI / 2;
    swMesh1.position.set(worldPos.x, BOARD_SURFACE_Y + 0.005, worldPos.z);
    scene.add(swMesh1);
    activeShockwaves.push({
      mesh: swMesh1,
      startTime: performance.now(),
      duration: 320,
      maxScale: 2.8
    });

    // 3b. Outer Expanding Altar Ground Dust/Pressure Ripple Ring
    const swMat2 = shockwaveMat.clone();
    swMat2.color.setHex(0xd4af37);
    const swMesh2 = new THREE.Mesh(shockwaveGeo, swMat2);
    swMesh2.rotation.x = -Math.PI / 2;
    swMesh2.position.set(worldPos.x, BOARD_SURFACE_Y + 0.003, worldPos.z);
    scene.add(swMesh2);
    activeShockwaves.push({
      mesh: swMesh2,
      startTime: performance.now() + 40,
      duration: 540,
      maxScale: 3.8
    });

    // 4. Catastrophic Shatter Debris (Stone Chunks + Polished Rim Shards + Bronze Cap Slices + Sparks)
    const stoneMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1f2937 : 0xd90429,
      roughness: 0.32,
      metalness: 0.35
    });
    const rimShardMat = new THREE.MeshStandardMaterial({
      color: 0xf5d76e,
      roughness: 0.2,
      metalness: 0.95
    });
    const capBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x9e6c28,
      roughness: 0.22,
      metalness: 0.9
    });

    const totalDebris = hasCap ? 72 : 54;
    for (let i = 0; i < totalDebris; i++) {
      const isTetra = Math.random() > 0.45;
      const isRim = i < 16;
      const isCapPiece = hasCap && i >= 40;
      const mat = isCapPiece ? capBronzeMat : (isRim ? rimShardMat : stoneMat);
      const geo = isTetra ? debrisGeoTetra : debrisGeoStone;

      const mesh = new THREE.Mesh(geo, mat);
      const scaleRand = 0.75 + Math.random() * 1.1;
      mesh.scale.setScalar(scaleRand);

      mesh.position.copy(worldPos);
      mesh.position.x += (Math.random() - 0.5) * 0.16;
      mesh.position.z += (Math.random() - 0.5) * 0.16;
      mesh.position.y += Math.random() * 0.1;
      mesh.castShadow = true;
      scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 3.2;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.2 + Math.random() * 3.6,
        Math.sin(angle) * speed
      );
      const rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 32,
        (Math.random() - 0.5) * 32,
        (Math.random() - 0.5) * 32
      );
      activeShatterDebris.push({ mesh, vel, rotVel, life: 0, maxLife: 1.4 + Math.random() * 0.45 });
    }

    // 5. Fiery Glowing Ember & Spark Cloud
    const sparkCount = 32;
    for (let i = 0; i < sparkCount; i++) {
      const sparkMesh = new THREE.Mesh(debrisGeoSpark, isDark ? sparkMatGold : sparkMatCrimson);
      sparkMesh.position.copy(worldPos);
      scene.add(sparkMesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.8 + Math.random() * 4.2,
        Math.sin(angle) * speed
      );
      activeShatterDebris.push({
        mesh: sparkMesh,
        vel,
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.85 + Math.random() * 0.45,
        isSpark: true
      });
    }

    // Sound: Deep sub-bass boom, fracture crunch, and metallic clang if capped
    coUpAudio.playStoneShatter(hasCap);
  }

  // =========================================================================
  // Unified Game States & Logic Routing
  // =========================================================================
  // Cờ Úp state
  let coUpBoard: CoUpBoardGrid = createInitialCoUpBoard();
  let coUpTurn: CoUpPieceColor = 'r';
  let coUpPlayerColor: CoUpPieceColor = 'r';
  let coUpSelectedPiece: CoUpPiece | null = null;
  let coUpLegalMoves: { r: number; c: number }[] = [];
  const coUpCapturedRed: CoUpPiece[] = [];
  const coUpCapturedBlack: CoUpPiece[] = [];

  // Western Chess state
  let chessPlayerColor: ChessColor = 'w';
  let chessSelectedPiece: WesternPiece | null = null;
  let chessLegalMoves: { r: number; c: number; toSq: Square; isCapture: boolean }[] = [];
  const chessCapturedWhite: string[] = [];
  const chessCapturedBlack: string[] = [];

  let isAiThinking = false;
  let isAnimatingMove = false;

  function initCoUpPieces() {
    coUpPieceMeshMap.forEach((m) => coUpBoardGroup.remove(m));
    coUpPieceMeshMap.clear();

    for (let r = 0; r < XIANGQI_ROWS; r++) {
      for (let c = 0; c < XIANGQI_COLS; c++) {
        const p = coUpBoard[r][c];
        if (p) createCoUp3DPieceMesh(p);
      }
    }
  }

  initCoUpPieces();

  // =========================================================================
  // UI & HUD Synchronizer
  // =========================================================================
  function updateTurnUI() {
    const turnText = document.getElementById('turn-text');
    const turnDot = document.getElementById('turn-dot');
    const modeBadge = document.getElementById('mode-badge');
    const sideToggleBtn = document.getElementById('btn-side-toggle');
    const brandTitle = document.querySelector('.brand-title');
    const brandSwitchTag = document.getElementById('brand-switch-tag');

    if (currentGameType === 'co_up') {
      if (brandTitle) brandTitle.textContent = 'Cờ Úp 3D';
      if (brandSwitchTag) brandSwitchTag.textContent = '⇄ Cờ Vua';

      const inCheck = isCoUpKingInCheck(coUpTurn, coUpBoard);
      const sideName = coUpTurn === 'r' ? 'Đỏ' : 'Đen';
      if (turnText) turnText.textContent = inCheck ? `Lượt ${sideName} (CHIẾU TƯỚNG!)` : `Lượt ${sideName} đi`;
      if (turnDot) {
        if (coUpTurn === 'b') turnDot.classList.add('black');
        else turnDot.classList.remove('black');
      }
      if (modeBadge) modeBadge.textContent = `Đấu với AI • Bạn cầm ${coUpPlayerColor === 'r' ? 'Đỏ' : 'Đen'}`;
      if (sideToggleBtn) sideToggleBtn.textContent = coUpPlayerColor === 'r' ? 'Đổi sang phe Đen' : 'Đổi sang phe Đỏ';

      if (inCheck) {
        coUpAudio.playCheckBell();
        let kPos: { r: number; c: number } | null = null;
        for (let r = 0; r < XIANGQI_ROWS; r++) {
          for (let c = 0; c < XIANGQI_COLS; c++) {
            const p = coUpBoard[r][c];
            if (p && p.color === coUpTurn && p.trueType === 'K') {
              kPos = { r, c };
              break;
            }
          }
          if (kPos) break;
        }
        if (kPos) {
          const wp = coUpBoardToWorld(kPos.r, kPos.c);
          checkRing.position.set(wp.x, BOARD_SURFACE_Y + 0.004, wp.z);
          checkRing.visible = true;
        }
      } else {
        checkRing.visible = false;
      }
      updateCapturedTray();
    } else {
      // Western Chess Mode
      if (brandTitle) brandTitle.textContent = 'Cờ Vua 3D';
      if (brandSwitchTag) brandSwitchTag.textContent = '⇄ Cờ Úp';

      const chessTurn = westernChessEngine.getTurn();
      const inCheck = westernChessEngine.isCheck();
      const sideName = chessTurn === 'w' ? 'Trắng' : 'Đen';
      if (turnText) turnText.textContent = inCheck ? `Lượt ${sideName} (CHIẾU!)` : `Lượt ${sideName} đi`;
      if (turnDot) {
        if (chessTurn === 'b') turnDot.classList.add('black');
        else turnDot.classList.remove('black');
      }
      if (modeBadge) modeBadge.textContent = `Đấu với AI • Bạn cầm ${chessPlayerColor === 'w' ? 'Trắng' : 'Đen'}`;
      if (sideToggleBtn) sideToggleBtn.textContent = chessPlayerColor === 'w' ? 'Đổi sang phe Đen' : 'Đổi sang phe Trắng';

      if (inCheck) {
        coUpAudio.playCheckBell();
        const b = westernChessEngine.getBoardState();
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.color === chessTurn && p.type === 'k') {
              const wp = chessBoardToWorld(r, c);
              checkRing.position.set(wp.x, BOARD_SURFACE_Y + 0.004, wp.z);
              checkRing.visible = true;
              break;
            }
          }
        }
      } else {
        checkRing.visible = false;
      }
      updateCapturedTray();
    }
  }

  function updateCapturedTray() {
    const tray = document.getElementById('captured-tray');
    if (!tray) return;

    if (currentGameType === 'co_up') {
      const redHtml = coUpCapturedRed.map((p) => {
        const info = CO_UP_PIECE_NAMES[p.color][p.trueType];
        return `<span class="captured-chip red">${info.han}</span>`;
      }).join('');
      const blackHtml = coUpCapturedBlack.map((p) => {
        const info = CO_UP_PIECE_NAMES[p.color][p.trueType];
        return `<span class="captured-chip black">${info.han}</span>`;
      }).join('');

      const parts = [];
      if (redHtml) parts.push(`<span class="captured-side-label">Đỏ mất:</span> ${redHtml}`);
      if (blackHtml) parts.push(`<span class="captured-side-label">Đen mất:</span> ${blackHtml}`);
      tray.innerHTML = parts.join('<span class="tray-sep">|</span>');
    } else {
      const wHtml = chessCapturedWhite.map((s) => `<span class="captured-chip red">${s.toUpperCase()}</span>`).join('');
      const bHtml = chessCapturedBlack.map((s) => `<span class="captured-chip black">${s.toUpperCase()}</span>`).join('');
      const parts = [];
      if (wHtml) parts.push(`<span class="captured-side-label">Trắng mất:</span> ${wHtml}`);
      if (bHtml) parts.push(`<span class="captured-side-label">Đen mất:</span> ${bHtml}`);
      tray.innerHTML = parts.join('<span class="tray-sep">|</span>');
    }
  }

  function showCheckmateBanner(winnerName: string, icon: string) {
    const overlay = document.getElementById('checkmate-overlay');
    const title = document.getElementById('checkmate-title');
    const subtitle = document.getElementById('checkmate-subtitle');
    const crown = document.getElementById('checkmate-crown');

    if (title) title.textContent = 'CHIẾU BÍ - THẮNG CUỘC';
    if (crown) crown.textContent = icon;
    if (subtitle) {
      subtitle.textContent = `${winnerName} Đại Thắng • Vua Địch Đã Bị Thu Phục Tại Thánh Đường`;
    }
    if (overlay) overlay.classList.add('visible');
    coUpAudio.playVictory();
  }

  // =========================================================================
  // Game Mode Switcher: Cờ Úp 3D <-> Cờ Vua Gốc
  // =========================================================================
  function switchGameType(targetType: GameType) {
    if (currentGameType === targetType) return;
    currentGameType = targetType;
    clearHighlights();
    checkRing.visible = false;

    const overlay = document.getElementById('checkmate-overlay');
    if (overlay) overlay.classList.remove('visible');

    if (currentGameType === 'western_chess') {
      coUpBoardGroup.visible = false;
      westernBoardGroup.visible = true;
      initWesternPieces();
      setCameraPreset('player');
    } else {
      westernBoardGroup.visible = false;
      coUpBoardGroup.visible = true;
      initCoUpPieces();
      setCameraPreset('player');
    }
    updateTurnUI();
  }

  // =========================================================================
  // Move Execution: Cờ Úp vs Western Chess
  // =========================================================================
  function executeCoUpMove(move: CoUpMove) {
    if (isAnimatingMove) return;
    isAnimatingMove = true;
    clearHighlights();

    const { piece, toRow, toCol, captured } = move;
    const meshGroup = coUpPieceMeshMap.get(piece.id);
    if (!meshGroup) {
      isAnimatingMove = false;
      return;
    }

    const startPos = coUpBoardToWorld(piece.row, piece.col);
    const endPos = coUpBoardToWorld(toRow, toCol);
    const needsFlip = !piece.isRevealed;

    // If piece had a Nắp Úp cap, trigger spectacular 3D uncapping animation!
    const cap = meshGroup.userData.cap as THREE.Group | undefined;
    if (needsFlip && cap) {
      meshGroup.remove(cap);
      coUpBoardGroup.add(cap);
      cap.position.copy(startPos);

      activeFlyingCaps.push({
        group: cap,
        startPos: cap.position.clone(),
        startTime: performance.now(),
        duration: 720
      });
      meshGroup.userData.cap = null;
      coUpAudio.playMysteryReveal();
    }

    const isCapture = Boolean(captured);
    if (isCapture) {
      coUpAudio.playAttackCharge();
    } else {
      coUpAudio.playStoneMove();
    }

    const startTime = performance.now();
    const duration = isCapture ? 820 : (needsFlip ? 520 : 440);
    const impactT = isCapture ? 0.62 : 1.0;
    let impactHandled = false;

    const dx = endPos.x - startPos.x;
    const dz = endPos.z - startPos.z;
    const attackAngleY = Math.atan2(dx, dz);
    const targetCapMesh = captured ? coUpPieceMeshMap.get(captured.id) : null;
    const wasCapturedCapped = captured ? !captured.isRevealed : false;

    function animate(time: number) {
      const elapsed = time - startTime;
      const t = Math.min(1.0, elapsed / duration);

      if (isCapture) {
        if (t < impactT) {
          // Phase 1: Swoop, Leap & Combat Tilt Strike
          const tPre = t / impactT;
          const easePre = easeInOutCubic(tPre);
          const curY = THREE.MathUtils.lerp(startPos.y, endPos.y, easePre) + Math.sin(tPre * Math.PI) * 0.58;
          meshGroup!.position.set(
            THREE.MathUtils.lerp(startPos.x, endPos.x, easePre),
            curY,
            THREE.MathUtils.lerp(startPos.z, endPos.z, easePre)
          );
          meshGroup!.rotation.y = attackAngleY;
          meshGroup!.rotation.x = Math.sin(tPre * Math.PI) * 0.65; // Aggressive forward combat tilt!

          // Target piece shakes in anticipation right before impact
          if (tPre > 0.72 && targetCapMesh) {
            targetCapMesh.position.x = endPos.x + (Math.random() - 0.5) * 0.024;
            targetCapMesh.position.z = endPos.z + (Math.random() - 0.5) * 0.024;
          }
        } else {
          // Phase 2: Cataclysmic Impact & Heavy Recoil Settling
          if (!impactHandled) {
            impactHandled = true;
            triggerImpactEffects(endPos, captured!.color === 'b', wasCapturedCapped);
            if (targetCapMesh) {
              coUpBoardGroup.remove(targetCapMesh);
              coUpPieceMeshMap.delete(captured!.id);
            }
            if (captured!.color === 'r') coUpCapturedRed.push(captured!);
            else coUpCapturedBlack.push(captured!);
          }

          const tPost = (t - impactT) / (1.0 - impactT);
          const easePost = easeOutCubic(tPost);
          const bounceY = Math.sin(tPost * Math.PI) * 0.11;
          meshGroup!.position.set(endPos.x, endPos.y + bounceY, endPos.z);
          meshGroup!.rotation.x = 0.65 * (1.0 - easePost);
          meshGroup!.rotation.y = attackAngleY * (1.0 - easePost);
        }
      } else {
        // Non-capture regular glide
        const ease = easeInOutCubic(t);
        const arcH = needsFlip ? 0.32 : 0.18;
        const curY = THREE.MathUtils.lerp(startPos.y, endPos.y, ease) + Math.sin(t * Math.PI) * arcH;
        meshGroup!.position.set(
          THREE.MathUtils.lerp(startPos.x, endPos.x, ease),
          curY,
          THREE.MathUtils.lerp(startPos.z, endPos.z, ease)
        );
      }

      if (t < 1.0) {
        requestAnimationFrame(animate);
      } else {
        meshGroup!.position.copy(endPos);
        meshGroup!.rotation.set(0, 0, 0);

        if (needsFlip) {
          piece.isRevealed = true;
        }

        if (isCapture) {
          coUpAudio.playStoneMove(); // Final settling clack
        }

        coUpBoard[piece.row][piece.col] = null;
        piece.row = toRow;
        piece.col = toCol;
        coUpBoard[toRow][toCol] = piece;

        coUpTurn = coUpTurn === 'r' ? 'b' : 'r';
        isAnimatingMove = false;
        updateTurnUI();

        const oppMoves = getCoUpAIMove(coUpTurn, coUpBoard);
        if (!oppMoves) {
          const winSide = coUpTurn === 'r' ? 'Phe Đen' : 'Phe Đỏ';
          showCheckmateBanner(winSide, coUpTurn === 'r' ? '將' : '帥');
          return;
        }

        if (coUpTurn !== coUpPlayerColor && !isAiThinking) {
          triggerAIMoveWithDelay();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  function executeWesternMove(fromSq: Square, toSq: Square) {
    if (isAnimatingMove) return;
    isAnimatingMove = true;
    clearHighlights();

    const fromCoord = squareToCoord(fromSq);
    const toCoord = squareToCoord(toSq);
    const boardState = westernChessEngine.getBoardState();
    const movingPiece = boardState[fromCoord.r][fromCoord.c];
    if (!movingPiece) {
      isAnimatingMove = false;
      return;
    }

    const movingPieceId = movingPiece.id;
    const meshGroup = westernPieceMeshMap.get(movingPieceId);
    if (!meshGroup) {
      isAnimatingMove = false;
      return;
    }

    const startPos = chessBoardToWorld(fromCoord.r, fromCoord.c);
    const endPos = chessBoardToWorld(toCoord.r, toCoord.c);
    const targetPiece = boardState[toCoord.r][toCoord.c];
    const isCapture = Boolean(targetPiece);

    if (isCapture) {
      coUpAudio.playAttackCharge();
    } else {
      coUpAudio.playStoneMove();
    }

    const startTime = performance.now();
    const duration = isCapture ? 820 : 500;
    const impactT = isCapture ? 0.62 : 1.0;
    let impactHandled = false;

    let targetMesh: THREE.Group | null = null;
    if (isCapture) {
      for (const [id, m] of westernPieceMeshMap.entries()) {
        if (m.userData.square === toSq && id !== movingPieceId) {
          targetMesh = m;
          break;
        }
      }
    }

    function animate(time: number) {
      const elapsed = time - startTime;
      const t = Math.min(1.0, elapsed / duration);

      if (isCapture) {
        if (t < impactT) {
          const tPre = t / impactT;
          const easePre = easeInOutCubic(tPre);
          const curY = THREE.MathUtils.lerp(startPos.y, endPos.y, easePre) + Math.sin(tPre * Math.PI) * 0.58;
          meshGroup!.position.set(
            THREE.MathUtils.lerp(startPos.x, endPos.x, easePre),
            curY,
            THREE.MathUtils.lerp(startPos.z, endPos.z, easePre)
          );
          if (tPre > 0.72 && targetMesh) {
            targetMesh.position.x = endPos.x + (Math.random() - 0.5) * 0.024;
            targetMesh.position.z = endPos.z + (Math.random() - 0.5) * 0.024;
          }
        } else {
          if (!impactHandled) {
            impactHandled = true;
            const moveResult = westernChessEngine.makeMove(fromSq, toSq);
            if (moveResult && moveResult.captured) {
              if (moveResult.color === 'w') chessCapturedBlack.push(moveResult.captured);
              else chessCapturedWhite.push(moveResult.captured);
            }
            triggerImpactEffects(endPos, movingPiece!.color === 'w', false);
            if (targetMesh) {
              westernBoardGroup.remove(targetMesh);
              for (const [id, m] of westernPieceMeshMap.entries()) {
                if (m === targetMesh) {
                  westernPieceMeshMap.delete(id);
                  break;
                }
              }
            }
          }

          const tPost = (t - impactT) / (1.0 - impactT);
          const bounceY = Math.sin(tPost * Math.PI) * 0.12;
          meshGroup!.position.set(endPos.x, endPos.y + bounceY, endPos.z);
        }
      } else {
        const ease = easeInOutCubic(t);
        const curY = THREE.MathUtils.lerp(startPos.y, endPos.y, ease) + Math.sin(t * Math.PI) * 0.28;
        meshGroup!.position.set(
          THREE.MathUtils.lerp(startPos.x, endPos.x, ease),
          curY,
          THREE.MathUtils.lerp(startPos.z, endPos.z, ease)
        );
      }

      if (t < 1.0) {
        requestAnimationFrame(animate);
      } else {
        meshGroup!.position.copy(endPos);
        if (!isCapture) {
          westernChessEngine.makeMove(fromSq, toSq);
        }

        meshGroup!.userData.square = toSq;
        isAnimatingMove = false;
        updateTurnUI();

        if (westernChessEngine.isCheckmate()) {
          const win = westernChessEngine.getTurn() === 'w' ? 'Phe Đen' : 'Phe Trắng';
          showCheckmateBanner(win, '♔');
          return;
        }

        if (westernChessEngine.getTurn() !== chessPlayerColor && !isAiThinking) {
          triggerAIMoveWithDelay();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  function triggerAIMoveWithDelay() {
    isAiThinking = true;
    setTimeout(() => {
      if (currentGameType === 'co_up') {
        const move = getCoUpAIMove(coUpTurn, coUpBoard);
        isAiThinking = false;
        if (move) executeCoUpMove(move);
      } else {
        const move = westernChessEngine.getAIMove();
        isAiThinking = false;
        if (move) executeWesternMove(move.from, move.to);
      }
    }, 600);
  }

  // =========================================================================
  // Interaction (Click / Tap on Board)
  // =========================================================================
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let pointerDownTime = 0;
  let pointerDownPos = { x: 0, y: 0 };

  function handleInteraction(clientX: number, clientY: number) {
    if (isAnimatingMove || isAiThinking) return;

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_SURFACE_Y);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(boardPlane, hit)) return;

    if (currentGameType === 'co_up') {
      if (coUpTurn !== coUpPlayerColor) return;
      const coords = worldToCoUpBoard(hit.x, hit.z);
      if (!coords) {
        coUpSelectedPiece = null;
        coUpLegalMoves = [];
        clearHighlights();
        return;
      }

      const { r, c } = coords;
      const clickedPiece = coUpBoard[r][c];

      if (coUpSelectedPiece) {
        const isTarget = coUpLegalMoves.some((m) => m.r === r && m.c === c);
        if (isTarget) {
          executeCoUpMove({
            fromRow: coUpSelectedPiece.row,
            fromCol: coUpSelectedPiece.col,
            toRow: r,
            toCol: c,
            piece: coUpSelectedPiece,
            captured: clickedPiece
          });
          coUpSelectedPiece = null;
          coUpLegalMoves = [];
          clearHighlights();
          return;
        }
      }

      if (clickedPiece && clickedPiece.color === coUpTurn) {
        coUpSelectedPiece = clickedPiece;
        coUpLegalMoves = getCoUpLegalMoves(clickedPiece, coUpBoard);
        const wPos = coUpBoardToWorld(r, c);
        showHighlights(
          coUpLegalMoves.map((m) => ({ r: m.r, c: m.c, isCapture: Boolean(coUpBoard[m.r][m.c]) })),
          wPos
        );
        coUpAudio.playSelect();
      } else {
        coUpSelectedPiece = null;
        coUpLegalMoves = [];
        clearHighlights();
      }
    } else {
      // Western Chess Mode
      if (westernChessEngine.getTurn() !== chessPlayerColor) return;
      const coords = worldToChessBoard(hit.x, hit.z);
      if (!coords) {
        chessSelectedPiece = null;
        chessLegalMoves = [];
        clearHighlights();
        return;
      }

      const sq = coordToSquare(coords.r, coords.c);
      const boardState = westernChessEngine.getBoardState();
      const clickedPiece = boardState[coords.r][coords.c];

      if (chessSelectedPiece) {
        const target = chessLegalMoves.find((m) => m.toSq === sq);
        if (target) {
          executeWesternMove(chessSelectedPiece.square, target.toSq);
          chessSelectedPiece = null;
          chessLegalMoves = [];
          clearHighlights();
          return;
        }
      }

      if (clickedPiece && clickedPiece.color === westernChessEngine.getTurn()) {
        chessSelectedPiece = clickedPiece;
        const moves = westernChessEngine.getLegalMoves(sq);
        chessLegalMoves = moves.map((m) => {
          const tc = squareToCoord(m.to);
          return { r: tc.r, c: tc.c, toSq: m.to, isCapture: Boolean(m.captured) };
        });
        const wPos = chessBoardToWorld(coords.r, coords.c);
        showHighlights(chessLegalMoves, wPos);
        coUpAudio.playSelect();
      } else {
        chessSelectedPiece = null;
        chessLegalMoves = [];
        clearHighlights();
      }
    }
  }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDownTime = performance.now();
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    const elapsed = performance.now() - pointerDownTime;
    const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (elapsed < 350 && dist < 12) {
      handleInteraction(e.clientX, e.clientY);
    }
  });

  // =========================================================================
  // Camera Presets & Transitions
  // =========================================================================
  let activeCamTransition: {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null = null;

  function smoothCameraTo(endPos: THREE.Vector3, endTarget: THREE.Vector3, durSeconds = 0.75) {
    activeCamTransition = {
      startPos: camera.position.clone(),
      endPos: endPos.clone(),
      startTarget: orbitControls.target.clone(),
      endTarget: endTarget.clone(),
      startTime: performance.now(),
      duration: durSeconds * 1000
    };
  }

  let playerCamSide: 'w' | 'b' = 'w';
  let overheadCamSide: 'w' | 'b' = 'w';
  let sideCamSide: 'east' | 'west' = 'east';
  let cathedralWideSide: 'north' | 'south' = 'north';

  function setActiveCamButton(activeId: string) {
    ['btn-cam-player', 'btn-cam-top', 'btn-cam-side', 'btn-cam-wide', 'btn-cam-tour'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        if (id === activeId) el.classList.add('active');
        else el.classList.remove('active');
      }
    });
  }

  function updateEnvironmentUI() {
    const isCafe = currentEnvironment === 'cafe';

    const envIcon = document.getElementById('env-pill-icon');
    const envLabel = document.getElementById('env-pill-label');
    if (envIcon) envIcon.textContent = isCafe ? '🏛️' : '☕';
    if (envLabel) envLabel.textContent = isCafe ? 'Thánh Đường' : 'Quán Cà Phê';

    const btnEnvMobile = document.getElementById('btn-env-toggle-mobile');
    if (btnEnvMobile) {
      btnEnvMobile.textContent = isCafe ? '🏛️ Đổi sang Thánh Đường' : '☕ Đổi sang Quán Cà Phê';
    }

    const tourIcon = document.getElementById('tour-env-icon');
    const tourTitle = document.getElementById('tour-env-title');
    const tourBadge = document.getElementById('tour-env-badge');
    const btnTourSwitch = document.getElementById('btn-tour-switch-env');
    const btnSpotFeature = document.getElementById('btn-spot-feature');

    if (tourIcon) tourIcon.textContent = isCafe ? '☕' : '🏛️';
    if (tourTitle) tourTitle.textContent = isCafe ? 'Tham Quan Cà Phê Hè Phố Hà Nội' : 'Tham Quan Thánh Đường Gothic';
    if (tourBadge) tourBadge.textContent = isCafe ? 'Phố Cổ Hà Nội' : 'Thánh Đường Cổ';
    if (btnTourSwitch) {
      btnTourSwitch.textContent = isCafe ? '🏛️ Đến Thánh Đường' : '☕ Đến Phố Cổ Hà Nội';
    }
    const btnSpotTerrace = document.getElementById('btn-spot-terrace');
    if (btnSpotFeature) {
      btnSpotFeature.textContent = isCafe ? '🏍️ Xe Honda Cub' : '🕯️ Gian Thờ Đá';
    }
    if (btnSpotTerrace) {
      btnSpotTerrace.textContent = isCafe ? '🍵 Quán Nước Chè' : '🏛️ Cửa Sổ Hoa Hồng';
    }
  }

  function setEnvironment(env: GameEnvironment, teleportIfTour = true) {
    currentEnvironment = env;

    if (env === 'cafe') {
      if (cathedralSceneObj) cathedralSceneObj.visible = false;
      cafeBundle.group.visible = true;

      scene.background = new THREE.Color(0x82b9e6);
      scene.fog = new THREE.FogExp2(0xb2d6f2, 0.0075);

      keyLight.color.setHex(0xfff5e4);
      keyLight.intensity = 2.45;
      keyLight.position.set(6.2, 9.8, 5.2);

      hemiLight.color.setHex(0x9bd0f7);
      hemiLight.groundColor.setHex(0x4a3a29);
      hemiLight.intensity = 0.95;

      rimLight.intensity = 0.45;
      southFillLight.intensity = 0.75;

      brazierLights.forEach((l) => (l.visible = false));
      renderer.toneMappingExposure = 1.15;
    } else {
      if (cathedralSceneObj) cathedralSceneObj.visible = true;
      cafeBundle.group.visible = false;

      scene.background = new THREE.Color(0x070a12);
      scene.fog = new THREE.FogExp2(0x080b14, 0.015);

      keyLight.color.setHex(0xfff0d6);
      keyLight.intensity = 2.6;
      keyLight.position.set(3.8, 8.5, 4.2);

      hemiLight.color.setHex(0xd8ccb8);
      hemiLight.groundColor.setHex(0x261d14);
      hemiLight.intensity = 0.65;

      rimLight.intensity = 0.75;
      southFillLight.intensity = 0.55;

      brazierLights.forEach((l) => (l.visible = true));
      renderer.toneMappingExposure = 1.25;
    }

    updateEnvironmentUI();

    if (tourModeActive && teleportIfTour) {
      if (env === 'cafe') {
        smoothCameraTo(
          new THREE.Vector3(0, 1.72, 3.8),
          new THREE.Vector3(0, 1.25, 0),
          0.75
        );
      } else {
        smoothCameraTo(
          new THREE.Vector3(0, 1.72, 8.2),
          new THREE.Vector3(0, 1.62, -0.65),
          0.75
        );
      }
    } else if (!tourModeActive) {
      if (document.getElementById('btn-cam-wide')?.classList.contains('active')) {
        setCameraPreset('wide');
      }
    }
  }

  function toggleEnvironment() {
    const nextEnv = currentEnvironment === 'cathedral' ? 'cafe' : 'cathedral';
    setEnvironment(nextEnv, true);
    coUpAudio.playSelect();
  }

  function setTourMode(active: boolean, teleportToNave = false) {
    tourModeActive = active;
    const tourOverlay = document.getElementById('tour-hud-overlay');
    const tourBtn = document.getElementById('btn-cam-tour');

    if (tourModeActive) {
      if (tourOverlay) tourOverlay.classList.add('visible');
      if (tourBtn) tourBtn.classList.add('active');
      ['btn-cam-player', 'btn-cam-top', 'btn-cam-side', 'btn-cam-wide'].forEach((id) => {
        document.getElementById(id)?.classList.remove('active');
      });

      if (teleportToNave) {
        if (currentEnvironment === 'cafe') {
          smoothCameraTo(
            new THREE.Vector3(0, 1.72, 3.8),
            new THREE.Vector3(0, 1.25, 0),
            0.85
          );
        } else {
          smoothCameraTo(
            new THREE.Vector3(0, 1.72, 8.2),
            new THREE.Vector3(0, 1.62, -0.65),
            0.85
          );
        }
      }
    } else {
      if (tourOverlay) tourOverlay.classList.remove('visible');
      if (tourBtn) tourBtn.classList.remove('active');
    }
  }

  function toggleTourMode() {
    if (!tourModeActive) {
      setTourMode(true, true);
    } else {
      setTourMode(false);
      setCameraPreset('player');
    }
  }

  function cycleTourSpeed() {
    const speedLabel = document.getElementById('tour-speed-label');
    if (tourSpeedLevel === 'normal') {
      tourSpeedLevel = 'fast';
      if (speedLabel) speedLabel.textContent = 'Chạy nhanh (2.5x)';
    } else if (tourSpeedLevel === 'fast') {
      tourSpeedLevel = 'slow';
      if (speedLabel) speedLabel.textContent = 'Ngắm cảnh (0.5x)';
    } else {
      tourSpeedLevel = 'normal';
      if (speedLabel) speedLabel.textContent = 'Đi bộ (1x)';
    }
  }

  function setCameraPreset(preset: 'player' | 'top' | 'side' | 'wide' | 'tour') {
    const isPlayerWhite = currentGameType === 'co_up' ? coUpPlayerColor === 'r' : chessPlayerColor === 'w';

    if (preset === 'tour') {
      setActiveCamButton('btn-cam-tour');
      setTourMode(true, true);
      return;
    }

    setTourMode(false);

    if (preset === 'player') {
      const wasPlayerActive = document.getElementById('btn-cam-player')?.classList.contains('active');
      if (wasPlayerActive) {
        playerCamSide = playerCamSide === 'w' ? 'b' : 'w';
      } else {
        playerCamSide = isPlayerWhite ? 'w' : 'b';
      }
      setActiveCamButton('btn-cam-player');
      const zSign = playerCamSide === 'w' ? 1 : -1;
      smoothCameraTo(new THREE.Vector3(0, 2.35, zSign * 2.75), new THREE.Vector3(0, BOARD_SURFACE_Y, zSign * 0.15));
    } else if (preset === 'top') {
      const wasTopActive = document.getElementById('btn-cam-top')?.classList.contains('active');
      if (wasTopActive) {
        overheadCamSide = overheadCamSide === 'w' ? 'b' : 'w';
      } else {
        overheadCamSide = isPlayerWhite ? 'w' : 'b';
      }
      setActiveCamButton('btn-cam-top');
      const zSign = overheadCamSide === 'w' ? 0.05 : -0.05;
      smoothCameraTo(new THREE.Vector3(0, 4.85, zSign), new THREE.Vector3(0, BOARD_SURFACE_Y, 0));
    } else if (preset === 'side') {
      const wasSideActive = document.getElementById('btn-cam-side')?.classList.contains('active');
      if (wasSideActive) {
        sideCamSide = sideCamSide === 'east' ? 'west' : 'east';
      } else {
        sideCamSide = 'east';
      }
      setActiveCamButton('btn-cam-side');
      const xSign = sideCamSide === 'west' ? -1 : 1;
      smoothCameraTo(new THREE.Vector3(xSign * 3.25, 2.15, 0), new THREE.Vector3(0, BOARD_SURFACE_Y, 0));
    } else if (preset === 'wide') {
      const wasWideActive = document.getElementById('btn-cam-wide')?.classList.contains('active');
      if (wasWideActive) {
        cathedralWideSide = cathedralWideSide === 'north' ? 'south' : 'north';
      } else {
        cathedralWideSide = 'north';
      }
      setActiveCamButton('btn-cam-wide');
      if (currentEnvironment === 'cafe') {
        if (cathedralWideSide === 'north') {
          smoothCameraTo(new THREE.Vector3(4.8, 3.2, 5.6), new THREE.Vector3(0, 1.0, 0));
        } else {
          smoothCameraTo(new THREE.Vector3(-4.8, 3.2, -4.6), new THREE.Vector3(0, 1.0, 0));
        }
      } else {
        if (cathedralWideSide === 'north') {
          smoothCameraTo(new THREE.Vector3(0, 3.45, 6.2), new THREE.Vector3(0, 1.85, -4.5));
        } else {
          smoothCameraTo(new THREE.Vector3(0, 3.45, -6.2), new THREE.Vector3(0, 1.85, 4.5));
        }
      }
    }
  }

  // Hook camera HUD buttons
  document.getElementById('btn-cam-player')?.addEventListener('click', () => setCameraPreset('player'));
  document.getElementById('btn-cam-top')?.addEventListener('click', () => setCameraPreset('top'));
  document.getElementById('btn-cam-side')?.addEventListener('click', () => setCameraPreset('side'));
  document.getElementById('btn-cam-wide')?.addEventListener('click', () => setCameraPreset('wide'));
  document.getElementById('btn-cam-tour')?.addEventListener('click', () => setCameraPreset('tour'));
  document.getElementById('btn-tour-return')?.addEventListener('click', () => setCameraPreset('player'));
  document.getElementById('btn-tour-speed')?.addEventListener('click', cycleTourSpeed);

  // Hook Environment Toggle Buttons
  document.getElementById('btn-env-toggle')?.addEventListener('click', toggleEnvironment);
  document.getElementById('btn-env-toggle-mobile')?.addEventListener('click', toggleEnvironment);
  document.getElementById('btn-tour-switch-env')?.addEventListener('click', toggleEnvironment);

  // Hook Tour Quick Navigation Spot Shortcuts
  document.getElementById('btn-spot-board')?.addEventListener('click', () => {
    smoothCameraTo(new THREE.Vector3(0, 1.85, 2.2), new THREE.Vector3(0, BOARD_SURFACE_Y, 0), 0.7);
  });
  document.getElementById('btn-spot-feature')?.addEventListener('click', () => {
    if (currentEnvironment === 'cafe') {
      smoothCameraTo(new THREE.Vector3(-2.2, 1.35, 3.8), new THREE.Vector3(-2.4, 0.72, 2.4), 0.7);
    } else {
      smoothCameraTo(new THREE.Vector3(0, 1.72, 3.2), new THREE.Vector3(0, 1.25, 0), 0.7);
    }
  });
  document.getElementById('btn-spot-terrace')?.addEventListener('click', () => {
    if (currentEnvironment === 'cafe') {
      smoothCameraTo(new THREE.Vector3(2.6, 1.38, -3.2), new THREE.Vector3(2.6, 0.75, -4.5), 0.7);
    } else {
      smoothCameraTo(new THREE.Vector3(0, 3.2, 12.0), new THREE.Vector3(0, 2.4, -2.0), 0.7);
    }
  });

  // Hook Virtual Mobile Exploration D-Pad buttons
  function bindDpadButton(btnId: string, dirKey: keyof typeof moveKeys) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const start = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
      moveKeys[dirKey] = true;
    };
    const end = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
      moveKeys[dirKey] = false;
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('pointerleave', end);
  }

  bindDpadButton('btn-dpad-up', 'forward');
  bindDpadButton('btn-dpad-down', 'backward');
  bindDpadButton('btn-dpad-left', 'left');
  bindDpadButton('btn-dpad-right', 'right');
  bindDpadButton('btn-fly-up', 'up');
  bindDpadButton('btn-fly-down', 'down');

  function bindLookButton(btnId: string, dirKey: keyof typeof lookKeys) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const start = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
      lookKeys[dirKey] = true;
    };
    const end = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
      lookKeys[dirKey] = false;
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('pointerleave', end);
  }

  bindLookButton('btn-look-up', 'up');
  bindLookButton('btn-look-down', 'down');
  bindLookButton('btn-look-left', 'left');
  bindLookButton('btn-look-right', 'right');

  // Game Type Switcher Button
  const handleToggleGameType = () => {
    const nextType: GameType = currentGameType === 'co_up' ? 'western_chess' : 'co_up';
    switchGameType(nextType);
  };
  document.getElementById('btn-game-type-toggle')?.addEventListener('click', handleToggleGameType);
  document.getElementById('btn-game-type-toggle-mobile')?.addEventListener('click', handleToggleGameType);

  // Side Toggle Button (Switch playing as Red/White vs Black)
  document.getElementById('btn-side-toggle')?.addEventListener('click', () => {
    if (currentGameType === 'co_up') {
      coUpPlayerColor = coUpPlayerColor === 'r' ? 'b' : 'r';
      updateTurnUI();
      setCameraPreset('player');
      if (coUpTurn !== coUpPlayerColor && !isAiThinking) {
        triggerAIMoveWithDelay();
      }
    } else {
      chessPlayerColor = chessPlayerColor === 'w' ? 'b' : 'w';
      updateTurnUI();
      setCameraPreset('player');
      if (westernChessEngine.getTurn() !== chessPlayerColor && !isAiThinking) {
        triggerAIMoveWithDelay();
      }
    }
  });

  // AI Move Button
  document.getElementById('btn-ai-move')?.addEventListener('click', () => {
    if (!isAnimatingMove && !isAiThinking) {
      triggerAIMoveWithDelay();
    }
  });

  // New Game / Reset Button
  function resetCurrentGame() {
    clearHighlights();
    checkRing.visible = false;
    const overlay = document.getElementById('checkmate-overlay');
    if (overlay) overlay.classList.remove('visible');

    if (currentGameType === 'co_up') {
      coUpBoard = createInitialCoUpBoard();
      coUpTurn = 'r';
      coUpSelectedPiece = null;
      coUpLegalMoves = [];
      coUpCapturedRed.length = 0;
      coUpCapturedBlack.length = 0;
      initCoUpPieces();
      updateTurnUI();
      if (coUpPlayerColor === 'b') triggerAIMoveWithDelay();
    } else {
      westernChessEngine.reset();
      chessSelectedPiece = null;
      chessLegalMoves = [];
      chessCapturedWhite.length = 0;
      chessCapturedBlack.length = 0;
      initWesternPieces();
      updateTurnUI();
      if (chessPlayerColor === 'b') triggerAIMoveWithDelay();
    }
  }

  document.getElementById('btn-reset')?.addEventListener('click', resetCurrentGame);
  document.getElementById('btn-checkmate-newgame')?.addEventListener('click', resetCurrentGame);
  document.getElementById('btn-checkmate-dismiss')?.addEventListener('click', () => {
    const overlay = document.getElementById('checkmate-overlay');
    if (overlay) overlay.classList.remove('visible');
  });

  // Hide UI Toggle
  function toggleUI(force?: boolean) {
    const isHidden = document.body.classList.contains('cinematic-ui-hidden');
    const willHide = force !== undefined ? force : !isHidden;
    if (willHide) {
      document.body.classList.add('cinematic-ui-hidden');
      const btn = document.getElementById('btn-hide-ui');
      if (btn) btn.textContent = 'Hiện UI [H]';
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btn = document.getElementById('btn-hide-ui');
      if (btn) btn.textContent = 'Ẩn UI [H]';
    }
  }

  document.getElementById('btn-hide-ui')?.addEventListener('click', () => toggleUI());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') toggleUI();
  });

  // =========================================================================
  // Animation & Render Loop
  // =========================================================================
  let prevCamPos = camera.position.clone();

  function animateLoop() {
    requestAnimationFrame(animateLoop);
    const dt = clock.getDelta();
    const timeNow = performance.now();

    if (activeCamTransition) {
      const elapsed = timeNow - activeCamTransition.startTime;
      const t = Math.min(1.0, elapsed / activeCamTransition.duration);
      const ease = easeOutCubic(t);

      camera.position.lerpVectors(activeCamTransition.startPos, activeCamTransition.endPos, ease);
      orbitControls.target.lerpVectors(activeCamTransition.startTarget, activeCamTransition.endTarget, ease);
      orbitControls.update();

      if (t >= 1.0) {
        activeCamTransition = null;
      }
    } else {
      // Free Cathedral Roam & Sightseeing Navigation (WASD / Arrow Keys / Virtual D-Pad)
      const isMoving =
        moveKeys.forward ||
        moveKeys.backward ||
        moveKeys.left ||
        moveKeys.right ||
        moveKeys.up ||
        moveKeys.down;

      if (isMoving) {
        if (!tourModeActive) {
          setTourMode(true, false);
        }

        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        const fwdXZ = new THREE.Vector3(fwd.x, 0, fwd.z);
        if (fwdXZ.lengthSq() > 1e-4) fwdXZ.normalize();
        else fwdXZ.set(0, 0, -1);

        const rightXZ = new THREE.Vector3(-fwdXZ.z, 0, fwdXZ.x).normalize();

        const speed = tourSpeeds[tourSpeedLevel] * dt;
        const step = new THREE.Vector3();

        if (moveKeys.forward) step.addScaledVector(fwdXZ, speed);
        if (moveKeys.backward) step.addScaledVector(fwdXZ, -speed);
        if (moveKeys.right) step.addScaledVector(rightXZ, speed);
        if (moveKeys.left) step.addScaledVector(rightXZ, -speed);
        if (moveKeys.up) step.y += speed * 0.85;
        if (moveKeys.down) step.y -= speed * 0.85;

        camera.position.add(step);
        orbitControls.target.add(step);
      }

      // Rotate viewing angle with Arrow Keys (Look Left, Right, Up, Down)
      const isLooking = lookKeys.left || lookKeys.right || lookKeys.up || lookKeys.down;
      if (isLooking) {
        if (!tourModeActive) {
          setTourMode(true, false);
        }

        const lookDir = new THREE.Vector3().subVectors(orbitControls.target, camera.position);
        const dist = Math.max(1.8, lookDir.length());
        lookDir.normalize();

        const turnSpeed = 2.0; // rad/s
        let yawDelta = 0;
        if (lookKeys.left) yawDelta += turnSpeed * dt;
        if (lookKeys.right) yawDelta -= turnSpeed * dt;
        if (yawDelta !== 0) {
          lookDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawDelta);
        }

        let pitchDelta = 0;
        if (lookKeys.up) pitchDelta += turnSpeed * 0.85 * dt;
        if (lookKeys.down) pitchDelta -= turnSpeed * 0.85 * dt;
        if (pitchDelta !== 0) {
          const right = new THREE.Vector3().crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize();
          const curPitch = Math.asin(THREE.MathUtils.clamp(lookDir.y, -0.99, 0.99));
          const newPitch = THREE.MathUtils.clamp(curPitch + pitchDelta, -Math.PI * 0.44, Math.PI * 0.44);
          const actualPitchDelta = newPitch - curPitch;
          if (Math.abs(actualPitchDelta) > 1e-4) {
            lookDir.applyAxisAngle(right, actualPitchDelta);
          }
        }

        orbitControls.target.copy(camera.position).addScaledVector(lookDir, dist);
      }

      orbitControls.update();
    }

    enforceBoundsAndObstacles(prevCamPos, camera.position, orbitControls.target);
    prevCamPos.copy(camera.position);

    // 1. Camera Trauma Shake
    if (cameraShakeTrauma > 0.001) {
      const sX = (Math.random() - 0.5) * cameraShakeTrauma;
      const sY = (Math.random() - 0.5) * cameraShakeTrauma * 0.6;
      camera.position.x += sX;
      camera.position.y += sY;
      cameraShakeTrauma *= 0.82;
    }

    // 2. Impact Flash Light Decay
    if (impactFlashLight.intensity > 0.01) {
      impactFlashLight.intensity *= 0.82;
    } else {
      impactFlashLight.intensity = 0;
    }

    // 3. Update Flying Nắp Úp Caps
    for (let i = activeFlyingCaps.length - 1; i >= 0; i--) {
      const fc = activeFlyingCaps[i];
      const elapsed = timeNow - fc.startTime;
      const t = Math.min(1.0, elapsed / fc.duration);
      const ease = easeOutCubic(t);

      fc.group.position.y = fc.startPos.y + ease * 0.92;
      fc.group.rotation.y += 0.28;
      fc.group.rotation.z += 0.14;
      const sScale = Math.max(0.001, 1 - ease * 1.02);
      fc.group.scale.setScalar(sScale);

      if (t >= 1.0) {
        coUpBoardGroup.remove(fc.group);
        activeFlyingCaps.splice(i, 1);
      }
    }

    // 4. Update Expanding Energy Shockwaves
    for (let i = activeShockwaves.length - 1; i >= 0; i--) {
      const sw = activeShockwaves[i];
      const elapsed = timeNow - sw.startTime;
      const t = Math.min(1.0, elapsed / sw.duration);
      const ease = easeOutCubic(t);

      const sScale = 0.25 + ease * sw.maxScale;
      sw.mesh.scale.set(sScale, sScale, 1);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - ease) * 0.95);

      if (t >= 1.0) {
        scene.remove(sw.mesh);
        activeShockwaves.splice(i, 1);
      }
    }

    // 5. Environment Specific Lighting Animations
    if (currentEnvironment === 'cathedral') {
      const flickerTime = timeNow * 0.003;
      brazierLights.forEach((light, idx) => {
        const base = light.userData.baseIntensity || 4.35;
        const noise = Math.sin(flickerTime * 3.5 + idx * 2.1) * 0.45 + Math.cos(flickerTime * 7.2) * 0.25;
        light.intensity = base + noise;
      });
    } else {
      cafeBundle.update(timeNow);
    }

    // 6. Shatter Debris Physics
    for (let i = activeShatterDebris.length - 1; i >= 0; i--) {
      const d = activeShatterDebris[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        scene.remove(d.mesh);
        activeShatterDebris.splice(i, 1);
        continue;
      }

      d.vel.y -= (d.isSpark ? 4.5 : 9.8) * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;

      if (!d.isSpark && d.mesh.position.y < BOARD_SURFACE_Y + 0.015) {
        d.mesh.position.y = BOARD_SURFACE_Y + 0.015;
        d.vel.y = -d.vel.y * 0.45;
        d.vel.x *= 0.75;
        d.vel.z *= 0.75;
      }

      const fade = 1 - d.life / d.maxLife;
      if (Array.isArray(d.mesh.material)) {
        d.mesh.material.forEach((m: any) => (m.opacity = fade));
      } else if (d.mesh.material) {
        (d.mesh.material as any).opacity = fade;
        d.mesh.material.transparent = true;
      }
    }

    if (selectedRing.visible) {
      const pulse = 1.0 + Math.sin(timeNow * 0.006) * 0.08;
      selectedRing.scale.set(pulse, pulse, 1);
    }
    if (checkRing.visible) {
      const checkPulse = 1.0 + Math.sin(timeNow * 0.01) * 0.12;
      checkRing.scale.set(checkPulse, checkPulse, 1);
    }

    renderer.render(scene, camera);
  }

  animateLoop();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  updateTurnUI();
  updateEnvironmentUI();

  // Expose API on window
  const wizardChess = {
    setCameraPreset,
    toggleUI,
    switchGameType,
    setEnvironment,
    toggleEnvironment,
    getCurrentEnvironment: () => currentEnvironment,
    resetGame: resetCurrentGame,
    triggerAIMove: triggerAIMoveWithDelay,
    getCurrentGameType: () => currentGameType
  };

  (window as unknown as { wizardChess: typeof wizardChess }).wizardChess = wizardChess;
}
