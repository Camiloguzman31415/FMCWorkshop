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
  const btnInfo = document.getElementById('btn-info');
  const btnDonate = document.getElementById('btn-donate');
  const btnLoadExample = document.getElementById('btn-load-example');

  const highlightSelect = document.getElementById('highlight-select');
  const statusBadge = document.getElementById('status-badge');
  const eoBadge = document.getElementById('eo-badge');
  let isEoBadgeHidden = false;
  try {
    isEoBadgeHidden = (localStorage.getItem('fmc_hide_eo_badge') === 'true');
  } catch (e) {}

  // Modals
  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const infoModal = document.getElementById('info-modal');
  const donateModal = document.getElementById('donate-modal');
  const closeSettings = document.getElementById('close-settings');
  const closeInfo = document.getElementById('close-info');
  const closeDonate = document.getElementById('close-donate');
  const animSpeedSelect = document.getElementById('anim-speed');
  const perspectiveModeSelect = document.getElementById('perspective-mode');
  const btnResetCamera = document.getElementById('btn-reset-camera');
  const btnResetView = document.getElementById('btn-reset-view');
  const fontSelect = document.getElementById('font-select');
  const modalFontSelect = document.getElementById('modal-font-select');
  const sizeSelect = document.getElementById('size-select');
  const modalSizeSelect = document.getElementById('modal-size-select');
  const btnToggleBold = document.getElementById('btn-toggle-bold');
  const modalSettingBold = document.getElementById('modal-setting-bold');
  const movesHighlight = document.getElementById('moves-highlight');
  const commentColorSelect = document.getElementById('comment-color-select');
  const modalCommentColorSelect = document.getElementById('modal-comment-color-select');

  let currentMinScrambleHeight = 50;

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

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight, false);
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
    scrambleInput.style.height = Math.max(currentMinScrambleHeight, scrambleInput.scrollHeight + 2) + 'px';
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

  // Dimension caching & flicker-free resize handling
  let lastCanvasWidth = canvasContainer ? canvasContainer.clientWidth : 0;
  let lastCanvasHeight = canvasContainer ? canvasContainer.clientHeight : 0;
  let lastCanvasDpr = Math.min(window.devicePixelRatio || 1, 2);

  function onCanvasResize() {
    if (!canvasContainer || !renderer || !camera) return;
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (width <= 0 || height <= 0) return;

    // Avoid clearing the WebGL backbuffer if size and pixel ratio haven't changed
    if (width === lastCanvasWidth && height === lastCanvasHeight && dpr === lastCanvasDpr) {
      return;
    }

    lastCanvasWidth = width;
    lastCanvasHeight = height;
    lastCanvasDpr = dpr;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    // Synchronously render immediately so the canvas buffer is NEVER empty/blank on resize
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    onCanvasResize();
    autoResizeScramble();
    autoResizeMoves();
  }

  window.addEventListener('resize', onWindowResize);
  if (typeof ResizeObserver !== 'undefined' && canvasContainer) {
    const ro = new ResizeObserver(() => onCanvasResize());
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
    const drUD = FMC.checkDR(state, 'UD');
    const drRL = FMC.checkDR(state, 'RL');
    const drFB = FMC.checkDR(state, 'FB');

    // Update EO badge based on active highlight mode, or display all 3 axes in Full mode
    if (mode === 'EO_RL') {
      if (eoRL.isSolved) {
        eoBadge.innerHTML = '<span class="eo-badge-full">EO (R/L): Solved (0 bad)</span><span class="eo-badge-compact">RL: 0✓</span>';
        eoBadge.className = 'badge badge-info';
      } else {
        eoBadge.innerHTML = `<span class="eo-badge-full">EO (R/L): ${eoRL.badCount} Bad Edges</span><span class="eo-badge-compact">RL: ${eoRL.badCount} bad</span>`;
        eoBadge.className = 'badge badge-warn';
      }
      eoBadge.title = 'Eje R/L activo. Haz clic para cambiar de eje.';
    } else if (mode === 'EO_UD') {
      if (eoUD.isSolved) {
        eoBadge.innerHTML = '<span class="eo-badge-full">EO (U/D): Solved (0 bad)</span><span class="eo-badge-compact">UD: 0✓</span>';
        eoBadge.className = 'badge badge-info';
      } else {
        eoBadge.innerHTML = `<span class="eo-badge-full">EO (U/D): ${eoUD.badCount} Bad Edges</span><span class="eo-badge-compact">UD: ${eoUD.badCount} bad</span>`;
        eoBadge.className = 'badge badge-warn';
      }
      eoBadge.title = 'Eje U/D activo. Haz clic para cambiar de eje.';
    } else if (mode === 'EO_FB') {
      if (eoFB.isSolved) {
        eoBadge.innerHTML = '<span class="eo-badge-full">EO (F/B): Solved (0 bad)</span><span class="eo-badge-compact">FB: 0✓</span>';
        eoBadge.className = 'badge badge-info';
      } else {
        eoBadge.innerHTML = `<span class="eo-badge-full">EO (F/B): ${eoFB.badCount} Bad Edges</span><span class="eo-badge-compact">FB: ${eoFB.badCount} bad</span>`;
        eoBadge.className = 'badge badge-warn';
      }
      eoBadge.title = 'Eje F/B activo. Haz clic para cambiar de eje.';
    } else {
      // In Full / general mode, show the overview across all 3 axes
      const fbText = eoFB.isSolved ? '0✓' : `${eoFB.badCount}`;
      const rlText = eoRL.isSolved ? '0✓' : `${eoRL.badCount}`;
      const udText = eoUD.isSolved ? '0✓' : `${eoUD.badCount}`;
      eoBadge.innerHTML = `<span class="eo-badge-full">EO: F/B (${fbText}) • R/L (${rlText}) • U/D (${udText})</span><span class="eo-badge-compact">FB:${fbText} · RL:${rlText} · UD:${udText}</span>`;
      eoBadge.className = (eoFB.isSolved || eoRL.isSolved || eoUD.isSolved) ? 'badge badge-info' : 'badge badge-warn';
      eoBadge.title = 'Orientación en los 3 ejes. Haz clic para alternar el resaltado entre F/B, R/L y U/D.';
    }

    if (eoBadge && isEoBadgeHidden) {
      eoBadge.style.display = 'none';
    }

    if (currentCube.isSolved()) {
      statusBadge.textContent = 'Solved!';
      statusBadge.className = 'badge badge-info';
    } else if (isCurrentStateNiss) {
      statusBadge.innerHTML = '<span class="eo-badge-full">NISS (Inverse)</span><span class="eo-badge-compact">NISS</span>';
      statusBadge.className = 'badge badge-niss';
    } else if (drUD.isDR || drRL.isDR || drFB.isDR) {
      const solvedAxes = [];
      if (drUD.isDR) solvedAxes.push('U/D');
      if (drRL.isDR) solvedAxes.push('R/L');
      if (drFB.isDR) solvedAxes.push('F/B');
      statusBadge.innerHTML = `<span class="eo-badge-full">DR (${solvedAxes.join(', ')}) Solved!</span><span class="eo-badge-compact">DR ✓</span>`;
      statusBadge.className = 'badge badge-info';
    } else if (mode.startsWith('DR_')) {
      const activeDr = (mode === 'DR_RL') ? drRL : ((mode === 'DR_FB') ? drFB : drUD);
      statusBadge.innerHTML = `<span class="eo-badge-full">DR: C ${activeDr.cornersOriented}/8, E ${activeDr.sliceEdgesInSlice}/4</span><span class="eo-badge-compact">C:${activeDr.cornersOriented} E:${activeDr.sliceEdgesInSlice}</span>`;
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
      } else if (mode.startsWith('DR_')) {
        const drObj = (mode === 'DR_RL') ? drRL : ((mode === 'DR_FB') ? drFB : drUD);
        if (edge) {
          if (drObj.badEdges.some(be => be.name === edge.name)) {
            hex = HIGHLIGHT_BAD_COLOR;
          } else if (drObj.isDR) {
            hex = HIGHLIGHT_GOOD_COLOR;
          } else {
            isDimmed = true;
          }
        } else if (corner) {
          if (drObj.badCorners.some(bc => bc.name === corner.name)) {
            hex = HIGHLIGHT_BAD_COLOR;
          } else if (drObj.isDR) {
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

  // --- FMC Steps Syntax Highlighting ---
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function highlightFMC(text) {
    if (!text) return '';
    const regex = /(\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)/g;
    let lastIndex = 0;
    let result = '';
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result += escapeHtml(text.substring(lastIndex, match.index));
      }
      result += '<span class="fmc-comment">' + escapeHtml(match[0]) + '</span>';
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result += escapeHtml(text.substring(lastIndex));
    }

    if (text.endsWith('\n')) {
      result += ' ';
    }

    return result;
  }

  function updateMovesHighlight() {
    if (!movesHighlight || !movesInput) return;
    movesHighlight.innerHTML = highlightFMC(movesInput.value);
  }

  // --- Recalculate FMC inputs, Inverse Scramble & Result ---
  function updateSolution() {
    const rawScramble = scrambleInput.value.trim();
    const rawMoves = movesInput.value;

    updateMovesHighlight();

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

    // Auto-sync detected EO from steps into Mallard input
    if (typeof syncEOFromStepsToMallard === 'function') {
      syncEOFromStepsToMallard();
    }

    // Trigger EO Finder & Analysis Suite update if scramble changed
    if (typeof onScrambleChangedForAnalysis === 'function') {
      onScrambleChangedForAnalysis(rawScramble);
    }
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

  movesInput.addEventListener('scroll', () => {
    if (movesHighlight) {
      movesHighlight.scrollTop = movesInput.scrollTop;
      movesHighlight.scrollLeft = movesInput.scrollLeft;
    }
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

  // --- Toggle EO Badge Visibility ---
  const btnToggleEoBadge = document.getElementById('btn-toggle-eo-badge');
  const settingShowEoBadge = document.getElementById('setting-show-eo-badge');
  const eoToggleIcon = document.getElementById('eo-toggle-icon');

  function setEoBadgeHidden(hidden) {
    isEoBadgeHidden = hidden;
    try {
      localStorage.setItem('fmc_hide_eo_badge', isEoBadgeHidden ? 'true' : 'false');
    } catch (e) {}

    if (eoBadge) {
      eoBadge.style.display = isEoBadgeHidden ? 'none' : '';
    }
    if (settingShowEoBadge) {
      settingShowEoBadge.checked = !isEoBadgeHidden;
    }
    if (eoToggleIcon) {
      eoToggleIcon.innerHTML = isEoBadgeHidden ? SVG_EYE_SLASH : SVG_EYE_OPEN;
    }
    if (btnToggleEoBadge) {
      btnToggleEoBadge.title = isEoBadgeHidden ? 'Mostrar indicador de EO' : 'Ocultar indicador de EO';
      btnToggleEoBadge.classList.toggle('active', !isEoBadgeHidden);
      btnToggleEoBadge.classList.toggle('dimmed', isEoBadgeHidden);
    }
  }

  if (btnToggleEoBadge) {
    btnToggleEoBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      setEoBadgeHidden(!isEoBadgeHidden);
      showToast(isEoBadgeHidden ? 'Indicador de EO ocultado' : 'Indicador de EO visible');
    });
  }

  if (settingShowEoBadge) {
    settingShowEoBadge.addEventListener('change', () => {
      setEoBadgeHidden(!settingShowEoBadge.checked);
    });
  }

  // Set initial state
  setEoBadgeHidden(isEoBadgeHidden);

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

  if (btnInfo && infoModal) {
    btnInfo.addEventListener('click', () => {
      infoModal.classList.add('active');
    });
  }

  if (closeInfo && infoModal) {
    closeInfo.addEventListener('click', () => {
      infoModal.classList.remove('active');
    });
  }

  btnDonate.addEventListener('click', () => {
    donateModal.classList.add('active');
  });

  closeDonate.addEventListener('click', () => {
    donateModal.classList.remove('active');
  });

  // Close modals clicking on backdrop
  [settingsModal, infoModal, donateModal].filter(Boolean).forEach(m => {
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

  // --- Notation Typography, Size & Bold Management ---
  const FONT_MAP = {
    'JetBrains Mono': "'JetBrains Mono', 'Roboto Mono', monospace",
    'Fira Code': "'Fira Code', 'JetBrains Mono', monospace",
    'IBM Plex Mono': "'IBM Plex Mono', 'Roboto Mono', monospace",
    'Roboto Mono': "'Roboto Mono', 'JetBrains Mono', monospace",
    'Source Code Pro': "'Source Code Pro', 'JetBrains Mono', monospace",
    'Martian Mono': "'Martian Mono', 'JetBrains Mono', monospace",
    'Overpass Mono': "'Overpass Mono', 'JetBrains Mono', monospace",
    'Red Hat Mono': "'Red Hat Mono', 'JetBrains Mono', monospace",
    'B612 Mono': "'B612 Mono', monospace",
    'Anonymous Pro': "'Anonymous Pro', monospace",
    'Spline Sans Mono': "'Spline Sans Mono', monospace",
    'DM Mono': "'DM Mono', monospace",
    'Fira Mono': "'Fira Mono', 'JetBrains Mono', monospace",
    'Fragment Mono': "'Fragment Mono', monospace",
    'Space Mono': "'Space Mono', monospace",
    'Ubuntu Mono': "'Ubuntu Mono', monospace",
    'Cascadia Code': "'Cascadia Code', 'JetBrains Mono', monospace",
    'Inconsolata': "'Inconsolata', 'Roboto Mono', monospace",
    'Cousine': "'Cousine', monospace",
    'Courier Prime': "'Courier Prime', monospace",
    'Cutive Mono': "'Cutive Mono', monospace",
    'Share Tech Mono': "'Share Tech Mono', monospace",
    'Syne Mono': "'Syne Mono', monospace",
    'Nova Mono': "'Nova Mono', monospace",
    'Major Mono Display': "'Major Mono Display', monospace",
    'VT323': "'VT323', monospace"
  };

  const SIZE_PRESETS = {
    custom: {
      scramble: '20px',
      inverse: '20px',
      moves: '22px',
      result: '20px',
      minScramble: 50
    },
    normal: {
      scramble: '18px',
      inverse: '16.5px',
      moves: '15px',
      result: '14.5px',
      minScramble: 46
    },
    large: {
      scramble: '22px',
      inverse: '19px',
      moves: '16.5px',
      result: '16px',
      minScramble: 52
    },
    xlarge: {
      scramble: '26px',
      inverse: '22px',
      moves: '18.5px',
      result: '18px',
      minScramble: 60
    },
    giant: {
      scramble: '30px',
      inverse: '25px',
      moves: '21px',
      result: '20px',
      minScramble: 70
    }
  };

  function applyNotationFont(fontName) {
    if (!FONT_MAP[fontName]) fontName = 'Cutive Mono';
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

  function applyNotationSize(sizeKey) {
    if (!SIZE_PRESETS[sizeKey]) sizeKey = 'custom';
    const preset = SIZE_PRESETS[sizeKey];
    currentMinScrambleHeight = preset.minScramble;
    document.documentElement.style.setProperty('--font-scramble-size', preset.scramble);
    document.documentElement.style.setProperty('--font-inverse-size', preset.inverse);
    document.documentElement.style.setProperty('--font-moves-size', preset.moves);
    document.documentElement.style.setProperty('--font-result-size', preset.result);

    try {
      localStorage.setItem('fmc_notation_size', sizeKey);
    } catch (e) {}

    if (sizeSelect && sizeSelect.value !== sizeKey) {
      sizeSelect.value = sizeKey;
    }
    if (modalSizeSelect && modalSizeSelect.value !== sizeKey) {
      modalSizeSelect.value = sizeKey;
    }

    autoResizeScramble();
    autoResizeMoves();
  }

  function applyNotationBold(isBold) {
    const weight = isBold ? '700' : '500';
    document.documentElement.style.setProperty('--font-notation-weight', weight);

    try {
      localStorage.setItem('fmc_notation_bold', isBold ? 'true' : 'false');
    } catch (e) {}

    if (btnToggleBold) {
      btnToggleBold.classList.toggle('active', isBold);
    }
    if (modalSettingBold && modalSettingBold.checked !== isBold) {
      modalSettingBold.checked = isBold;
    }
  }

  function applyCommentColor(color) {
    if (!color) color = '#dc2626';
    document.documentElement.style.setProperty('--color-comment', color);

    try {
      localStorage.setItem('fmc_comment_color', color);
    } catch (e) {}

    if (commentColorSelect && commentColorSelect.value !== color) {
      commentColorSelect.value = color;
    }
    if (modalCommentColorSelect && modalCommentColorSelect.value !== color) {
      modalCommentColorSelect.value = color;
    }
  }

  // Event Listeners
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => applyNotationFont(e.target.value));
  }
  if (modalFontSelect) {
    modalFontSelect.addEventListener('change', (e) => applyNotationFont(e.target.value));
  }

  if (sizeSelect) {
    sizeSelect.addEventListener('change', (e) => applyNotationSize(e.target.value));
  }
  if (modalSizeSelect) {
    modalSizeSelect.addEventListener('change', (e) => applyNotationSize(e.target.value));
  }

  if (btnToggleBold) {
    btnToggleBold.addEventListener('click', () => {
      const isCurrentlyBold = btnToggleBold.classList.contains('active');
      applyNotationBold(!isCurrentlyBold);
    });
  }
  if (modalSettingBold) {
    modalSettingBold.addEventListener('change', (e) => {
      applyNotationBold(e.target.checked);
    });
  }

  if (commentColorSelect) {
    commentColorSelect.addEventListener('change', (e) => applyCommentColor(e.target.value));
  }
  if (modalCommentColorSelect) {
    modalCommentColorSelect.addEventListener('change', (e) => applyCommentColor(e.target.value));
  }

  // Load Saved Typography Settings
  try {
    const savedFont = localStorage.getItem('fmc_notation_font') || 'Cutive Mono';
    applyNotationFont(savedFont);

    const savedSize = localStorage.getItem('fmc_notation_size') || 'custom';
    applyNotationSize(savedSize);

    const savedBold = localStorage.getItem('fmc_notation_bold') !== 'false';
    applyNotationBold(savedBold);

    const savedCommentColor = localStorage.getItem('fmc_comment_color') || '#dc2626';
    applyCommentColor(savedCommentColor);
  } catch (e) {
    applyNotationFont('Cutive Mono');
    applyNotationSize('custom');
    applyNotationBold(true);
    applyCommentColor('#dc2626');
  }

  // ============================================================================
  // FMC ANALYSIS & SOLVER SUITE CONTROLLER (EO Finder, Mallard DR & Optimal)
  // ============================================================================
  const eoStatusSubtitle = document.getElementById('eo-status-subtitle');
  const eoMaxMovesSelect = document.getElementById('eo-max-moves-select');
  const eoTotalCountEl = document.getElementById('eo-total-count');
  const eoTotalNormalEl = document.getElementById('eo-total-normal');
  const eoTotalInverseEl = document.getElementById('eo-total-inverse');
  const eoTotalNissEl = document.getElementById('eo-total-niss');
  const eoByMoveGrid = document.getElementById('eo-by-move-grid');
  const eoAxesGrid = document.getElementById('eo-axes-grid');
  const eoSolutionsListTitle = document.getElementById('eo-solutions-list-title');
  const eoMoveFilterPills = document.getElementById('eo-move-filter-pills');
  const eoFilterType = document.getElementById('eo-filter-type');
  const eoFilterAxis = document.getElementById('eo-filter-axis');
  const eoFilterRzp = document.getElementById('eo-filter-rzp');
  const eoSolutionsList = document.getElementById('eo-solutions-list');

  const mallardSection = document.getElementById('mallard-analyzer-section');
  const mallardEoInput = document.getElementById('mallard-eo-input');
  const btnRunMallard = document.getElementById('btn-run-mallard');
  const mallardFilterAxis = document.getElementById('mallard-filter-axis');
  const mallardFilterDir = document.getElementById('mallard-filter-dir');
  const mallardStatusBar = document.getElementById('mallard-status-bar');
  const mallardResultsGrid = document.getElementById('mallard-results-grid');

  const btnCalcOptimal = document.getElementById('btn-calc-optimal');
  const btnStopOptimal = document.getElementById('btn-stop-optimal');
  const optimalStatusBar = document.getElementById('optimal-status-bar');
  const optimalResultsList = document.getElementById('optimal-results-list');

  let solverWorker = (typeof FMCSolver !== 'undefined' && FMCSolver.createSolverWorker)
    ? FMCSolver.createSolverWorker()
    : null;
  let workerReqId = 0;
  const workerCallbacks = new Map();

  function bindWorkerEvents(w) {
    if (!w) return;
    w.onmessage = (e) => {
      const { id, type, result, progress, error } = e.data || {};
      const cb = workerCallbacks.get(id);
      if (!cb) return;
      if (type === 'progress') {
        if (cb.onProgress) cb.onProgress(progress);
      } else if (type === 'done') {
        workerCallbacks.delete(id);
        cb.resolve(result);
      } else if (type === 'error') {
        workerCallbacks.delete(id);
        cb.reject(new Error(error || 'Solver worker error'));
      }
    };
  }
  bindWorkerEvents(solverWorker);

  function callSolverAsync(action, payload, onProgress = null) {
    if (solverWorker) {
      return new Promise((resolve, reject) => {
        const id = ++workerReqId;
        workerCallbacks.set(id, { resolve, reject, onProgress });
        solverWorker.postMessage({ id, action, payload });
      });
    }
    // Fallback to main thread via setTimeout so UI paints first
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (action === 'findEOs') {
            resolve(FMCSolver.findAllEOs(payload.scramble, payload.maxMoves || 5));
          } else if (action === 'analyzeMallard') {
            resolve(FMCSolver.analyzeMallardFromEO(payload.scramble, payload.eo, payload.options || {}));
          } else if (action === 'findOptimal') {
            resolve(FMCSolver.findOptimalSolutions(payload.scramble, payload.options || {}, onProgress));
          }
        } catch (err) {
          reject(err);
        }
      }, 15);
    });
  }

  // Render an isometric 3D mini-cube SVG highlighting bad edges in red
  function renderBadEdgesMiniCubeSVG(badEdgesList) {
    const badSet = new Set(badEdgesList || []);
    const BAD_COLOR = '#f43f5e';
    const GOOD_TOP = '#262936';
    const GOOD_LEFT = '#1e202b';
    const GOOD_RIGHT = '#171922';
    const STROKE = '#0e0f14';

    const c = (edgeName, defaultFill) => (badSet.has(edgeName) ? BAD_COLOR : defaultFill);

    return `
      <svg viewBox="0 0 48 48" class="eo-minicube-svg" xmlns="http://www.w3.org/2000/svg">
        <!-- Base Cube Shell -->
        <polygon points="24,24 41.32,14 24,4 6.68,14" fill="#12131a" stroke="${STROKE}" stroke-width="0.9" stroke-linejoin="round"/>
        <polygon points="24,24 6.68,14 6.68,34 24,44" fill="#0e0f15" stroke="${STROKE}" stroke-width="0.9" stroke-linejoin="round"/>
        <polygon points="24,24 41.32,14 41.32,34 24,44" fill="#0a0b10" stroke="${STROKE}" stroke-width="0.9" stroke-linejoin="round"/>

        <!-- Top Face (U) Stickers -->
        <polygon points="24.00,23.30 19.44,20.67 24.00,18.03 28.56,20.67" fill="${GOOD_TOP}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="29.77,19.97 25.21,17.33 29.77,14.70 34.33,17.33" fill="${c('UR', GOOD_TOP)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="35.55,16.63 30.99,14.00 35.55,11.37 40.11,14.00" fill="${GOOD_TOP}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="18.23,19.97 13.67,17.33 18.23,14.70 22.79,17.33" fill="${c('UF', GOOD_TOP)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="24.00,16.63 19.44,14.00 24.00,11.37 28.56,14.00" fill="${GOOD_TOP}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="29.77,13.30 25.21,10.67 29.77,8.03 34.33,10.67" fill="${c('UB', GOOD_TOP)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="12.45,16.63 7.89,14.00 12.45,11.37 17.01,14.00" fill="${GOOD_TOP}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="18.23,13.30 13.67,10.67 18.23,8.03 22.79,10.67" fill="${c('UL', GOOD_TOP)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="24.00,9.97 19.44,7.33 24.00,4.70 28.56,7.33" fill="${GOOD_TOP}" stroke="${STROKE}" stroke-width="0.6"/>

        <!-- Front-Left Face (F) Stickers -->
        <polygon points="23.39,24.35 18.83,21.72 18.83,26.98 23.39,29.62" fill="${GOOD_LEFT}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="23.39,31.02 18.83,28.38 18.83,33.65 23.39,36.28" fill="${c('FR', GOOD_LEFT)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="23.39,37.68 18.83,35.05 18.83,40.32 23.39,42.95" fill="${GOOD_LEFT}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="17.62,21.02 13.06,18.38 13.06,23.65 17.62,26.28" fill="${c('UF', GOOD_LEFT)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="17.62,27.68 13.06,25.05 13.06,30.32 17.62,32.95" fill="${GOOD_LEFT}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="17.62,34.35 13.06,31.72 13.06,36.98 17.62,39.62" fill="${c('DF', GOOD_LEFT)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="11.85,17.68 7.29,15.05 7.29,20.32 11.85,22.95" fill="${GOOD_LEFT}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="11.85,24.35 7.29,21.72 7.29,26.98 11.85,29.62" fill="${c('FL', GOOD_LEFT)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="11.85,31.02 7.29,28.38 7.29,33.65 11.85,36.28" fill="${GOOD_LEFT}" stroke="${STROKE}" stroke-width="0.6"/>

        <!-- Front-Right Face (R) Stickers -->
        <polygon points="24.61,24.35 29.17,21.72 29.17,26.98 24.61,29.62" fill="${GOOD_RIGHT}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="24.61,31.02 29.17,28.38 29.17,33.65 24.61,36.28" fill="${c('FR', GOOD_RIGHT)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="24.61,37.68 29.17,35.05 29.17,40.32 24.61,42.95" fill="${GOOD_RIGHT}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="30.38,21.02 34.94,18.38 34.94,23.65 30.38,26.28" fill="${c('UR', GOOD_RIGHT)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="30.38,27.68 34.94,25.05 34.94,30.32 30.38,32.95" fill="${GOOD_RIGHT}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="30.38,34.35 34.94,31.72 34.94,36.98 30.38,39.62" fill="${c('DR', GOOD_RIGHT)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="36.15,17.68 40.71,15.05 40.71,20.32 36.15,22.95" fill="${GOOD_RIGHT}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="36.15,24.35 40.71,21.72 40.71,26.98 36.15,29.62" fill="${c('BR', GOOD_RIGHT)}" stroke="${STROKE}" stroke-width="0.6"/>
        <polygon points="36.15,31.02 40.71,28.38 40.71,33.65 36.15,36.28" fill="${GOOD_RIGHT}" stroke="${STROKE}" stroke-width="0.6"/>

        <!-- Back/Bottom Hidden Edge Indicators (BL, DL, DB) along outer rim -->
        ${badSet.has('BL') ? `<line x1="4.8" y1="21" x2="4.8" y2="27" stroke="${BAD_COLOR}" stroke-width="2.6" stroke-linecap="round"/>` : ''}
        ${badSet.has('DL') ? `<line x1="11.5" y1="39.2" x2="17.5" y2="42.7" stroke="${BAD_COLOR}" stroke-width="2.6" stroke-linecap="round"/>` : ''}
        ${badSet.has('DB') ? `<line x1="36.5" y1="39.2" x2="30.5" y2="42.7" stroke="${BAD_COLOR}" stroke-width="2.6" stroke-linecap="round"/>` : ''}
      </svg>
    `;
  }

  // --- Auto-detect and sync EO from solution steps to Mallard DR Analyzer ---
  let lastAutoDetectedEO = null;

  function cleanEONotation(str) {
    if (!str || typeof str !== 'string') return null;
    const cleaned = str
      .replace(/\s+/g, ' ')
      .replace(/\s+([2'])/g, '$1')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .trim();
    if (!/[UDFBRL]/i.test(cleaned)) return null;
    return cleaned;
  }

  function extractEOFromSteps(movesText, scrambleStr = '') {
    if (!movesText || typeof movesText !== 'string') return null;
    const lines = movesText.split(/\r?\n/);

    // 1. Look for explicit EO comment or marker (e.g. // EO, // EO (2/2), // EO-UD, /* EO */)
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const hasEoComment = /(?:\/\/[^\n]*?\beo\b|\/\*[\s\S]*?\beo\b[\s\S]*?\*\/)/i.test(trimmed);
      const startsWithEo = /^eo\b/i.test(trimmed);

      if (hasEoComment || startsWithEo) {
        let movePart = trimmed
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/g, '')
          .replace(/^eo\s*[:\-]\s*/i, '')
          .trim();

        // If comment was on its own line (e.g. "// EO (2/2)"), check next line
        if (!movePart && i + 1 < lines.length) {
          movePart = lines[i + 1]
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/g, '')
            .trim();
        }

        const cleanEO = cleanEONotation(movePart);
        if (cleanEO) return cleanEO;
      }
    }

    // 2. Fallback: check if the first non-comment move line solves EO for the current scramble
    if (scrambleStr && typeof FMCSolver !== 'undefined' && FMCSolver.getBadEdgeNames && FMCSolver.parseMovesToIndices) {
      for (let i = 0; i < lines.length; i++) {
        const lineWithoutComments = lines[i]
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/g, '')
          .trim();
        if (!lineWithoutComments) continue;

        const cleanCandidate = cleanEONotation(lineWithoutComments);
        if (cleanCandidate) {
          try {
            const scrambleMoves = FMCSolver.parseMovesToIndices(scrambleStr);
            const parseNiss = (typeof FMCSolver.parseNissSequence === 'function')
              ? FMCSolver.parseNissSequence
              : ((s) => {
                  const cl = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
                  const n = [], inv = [];
                  let inI = false, buf = '';
                  for (let ci = 0; ci < cl.length; ci++) {
                    const ch = cl[ci];
                    if (ch === '(') { if (buf.trim()) n.push(...FMCSolver.parseMovesToIndices(buf)); buf = ''; inI = true; }
                    else if (ch === ')') { if (buf.trim()) inv.push(...FMCSolver.parseMovesToIndices(buf)); buf = ''; inI = false; }
                    else { buf += ch; }
                  }
                  if (buf.trim()) { if (inI) inv.push(...FMCSolver.parseMovesToIndices(buf)); else n.push(...FMCSolver.parseMovesToIndices(buf)); }
                  return { normalMoves: n, inverseMoves: inv };
                });
            const { normalMoves: eoNorm, inverseMoves: eoInv } = parseNiss(cleanCandidate);
            const INV = [2, 1, 0, 5, 4, 3, 8, 7, 6, 11, 10, 9, 14, 13, 12, 17, 16, 15];
            const invIndices = (indices) => indices.slice().reverse().map(m => INV[m]);
            const postEONormalMoves = [...invIndices(eoInv), ...scrambleMoves, ...eoNorm];
            for (const ax of ['FB', 'RL', 'UD']) {
              if (FMCSolver.getBadEdgeNames(postEONormalMoves, ax).length === 0) {
                return cleanCandidate;
              }
            }
          } catch (e) {}
        }
        break; // Only test the first move line
      }
    }

    return null;
  }

  function syncEOFromStepsToMallard(force = false) {
    if (!mallardEoInput) return;
    if (!force && document.activeElement === mallardEoInput) return;

    const rawMoves = movesInput ? movesInput.value : '';
    const rawScramble = scrambleInput ? scrambleInput.value.trim() : '';
    const detectedEO = extractEOFromSteps(rawMoves, rawScramble);

    if (detectedEO) {
      if (force || mallardEoInput.value !== detectedEO) {
        mallardEoInput.value = detectedEO;
        lastAutoDetectedEO = detectedEO;
      }
    } else if (!rawMoves.trim()) {
      if (lastAutoDetectedEO !== null) {
        lastAutoDetectedEO = null;
        if (currentEOData && currentEOData.solutions && currentEOData.solutions.length > 0) {
          mallardEoInput.value = currentEOData.solutions[0].notation;
        } else {
          mallardEoInput.value = '';
        }
      }
    }
  }

  let currentEOData = null;
  let activeMoveFilter = 'all';
  let lastAnalyzedScramble = null;
  let eoDebounceTimer = null;

  function onScrambleChangedForAnalysis(rawScramble) {
    const clean = (rawScramble || '').trim();
    if (clean === lastAnalyzedScramble) return;
    lastAnalyzedScramble = clean;

    if (eoDebounceTimer) clearTimeout(eoDebounceTimer);
    eoDebounceTimer = setTimeout(() => {
      runEOAnalysis(clean);
    }, 120);
  }

  async function runEOAnalysis(scrambleStr) {
    if (!eoStatusSubtitle) return;
    const maxMoves = parseInt(eoMaxMovesSelect ? eoMaxMovesSelect.value : '5', 10) || 5;

    if (!scrambleStr) {
      eoStatusSubtitle.textContent = 'Ingresa una mezcla arriba para calcular todos los EOs en los 3 ejes.';
      return;
    }

    eoStatusSubtitle.textContent = `Calculando EOs hasta ${maxMoves} movimientos en los 3 ejes (FB, RL, UD)...`;
    const t0 = performance.now();

    try {
      const data = await callSolverAsync('findEOs', { scramble: scrambleStr, maxMoves });
      currentEOData = data;
      const elapsed = Math.round(performance.now() - t0);
      eoStatusSubtitle.textContent = `${data.total} EOs encontrados (hasta ${maxMoves} movs) en ${elapsed} ms`;
      renderEOHints(data, maxMoves);
      renderEOSolutionsList();

      // Pre-fill Mallard input: prioritize the EO extracted from user's steps!
      const stepEO = extractEOFromSteps(movesInput ? movesInput.value : '', scrambleStr);
      if (stepEO && mallardEoInput) {
        mallardEoInput.value = stepEO;
        lastAutoDetectedEO = stepEO;
      } else if (data.solutions && data.solutions.length > 0 && mallardEoInput) {
        if (!mallardEoInput.value.trim()) {
          mallardEoInput.value = data.solutions[0].notation;
        }
      }
    } catch (err) {
      eoStatusSubtitle.textContent = 'Error al calcular EOs: ' + err.message;
    }
  }

  function renderEOHints(data, maxMoves) {
    if (!data) return;
    if (eoTotalCountEl) eoTotalCountEl.textContent = data.total;
    if (eoTotalNormalEl) eoTotalNormalEl.textContent = data.totalByType.Normal || 0;
    if (eoTotalInverseEl) eoTotalInverseEl.textContent = data.totalByType.Inverse || 0;
    if (eoTotalNissEl) eoTotalNissEl.textContent = data.totalByType.NISS || 0;

    // 1. By Move Cards
    if (eoByMoveGrid) {
      eoByMoveGrid.innerHTML = '';
      for (let m = 0; m <= maxMoves; m++) {
        const info = data.totalByMove[m];
        if (!info || info.total === 0) continue;
        const card = document.createElement('div');
        card.className = 'eo-move-card';
        card.title = `Filtrar EOs de ${m} movimiento${m === 1 ? '' : 's'}`;
        card.innerHTML = `
          <div class="eo-move-card-title">${m} ${m === 1 ? 'Move' : 'Moves'}</div>
          <div class="eo-move-card-sub">${info.total} Soluciones</div>
          <div class="eo-move-card-breakdown">
            <div class="eo-mini-stat">
              <span class="eo-mini-stat-v">${info.Normal}</span>
              <span class="eo-mini-stat-l">NORMAL</span>
            </div>
            <div class="eo-mini-stat">
              <span class="eo-mini-stat-v">${info.Inverse}</span>
              <span class="eo-mini-stat-l">INVERSE</span>
            </div>
            <div class="eo-mini-stat">
              <span class="eo-mini-stat-v">${info.NISS}</span>
              <span class="eo-mini-stat-l">NISS</span>
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          setMoveFilterPill(String(m));
        });
        eoByMoveGrid.appendChild(card);
      }
    }

    // 2. By Axis Cards (FB, RL, UD) with isometric 3D bad-edge mini-cubes
    if (eoAxesGrid) {
      eoAxesGrid.innerHTML = '';
      const axesOrder = [
        { key: 'FB', cls: 'axis-fb', label: 'FB Axis' },
        { key: 'RL', cls: 'axis-rl', label: 'RL Axis' },
        { key: 'UD', cls: 'axis-ud', label: 'UD Axis' }
      ];

      for (const axCfg of axesOrder) {
        const axData = data.axisSummaries[axCfg.key];
        if (!axData) continue;

        const moveChips = [];
        for (let m = 0; m <= maxMoves; m++) {
          const c = axData.byMove[m] ? axData.byMove[m].total : 0;
          if (c > 0) {
            moveChips.push(`<span class="eo-axis-move-Chip len-${m}">${m}m: ${c}</span>`);
          }
        }

        const card = document.createElement('div');
        card.className = `eo-axis-card ${axCfg.cls}`;
        card.title = `Haz clic para filtrar soluciones del eje ${axCfg.key}`;
        card.innerHTML = `
          <div class="eo-axis-card-title">${axCfg.label} <span class="eo-axis-card-bad">(${axData.normBadCount} bad)</span></div>
          <div class="eo-axis-minicubes">
            <div class="eo-minicube-box" title="Aristas malas en Normal (${axData.normBadCount}): ${axData.normBadEdges.join(', ') || 'Ninguna'}">
              ${renderBadEdgesMiniCubeSVG(axData.normBadEdges)}
              <span class="eo-minicube-label">NORMAL (${axData.normBadCount})</span>
            </div>
            <div class="eo-minicube-box" title="Aristas malas en Inversa (${axData.invBadCount}): ${axData.invBadEdges.join(', ') || 'Ninguna'}">
              ${renderBadEdgesMiniCubeSVG(axData.invBadEdges)}
              <span class="eo-minicube-label">INVERSE (${axData.invBadCount})</span>
            </div>
          </div>
          <div class="eo-axis-total-num">${axData.total}</div>
          <div class="eo-axis-total-sub">Soluciones</div>
          <div class="eo-move-card-breakdown">
            <div class="eo-mini-stat">
              <span class="eo-mini-stat-v">${axData.byType.Normal}</span>
              <span class="eo-mini-stat-l">NORMAL</span>
            </div>
            <div class="eo-mini-stat">
              <span class="eo-mini-stat-v">${axData.byType.Inverse}</span>
              <span class="eo-mini-stat-l">INVERSE</span>
            </div>
            <div class="eo-mini-stat">
              <span class="eo-mini-stat-v">${axData.byType.NISS}</span>
              <span class="eo-mini-stat-l">NISS</span>
            </div>
          </div>
          <div class="eo-axis-moves-row">
            ${moveChips.join('')}
          </div>
        `;
        card.addEventListener('click', () => {
          if (eoFilterAxis) {
            eoFilterAxis.value = eoFilterAxis.value === axCfg.key ? 'all' : axCfg.key;
            renderEOSolutionsList();
          }
        });
        eoAxesGrid.appendChild(card);
      }
    }
  }

  function setMoveFilterPill(moveVal) {
    activeMoveFilter = moveVal;
    if (eoMoveFilterPills) {
      eoMoveFilterPills.querySelectorAll('.eo-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.move === moveVal);
      });
    }
    renderEOSolutionsList();
  }

  const EO_BATCH_SIZE = 150;
  let currentFilteredEOs = [];
  let currentEORenderCount = 0;
  let eoLoadMoreContainer = null;

  function createEOSolRow(sol, idx) {
    const row = document.createElement('div');
    row.className = 'eo-sol-row';

    const axisBadgeCls = `axis-${sol.axis.toLowerCase()}`;
    const drStatsHtml = (sol.drStats || []).map(st => {
      const rzpCls = st.isRzp ? 'eo-rzp-tag ready' : 'eo-rzp-tag';
      const starHtml = st.isArm ? '<span class="eo-arm-star" title="Cerca de DR / ARM Ready">★</span>' : '';
      return `
        <div class="eo-dr-stat-line">
          <span>${st.axis}: <span class="${rzpCls}">${st.c}c${st.e}e</span> | ${st.armC}c${st.armE}e ${starHtml}</span>
          <span class="eo-pairs-count" title="Pares esquina-arista formados">${st.pairs}</span>
        </div>
      `;
    }).join('');

    row.innerHTML = `
      <div class="eo-sol-left">
        <span class="eo-sol-idx">${idx + 1}.</span>
        <span class="eo-sol-alg" title="Haz clic para cargar este EO en el editor y verlo en el cubo 3D">${escapeHtml(sol.notation)}</span>
        <span class="eo-sol-len-badge len-${sol.length}">${sol.length}</span>
        <span class="eo-sol-axis-badge ${axisBadgeCls}">${sol.axis}</span>
      </div>
      <div class="eo-sol-right">
        <div class="eo-dr-stats-col">
          ${drStatsHtml}
        </div>
        <button type="button" class="eo-dr-btn" title="Analizar mejores DRs y solves desde este EO (Estilo Mallard)">DR</button>
      </div>
    `;

    // Click on EO notation -> load into main editor & highlight that EO axis
    const algEl = row.querySelector('.eo-sol-alg');
    if (algEl) {
      algEl.addEventListener('click', () => {
        movesInput.value = `${sol.notation} // EO-${sol.axis} (${sol.length}/${sol.length})`;
        if (highlightSelect) {
          highlightSelect.value = `EO_${sol.axis}`;
        }
        updateSolution();
        setStep(parsedSolution.finalMoves.length);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`EO cargado en el editor: ${sol.notation} (${sol.axis})`);
      });
    }

    // Click on DR button -> load into Mallard analyzer and run immediately
    const drBtn = row.querySelector('.eo-dr-btn');
    if (drBtn) {
      drBtn.addEventListener('click', () => {
        // Ensure Mallard section body is expanded if it was collapsed
        const mallardBody = document.getElementById('mallard-analyzer-body');
        if (mallardBody && mallardBody.style.display === 'none') {
          mallardBody.style.display = '';
          const collapseBtn = document.querySelector('.block-collapse-btn[data-target="mallard-analyzer-body"] span');
          if (collapseBtn) collapseBtn.textContent = 'Ocultar';
        }
        if (mallardEoInput) {
          mallardEoInput.value = sol.notation;
        }
        if (mallardSection) {
          mallardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        runMallardAnalysis(sol.notation);
      });
    }

    return row;
  }

  function appendEORows(count) {
    if (!eoSolutionsList || !currentFilteredEOs.length) return;

    if (eoLoadMoreContainer && eoLoadMoreContainer.parentNode) {
      eoLoadMoreContainer.parentNode.removeChild(eoLoadMoreContainer);
    }

    const start = currentEORenderCount;
    const end = Math.min(start + count, currentFilteredEOs.length);
    if (start >= end) return;

    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      frag.appendChild(createEOSolRow(currentFilteredEOs[i], i));
    }
    eoSolutionsList.appendChild(frag);
    currentEORenderCount = end;

    if (currentEORenderCount < currentFilteredEOs.length) {
      if (!eoLoadMoreContainer) {
        eoLoadMoreContainer = document.createElement('div');
        eoLoadMoreContainer.className = 'eo-load-more-container';
      }
      const remaining = currentFilteredEOs.length - currentEORenderCount;
      const nextBatch = Math.min(EO_BATCH_SIZE, remaining);
      eoLoadMoreContainer.innerHTML = `
        <button type="button" class="eo-load-more-btn">⬇ Cargar más (+${nextBatch}) • Mostrando ${currentEORenderCount} de ${currentFilteredEOs.length}</button>
        <button type="button" class="eo-load-all-btn">Mostrar todas (${currentFilteredEOs.length})</button>
      `;

      const loadMoreBtn = eoLoadMoreContainer.querySelector('.eo-load-more-btn');
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          appendEORows(EO_BATCH_SIZE);
        });
      }

      const loadAllBtn = eoLoadMoreContainer.querySelector('.eo-load-all-btn');
      if (loadAllBtn) {
        loadAllBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          appendEORows(currentFilteredEOs.length - currentEORenderCount);
        });
      }

      eoSolutionsList.appendChild(eoLoadMoreContainer);
    }
  }

  function renderEOSolutionsList() {
    if (!eoSolutionsList || !currentEOData) return;

    const typeVal = eoFilterType ? eoFilterType.value : 'all';
    const axisVal = eoFilterAxis ? eoFilterAxis.value : 'all';
    const rzpVal = eoFilterRzp ? eoFilterRzp.value : 'all';

    currentFilteredEOs = currentEOData.solutions.filter(sol => {
      if (activeMoveFilter !== 'all' && sol.length !== parseInt(activeMoveFilter, 10)) return false;
      if (typeVal !== 'all' && sol.type !== typeVal) return false;
      if (axisVal !== 'all' && sol.axis !== axisVal) return false;
      if (rzpVal === 'rzp' && !sol.hasRzp) return false;
      if (rzpVal === 'arm' && !sol.hasArm) return false;
      return true;
    });

    if (eoSolutionsListTitle) {
      eoSolutionsListTitle.textContent = `Soluciones EO (${currentFilteredEOs.length})`;
    }

    eoSolutionsList.innerHTML = '';
    currentEORenderCount = 0;

    if (currentFilteredEOs.length === 0) {
      eoSolutionsList.innerHTML = `<div style="padding: 18px; text-align: center; color: #9a9ca8; font-size: 13px;">No hay soluciones EO que coincidan con los filtros seleccionados.</div>`;
      return;
    }

    appendEORows(EO_BATCH_SIZE);
  }

  // Collapsible Master Analysis Suite & Individual Section Toggles
  const btnToggleAnalysisSuite = document.getElementById('btn-toggle-analysis-suite');
  const analysisSuiteBody = document.getElementById('analysis-suite-body');
  const suiteChevronIcon = document.getElementById('suite-chevron-icon');
  const analysisSuiteToggleLabel = document.getElementById('analysis-suite-toggle-label');

  function setAnalysisSuiteCollapsed(collapsed) {
    if (!analysisSuiteBody) return;
    analysisSuiteBody.style.display = collapsed ? 'none' : '';
    if (suiteChevronIcon) {
      suiteChevronIcon.classList.toggle('collapsed', collapsed);
    }
    if (analysisSuiteToggleLabel) {
      analysisSuiteToggleLabel.textContent = collapsed ? 'Mostrar Análisis' : 'Ocultar Análisis';
    }
    try {
      localStorage.setItem('fmc_hide_analysis_suite', collapsed ? 'true' : 'false');
    } catch (e) {}
    if (typeof onCanvasResize === 'function') {
      onCanvasResize();
    }
  }

  if (btnToggleAnalysisSuite) {
    btnToggleAnalysisSuite.addEventListener('click', () => {
      const isCurrentlyCollapsed = analysisSuiteBody && analysisSuiteBody.style.display === 'none';
      setAnalysisSuiteCollapsed(!isCurrentlyCollapsed);
    });
  }

  try {
    if (localStorage.getItem('fmc_hide_analysis_suite') === 'true') {
      setAnalysisSuiteCollapsed(true);
    }
  } catch (e) {}

  document.querySelectorAll('.block-collapse-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-target');
      const targetEl = targetId ? document.getElementById(targetId) : null;
      if (!targetEl) return;
      const isHidden = targetEl.style.display === 'none';
      targetEl.style.display = isHidden ? '' : 'none';
      const span = btn.querySelector('span');
      if (span) span.textContent = isHidden ? 'Ocultar' : 'Mostrar';
    });
  });

  function syncMovePillsVisibility() {
    if (!eoMoveFilterPills || !eoMaxMovesSelect) return;
    const maxM = parseInt(eoMaxMovesSelect.value, 10) || 5;
    eoMoveFilterPills.querySelectorAll('.eo-pill-btn').forEach(btn => {
      const mv = btn.dataset.move;
      if (mv !== 'all') {
        const num = parseInt(mv, 10);
        btn.style.display = num <= maxM ? '' : 'none';
      }
    });
    if (activeMoveFilter !== 'all' && parseInt(activeMoveFilter, 10) > maxM) {
      activeMoveFilter = 'all';
      eoMoveFilterPills.querySelectorAll('.eo-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.move === 'all');
      });
    }
  }

  // Filter Event Listeners for EO Trainer
  if (eoMaxMovesSelect) {
    syncMovePillsVisibility();
    eoMaxMovesSelect.addEventListener('change', () => {
      syncMovePillsVisibility();
      runEOAnalysis(scrambleInput.value.trim());
    });
  }
  if (eoMoveFilterPills) {
    eoMoveFilterPills.querySelectorAll('.eo-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setMoveFilterPill(btn.dataset.move);
      });
    });
  }
  if (eoFilterType) eoFilterType.addEventListener('change', renderEOSolutionsList);
  if (eoFilterAxis) eoFilterAxis.addEventListener('change', renderEOSolutionsList);
  if (eoFilterRzp) eoFilterRzp.addEventListener('change', renderEOSolutionsList);

  if (eoSolutionsList) {
    eoSolutionsList.addEventListener('scroll', () => {
      if (currentFilteredEOs && currentEORenderCount < currentFilteredEOs.length) {
        if (eoSolutionsList.scrollTop + eoSolutionsList.clientHeight >= eoSolutionsList.scrollHeight - 200) {
          appendEORows(EO_BATCH_SIZE);
        }
      }
    });
  }

  // --- 2. Mallard DR & Finish Analyzer Logic ---
  let currentMallardData = null;

  async function runMallardAnalysis(customEoStr) {
    const scrambleStr = scrambleInput.value.trim();
    const eoStr = (customEoStr !== undefined ? customEoStr : (mallardEoInput ? mallardEoInput.value : '')).trim();

    if (!scrambleStr) {
      if (mallardStatusBar) mallardStatusBar.textContent = 'Primero ingresa una mezcla válida arriba.';
      return;
    }
    if (!eoStr) {
      if (mallardStatusBar) mallardStatusBar.textContent = 'Ingresa o selecciona una secuencia de EO para analizar.';
      return;
    }

    if (mallardStatusBar) {
      mallardStatusBar.innerHTML = `Analizando mejores <b>DRs</b> y <b>Soluciones Completas (Domino Finish)</b> a partir del EO <code>${escapeHtml(eoStr)}</code>...`;
    }
    if (mallardResultsGrid) mallardResultsGrid.innerHTML = '';

    const t0 = performance.now();
    try {
      const res = await callSolverAsync('analyzeMallard', {
        scramble: scrambleStr,
        eo: eoStr,
        options: { maxDRSolutions: 18, maxExtraDRMoves: 10 }
      });
      currentMallardData = res;
      const elapsed = Math.round(performance.now() - t0);

      if (!res.validEO) {
        if (mallardStatusBar) {
          mallardStatusBar.innerHTML = `<span style="color:#f87171;">${escapeHtml(res.message)}</span>`;
        }
        return;
      }

      if (mallardStatusBar) {
        mallardStatusBar.innerHTML = `EO válido en eje <b>${res.eoAxes.join(', ')}</b> (${res.eoLen} movs) &bull; Se encontraron <b>${res.drResults.length} soluciones DR + Finish</b> en ${elapsed} ms.`;
      }
      renderMallardResults();
    } catch (err) {
      if (mallardStatusBar) {
        mallardStatusBar.textContent = 'Error en análisis Mallard: ' + err.message;
      }
    }
  }

  function renderMallardResults() {
    if (!mallardResultsGrid || !currentMallardData || !currentMallardData.validEO) return;

    const axisFilter = mallardFilterAxis ? mallardFilterAxis.value : 'all';
    const dirFilter = mallardFilterDir ? mallardFilterDir.value : 'all';

    const list = (currentMallardData.drResults || []).filter(item => {
      if (axisFilter !== 'all' && item.drAxis !== axisFilter) return false;
      if (dirFilter !== 'all') {
        if (dirFilter === 'RZP') {
          if (!item.direction.includes('RZP')) return false;
        } else if (item.direction !== dirFilter) {
          return false;
        }
      }
      return true;
    });

    mallardResultsGrid.innerHTML = '';

    if (list.length === 0) {
      mallardResultsGrid.innerHTML = `<div style="padding: 16px; color: #9a9ca8; font-size: 13px;">No se encontraron DRs con los filtros seleccionados.</div>`;
      return;
    }

    list.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'mallard-card';

      card.innerHTML = `
        <div class="mallard-card-top">
          <div class="mallard-badges">
            <span class="mallard-badge-dr">#${idx + 1} &bull; EO-${item.eoAxis} &rarr; DR-${item.drAxis}</span>
            <span class="mallard-badge-dir">${escapeHtml(item.direction)} &bull; DR en ${item.totalDRLen}m</span>
          </div>
          <span class="mallard-ftm-pill" title="Longitud de la solución completa (EO + DR + Finish)">Solve: ${item.totalSolveFTM} FTM</span>
        </div>
        <div class="mallard-steps-box">${highlightFMC(item.fmcReconstruction)}</div>
        <div class="mallard-card-actions">
          <button type="button" class="mallard-action-btn btn-load-dr" title="Cargar solo hasta el DR en el editor principal">Cargar Solo DR (${item.totalDRLen}m)</button>
          <button type="button" class="mallard-action-btn primary btn-load-solve" title="Cargar la solución completa comentada en el editor principal">Cargar Solve Completa (${item.totalSolveFTM} FTM)</button>
        </div>
      `;

      const btnLoadDR = card.querySelector('.btn-load-dr');
      if (btnLoadDR) {
        btnLoadDR.addEventListener('click', () => {
          movesInput.value = item.drOnlyReconstruction;
          updateSolution();
          setStep(parsedSolution.finalMoves.length);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast(`DR-${item.drAxis} (${item.totalDRLen} movs) cargado en el editor`);
        });
      }

      const btnLoadSolve = card.querySelector('.btn-load-solve');
      if (btnLoadSolve) {
        btnLoadSolve.addEventListener('click', () => {
          movesInput.value = item.fmcReconstruction;
          if (highlightSelect) highlightSelect.value = 'Full';
          updateSolution();
          setStep(parsedSolution.finalMoves.length);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast(`Solución Mallard (${item.totalSolveFTM} FTM) cargada en el editor`);
        });
      }

      mallardResultsGrid.appendChild(card);
    });
  }

  if (btnRunMallard) {
    btnRunMallard.addEventListener('click', () => runMallardAnalysis());
  }
  if (mallardEoInput) {
    mallardEoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runMallardAnalysis();
      }
    });
  }
  if (mallardFilterAxis) mallardFilterAxis.addEventListener('change', renderMallardResults);
  if (mallardFilterDir) mallardFilterDir.addEventListener('change', renderMallardResults);

  // --- 3. Optimal Solver (Nissy style `solve optimal`: finds the single shortest solution) ---
  let isOptimalRunning = false;
  let optimalTimerInterval = null;
  let optimalStartTime = 0;
  let streamedOptimalSolutions = [];

  function renderOptimalSolutions(solutions) {
    if (!optimalResultsList) return;
    optimalResultsList.innerHTML = '';

    solutions.forEach((sol, idx) => {
      const row = document.createElement('div');
      row.className = 'optimal-sol-row';
      const badgeText = solutions.length > 1
        ? `Óptimo #${idx + 1} &bull; ${sol.ftm} FTM`
        : `Óptimo &bull; ${sol.ftm} FTM`;
      row.innerHTML = `
        <div class="optimal-sol-left">
          <span class="optimal-ftm-badge">${badgeText}</span>
          <span class="optimal-sol-alg">${escapeHtml(sol.alg)}</span>
        </div>
        <div class="optimal-sol-actions">
          <button type="button" class="mallard-action-btn btn-copy-opt">Copiar</button>
          <button type="button" class="mallard-action-btn primary btn-load-opt">Cargar en Editor</button>
        </div>
      `;

      const copyBtn = row.querySelector('.btn-copy-opt');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(`${sol.alg} (${sol.ftm})`).then(() => {
            showToast(`Copiado: ${sol.alg} (${sol.ftm} FTM)`);
          });
        });
      }

      const loadBtn = row.querySelector('.btn-load-opt');
      if (loadBtn) {
        loadBtn.addEventListener('click', () => {
          const suffix = solutions.length > 1 ? ` #${idx + 1}` : '';
          movesInput.value = `${sol.alg} // Solución Óptima${suffix} (${sol.ftm} FTM)`;
          if (highlightSelect) highlightSelect.value = 'Full';
          updateSolution();
          setStep(parsedSolution.finalMoves.length);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast(`Solución óptima de ${sol.ftm} FTM cargada en el editor`);
        });
      }

      optimalResultsList.appendChild(row);
    });
  }

  function stopOptimalCalculation(userCancelled = false) {
    isOptimalRunning = false;
    if (optimalTimerInterval) {
      clearInterval(optimalTimerInterval);
      optimalTimerInterval = null;
    }
    if (btnCalcOptimal) btnCalcOptimal.style.display = '';
    if (btnStopOptimal) btnStopOptimal.style.display = 'none';

    if (userCancelled) {
      // Terminate current worker immediately and respawn a fresh one
      if (solverWorker) {
        solverWorker.terminate();
        workerCallbacks.clear();
        solverWorker = FMCSolver.createSolverWorker();
        bindWorkerEvents(solverWorker);
      }
      const elapsedSec = ((performance.now() - optimalStartTime) / 1000).toFixed(1);
      if (optimalStatusBar) {
        if (streamedOptimalSolutions.length > 1) {
          optimalStatusBar.innerHTML = `Búsqueda detenida a los ${elapsedSec}s. <b>${streamedOptimalSolutions.length} soluciones óptimas</b> de <b>${streamedOptimalSolutions[0].ftm} FTM</b> encontradas.`;
        } else if (streamedOptimalSolutions.length === 1) {
          optimalStatusBar.innerHTML = `Búsqueda detenida a los ${elapsedSec}s. Solución más corta encontrada: <b>${streamedOptimalSolutions[0].ftm} FTM</b>.`;
        } else {
          optimalStatusBar.innerHTML = `Búsqueda detenida a los ${elapsedSec}s.`;
        }
      }
    }
  }

  if (btnCalcOptimal) {
    btnCalcOptimal.addEventListener('click', async () => {
      if (isOptimalRunning) return;
      const scrambleStr = scrambleInput.value.trim();
      if (!scrambleStr) {
        if (optimalStatusBar) optimalStatusBar.textContent = 'Primero ingresa una mezcla válida arriba.';
        return;
      }

      const timeLimitMs = 15000;
      isOptimalRunning = true;
      streamedOptimalSolutions = [];
      optimalStartTime = performance.now();
      if (optimalResultsList) optimalResultsList.innerHTML = '';

      btnCalcOptimal.style.display = 'none';
      if (btnStopOptimal) btnStopOptimal.style.display = '';

      let currentDepthInfo = '';
      optimalTimerInterval = setInterval(() => {
        const sec = ((performance.now() - optimalStartTime) / 1000).toFixed(1);
        const countTxt = streamedOptimalSolutions.length > 1
          ? ` (${streamedOptimalSolutions.length} sol.)`
          : '';
        const bestTxt = streamedOptimalSolutions.length > 0
          ? ` &bull; Mejor actual: <b>${streamedOptimalSolutions[0].ftm} FTM</b>${countTxt}`
          : '';
        if (optimalStatusBar) {
          optimalStatusBar.innerHTML = `Buscando la solución más óptima (<code>solve optimal</code>)... <b>${sec}s</b>${currentDepthInfo}${bestTxt}`;
        }
      }, 100);

      try {
        const res = await callSolverAsync(
          'findOptimal',
          {
            scramble: scrambleStr,
            options: { timeLimitMs }
          },
          (prog) => {
            if (!isOptimalRunning) return;
            if (prog.type === 'progress' && prog.depth !== undefined) {
              currentDepthInfo = ` (Fase 1 prof. ${prog.depth})`;
            } else if (prog.type === 'solution') {
              if (prog.solutions && prog.solutions.length > 0) {
                streamedOptimalSolutions = prog.solutions;
              } else {
                streamedOptimalSolutions = [{ alg: prog.alg, ftm: prog.ftm }];
              }
              renderOptimalSolutions(streamedOptimalSolutions);
            }
          }
        );

        if (!isOptimalRunning) return;
        stopOptimalCalculation(false);

        const totalSec = (res.elapsedMs / 1000).toFixed(2);
        if (res.solutions && res.solutions.length > 0) {
          streamedOptimalSolutions = res.solutions;
          renderOptimalSolutions(streamedOptimalSolutions);
          if (optimalStatusBar) {
            if (res.solutions.length > 1) {
              optimalStatusBar.innerHTML = `<b>${res.solutions.length} soluciones óptimas</b> de <b>${res.bestFTM} FTM</b> encontradas en <b>${totalSec}s</b>.`;
            } else {
              optimalStatusBar.innerHTML = `Solución óptima encontrada en <b>${totalSec}s</b> &bull; <b>${res.bestFTM} movimientos (FTM)</b>.`;
            }
          }
        } else {
          if (optimalStatusBar) {
            optimalStatusBar.textContent = 'No se encontró solución.';
          }
        }
      } catch (err) {
        if (!isOptimalRunning) return;
        stopOptimalCalculation(false);
        if (optimalStatusBar) {
          optimalStatusBar.textContent = 'Error al calcular solución óptima: ' + err.message;
        }
      }
    });
  }

  if (btnStopOptimal) {
    btnStopOptimal.addEventListener('click', () => {
      stopOptimalCalculation(true);
    });
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
