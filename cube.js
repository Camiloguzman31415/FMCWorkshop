// cube.js - Complete Rubik's Cube Engine for FMCWorkshop

(function (global) {
  'use strict';

  // Facelet Indices in 54-array:
  // U: 0..8 (White)
  // R: 9..17 (Red)
  // F: 18..26 (Green)
  // D: 27..35 (Yellow)
  // L: 36..44 (Orange)
  // B: 45..53 (Blue)

  const U = 0, R = 1, F = 2, D = 3, L = 4, B = 5;

  const COLOR_NAMES = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];
  const COLOR_HEX = {
    white: '#FFFFFF',
    red: '#C41E3A',
    green: '#009B48',
    yellow: '#FFD500',
    orange: '#FF5800',
    blue: '#0046AD'
  };

  // 12 Edges definitions (facelet index 1, facelet index 2)
  const EDGES = [
    { name: 'UB', f1: 1,  f2: 46, piece: ['U', 'B'] },
    { name: 'UL', f1: 3,  f2: 37, piece: ['U', 'L'] },
    { name: 'UR', f1: 5,  f2: 10, piece: ['U', 'R'] },
    { name: 'UF', f1: 7,  f2: 19, piece: ['U', 'F'] },
    { name: 'DF', f1: 28, f2: 25, piece: ['D', 'F'] },
    { name: 'DL', f1: 30, f2: 43, piece: ['D', 'L'] },
    { name: 'DR', f1: 32, f2: 16, piece: ['D', 'R'] },
    { name: 'DB', f1: 34, f2: 52, piece: ['D', 'B'] },
    { name: 'FR', f1: 23, f2: 12, piece: ['F', 'R'] },
    { name: 'FL', f1: 21, f2: 41, piece: ['F', 'L'] },
    { name: 'BR', f1: 48, f2: 14, piece: ['B', 'R'] },
    { name: 'BL', f1: 50, f2: 39, piece: ['B', 'L'] }
  ];

  // 8 Corners definitions (facelet indices: U/D facelet, F/B facelet, L/R facelet)
  const CORNERS = [
    { name: 'UFL', fU: 6,  fFB: 18, fLR: 38 },
    { name: 'UFR', fU: 8,  fFB: 20, fLR: 9  },
    { name: 'UBL', fU: 0,  fFB: 47, fLR: 36 },
    { name: 'UBR', fU: 2,  fFB: 45, fLR: 11 },
    { name: 'DFL', fU: 27, fFB: 24, fLR: 44 },
    { name: 'DFR', fU: 29, fFB: 26, fLR: 15 },
    { name: 'DBL', fU: 33, fFB: 53, fLR: 42 },
    { name: 'DBR', fU: 35, fFB: 51, fLR: 17 }
  ];

  class CubeModel {
    constructor() {
      this.reset();
    }

    reset() {
      this.state = new Int8Array(54);
      for (let face = 0; face < 6; face++) {
        for (let i = 0; i < 9; i++) {
          this.state[face * 9 + i] = face;
        }
      }
    }

    clone() {
      const c = new CubeModel();
      c.state.set(this.state);
      return c;
    }

    rotateFaceCW(faceOffset) {
      const s = this.state;
      const p0 = s[faceOffset + 0], p1 = s[faceOffset + 1], p2 = s[faceOffset + 2];
      const p3 = s[faceOffset + 3], p4 = s[faceOffset + 4], p5 = s[faceOffset + 5];
      const p6 = s[faceOffset + 6], p7 = s[faceOffset + 7], p8 = s[faceOffset + 8];
      s[faceOffset + 0] = p6; s[faceOffset + 1] = p3; s[faceOffset + 2] = p0;
      s[faceOffset + 3] = p7; s[faceOffset + 4] = p4; s[faceOffset + 5] = p1;
      s[faceOffset + 6] = p8; s[faceOffset + 7] = p5; s[faceOffset + 8] = p2;
    }

    moveU() {
      this.rotateFaceCW(0);
      const s = this.state;
      const t0 = s[36], t1 = s[37], t2 = s[38];
      s[36] = s[18]; s[37] = s[19]; s[38] = s[20];
      s[18] = s[9];  s[19] = s[10]; s[20] = s[11];
      s[9]  = s[45]; s[10] = s[46]; s[11] = s[47];
      s[45] = t0;    s[46] = t1;    s[47] = t2;
    }

    moveD() {
      this.rotateFaceCW(27);
      const s = this.state;
      const t0 = s[24], t1 = s[25], t2 = s[26];
      s[24] = s[42]; s[25] = s[43]; s[26] = s[44];
      s[42] = s[51]; s[43] = s[52]; s[44] = s[53];
      s[51] = s[15]; s[52] = s[16]; s[53] = s[17];
      s[15] = t0;    s[16] = t1;    s[17] = t2;
    }

    moveR() {
      this.rotateFaceCW(9);
      const s = this.state;
      const t0 = s[2], t1 = s[5], t2 = s[8];
      s[2]  = s[20]; s[5]  = s[23]; s[8]  = s[26];
      s[20] = s[29]; s[23] = s[32]; s[26] = s[35];
      s[29] = s[51]; s[32] = s[48]; s[35] = s[45];
      s[51] = t0;    s[48] = t1;    s[45] = t2;
    }

    moveL() {
      this.rotateFaceCW(36);
      const s = this.state;
      const t0 = s[0], t1 = s[3], t2 = s[6];
      s[0]  = s[53]; s[3]  = s[50]; s[6]  = s[47];
      s[53] = s[27]; s[50] = s[30]; s[47] = s[33];
      s[27] = s[18]; s[30] = s[21]; s[33] = s[24];
      s[18] = t0;    s[21] = t1;    s[24] = t2;
    }

    moveF() {
      this.rotateFaceCW(18);
      const s = this.state;
      const t0 = s[6], t1 = s[7], t2 = s[8];
      s[6]  = s[44]; s[7]  = s[41]; s[8]  = s[38];
      s[44] = s[29]; s[41] = s[28]; s[38] = s[27];
      s[29] = s[9];  s[28] = s[12]; s[27] = s[15];
      s[9]  = t0;    s[12] = t1;    s[15] = t2;
    }

    moveB() {
      this.rotateFaceCW(45);
      const s = this.state;
      const t0 = s[0], t1 = s[1], t2 = s[2];
      s[0]  = s[11]; s[1]  = s[14]; s[2]  = s[17];
      s[11] = s[35]; s[14] = s[34]; s[17] = s[33];
      s[35] = s[42]; s[34] = s[39]; s[33] = s[36];
      s[42] = t0;    s[39] = t1;    s[36] = t2;
    }

    // Slices and Rotations
    moveM() {
      // M follows L direction (between L and R)
      // U(1,4,7) -> F(19,22,25) -> D(28,31,34) -> B(46,49,52)
      const s = this.state;
      const t1 = s[1], t4 = s[4], t7 = s[7];
      s[1] = s[52]; s[4] = s[49]; s[7] = s[46];
      s[52] = s[34]; s[49] = s[31]; s[46] = s[28];
      s[34] = s[25]; s[31] = s[22]; s[28] = s[19];
      s[25] = t7; s[22] = t4; s[19] = t1;
    }

    moveE() {
      // E follows D direction
      // F(21,22,23) <- L(39,40,41) <- B(48,49,50) <- R(14,13,12)
      const s = this.state;
      const t1 = s[21], t2 = s[22], t3 = s[23];
      s[21] = s[39]; s[22] = s[40]; s[23] = s[41];
      s[39] = s[48]; s[40] = s[49]; s[41] = s[50];
      s[48] = s[14]; s[49] = s[13]; s[50] = s[12];
      s[12] = t3;    s[13] = t2;    s[14] = t1;
    }

    moveS() {
      // S follows F direction
      // U(3,4,5) -> R(10,13,16) -> D(32,31,30) -> L(43,40,37)
      const s = this.state;
      const t3 = s[3], t4 = s[4], t5 = s[5];
      s[3] = s[43]; s[4] = s[40]; s[5] = s[37];
      s[43] = s[30]; s[40] = s[31]; s[37] = s[32];
      s[30] = s[16]; s[31] = s[13]; s[32] = s[10];
      s[16] = t5;    s[13] = t4;    s[10] = t3;
    }

    moveX() {
      // x = R L' M'
      this.applyMove('R');
      this.applyMove("L'");
      this.applyMove("M'");
    }

    moveY() {
      // y = U D' E'
      this.applyMove('U');
      this.applyMove("D'");
      this.applyMove("E'");
    }

    moveZ() {
      // z = F B' S
      this.applyMove('F');
      this.applyMove("B'");
      this.applyMove('S');
    }

    applySingleStep(base) {
      switch (base) {
        case 'U': this.moveU(); break;
        case 'D': this.moveD(); break;
        case 'R': this.moveR(); break;
        case 'L': this.moveL(); break;
        case 'F': this.moveF(); break;
        case 'B': this.moveB(); break;
        case 'M': this.moveM(); break;
        case 'E': this.moveE(); break;
        case 'S': this.moveS(); break;
        case 'x': this.moveX(); break;
        case 'y': this.moveY(); break;
        case 'z': this.moveZ(); break;
        // wide moves:
        case 'u': case 'Uw': this.moveU(); this.applyMove("E'"); break;
        case 'd': case 'Dw': this.moveD(); this.moveE(); break;
        case 'r': case 'Rw': this.moveR(); this.applyMove("M'"); break;
        case 'l': case 'Lw': this.moveL(); this.moveM(); break;
        case 'f': case 'Fw': this.moveF(); this.moveS(); break;
        case 'b': case 'Bw': this.moveB(); this.applyMove("S'"); break;
        default: break;
      }
    }

    applyMove(m) {
      if (!m || typeof m !== 'string') return;
      m = m.trim();
      if (!m) return;

      let base = m[0];
      let modifier = m.slice(1);

      // Handle wide moves like 'Rw', 'Uw'
      if (m.length >= 2 && (m[1] === 'w' || m[1] === 'W')) {
        base = m.slice(0, 2);
        modifier = m.slice(2);
      }

      let times = 1;
      if (modifier === '2' || modifier === "2'" || modifier === "2w") {
        times = 2;
      } else if (modifier === "'" || modifier === "3") {
        times = 3;
      }

      for (let t = 0; t < times; t++) {
        this.applySingleStep(base);
      }
    }

    applyAlg(alg) {
      if (!alg) return;
      const tokens = Array.isArray(alg) ? alg : alg.trim().split(/\s+/).filter(Boolean);
      for (const t of tokens) {
        this.applyMove(t);
      }
    }

    isSolved() {
      for (let f = 0; f < 6; f++) {
        const center = this.state[f * 9 + 4];
        for (let i = 0; i < 9; i++) {
          if (this.state[f * 9 + i] !== center) return false;
        }
      }
      return true;
    }
  }

  // --- FMC Algorithms and Helpers ---

  function invertMove(m) {
    if (!m) return '';
    m = m.trim();
    if (m.endsWith("2") || m.endsWith("2'")) {
      return m.replace(/['2]+/g, '') + '2';
    }
    if (m.endsWith("'")) {
      return m.slice(0, -1);
    }
    return m + "'";
  }

  function invertAlg(alg) {
    if (!alg) return '';
    const tokens = (Array.isArray(alg) ? alg : alg.trim().split(/\s+/)).filter(Boolean);
    return tokens.reverse().map(invertMove).join(' ');
  }

  // Expand commutators like [A, B] -> A B A' B' and conjugates [A: B] -> A B A'
  function expandCommutators(str) {
    let prev = '';
    let curr = str;
    let guard = 0;
    while (curr !== prev && guard < 10) {
      prev = curr;
      guard++;
      // [A: B] conjugate
      curr = curr.replace(/\[\s*([^,:\[\]]+)\s*:\s*([^,:\[\]]+)\s*\]/g, (match, a, b) => {
        const aInv = invertAlg(a.trim());
        return ` ${a.trim()} ${b.trim()} ${aInv} `;
      });
      // [A, B] commutator
      curr = curr.replace(/\[\s*([^,:\[\]]+)\s*,\s*([^,:\[\]]+)\s*\]/g, (match, a, b) => {
        const aInv = invertAlg(a.trim());
        const bInv = invertAlg(b.trim());
        return ` ${a.trim()} ${b.trim()} ${aInv} ${bInv} `;
      });
    }
    return curr;
  }

  // Parse FMC Moves Input:
  // Handles comments (//...), insertions (@, @1, *, *1), and NISS parentheses ( ... )
  function parseFMCSolution(inputText) {
    if (!inputText) {
      return {
        normalMoves: [],
        inverseMoves: [],
        invertedInverse: [],
        finalMoves: [],
        finalResultStr: '',
        ftm: 0,
        timeline: []
      };
    }

    const lines = inputText.split('\n');
    const bodyLines = [];
    const insertionDefs = {};

    for (let line of lines) {
      const trimmed = line.trim();
      // Check for insertion definition: @=, @1=, @1:, *=, *1=, *1:, etc.
      const insMatch = trimmed.match(/^([@*]+[0-9]*|\[[0-9]+\])\s*[:=]\s*(.+)$/i);
      if (insMatch) {
        const tag = insMatch[1].trim();
        let val = insMatch[2].trim();
        // remove comments from definition
        val = val.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
        // expand commutators if any
        val = expandCommutators(val);
        insertionDefs[tag] = val;
      } else {
        bodyLines.push(line);
      }
    }

    let fullBody = bodyLines.join('\n');
    // Remove comments from body
    fullBody = fullBody.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    fullBody = expandCommutators(fullBody);

    // Replace insertions in body
    const sortedKeys = Object.keys(insertionDefs).sort((a, b) => b.length - a.length);
    for (const tag of sortedKeys) {
      const escaped = tag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const reg = new RegExp(escaped, 'g');
      fullBody = fullBody.replace(reg, ' ' + insertionDefs[tag] + ' ');
    }

    // Now parse NISS
    const normalMoves = [];
    const inverseMoves = [];
    const timeline = []; // structured sequence of steps with type 'normal' or 'inverse'
    let currentIsInverse = false;

    // We can also extract moves with their NISS context
    let buffer = '';
    for (let i = 0; i < fullBody.length; i++) {
      const ch = fullBody[i];
      if (ch === '(') {
        if (buffer.trim()) {
          const moves = buffer.trim().split(/\s+/).filter(Boolean);
          for (const m of moves) {
            if (currentIsInverse) {
              inverseMoves.push(m);
              timeline.push({ move: m, isInverse: true });
            } else {
              normalMoves.push(m);
              timeline.push({ move: m, isInverse: false });
            }
          }
          buffer = '';
        }
        currentIsInverse = true;
      } else if (ch === ')') {
        if (buffer.trim()) {
          const moves = buffer.trim().split(/\s+/).filter(Boolean);
          for (const m of moves) {
            if (currentIsInverse) {
              inverseMoves.push(m);
              timeline.push({ move: m, isInverse: true });
            } else {
              normalMoves.push(m);
              timeline.push({ move: m, isInverse: false });
            }
          }
          buffer = '';
        }
        currentIsInverse = false;
      } else {
        buffer += ch;
      }
    }
    if (buffer.trim()) {
      const moves = buffer.trim().split(/\s+/).filter(Boolean);
      for (const m of moves) {
        if (currentIsInverse) {
          inverseMoves.push(m);
          timeline.push({ move: m, isInverse: true });
        } else {
          normalMoves.push(m);
          timeline.push({ move: m, isInverse: false });
        }
      }
    }

    // Final result: Normal moves followed by inverse of inverse moves
    const invertedInverse = [...inverseMoves].reverse().map(invertMove);
    const finalMoves = [...normalMoves, ...invertedInverse];

    return {
      normalMoves,
      inverseMoves,
      invertedInverse,
      finalMoves,
      finalResultStr: finalMoves.join(' '),
      ftm: finalMoves.length,
      timeline
    };
  }

  // --- Highlighting / State Analysis (EO, DR) ---

  // Check Edge Orientation
  // Axis: 'FB' (standard FMC default), 'RL', 'UD'
  function checkEO(cubeState, axis = 'FB') {
    const badEdges = [];
    const orientedEdges = [];

    // Dynamically retrieve center colors to support rotated cube states
    const uColor = cubeState[4];
    const dColor = cubeState[31];
    const fColor = cubeState[22];
    const bColor = cubeState[49];
    const rColor = cubeState[13];
    const lColor = cubeState[40];

    EDGES.forEach((e) => {
      const c1 = cubeState[e.f1];
      const c2 = cubeState[e.f2];
      let isBad = false;

      if (axis === 'FB') {
        // Axis F/B: Allowed moves <U, D, L, R, F2, B2>. Flipping moves: F, B.
        // Primary colors: U/D. Secondary: F/B.
        // Good facelet for all 12 positions is f1 (U for U-layer, D for D-layer, F/B for E-slice).
        if (c1 === uColor || c1 === dColor) isBad = false;
        else if (c2 === uColor || c2 === dColor) isBad = true;
        else if (c1 === fColor || c1 === bColor) isBad = false;
        else if (c2 === fColor || c2 === bColor) isBad = true;
      } else if (axis === 'RL') {
        // Axis R/L: Allowed moves <U, D, F, B, R2, L2>. Flipping moves: R, L.
        // Primary colors: U/D. Secondary: R/L.
        // Good facelet: f1 for U/D-layer edges; f2 for E-slice edges (where f2 is R or L).
        const isEslice = (e.name === 'FR' || e.name === 'FL' || e.name === 'BR' || e.name === 'BL');
        const goodColor = isEslice ? c2 : c1;
        const badColor  = isEslice ? c1 : c2;

        if (goodColor === uColor || goodColor === dColor) isBad = false;
        else if (badColor === uColor || badColor === dColor) isBad = true;
        else if (goodColor === rColor || goodColor === lColor) isBad = false;
        else if (badColor === rColor || badColor === lColor) isBad = true;
      } else if (axis === 'UD') {
        // Axis U/D: Allowed moves <F, B, R, L, U2, D2>. Flipping moves: U, D.
        // Primary colors: F/B. Secondary: U/D.
        // Good facelet: f2 for S-slice edges (UF, DF, UB, DB where f2 is F or B);
        // f1 for all others (E-slice f1 is F/B, M-slice f1 is U/D).
        const isSslice = (e.name === 'UF' || e.name === 'DF' || e.name === 'UB' || e.name === 'DB');
        const goodColor = isSslice ? c2 : c1;
        const badColor  = isSslice ? c1 : c2;

        if (goodColor === fColor || goodColor === bColor) isBad = false;
        else if (badColor === fColor || badColor === bColor) isBad = true;
        else if (goodColor === uColor || goodColor === dColor) isBad = false;
        else if (badColor === uColor || badColor === dColor) isBad = true;
      }

      if (isBad) badEdges.push(e);
      else orientedEdges.push(e);
    });

    return {
      axis,
      badCount: badEdges.length,
      badEdges,
      orientedEdges,
      isSolved: badEdges.length === 0
    };
  }

  // Parse FMC moves up to a specific cursor offset
  function parseFMCAtCursor(inputText, cursor) {
    if (!inputText || cursor === undefined || cursor === null) {
      return {
        isCurrentlyInverse: false,
        normalMoves: [],
        inverseMoves: [],
        currentBlockInverseMoves: [],
        lastMove: null,
        totalStep: 0
      };
    }

    // 1. Extract insertion definitions from full text
    const lines = inputText.split('\n');
    const insertionDefs = {};
    for (let line of lines) {
      const trimmed = line.trim();
      const insMatch = trimmed.match(/^([@*]+[0-9]*|\[[0-9]+\])\s*[:=]\s*(.+)$/i);
      if (insMatch) {
        const tag = insMatch[1].trim();
        let val = insMatch[2].trim().replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
        val = expandCommutators(val);
        insertionDefs[tag] = val;
      }
    }

    // 2. Extract code before cursor
    const textBefore = inputText.slice(0, cursor);
    const beforeLines = textBefore.split('\n');

    let cleanLines = [];
    for (let i = 0; i < beforeLines.length; i++) {
      let line = beforeLines[i];
      if (line.trim().match(/^([@*]+[0-9]*|\[[0-9]+\])\s*[:=]/)) {
        continue;
      }
      const commentIdx = line.indexOf('//');
      if (commentIdx !== -1) {
        line = line.slice(0, commentIdx);
      }
      cleanLines.push(line);
    }

    let code = cleanLines.join('\n');
    code = expandCommutators(code);

    const sortedKeys = Object.keys(insertionDefs).sort((a, b) => b.length - a.length);
    for (const tag of sortedKeys) {
      const escaped = tag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      code = code.replace(new RegExp(escaped, 'g'), ' ' + insertionDefs[tag] + ' ');
    }

    let normalMoves = [];
    let inverseMoves = [];
    let currentBlockInverseMoves = [];
    let isCurrentlyInverse = false;
    let lastMove = null;

    let buffer = '';
    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      if (ch === '(') {
        if (buffer.trim()) {
          const moves = buffer.trim().split(/\s+/).filter(Boolean);
          for (const m of moves) {
            normalMoves.push(m);
            lastMove = { move: m, isInverse: false };
          }
          buffer = '';
        }
        isCurrentlyInverse = true;
        currentBlockInverseMoves = [];
      } else if (ch === ')') {
        if (buffer.trim()) {
          const moves = buffer.trim().split(/\s+/).filter(Boolean);
          for (const m of moves) {
            inverseMoves.push(m);
            currentBlockInverseMoves.push(m);
            lastMove = { move: m, isInverse: true };
          }
          buffer = '';
        }
        isCurrentlyInverse = false;
      } else {
        buffer += ch;
      }
    }

    if (buffer.trim()) {
      const moves = buffer.trim().split(/\s+/).filter(Boolean);
      for (const m of moves) {
        if (isCurrentlyInverse) {
          inverseMoves.push(m);
          currentBlockInverseMoves.push(m);
          lastMove = { move: m, isInverse: true };
        } else {
          normalMoves.push(m);
          lastMove = { move: m, isInverse: false };
        }
      }
    }

    return {
      isCurrentlyInverse,
      normalMoves,
      inverseMoves,
      currentBlockInverseMoves,
      lastMove,
      totalStep: normalMoves.length + inverseMoves.length
    };
  }

  // Check Domino Reduction (DR on U/D)
  // In DR on U/D:
  // 1. All 12 edges have EO satisfied (on F/B or R/L)
  // 2. All 8 corners have U/D colors on U or D facelets
  // 3. E-slice edges (FR, FL, BR, BL) are in the E-slice
  function checkDR(cubeState, eoAxis = 'FB') {
    const eoResult = checkEO(cubeState, eoAxis);

    // Check corner orientation to U/D
    let orientedCornersCount = 0;
    const badCorners = [];
    CORNERS.forEach(c => {
      const cu = cubeState[c.fU];
      if (cu === U || cu === D) {
        orientedCornersCount++;
      } else {
        badCorners.push(c);
      }
    });

    // Check E-slice edges: pieces with no U or D color
    // Should be in E-slice positions: FR, FL, BR, BL
    let eSliceCorrect = 0;
    const eSlicePositions = ['FR', 'FL', 'BR', 'BL'];
    EDGES.forEach(e => {
      const c1 = cubeState[e.f1];
      const c2 = cubeState[e.f2];
      const hasUD = (c1 === U || c1 === D || c2 === U || c2 === D);
      if (!hasUD) {
        // This is an E-slice piece. Is it in an E-slice position?
        if (eSlicePositions.includes(e.name)) {
          eSliceCorrect++;
        }
      }
    });

    const isDR = (eoResult.isSolved && orientedCornersCount === 8 && eSliceCorrect === 4);

    return {
      isDR,
      eoResult,
      cornersOriented: orientedCornersCount,
      badCorners,
      eSliceEdgesInSlice: eSliceCorrect
    };
  }

  // Generate standard random WCA scramble
  function generateRandomScramble(len = 22) {
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const oppositeFaces = {
      'U': 'D', 'D': 'U',
      'L': 'R', 'R': 'L',
      'F': 'B', 'B': 'F'
    };

    const moves = [];
    let lastFace = '';
    let secondLastFace = '';

    while (moves.length < len) {
      const face = faces[Math.floor(Math.random() * faces.length)];
      if (face === lastFace) continue;
      if (face === secondLastFace && oppositeFaces[lastFace] === face) continue;

      const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
      moves.push(face + mod);
      secondLastFace = lastFace;
      lastFace = face;
    }

    return moves.join(' ');
  }

  // Export
  const FMC = {
    CubeModel,
    EDGES,
    CORNERS,
    COLOR_NAMES,
    COLOR_HEX,
    U, R, F, D, L, B,
    invertMove,
    invertAlg,
    expandCommutators,
    parseFMCSolution,
    parseFMCAtCursor,
    checkEO,
    checkDR,
    generateRandomScramble
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FMC;
  } else {
    global.FMC = FMC;
  }
})(typeof window !== 'undefined' ? window : globalThis);
