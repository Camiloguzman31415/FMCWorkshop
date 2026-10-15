// app.js - FMCWorkshop Main Application

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const scrambleInput = document.getElementById('scramble-input');
  const inverseScrambleBox = document.getElementById('inverse-scramble-box');
  const inverseScrambleBanner = document.getElementById('inverse-scramble-banner');
  const inverseScrambleDisplay = document.getElementById('inverse-scramble-display');
  const btnToggleInverse = document.getElementById('btn-toggle-inverse');
  const toggleInverseText = document.getElementById('toggle-inverse-text');
  const toggleInverseIcon = document.getElementById('toggle-inverse-icon');
  const settingShowInverse = document.getElementById('setting-show-inverse');
  const movesInput = document.getElementById('moves-input');
  const resultDisplay = document.getElementById('result-display');
  const ftmCount = document.getElementById('ftm-count');
  const titleInput = document.getElementById('title-input');

  const scrubber = document.getElementById('scrubber');
  const moveProgress = document.getElementById('move-progress');
  const currentMoveLabel = document.getElementById('current-move-label');

  const btnFirst = document.getElementById('btn-first');
  const btnPrev = document.getElementById('btn-prev');
  const btnPlay = document.getElementById('btn-play');
  const btnNext = document.getElementById('btn-next');
  const btnLast = document.getElementById('btn-last');

  const btnReset = document.getElementById('btn-reset');
  const btnRandom = document.getElementById('btn-random');
  const btnRemoveComments = document.getElementById('btn-remove-comments');
  const btnCopySolution = document.getElementById('btn-copy-solution') || document.getElementById('btn-copy-state');
  const btnCopyShare = document.getElementById('btn-copy-share');
  const btnInvert = document.getElementById('btn-invert');
  const btnNewRecon = document.getElementById('btn-new-recon');
  const btnDonate = document.getElementById('btn-donate');
  const btnLoadExample = document.getElementById('btn-load-example');

  const highlightSelect = document.getElementById('highlight-select');
  const statusBadge = document.getElementById('status-badge');
  const eoBadge = document.getElementById('eo-badge');

  // Modals
  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const donateModal = document.getElementById('donate-modal');
  const closeSettings = document.getElementById('close-settings');
  const closeDonate = document.getElementById('close-donate');
  const animSpeedSelect = document.getElementById('anim-speed');
  const perspectiveModeSelect = document.getElementById('perspective-mode');
  const btnResetCamera = document.getElementById('btn-reset-camera');
  const btnResetView = document.getElementById('btn-reset-view');
  const fontSelect = document.getElementById('font-select');
  const modalFontSelect = document.getElementById('modal-font-select');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // --- 3D Scene Initialization ---
  const canvasContainer = document.getElementById('canvas-container');
  const canvas = document.getElementById('cube-canvas');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18191c);

  const camera = new THREE.PerspectiveCamera(40, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 100);
  const defaultCameraPos = new THREE.Vector3(4.45, 3.88, 5.38);
  camera.position.copy(defaultCameraPos);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3.2;
  controls.maxDistance = 18;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.75);
  dirLight1.position.set(6, 9, 8);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.45);
  dirLight2.position.set(-6, -7, -8);
  scene.add(dirLight2);

  const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.25);
  dirLight3.position.set(-5, 6, -5);
  scene.add(dirLight3);

  // Auto-resize scramble textarea to fit content with no dead space
  function autoResizeScramble() {
    if (!scrambleInput) return;
    const currentScrollY = window.scrollY;
    scrambleInput.style.height = 'auto';
    scrambleInput.style.height = Math.max(48, scrambleInput.scrollHeight + 2) + 'px';
    if (window.scrollY !== currentScrollY) {
      window.scrollTo(window.scrollX, currentScrollY);
    }
  }

  // Auto-resize moves textarea to fit content dynamically, preserving standard initial height
  const DEFAULT_MOVES_HEIGHT = 140;
  function autoResizeMoves() {
    if (!movesInput) return;
    const currentScrollY = window.scrollY;
    movesInput.style.height = 'auto';
    movesInput.style.height = Math.max(DEFAULT_MOVES_HEIGHT, movesInput.scrollHeight + 2) + 'px';
    if (window.scrollY !== currentScrollY) {
      window.scrollTo(window.scrollX, currentScrollY);
    }
  }

  // Resize handler
  function onResize() {
    if (!canvasContainer) return;
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    autoResizeScramble();
    autoResizeMoves();
  }
  window.addEventListener('resize', onResize);
  if (typeof ResizeObserver !== 'undefined' && canvasContainer) {
    const ro = new ResizeObserver(() => onResize());
    ro.observe(canvasContainer);
  }

  // --- Rubik's Cube 3D Geometry ---
  const cubeRootGroup = new THREE.Group();
  scene.add(cubeRootGroup);

  // Colors
  const COLOR_PALETTE = {
    0: 0xffffff, // U: White
    1: 0xc41e3a, // R: Red
    2: 0x009b48, // F: Green
    3: 0xffd500, // D: Yellow
    4: 0xff5800, // L: Orange
    5: 0x0046ad  // B: Blue
  };

  const DIMMED_COLOR = 0x2e3038;
  const HIGHLIGHT_BAD_COLOR = 0xff1744; // Neon Red for bad EO
  const HIGHLIGHT_GOOD_COLOR = 0x00e676; // Bright Green for good EO/DR

  // 54 Stickers Mapping Table to 3D Coordinates & Normals
  // [faceletIndex] -> { x, y, z, normal: 'U'|'D'|'R'|'L'|'F'|'B', cubieKey }
  const FACELET_MAP = [
    // U Face (0..8), y = +1, normal: +Y
    { x: -1, y: 1, z: -1, normal: 'U' }, // 0: ULB
    { x:  0, y: 1, z: -1, normal: 'U' }, // 1: UB
    { x:  1, y: 1, z: -1, normal: 'U' }, // 2: URB
    { x: -1, y: 1, z:  0, normal: 'U' }, // 3: UL
    { x:  0, y: 1, z:  0, normal: 'U' }, // 4: U center
    { x:  1, y: 1, z:  0, normal: 'U' }, // 5: UR
    { x: -1, y: 1, z:  1, normal: 'U' }, // 6: ULF
    { x:  0, y: 1, z:  1, normal: 'U' }, // 7: UF
    { x:  1, y: 1, z:  1, normal: 'U' }, // 8: URF

    // R Face (9..17), x = +1, normal: +X
    { x: 1, y:  1, z:  1, normal: 'R' }, // 9: RFU
    { x: 1, y:  1, z:  0, normal: 'R' }, // 10: RU
    { x: 1, y:  1, z: -1, normal: 'R' }, // 11: RBU
    { x: 1, y:  0, z:  1, normal: 'R' }, // 12: RF
    { x: 1, y:  0, z:  0, normal: 'R' }, // 13: R center
    { x: 1, y:  0, z: -1, normal: 'R' }, // 14: RB
    { x: 1, y: -1, z:  1, normal: 'R' }, // 15: RFD
    { x: 1, y: -1, z:  0, normal: 'R' }, // 16: RD
    { x: 1, y: -1, z: -1, normal: 'R' }, // 17: RBD

    // F Face (18..26), z = +1, normal: +Z
    { x: -1, y:  1, z: 1, normal: 'F' }, // 18: FLU
    { x:  0, y:  1, z: 1, normal: 'F' }, // 19: FU
    { x:  1, y:  1, z: 1, normal: 'F' }, // 20: FRU
    { x: -1, y:  0, z: 1, normal: 'F' }, // 21: FL
    { x:  0, y:  0, z: 1, normal: 'F' }, // 22: F center
    { x:  1, y:  0, z: 1, normal: 'F' }, // 23: FR
    { x: -1, y: -1, z: 1, normal: 'F' }, // 24: FLD
    { x:  0, y: -1, z: 1, normal: 'F' }, // 25: FD
    { x:  1, y: -1, z: 1, normal: 'F' }, // 26: FRD

    // D Face (27..35), y = -1, normal: -Y
    { x: -1, y: -1, z:  1, normal: 'D' }, // 27: DLF
    { x:  0, y: -1, z:  1, normal: 'D' }, // 28: DF
    { x:  1, y: -1, z:  1, normal: 'D' }, // 29: DRF
    { x: -1, y: -1, z:  0, normal: 'D' }, // 30: DL
    { x:  0, y: -1, z:  0, normal: 'D' }, // 31: D center
    { x:  1, y: -1, z:  0, normal: 'D' }, // 32: DR
    { x: -1, y: -1, z: -1, normal: 'D' }, // 33: DLB
    { x:  0, y: -1, z: -1, normal: 'D' }, // 34: DB
    { x:  1, y: -1, z: -1, normal: 'D' }, // 35: DRB

    // L Face (36..44), x = -1, normal: -X
    { x: -1, y:  1, z: -1, normal: 'L' }, // 36: LBU
    { x: -1, y:  1, z:  0, normal: 'L' }, // 37: LU
    { x: -1, y:  1, z:  1, normal: 'L' }, // 38: LFU
    { x: -1, y:  0, z: -1, normal: 'L' }, // 39: LB
    { x: -1, y:  0, z:  0, normal: 'L' }, // 40: L center
    { x: -1, y:  0, z:  1, normal: 'L' }, // 41: LF
    { x: -1, y: -1, z: -1, normal: 'L' }, // 42: LBD
    { x: -1, y: -1, z:  0, normal: 'L' }, // 43: LD
    { x: -1, y: -1, z:  1, normal: 'L' }, // 44: LFD

    // B Face (45..53), z = -1, normal: -Z
    { x:  1, y:  1, z: -1, normal: 'B' }, // 45: BRU
    { x:  0, y:  1, z: -1, normal: 'B' }, // 46: BU
    { x: -1, y:  1, z: -1, normal: 'B' }, // 47: BLU
    { x:  1, y:  0, z: -1, normal: 'B' }, // 48: BR
    { x:  0, y:  0, z: -1, normal: 'B' }, // 49: B center
    { x: -1, y:  0, z: -1, normal: 'B' }, // 50: BL
    { x:  1, y: -1, z: -1, normal: 'B' }, // 51: BRD
    { x:  0, y: -1, z: -1, normal: 'B' }, // 52: BD
    { x: -1, y: -1, z: -1, normal: 'B' }  // 53: BLD
  ];

  // Build the 26 cubies and 54 sticker meshes
  const cubies = [];
  const stickerMeshes = []; // index 0..53

  const CUBIE_SIZE = 0.96;
  const STICKER_SIZE = 0.85;
  const STICKER_OFFSET = 0.485;

  const cubieGeom = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
  const cubieMat = new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.4,
    metalness: 0.1
  });

  const stickerGeom = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);

  // Create 26 cubie meshes
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue; // Skip inner center

        const cubie = new THREE.Mesh(cubieGeom, cubieMat);
        cubie.position.set(x, y, z);
        cubie.userData = { origX: x, origY: y, origZ: z };
        cubeRootGroup.add(cubie);
        cubies.push(cubie);
      }
    }
  }

  // Create 54 sticker meshes attached directly to their respective cubie
  for (let i = 0; i < 54; i++) {
    const f = FACELET_MAP[i];
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.05
    });

    const sticker = new THREE.Mesh(stickerGeom, mat);

    // Find the parent cubie at (f.x, f.y, f.z)
    const cubie = cubies.find(c => c.userData.origX === f.x && c.userData.origY === f.y && c.userData.origZ === f.z);

    if (f.normal === 'U') {
      sticker.position.set(0, STICKER_OFFSET, 0);
      sticker.rotation.x = -Math.PI / 2;
    } else if (f.normal === 'D') {
      sticker.position.set(0, -STICKER_OFFSET, 0);
      sticker.rotation.x = Math.PI / 2;
    } else if (f.normal === 'R') {
      sticker.position.set(STICKER_OFFSET, 0, 0);
      sticker.rotation.y = Math.PI / 2;
    } else if (f.normal === 'L') {
      sticker.position.set(-STICKER_OFFSET, 0, 0);
      sticker.rotation.y = -Math.PI / 2;
    } else if (f.normal === 'F') {
      sticker.position.set(0, 0, STICKER_OFFSET);
      sticker.rotation.y = 0;
    } else if (f.normal === 'B') {
      sticker.position.set(0, 0, -STICKER_OFFSET);
      sticker.rotation.y = Math.PI;
    }

    sticker.userData = { faceletIndex: i, ...f };
    cubie.add(sticker);
    stickerMeshes.push(sticker);
  }

  // --- Animation / Render Loop ---
  function render() {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  }
  render();

  // --- App State ---
  let scrambleMoves = [];
  let parsedSolution = {
    normalMoves: [],
    inverseMoves: [],
    invertedInverse: [],
    finalMoves: [],
    finalResultStr: '',
    ftm: 0,
    timeline: []
  };

  let currentStep = 0; // 0 = scramble only, 1..totalMoves
  let isPlaying = false;
  let playInterval = null;
  let animDuration = 260; // ms
  let isAnimating = false;

  // Active mathematical cube
  const currentCube = new FMC.CubeModel();
  let isCurrentStateNiss = false;

  // --- Render 3D Cube Colors based on current mathematical state and highlight mode ---
  function updateCubeVisuals() {
    const state = currentCube.state;
    const mode = highlightSelect.value;

    // Check EO / DR for highlighting info
    const eoFB = FMC.checkEO(state, 'FB');
    const eoRL = FMC.checkEO(state, 'RL');
    const eoUD = FMC.checkEO(state, 'UD');
    const drUD = FMC.checkDR(state, 'FB');

    // Update EO badge based on active highlight mode, or display all 3 axes in Full mode
    if (mode === 'EO_RL') {
      if (eoRL.isSolved) {
        eoBadge.textContent = 'EO (R/L): Solved (0 bad)';
        eoBadge.className = 'badge badge-info';
      } else {
        eoBadge.textContent = `EO (R/L): ${eoRL.badCount} Bad Edges`;
        eoBadge.className = 'badge badge-warn';
      }
      eoBadge.title = 'Eje R/L activo. Haz clic para cambiar de eje.';
    } else if (mode === 'EO_UD') {
      if (eoUD.isSolved) {
        eoBadge.textContent = 'EO (U/D): Solved (0 bad)';
        eoBadge.className = 'badge badge-info';
      } else {
        eoBadge.textContent = `EO (U/D): ${eoUD.badCount} Bad Edges`;
        eoBadge.className = 'badge badge-warn';
      }
      eoBadge.title = 'Eje U/D activo. Haz clic para cambiar de eje.';
    } else if (mode === 'EO_FB') {
      if (eoFB.isSolved) {
        eoBadge.textContent = 'EO (F/B): Solved (0 bad)';
        eoBadge.className = 'badge badge-info';
      } else {
        eoBadge.textContent = `EO (F/B): ${eoFB.badCount} Bad Edges`;
        eoBadge.className = 'badge badge-warn';
      }
      eoBadge.title = 'Eje F/B activo. Haz clic para cambiar de eje.';
    } else {
      // In Full / general mode, show the overview across all 3 axes
      const fbText = eoFB.isSolved ? '0✓' : `${eoFB.badCount}`;
      const rlText = eoRL.isSolved ? '0✓' : `${eoRL.badCount}`;
      const udText = eoUD.isSolved ? '0✓' : `${eoUD.badCount}`;
      eoBadge.textContent = `EO: F/B (${fbText}) • R/L (${rlText}) • U/D (${udText})`;
      eoBadge.className = (eoFB.isSolved || eoRL.isSolved || eoUD.isSolved) ? 'badge badge-info' : 'badge badge-warn';
      eoBadge.title = 'Orientación en los 3 ejes. Haz clic para alternar el resaltado entre F/B, R/L y U/D.';
    }

    if (currentCube.isSolved()) {
      statusBadge.textContent = 'Solved!';
      statusBadge.className = 'badge badge-info';
    } else if (isCurrentStateNiss) {
      statusBadge.textContent = 'NISS (Inverse)';
      statusBadge.className = 'badge badge-niss';
    } else if (drUD.isDR) {
      statusBadge.textContent = 'DR Solved!';
      statusBadge.className = 'badge badge-info';
    } else if (mode.startsWith('DR')) {
      statusBadge.textContent = `DR: C ${drUD.cornersOriented}/8, E ${drUD.eSliceEdgesInSlice}/4`;
      statusBadge.className = 'badge badge-warn';
    } else {
      statusBadge.textContent = '3x3';
      statusBadge.className = 'badge badge-normal';
    }

    // Set sticker colors
    for (let i = 0; i < 54; i++) {
      const colorVal = state[i];
      let hex = COLOR_PALETTE[colorVal];
      let isDimmed = false;
      let isBadEdge = false;

      // Identify if facelet i belongs to an edge, corner, or center
      const edge = FMC.EDGES.find(e => e.f1 === i || e.f2 === i);
      const corner = FMC.CORNERS.find(c => c.fU === i || c.fFB === i || c.fLR === i);
      const isCenter = (i % 9 === 4);

      if (mode === 'Full') {
        // Normal vibrant colors
      } else if (mode === 'EO_FB') {
        if (edge) {
          if (eoFB.badEdges.some(be => be.name === edge.name)) {
            hex = HIGHLIGHT_BAD_COLOR;
          } else if (eoFB.isSolved) {
            hex = HIGHLIGHT_GOOD_COLOR;
          } else {
            isDimmed = true;
          }
        } else {
          isDimmed = true;
        }
      } else if (mode === 'EO_RL') {
        if (edge) {
          if (eoRL.badEdges.some(be => be.name === edge.name)) {
            hex = HIGHLIGHT_BAD_COLOR;
          } else if (eoRL.isSolved) {
            hex = HIGHLIGHT_GOOD_COLOR;
          } else {
            isDimmed = true;
          }
        } else {
          isDimmed = true;
        }
      } else if (mode === 'EO_UD') {
        if (edge) {
          if (eoUD.badEdges.some(be => be.name === edge.name)) {
            hex = HIGHLIGHT_BAD_COLOR;
          } else if (eoUD.isSolved) {
            hex = HIGHLIGHT_GOOD_COLOR;
          } else {
            isDimmed = true;
          }
        } else {
          isDimmed = true;
        }
      } else if (mode === 'DR_UD') {
        if (edge) {
          if (drUD.badEdges.some(be => be.name === edge.name)) {
            hex = HIGHLIGHT_BAD_COLOR;
          } else if (drUD.isDR) {
            hex = HIGHLIGHT_GOOD_COLOR;
          } else {
            isDimmed = true;
          }
        } else if (corner) {
          if (drUD.badCorners.some(bc => bc.name === corner.name)) {
            hex = HIGHLIGHT_BAD_COLOR;
          } else if (drUD.isDR) {
            hex = HIGHLIGHT_GOOD_COLOR;
          } else {
            isDimmed = true;
          }
        } else {
          isDimmed = true;
        }
      } else if (mode === 'Corners') {
        if (!corner) isDimmed = true;
      } else if (mode === 'Edges') {
        if (!edge) isDimmed = true;
      }

      const sticker = stickerMeshes[i];
      if (isDimmed) {
        sticker.material.color.setHex(DIMMED_COLOR);
      } else {
        sticker.material.color.setHex(hex);
      }
    }
  }

  // --- Calculate Cube State at Step k ---
  function computeStateAtStep(step) {
    const cube = new FMC.CubeModel();

    // 1. Apply Scramble
    const scrambleStr = scrambleInput.value.trim();
    if (scrambleStr) {
      cube.applyAlg(scrambleStr);
    }

    // 2. Apply moves up to step
    const moves = parsedSolution.finalMoves;
    for (let i = 0; i < step && i < moves.length; i++) {
      cube.applyMove(moves[i]);
    }

    return cube;
  }

  // --- Reset All Cubies to Base Positions and Rotations ---
  function resetCubieTransforms() {
    if (activePivot) {
      while (activePivot.children.length > 0) {
        const child = activePivot.children[0];
        cubeRootGroup.attach(child);
      }
      cubeRootGroup.remove(activePivot);
      activePivot = null;
    }

    cubies.forEach(c => {
      if (c.parent !== cubeRootGroup) {
        cubeRootGroup.attach(c);
      }
      c.position.set(c.userData.origX, c.userData.origY, c.userData.origZ);
      c.rotation.set(0, 0, 0);
      c.scale.set(1, 1, 1);
      c.updateMatrix();
    });
  }

  // --- Smooth 3D Layer Turn Animation ---
  let activePivot = null;

  function animateMove(moveStr, onComplete) {
    if (isAnimating) {
      if (onComplete) onComplete();
      return;
    }
    if (!moveStr) {
      if (onComplete) onComplete();
      return;
    }

    resetCubieTransforms();
    isAnimating = true;

    let base = moveStr[0];
    let modifier = moveStr.slice(1);
    if (moveStr.length >= 2 && (moveStr[1] === 'w' || moveStr[1] === 'W')) {
      base = moveStr.slice(0, 2);
      modifier = moveStr.slice(2);
    }

    let axis = 'y';
    let baseAngle = -Math.PI / 2;
    let filter = () => false;

    switch (base) {
      case 'U':
        axis = 'y'; baseAngle = -Math.PI / 2;
        filter = (c) => c.position.y > 0.5;
        break;
      case 'D':
        axis = 'y'; baseAngle = Math.PI / 2;
        filter = (c) => c.position.y < -0.5;
        break;
      case 'R':
        axis = 'x'; baseAngle = -Math.PI / 2;
        filter = (c) => c.position.x > 0.5;
        break;
      case 'L':
        axis = 'x'; baseAngle = Math.PI / 2;
        filter = (c) => c.position.x < -0.5;
        break;
      case 'F':
        axis = 'z'; baseAngle = -Math.PI / 2;
        filter = (c) => c.position.z > 0.5;
        break;
      case 'B':
        axis = 'z'; baseAngle = Math.PI / 2;
        filter = (c) => c.position.z < -0.5;
        break;
      case 'M':
        axis = 'x'; baseAngle = Math.PI / 2;
        filter = (c) => Math.abs(c.position.x) < 0.5;
        break;
      case 'E':
        axis = 'y'; baseAngle = Math.PI / 2;
        filter = (c) => Math.abs(c.position.y) < 0.5;
        break;
      case 'S':
        axis = 'z'; baseAngle = -Math.PI / 2;
        filter = (c) => Math.abs(c.position.z) < 0.5;
        break;
      case 'u': case 'Uw':
        axis = 'y'; baseAngle = -Math.PI / 2;
        filter = (c) => c.position.y > -0.5;
        break;
      case 'd': case 'Dw':
        axis = 'y'; baseAngle = Math.PI / 2;
        filter = (c) => c.position.y < 0.5;
        break;
      case 'r': case 'Rw':
        axis = 'x'; baseAngle = -Math.PI / 2;
        filter = (c) => c.position.x > -0.5;
        break;
      case 'l': case 'Lw':
        axis = 'x'; baseAngle = Math.PI / 2;
        filter = (c) => c.position.x < 0.5;
        break;
      case 'f': case 'Fw':
        axis = 'z'; baseAngle = -Math.PI / 2;
        filter = (c) => c.position.z > -0.5;
        break;
      case 'b': case 'Bw':
        axis = 'z'; baseAngle = Math.PI / 2;
        filter = (c) => c.position.z < 0.5;
        break;
      default:
        isAnimating = false;
        if (onComplete) onComplete();
        return;
    }

    let angle = baseAngle;
    if (modifier === '2' || modifier === "2'") {
      angle = baseAngle * 2;
    } else if (modifier === "'") {
      angle = -baseAngle;
    }

    const sliceCubies = cubies.filter(filter);
    if (sliceCubies.length === 0) {
      isAnimating = false;
      if (onComplete) onComplete();
      return;
    }

    const pivot = new THREE.Group();
    cubeRootGroup.add(pivot);
    activePivot = pivot;

    sliceCubies.forEach(c => pivot.attach(c));

    const duration = Math.max(120, parseInt(animSpeedSelect.value, 10) || 280);
    const startTime = performance.now();

    function stepAnim(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth sinusoidal easing
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);

      pivot.rotation[axis] = angle * ease;

      if (progress < 1) {
        requestAnimationFrame(stepAnim);
      } else {
        pivot.rotation[axis] = angle;
        pivot.updateMatrixWorld(true);

        sliceCubies.forEach(c => cubeRootGroup.attach(c));
        cubeRootGroup.remove(pivot);
        activePivot = null;
        isAnimating = false;

        resetCubieTransforms();
        if (onComplete) onComplete();
      }
    }

    requestAnimationFrame(stepAnim);
  }

  function setStep(step, animate = false) {
    const totalMoves = parsedSolution.finalMoves.length;
    step = Math.max(0, Math.min(step, totalMoves));

    if (animate && step !== currentStep && !isAnimating) {
      if (step === currentStep + 1) {
        const move = parsedSolution.finalMoves[currentStep];
        animateMove(move, () => {
          setStep(step, false);
        });
        return;
      } else if (step === currentStep - 1) {
        const move = FMC.invertMove(parsedSolution.finalMoves[step]);
        animateMove(move, () => {
          setStep(step, false);
        });
        return;
      }
    }

    resetCubieTransforms();
    currentStep = step;
    isCurrentStateNiss = false;

    scrubber.max = totalMoves;
    scrubber.value = step;
    moveProgress.textContent = `${step} / ${totalMoves}`;

    if (step === 0) {
      currentMoveLabel.textContent = totalMoves > 0 ? 'Scramble' : 'Solved';
    } else {
      const currentMove = parsedSolution.finalMoves[step - 1];
      currentMoveLabel.textContent = `Move ${step}: ${currentMove}`;
    }

    document.querySelectorAll('.move-token').forEach((el, idx) => {
      if (idx === step - 1) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        el.classList.remove('active');
      }
    });

    const stateAtStep = computeStateAtStep(step);
    currentCube.state.set(stateAtStep.state);
    updateCubeVisuals();
  }

  // --- Player Controls ---
  function stepForward() {
    if (isAnimating) return;
    if (currentStep < parsedSolution.finalMoves.length) {
      setStep(currentStep + 1, true);
    } else {
      pausePlayback();
    }
  }

  function stepBackward() {
    if (isAnimating) return;
    if (currentStep > 0) {
      setStep(currentStep - 1, true);
    }
  }

  let playTimeout = null;

  function runPlaybackStep() {
    if (!isPlaying) return;
    if (currentStep >= parsedSolution.finalMoves.length) {
      pausePlayback();
      return;
    }

    const nextMove = parsedSolution.finalMoves[currentStep];
    const targetStep = currentStep + 1;

    animateMove(nextMove, () => {
      setStep(targetStep, false);
      if (isPlaying && currentStep < parsedSolution.finalMoves.length) {
        playTimeout = setTimeout(runPlaybackStep, 70);
      } else {
        pausePlayback();
      }
    });
  }

  function startPlayback() {
    if (parsedSolution.finalMoves.length === 0) return;
    if (currentStep >= parsedSolution.finalMoves.length) {
      setStep(0, false);
    }
    isPlaying = true;
    updatePlayBtnIcon();
    runPlaybackStep();
  }

  function pausePlayback() {
    isPlaying = false;
    updatePlayBtnIcon();
    if (playTimeout) {
      clearTimeout(playTimeout);
      playTimeout = null;
    }
  }

  function togglePlayback() {
    if (isPlaying) pausePlayback();
    else startPlayback();
  }

  function updatePlayBtnIcon() {
    if (isPlaying) {
      btnPlay.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      `;
      btnPlay.title = 'Pause (Space)';
    } else {
      btnPlay.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
      btnPlay.title = 'Play (Space)';
    }
  }

  // Playback Button Listeners
  btnFirst.addEventListener('click', () => { pausePlayback(); setStep(0); });
  btnPrev.addEventListener('click', () => { pausePlayback(); stepBackward(); });
  btnPlay.addEventListener('click', togglePlayback);
  btnNext.addEventListener('click', () => { pausePlayback(); stepForward(); });
  btnLast.addEventListener('click', () => { pausePlayback(); setStep(parsedSolution.finalMoves.length); });

  scrubber.addEventListener('input', (e) => {
    pausePlayback();
    setStep(parseInt(e.target.value, 10));
  });

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    // Avoid triggering when user is typing in textarea or input
    if (['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayback();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      pausePlayback();
      stepForward();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      pausePlayback();
      stepBackward();
    } else if (e.code === 'Home') {
      e.preventDefault();
      pausePlayback();
      setStep(0);
    } else if (e.code === 'End') {
      e.preventDefault();
      pausePlayback();
      setStep(parsedSolution.finalMoves.length);
    }
  });

  // --- Recalculate FMC inputs, Inverse Scramble & Result ---
  function updateSolution() {
    const rawScramble = scrambleInput.value.trim();
    const rawMoves = movesInput.value;

    // 1. Calculate Inverse Scramble
    if (rawScramble) {
      const inv = FMC.invertAlg(rawScramble);
      inverseScrambleDisplay.textContent = inv;
      inverseScrambleDisplay.classList.remove('empty');
    } else {
      inverseScrambleDisplay.textContent = 'Scramble Inverse';
      inverseScrambleDisplay.classList.add('empty');
    }

    // 2. Parse FMC Moves (Comments, Insertions, NISS)
    parsedSolution = FMC.parseFMCSolution(rawMoves);

    // 3. Render Final Result display
    if (parsedSolution.finalMoves.length > 0) {
      ftmCount.textContent = `${parsedSolution.ftm}FTM`;
      resultDisplay.classList.remove('empty');
      resultDisplay.innerHTML = '';

      parsedSolution.finalMoves.forEach((move, idx) => {
        const span = document.createElement('span');
        span.className = 'move-token';
        span.textContent = move;
        span.dataset.step = idx + 1;
        span.addEventListener('click', () => {
          pausePlayback();
          setStep(idx + 1);
        });
        resultDisplay.appendChild(span);
        resultDisplay.appendChild(document.createTextNode(' '));
      });
    } else {
      ftmCount.textContent = '0FTM';
      resultDisplay.textContent = 'Final Result';
      resultDisplay.classList.add('empty');
    }

    // Auto-adjust textarea heights
    autoResizeScramble();
    autoResizeMoves();

    // Reset or clamp current step
    setStep(currentStep);
  }

  // --- Update Cube State from Cursor Position in Moves Textarea ---
  function updateCubeFromCursor() {
    const rawMoves = movesInput.value;
    const cursorPos = movesInput.selectionStart;
    const cursorInfo = FMC.parseFMCAtCursor(rawMoves, cursorPos);
    const rawScramble = scrambleInput.value.trim();

    const cube = new FMC.CubeModel();

    isCurrentStateNiss = cursorInfo.isCurrentlyInverse;

    if (cursorInfo.isCurrentlyInverse) {
      // User is inside ( ... ) on INVERSE SCRAMBLE (NISS)
      const invNormal = FMC.invertAlg(cursorInfo.normalMoves.join(' '));
      const invScramble = FMC.invertAlg(rawScramble);

      // Inverted moves + scramble as per NISS standard (invNormal then invScramble)
      if (invNormal) cube.applyAlg(invNormal);
      if (invScramble) cube.applyAlg(invScramble);

      if (cursorInfo.inverseMoves.length > 0) {
        cube.applyAlg(cursorInfo.inverseMoves.join(' '));
      }
    } else {
      // User is on NORMAL SCRAMBLE
      // Inverted inverse moves act as a PRE-SCRAMBLE to the normal scramble!
      const invInverse = FMC.invertAlg(cursorInfo.inverseMoves.join(' '));
      if (invInverse) cube.applyAlg(invInverse);
      if (rawScramble) cube.applyAlg(rawScramble);
      if (cursorInfo.normalMoves.length > 0) {
        cube.applyAlg(cursorInfo.normalMoves.join(' '));
      }
    }

    currentCube.state.set(cube.state);
    updateCubeVisuals();

    const totalMoves = parsedSolution.finalMoves.length;
    const step = Math.min(cursorInfo.totalStep, totalMoves);
    currentStep = step;
    scrubber.max = totalMoves;
    scrubber.value = step;
    moveProgress.textContent = `${step} / ${totalMoves}`;

    if (cursorInfo.lastMove) {
      currentMoveLabel.textContent = `Move ${step}: ${cursorInfo.lastMove.move}${cursorInfo.isCurrentlyInverse ? ' (NISS)' : ''}`;
    } else {
      currentMoveLabel.textContent = cursorInfo.isCurrentlyInverse ? 'Inverse Scramble' : 'Scramble';
    }

    // Highlight token in Result display
    document.querySelectorAll('.move-token').forEach((el, idx) => {
      if (idx === step - 1) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        el.classList.remove('active');
      }
    });
  }

  // Input Event Listeners
  scrambleInput.addEventListener('input', () => {
    updateSolution();
    updateCubeFromCursor();
  });

  movesInput.addEventListener('input', () => {
    autoResizeMoves();
    updateSolution();
    updateCubeFromCursor();
  });

  // Click on movesInput updates cube state to that specific move!
  movesInput.addEventListener('click', () => {
    pausePlayback();
    updateCubeFromCursor();
  });

  // Moving cursor with keyboard arrows/home/end updates cube state
  movesInput.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.code)) {
      pausePlayback();
      updateCubeFromCursor();
    }
  });

  movesInput.addEventListener('select', () => {
    pausePlayback();
    updateCubeFromCursor();
  });

  highlightSelect.addEventListener('change', () => {
    updateCubeVisuals();
  });

  // Click on EO badge cycles through EO axes (FB -> RL -> UD -> Full)
  eoBadge.addEventListener('click', () => {
    if (highlightSelect.value === 'EO_FB') {
      highlightSelect.value = 'EO_RL';
    } else if (highlightSelect.value === 'EO_RL') {
      highlightSelect.value = 'EO_UD';
    } else if (highlightSelect.value === 'EO_UD') {
      highlightSelect.value = 'Full';
    } else {
      highlightSelect.value = 'EO_FB';
    }
    updateCubeVisuals();
  });

  // --- Toggle Inverse Scramble Visibility ---
  const SVG_EYE_OPEN = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
  const SVG_EYE_SLASH = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>';

  let isInverseHidden = (localStorage.getItem('fmc_hide_inverse') === 'true');

  function setInverseHidden(hidden) {
    isInverseHidden = hidden;
    localStorage.setItem('fmc_hide_inverse', isInverseHidden ? 'true' : 'false');

    if (isInverseHidden) {
      inverseScrambleDisplay.style.display = 'none';
      if (toggleInverseText) toggleInverseText.textContent = 'Mostrar';
      if (toggleInverseIcon) toggleInverseIcon.innerHTML = SVG_EYE_OPEN;
      if (btnToggleInverse) btnToggleInverse.title = 'Mostrar Inverse Scramble';
      if (settingShowInverse) settingShowInverse.checked = false;
    } else {
      inverseScrambleDisplay.style.display = '';
      if (toggleInverseText) toggleInverseText.textContent = 'Ocultar';
      if (toggleInverseIcon) toggleInverseIcon.innerHTML = SVG_EYE_SLASH;
      if (btnToggleInverse) btnToggleInverse.title = 'Ocultar Inverse Scramble';
      if (settingShowInverse) settingShowInverse.checked = true;
    }
  }

  if (btnToggleInverse) {
    btnToggleInverse.addEventListener('click', (e) => {
      e.stopPropagation();
      setInverseHidden(!isInverseHidden);
    });
  }

  if (inverseScrambleBanner) {
    inverseScrambleBanner.style.cursor = 'pointer';
    inverseScrambleBanner.addEventListener('click', () => {
      setInverseHidden(!isInverseHidden);
    });
  }

  if (settingShowInverse) {
    settingShowInverse.addEventListener('change', () => {
      setInverseHidden(!settingShowInverse.checked);
    });
  }

  // Set initial state
  setInverseHidden(isInverseHidden);

  // Click on Inverse Scramble box copies it
  inverseScrambleDisplay.addEventListener('click', () => {
    const text = inverseScrambleDisplay.textContent;
    if (text && text !== 'Scramble Inverse') {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Inverse scramble copied!');
      });
    }
  });

  // Click on Result box copies full result
  resultDisplay.addEventListener('click', (e) => {
    if (e.target.classList.contains('move-token')) return; // handled by token
    const text = parsedSolution.finalResultStr;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Final result copied!');
      });
    }
  });

  // --- FMC Timer & Stopwatch Logic ---
  const fmcTimerWidget = document.getElementById('fmc-timer-widget');
  const timerDisplay = document.getElementById('timer-display');
  const btnTimerStart = document.getElementById('btn-timer-start');
  const timerStartIcon = document.getElementById('timer-start-icon');
  const btnTimerReset = document.getElementById('btn-timer-reset');
  const btnTimerMode = document.getElementById('btn-timer-mode');
  const timerModeLabel = document.getElementById('timer-mode-label');

  const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
  const ICON_PAUSE = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';

  const TIMER_MODES = {
    STOPWATCH: 'STOPWATCH', // count up from 0
    FMC_60: 'FMC_60' // 60 minutes countdown (3600 seconds)
  };

  let timerMode = localStorage.getItem('fmc_timer_mode');
  if (!timerMode || timerMode === 'FMC_60') {
    timerMode = TIMER_MODES.STOPWATCH;
    localStorage.setItem('fmc_timer_mode', TIMER_MODES.STOPWATCH);
  }
  let timerRunning = false;
  let timerInterval = null;
  let timerElapsedSeconds = 0;
  let timerRemainingSeconds = 3600;
  let timerLastTimestamp = null;
  let warned55Min = false;
  let warned60Min = false;

  // Web Audio alert chime for FMC milestones (55m warning & 60m limit)
  function playAlertBeep(type = 'limit') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'warning') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      }
    } catch (e) {
      // AudioContext blocked or not supported
    }
  }

  function formatTime(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    const pad = (n) => (n < 10 ? '0' + n : String(n));
    return pad(minutes) + ':' + pad(seconds);
  }

  function updateTimerUI() {
    if (!timerDisplay) return;

    if (timerMode === TIMER_MODES.FMC_60) {
      if (timerModeLabel) timerModeLabel.textContent = '60m FMC';
      timerDisplay.textContent = formatTime(timerRemainingSeconds);

      // Warning color coding when time is running low
      if (timerRemainingSeconds <= 60) {
        fmcTimerWidget.classList.add('danger');
        fmcTimerWidget.classList.remove('warning');
      } else if (timerRemainingSeconds <= 300) {
        fmcTimerWidget.classList.add('warning');
        fmcTimerWidget.classList.remove('danger');
      } else {
        fmcTimerWidget.classList.remove('warning', 'danger');
      }
    } else {
      if (timerModeLabel) timerModeLabel.textContent = 'Cronómetro';
      timerDisplay.textContent = formatTime(timerElapsedSeconds);

      // Warning color coding when approaching or reaching 60 minutes
      if (timerElapsedSeconds >= 3600) {
        fmcTimerWidget.classList.add('danger');
        fmcTimerWidget.classList.remove('warning');
      } else if (timerElapsedSeconds >= 3300) {
        fmcTimerWidget.classList.add('warning');
        fmcTimerWidget.classList.remove('danger');
      } else {
        fmcTimerWidget.classList.remove('warning', 'danger');
      }
    }

    if (timerRunning) {
      fmcTimerWidget.classList.add('running');
      if (timerStartIcon) timerStartIcon.innerHTML = ICON_PAUSE;
      if (btnTimerStart) btnTimerStart.title = 'Pausar cronómetro';
    } else {
      fmcTimerWidget.classList.remove('running');
      if (timerStartIcon) timerStartIcon.innerHTML = ICON_PLAY;
      if (btnTimerStart) btnTimerStart.title = 'Iniciar cronómetro';
    }
  }

  function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerLastTimestamp = performance.now();

    timerInterval = setInterval(() => {
      const now = performance.now();
      const deltaSec = (now - timerLastTimestamp) / 1000;
      timerLastTimestamp = now;

      if (timerMode === TIMER_MODES.FMC_60) {
        timerRemainingSeconds -= deltaSec;
        if (timerRemainingSeconds <= 0) {
          timerRemainingSeconds = 0;
          pauseTimer();
          playAlertBeep('limit');
          showToast('¡Tiempo FMC finalizado (60 minutos)!');
        }
      } else {
        timerElapsedSeconds += deltaSec;

        // 55 minutes warning (5 min remaining in standard FMC)
        if (timerElapsedSeconds >= 3300 && !warned55Min) {
          warned55Min = true;
          playAlertBeep('warning');
          showToast('¡Aviso FMC: 55 minutos cumplidos (quedan 5 min)!');
        }

        // 60 minutes limit reached: alert user but continue counting
        if (timerElapsedSeconds >= 3600 && !warned60Min) {
          warned60Min = true;
          playAlertBeep('limit');
          showToast('¡Tiempo límite alcanzado: 60 minutos!');
        }
      }
      updateTimerUI();
    }, 200);

    updateTimerUI();
  }

  function pauseTimer() {
    if (!timerRunning) return;
    timerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateTimerUI();
  }

  function toggleTimer() {
    if (timerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function resetTimer() {
    pauseTimer();
    timerElapsedSeconds = 0;
    timerRemainingSeconds = 3600;
    warned55Min = false;
    warned60Min = false;
    updateTimerUI();
    showToast(timerMode === TIMER_MODES.FMC_60 ? 'Cronómetro restablecido a 60:00' : 'Cronómetro restablecido a 00:00');
  }

  function toggleTimerMode() {
    pauseTimer();
    if (timerMode === TIMER_MODES.FMC_60) {
      timerMode = TIMER_MODES.STOPWATCH;
      timerElapsedSeconds = 0;
    } else {
      timerMode = TIMER_MODES.FMC_60;
      timerRemainingSeconds = 3600;
    }
    localStorage.setItem('fmc_timer_mode', timerMode);
    updateTimerUI();
    showToast(timerMode === TIMER_MODES.FMC_60 ? 'Modo: Cuenta atrás FMC (60m)' : 'Modo: Cronómetro libre');
  }

  if (btnTimerStart) btnTimerStart.addEventListener('click', toggleTimer);
  if (btnTimerReset) btnTimerReset.addEventListener('click', resetTimer);
  if (btnTimerMode) btnTimerMode.addEventListener('click', toggleTimerMode);

  if (timerDisplay) {
    timerDisplay.addEventListener('click', toggleTimer);
    timerDisplay.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      toggleTimerMode();
    });
  }

  updateTimerUI();

  // --- Action Buttons ---

  // Reset
  btnReset.addEventListener('click', () => {
    pausePlayback();
    setStep(0);
    showToast('Reset to scramble state');
  });

  // Random Scramble
  btnRandom.addEventListener('click', () => {
    pausePlayback();
    const newScramble = FMC.generateRandomScramble(25);
    scrambleInput.value = newScramble;
    currentStep = 0;
    updateSolution();
    showToast('Nueva mezcla FMC generada');
  });

  // Remove Comments
  btnRemoveComments.addEventListener('click', () => {
    const text = movesInput.value;
    const cleaned = text
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    movesInput.value = cleaned;
    updateSolution();
    showToast('Comments removed');
  });

  // Copy Solution (Scramble + Steps + Result)
  if (btnCopySolution) {
    btnCopySolution.addEventListener('click', () => {
      const title = titleInput ? titleInput.value.trim() : '';
      const scramble = scrambleInput ? scrambleInput.value.trim() : '';
      const steps = movesInput ? movesInput.value.trim() : '';
      const result = (parsedSolution && parsedSolution.finalMoves && parsedSolution.finalMoves.length > 0)
        ? parsedSolution.finalResultStr
        : '';
      const ftm = (parsedSolution && parsedSolution.ftm) ? parsedSolution.ftm : 0;

      const sections = [];
      if (title) sections.push(title);
      if (scramble) sections.push(`Scramble: ${scramble}`);
      if (steps) sections.push(steps);
      if (result) {
        sections.push(`Result: ${result} (${ftm} moves)`);
      }

      const fullSolutionText = sections.join('\n\n');

      if (!fullSolutionText) {
        showToast('No hay datos para copiar');
        return;
      }

      const copyToClipboard = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(fullSolutionText);
        }
        return new Promise((resolve, reject) => {
          try {
            const ta = document.createElement('textarea');
            ta.value = fullSolutionText;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const success = document.execCommand('copy');
            document.body.removeChild(ta);
            if (success) resolve();
            else reject(new Error('execCommand failed'));
          } catch (e) {
            reject(e);
          }
        });
      };

      copyToClipboard().then(() => {
        showToast('¡Solución copiada al portapapeles!');
      }).catch(() => {
        showToast('Error al copiar al portapapeles');
      });
    });
  }

  // Copy / Share URL
  btnCopyShare.addEventListener('click', () => {
    const title = titleInput.value.trim();
    const scramble = scrambleInput.value.trim();
    const moves = movesInput.value.trim();

    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (scramble) params.set('scramble', scramble);
    if (moves) params.set('alg', moves);

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', `?${params.toString()}`);

    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Shareable link copied to clipboard!');
    });
  });

  // Invert Scramble & Moves
  btnInvert.addEventListener('click', () => {
    pausePlayback();
    const currScramble = scrambleInput.value.trim();
    if (!currScramble) return;
    const invScramble = FMC.invertAlg(currScramble);
    scrambleInput.value = invScramble;
    updateSolution();
    showToast('Inverted scramble applied');
  });

  // New Recon
  btnNewRecon.addEventListener('click', () => {
    if (confirm('Start a new FMC reconstruction? Current inputs will be cleared.')) {
      pausePlayback();
      titleInput.value = '';
      scrambleInput.value = '';
      movesInput.value = '';
      currentStep = 0;
      window.history.replaceState({}, '', window.location.pathname);
      updateSolution();
      showToast('New reconstruction started');
    }
  });

  // Load Famous Example (Wong Chong Wen WR Mean Scramble #1)
  const EXAMPLE_DATA = {
    title: 'Wong Chong Wen WR Mean Scramble #1',
    scramble: "R' U' F D2 R2 F' L2 D2 F' L U' B U' D' F2 B2 L2 D F2 U2 D R' U' F",
    moves: `F' ( L' F2 L' F )//EO (5/5)
(L D2 R' U)//DR, 4qt 2c (4/9)
@ B2 L//HTR (7/16)
B2 L2 D2 F2//M slice (4/20)

@= L' U2 L F2 R'`
  };

  btnLoadExample.addEventListener('click', () => {
    pausePlayback();
    titleInput.value = EXAMPLE_DATA.title;
    scrambleInput.value = EXAMPLE_DATA.scramble;
    movesInput.value = EXAMPLE_DATA.moves;
    currentStep = 0;
    updateSolution();
    showToast('Loaded Wong Chong Wen WR Scramble #1');
  });

  // Modals Listeners
  btnSettings.addEventListener('click', () => {
    settingsModal.classList.add('active');
  });

  closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });

  btnDonate.addEventListener('click', () => {
    donateModal.classList.add('active');
  });

  closeDonate.addEventListener('click', () => {
    donateModal.classList.remove('active');
  });

  // Close modals clicking on backdrop
  [settingsModal, donateModal].forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.remove('active');
    });
  });

  // Reset Camera View to Default with Smooth Spherical Animation
  let cameraAnimId = null;

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function resetCameraView(duration = 500) {
    if (cameraAnimId) {
      cancelAnimationFrame(cameraAnimId);
      cameraAnimId = null;
    }

    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);

    // Camera offset vectors relative to their targets
    const startOffset = camera.position.clone().sub(startTarget);
    const endOffset = defaultCameraPos.clone().sub(endTarget);

    // If camera is already essentially in default position, skip animation
    if (camera.position.distanceTo(defaultCameraPos) < 0.05 && startTarget.distanceTo(endTarget) < 0.05) {
      camera.position.copy(defaultCameraPos);
      controls.target.set(0, 0, 0);
      controls.update();
      showToast('Posición del cubo restablecida');
      return;
    }

    // Convert offsets to spherical coordinates for natural orbiting around the cube
    const s1 = new THREE.Spherical().setFromVector3(startOffset);
    const s2 = new THREE.Spherical().setFromVector3(endOffset);

    // Calculate shortest angular path in theta around the Y axis
    let deltaTheta = s2.theta - s1.theta;
    while (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI;
    while (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI;

    const deltaPhi = s2.phi - s1.phi;
    const deltaRadius = s2.radius - s1.radius;

    const startTime = performance.now();

    function stepCamera(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      // Interpolate spherical orbit
      const curTheta = s1.theta + deltaTheta * eased;
      const curPhi = s1.phi + deltaPhi * eased;
      const curRadius = s1.radius + deltaRadius * eased;

      const curSpherical = new THREE.Spherical(curRadius, curPhi, curTheta);
      const curOffset = new THREE.Vector3().setFromSpherical(curSpherical);

      // Interpolate target in case of panning
      const curTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, eased);
      controls.target.copy(curTarget);
      camera.position.copy(curTarget).add(curOffset);
      controls.update();

      if (progress < 1) {
        cameraAnimId = requestAnimationFrame(stepCamera);
      } else {
        camera.position.copy(defaultCameraPos);
        controls.target.set(0, 0, 0);
        controls.update();
        cameraAnimId = null;
        showToast('Posición del cubo restablecida');
      }
    }

    cameraAnimId = requestAnimationFrame(stepCamera);
  }

  // Cancel camera reset animation if user begins interacting manually
  canvas.addEventListener('pointerdown', () => {
    if (cameraAnimId) {
      cancelAnimationFrame(cameraAnimId);
      cameraAnimId = null;
    }
  });

  if (btnResetView) {
    btnResetView.addEventListener('click', () => resetCameraView());
  }
  if (btnResetCamera) {
    btnResetCamera.addEventListener('click', () => resetCameraView());
  }
  canvas.addEventListener('dblclick', () => resetCameraView());

  // --- Font Management for Scramble, Moves & Result ---
  const FONT_MAP = {
    'JetBrains Mono': "'JetBrains Mono', 'Roboto Mono', monospace",
    'Fira Code': "'Fira Code', 'JetBrains Mono', monospace",
    'IBM Plex Mono': "'IBM Plex Mono', 'Roboto Mono', monospace",
    'Roboto Mono': "'Roboto Mono', 'JetBrains Mono', monospace",
    'Source Code Pro': "'Source Code Pro', 'JetBrains Mono', monospace",
    'Space Mono': "'Space Mono', monospace",
    'Ubuntu Mono': "'Ubuntu Mono', monospace",
    'Cascadia Code': "'Cascadia Code', 'JetBrains Mono', monospace",
    'Inconsolata': "'Inconsolata', 'Roboto Mono', monospace",
    'Courier Prime': "'Courier Prime', monospace"
  };

  function applyNotationFont(fontName) {
    if (!FONT_MAP[fontName]) fontName = 'JetBrains Mono';
    const family = FONT_MAP[fontName];
    document.documentElement.style.setProperty('--font-notation', family);
    try {
      localStorage.setItem('fmc_notation_font', fontName);
    } catch (e) {}

    if (fontSelect && fontSelect.value !== fontName) {
      fontSelect.value = fontName;
    }
    if (modalFontSelect && modalFontSelect.value !== fontName) {
      modalFontSelect.value = fontName;
    }

    autoResizeScramble();
    autoResizeMoves();
  }

  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      applyNotationFont(e.target.value);
    });
  }

  if (modalFontSelect) {
    modalFontSelect.addEventListener('change', (e) => {
      applyNotationFont(e.target.value);
    });
  }

  try {
    const savedFont = localStorage.getItem('fmc_notation_font') || 'JetBrains Mono';
    applyNotationFont(savedFont);
  } catch (e) {
    applyNotationFont('JetBrains Mono');
  }

  // --- Parse URL Parameters on Load ---
  function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const scramble = params.get('scramble');
    const alg = params.get('alg');

    if (title || scramble || alg) {
      if (title) titleInput.value = title;
      if (scramble) scrambleInput.value = scramble;
      if (alg) movesInput.value = alg;
      updateSolution();
    } else {
      // By default load the Wong Chong Wen example so the user immediately sees a working demo!
      titleInput.value = EXAMPLE_DATA.title;
      scrambleInput.value = EXAMPLE_DATA.scramble;
      movesInput.value = EXAMPLE_DATA.moves;
      updateSolution();
    }
  }

  loadFromURL();
});
