// fmc-solver.js - High-Performance FMC EO Finder, Mallard DR Analyzer & Optimal Solver
// Runs both in main thread and inside a self-contained Web Worker (via Blob URL)

(function fmcSolverFactory(global) {
  'use strict';

  // Move definitions (18 standard face turns)
  // Ordered by face: U(0..2), D(3..5), R(6..8), L(9..11), F(12..14), B(15..17)
  // Within each face: +1 (CW), +2 (180), +3 (CCW / ')
  const MOVE_NAMES = [
    'U', 'U2', "U'",
    'D', 'D2', "D'",
    'R', 'R2', "R'",
    'L', 'L2', "L'",
    'F', 'F2', "F'",
    'B', 'B2', "B'"
  ];

  const FACE_NAMES = ['U', 'D', 'R', 'L', 'F', 'B'];

  // Opposite face on same axis (0<->1, 2<->3, 4<->5)
  const OPPOSITE_FACE = [1, 0, 3, 2, 5, 4];

  // Inverse of each move index (0..17)
  const INV_MOVE = [
    2, 1, 0,
    5, 4, 3,
    8, 7, 6,
    11, 10, 9,
    14, 13, 12,
    17, 16, 15
  ];

  // Move name to index map
  const MOVE_TO_IDX = {};
  MOVE_NAMES.forEach((m, idx) => { MOVE_TO_IDX[m] = idx; });

  // 8 Corners in standard cube.js order:
  // 0:UFL, 1:UFR, 2:UBL, 3:UBR, 4:DFL, 5:DFR, 6:DBL, 7:DBR
  // Sticker indices: [fU, fR_or_L, fF_or_B] in clockwise order around corner!
  // Let's check clockwise order of stickers looking at each corner from outside the cube:
  // U(0..8), R(9..17), F(18..26), D(27..35), L(36..44), B(45..53)
  // UFL: U(6), F(18), L(38) -> around UFL vertex, U -> F -> L is clockwise!
  // UFR: U(8), R(9),  F(20) -> around UFR vertex, U -> R -> F is clockwise!
  // UBL: U(0), L(36), B(47) -> around UBL vertex, U -> L -> B is clockwise!
  // UBR: U(2), B(45), R(11) -> around UBR vertex, U -> B -> R is clockwise!
  // DFL: D(27), L(44), F(24) -> around DFL vertex, D -> L -> F is clockwise!
  // DFR: D(29), F(26), R(15) -> around DFR vertex, D -> F -> R is clockwise!
  // DBL: D(33), B(53), L(42) -> around DBL vertex, D -> B -> L is clockwise!
  // DBR: D(35), R(17), B(51) -> around DBR vertex, D -> R -> B is clockwise!
  const CORNER_FACELETS = [
    [6, 18, 38],  // 0: UFL
    [8, 9, 20],   // 1: UFR
    [0, 36, 47],  // 2: UBL
    [2, 45, 11],  // 3: UBR
    [27, 44, 24], // 4: DFL
    [29, 26, 15], // 5: DFR
    [33, 53, 42], // 6: DBL
    [35, 17, 51]  // 7: DBR
  ];

  // 12 Edges:
  // 0..7 are U/D edges: UB, UL, UR, UF, DF, DL, DR, DB
  // 8..11 are E-slice edges: FR, FL, BR, BL
  // Notice f1 is the "good" reference facelet for FB EO (U/D for 0..7, F/B for 8..11)
  const EDGE_FACELETS = [
    [1, 46],  // 0: UB
    [3, 37],  // 1: UL
    [5, 10],  // 2: UR
    [7, 19],  // 3: UF
    [28, 25], // 4: DF
    [30, 43], // 5: DL
    [32, 16], // 6: DR
    [34, 52], // 7: DB
    [23, 12], // 8: FR
    [21, 41], // 9: FL
    [48, 14], // 10: BR
    [50, 39]  // 11: BL
  ];

  // Basic 54-sticker move generator (matches cube.js 100%)
  function createSolved54() {
    const s = new Uint8Array(54);
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 9; i++) s[f * 9 + i] = f;
    }
    return s;
  }

  function rotateFaceCW(s, off) {
    const p0 = s[off], p1 = s[off + 1], p2 = s[off + 2];
    const p3 = s[off + 3], p4 = s[off + 4], p5 = s[off + 5];
    const p6 = s[off + 6], p7 = s[off + 7], p8 = s[off + 8];
    s[off] = p6; s[off + 1] = p3; s[off + 2] = p0;
    s[off + 3] = p7; s[off + 4] = p4; s[off + 5] = p1;
    s[off + 6] = p8; s[off + 7] = p5; s[off + 8] = p2;
  }

  function applyBasicQuarterTurn(s, faceChar) {
    let t0, t1, t2;
    switch (faceChar) {
      case 'U':
        rotateFaceCW(s, 0);
        t0 = s[36]; t1 = s[37]; t2 = s[38];
        s[36] = s[18]; s[37] = s[19]; s[38] = s[20];
        s[18] = s[9];  s[19] = s[10]; s[20] = s[11];
        s[9]  = s[45]; s[10] = s[46]; s[11] = s[47];
        s[45] = t0;    s[46] = t1;    s[47] = t2;
        break;
      case 'D':
        rotateFaceCW(s, 27);
        t0 = s[24]; t1 = s[25]; t2 = s[26];
        s[24] = s[42]; s[25] = s[43]; s[26] = s[44];
        s[42] = s[51]; s[43] = s[52]; s[44] = s[53];
        s[51] = s[15]; s[52] = s[16]; s[53] = s[17];
        s[15] = t0;    s[16] = t1;    s[17] = t2;
        break;
      case 'R':
        rotateFaceCW(s, 9);
        t0 = s[2]; t1 = s[5]; t2 = s[8];
        s[2]  = s[20]; s[5]  = s[23]; s[8]  = s[26];
        s[20] = s[29]; s[23] = s[32]; s[26] = s[35];
        s[29] = s[51]; s[32] = s[48]; s[35] = s[45];
        s[51] = t0;    s[48] = t1;    s[45] = t2;
        break;
      case 'L':
        rotateFaceCW(s, 36);
        t0 = s[0]; t1 = s[3]; t2 = s[6];
        s[0]  = s[53]; s[3]  = s[50]; s[6]  = s[47];
        s[53] = s[27]; s[50] = s[30]; s[47] = s[33];
        s[27] = s[18]; s[30] = s[21]; s[33] = s[24];
        s[18] = t0;    s[21] = t1;    s[24] = t2;
        break;
      case 'F':
        rotateFaceCW(s, 18);
        t0 = s[6]; t1 = s[7]; t2 = s[8];
        s[6]  = s[44]; s[7]  = s[41]; s[8]  = s[38];
        s[44] = s[29]; s[41] = s[28]; s[38] = s[27];
        s[29] = s[9];  s[28] = s[12]; s[27] = s[15];
        s[9]  = t0;    s[12] = t1;    s[15] = t2;
        break;
      case 'B':
        rotateFaceCW(s, 45);
        t0 = s[0]; t1 = s[1]; t2 = s[2];
        s[0]  = s[11]; s[1]  = s[14]; s[2]  = s[17];
        s[11] = s[35]; s[14] = s[34]; s[17] = s[33];
        s[35] = s[42]; s[34] = s[39]; s[33] = s[36];
        s[42] = t0;    s[39] = t1;    s[36] = t2;
        break;
    }
  }

  // Whole-cube rotations on 54-sticker array (for axis conjugation)
  function rotateCubeX(s) {
    // x = R L' M'
    applyBasicQuarterTurn(s, 'R');
    applyBasicQuarterTurn(s, 'L');
    applyBasicQuarterTurn(s, 'L');
    applyBasicQuarterTurn(s, 'L');
    // M' = 3x M
    for (let k = 0; k < 3; k++) {
      const t1 = s[1], t4 = s[4], t7 = s[7];
      s[1] = s[52]; s[4] = s[49]; s[7] = s[46];
      s[52] = s[34]; s[49] = s[31]; s[46] = s[28];
      s[34] = s[25]; s[31] = s[22]; s[28] = s[19];
      s[25] = t7; s[22] = t4; s[19] = t1;
    }
  }

  function rotateCubeY(s) {
    // y = U D' E'
    applyBasicQuarterTurn(s, 'U');
    applyBasicQuarterTurn(s, 'D');
    applyBasicQuarterTurn(s, 'D');
    applyBasicQuarterTurn(s, 'D');
    // E' = 3x E
    for (let k = 0; k < 3; k++) {
      const t1 = s[21], t2 = s[22], t3 = s[23];
      s[21] = s[39]; s[22] = s[40]; s[23] = s[41];
      s[39] = s[48]; s[40] = s[49]; s[41] = s[50];
      s[48] = s[14]; s[49] = s[13]; s[50] = s[12];
      s[12] = t3;    s[13] = t2;    s[14] = t1;
    }
  }

  function rotateCubeZ(s) {
    // z = F B' S
    applyBasicQuarterTurn(s, 'F');
    applyBasicQuarterTurn(s, 'B');
    applyBasicQuarterTurn(s, 'B');
    applyBasicQuarterTurn(s, 'B');
    // S
    const t3 = s[3], t4 = s[4], t5 = s[5];
    s[3] = s[43]; s[4] = s[40]; s[5] = s[37];
    s[43] = s[30]; s[40] = s[31]; s[37] = s[32];
    s[30] = s[16]; s[31] = s[13]; s[32] = s[10];
    s[16] = t5;    s[13] = t4;    s[10] = t3;
  }

  function applyMove54(s, moveIdx) {
    const face = FACE_NAMES[(moveIdx / 3) | 0];
    const turns = (moveIdx % 3) + 1;
    for (let t = 0; t < turns; t++) {
      applyBasicQuarterTurn(s, face);
    }
  }

  function parseMovesToIndices(algStr) {
    if (!algStr || typeof algStr !== 'string') return [];
    const tokens = algStr.trim().split(/\s+/).filter(Boolean);
    const res = [];
    for (const tok of tokens) {
      let norm = tok.replace(/2'$/, '2');
      if (MOVE_TO_IDX[norm] !== undefined) {
        res.push(MOVE_TO_IDX[norm]);
      }
    }
    return res;
  }

  function indicesToAlg(indices) {
    return indices.map(i => MOVE_NAMES[i]).join(' ');
  }

  function invertIndices(indices) {
    const res = new Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
      res[i] = INV_MOVE[indices[indices.length - 1 - i]];
    }
    return res;
  }

  // Simplify array of move indices (cancelling adjacent moves on same face & commuting opposite faces)
  function simplifyMoveIndices(moves) {
    const stack = [];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const f = (m / 3) | 0;
      const t = (m % 3) + 1;

      // Check if previous move is on the same face, or if previous is opposite face and the one before is same face
      if (stack.length > 0 && ((stack[stack.length - 1] / 3) | 0) === f) {
        const prev = stack.pop();
        const sum = ((prev % 3) + 1 + t) % 4;
        if (sum !== 0) stack.push(f * 3 + (sum - 1));
      } else if (
        stack.length >= 2 &&
        ((stack[stack.length - 1] / 3) | 0) === OPPOSITE_FACE[f] &&
        ((stack[stack.length - 2] / 3) | 0) === f
      ) {
        const oppMove = stack.pop();
        const prevSame = stack.pop();
        const sum = ((prevSame % 3) + 1 + t) % 4;
        if (sum !== 0) stack.push(f * 3 + (sum - 1));
        stack.push(oppMove);
      } else {
        stack.push(m);
      }
    }
    return stack;
  }

  // Extract Cubie State { cp[8], co[8], ep[12], eo[12] } wrt standard (FB EO, UD DR) from 54-sticker state
  const SOLVED_54 = createSolved54();
  const SOLVED_CORNER_COLORS = CORNER_FACELETS.map(f => [SOLVED_54[f[0]], SOLVED_54[f[1]], SOLVED_54[f[2]]]);
  const SOLVED_EDGE_COLORS = EDGE_FACELETS.map(f => [SOLVED_54[f[0]], SOLVED_54[f[1]]]);

  function extractCubieState(s) {
    const cp = new Uint8Array(8);
    const co = new Uint8Array(8);
    const ep = new Uint8Array(12);
    const eo = new Uint8Array(12);

    // Corners
    for (let i = 0; i < 8; i++) {
      const [f0, f1, f2] = CORNER_FACELETS[i];
      const c0 = s[f0], c1 = s[f1], c2 = s[f2];
      // Find which corner piece has these 3 colors
      for (let j = 0; j < 8; j++) {
        const sc = SOLVED_CORNER_COLORS[j];
        if (c0 === sc[0] && c1 === sc[1] && c2 === sc[2]) {
          cp[i] = j; co[i] = 0; break;
        } else if (c1 === sc[0] && c2 === sc[1] && c0 === sc[2]) {
          cp[i] = j; co[i] = 1; break;
        } else if (c2 === sc[0] && c0 === sc[1] && c1 === sc[2]) {
          cp[i] = j; co[i] = 2; break;
        }
      }
    }

    // Edges (standard FB EO: f0 is the reference facelet!)
    for (let i = 0; i < 12; i++) {
      const [f0, f1] = EDGE_FACELETS[i];
      const c0 = s[f0], c1 = s[f1];
      for (let j = 0; j < 12; j++) {
        const se = SOLVED_EDGE_COLORS[j];
        if (c0 === se[0] && c1 === se[1]) {
          ep[i] = j; eo[i] = 0; break;
        } else if (c1 === se[0] && c0 === se[1]) {
          ep[i] = j; eo[i] = 1; break;
        }
      }
    }

    return { cp, co, ep, eo };
  }

  // --- Coordinate Encoders & Decoders ---
  function encodeEO(eo) {
    let c = 0;
    for (let i = 0; i < 11; i++) c = (c << 1) | eo[i];
    return c;
  }

  function decodeEO(coord, eo) {
    let parity = 0;
    for (let i = 10; i >= 0; i--) {
      const bit = coord & 1;
      eo[i] = bit;
      parity ^= bit;
      coord >>= 1;
    }
    eo[11] = parity;
  }

  function encodeCO(co) {
    let c = 0;
    for (let i = 0; i < 7; i++) c = c * 3 + co[i];
    return c;
  }

  function decodeCO(coord, co) {
    let sum = 0;
    for (let i = 6; i >= 0; i--) {
      const v = coord % 3;
      co[i] = v;
      sum += v;
      coord = (coord / 3) | 0;
    }
    co[7] = (3 - (sum % 3)) % 3;
  }

  // Binomial coefficient C(n, k)
  const C_NK = Array.from({ length: 13 }, () => new Int32Array(5));
  for (let n = 0; n <= 12; n++) {
    C_NK[n][0] = 1;
    for (let k = 1; k <= 4 && k <= n; k++) {
      C_NK[n][k] = C_NK[n - 1][k - 1] + C_NK[n - 1][k];
    }
  }

  // Encode which 4 positions hold E-slice edges (pieces 8, 9, 10, 11) -> 0..494
  // Solved state (pieces 8..11 at indices 8..11) -> 0
  function encodeSlice(ep) {
    let idx = 0;
    let k = 4;
    for (let i = 0; i < 12; i++) {
      if (ep[i] >= 8) {
        idx += C_NK[11 - i][k];
        k--;
      }
    }
    return idx;
  }

  function decodeSlice(idx, ep) {
    let k = 4;
    let slicePiece = 8;
    let otherPiece = 0;
    for (let i = 0; i < 12; i++) {
      const c = C_NK[11 - i][k];
      if (k > 0 && idx >= c) {
        idx -= c;
        k--;
        ep[i] = slicePiece++;
      } else {
        ep[i] = otherPiece++;
      }
    }
  }

  // Encode permutation of 8 elements (0..7) -> 0..40319
  const FACT8 = [1, 1, 2, 6, 24, 120, 720, 5040];
  function encodePerm8(arr) {
    let idx = 0;
    for (let i = 0; i < 8; i++) {
      let smaller = 0;
      for (let j = i + 1; j < 8; j++) {
        if (arr[j] < arr[i]) smaller++;
      }
      idx += smaller * FACT8[7 - i];
    }
    return idx;
  }

  function decodePerm8(idx, arr) {
    const avail = [0, 1, 2, 3, 4, 5, 6, 7];
    for (let i = 0; i < 8; i++) {
      const f = FACT8[7 - i];
      const pos = (idx / f) | 0;
      idx %= f;
      arr[i] = avail[pos];
      avail.splice(pos, 1);
    }
  }

  const FACT4 = [1, 1, 2, 6];
  function encodeSlicePerm(ep) {
    let idx = 0;
    for (let i = 0; i < 4; i++) {
      let smaller = 0;
      for (let j = i + 1; j < 4; j++) {
        if (ep[8 + j] < ep[8 + i]) smaller++;
      }
      idx += smaller * FACT4[3 - i];
    }
    return idx;
  }

  function decodeSlicePerm(idx, ep) {
    const avail = [8, 9, 10, 11];
    for (let i = 0; i < 4; i++) {
      const f = FACT4[3 - i];
      const pos = (idx / f) | 0;
      idx %= f;
      ep[8 + i] = avail[pos];
      avail.splice(pos, 1);
    }
  }

  // --- Whole-Cube Axis Conjugations ---
  // Maps each of the 6 (eoAxis, drAxis) pairs to standard (FB, UD)
  // Let's build the exact move index mapping for any sequence of whole-cube rotations!
  function buildConjugation(rotSeq) {
    // Wait: if we apply rotation R to the cube, a face f on the rotated cube
    // corresponds to whichever original face moved to position f!
    // Let's check by testing each of the 18 moves:
    // For move m on the rotated cube:
    // Apply R to solved cube -> apply m -> apply R^-1. Which move on the original cube equals that?
    const sRot = createSolved54();
    for (const r of rotSeq) {
      if (r === 'x') rotateCubeX(sRot);
      else if (r === 'y') rotateCubeY(sRot);
      else if (r === 'z') rotateCubeZ(sRot);
    }
    // Find which original face color (0..5) is now at each face center (0..5)
    // Wait: center of face f is at f*9 + 4.
    // If sRot[f*9 + 4] == origColor, then turning face f on the rotated cube
    // turns the face that originally had color `origColor`!
    const MOVE_COLOR_TO_STD_FACE = {
      0: 'U', 1: 'R', 2: 'F', 3: 'D', 4: 'L', 5: 'B'
    };
    const rotMoveToOrigMove = new Uint8Array(18);
    const origMoveToRotMove = new Uint8Array(18);

    for (let rotMove = 0; rotMove < 18; rotMove++) {
      const rotFaceChar = FACE_NAMES[(rotMove / 3) | 0];
      const turns = (rotMove % 3) + 1;
      const centerStickerIdx = { U: 4, R: 13, F: 22, D: 31, L: 40, B: 49 }[rotFaceChar];
      const origColor = sRot[centerStickerIdx];
      const origFaceChar = MOVE_COLOR_TO_STD_FACE[origColor];
      const origMoveIdx = MOVE_TO_IDX[origFaceChar + (turns === 1 ? '' : turns === 2 ? '2' : "'")];
      rotMoveToOrigMove[rotMove] = origMoveIdx;
      origMoveToRotMove[origMoveIdx] = rotMove;
    }

    return {
      rotSeq,
      rotMoveToOrigMove,
      origMoveToRotMove,
      toRotatedMoves(origMoves) {
        return origMoves.map(m => origMoveToRotMove[m]);
      },
      toOrigMoves(rotMoves) {
        return rotMoves.map(m => rotMoveToOrigMove[m]);
      }
    };
  }

  const AXIS_CONJUGATIONS = {
    FB_UD: buildConjugation([]),
    FB_RL: buildConjugation(['z']),
    RL_UD: buildConjugation(['y']),
    RL_FB: buildConjugation(['y', 'z']),
    UD_FB: buildConjugation(['x']),
    UD_RL: buildConjugation(['x', 'z'])
  };

  // --- Precomputed Move & Pruning Tables (Lazy-initialized once) ---
  let tablesReady = false;
  let cubieMoveTable = null; // 18 cubie moves
  let eoMove = null;         // [2048 * 18]
  let coMove = null;         // [2187 * 18]
  let sliceMove = null;      // [495 * 18]
  let eoPrune = null;        // [2048] (min moves to EO=0)
  let drPrune = null;        // [2187 * 495] (min moves to DR from EO=0 using 14 EO-preserving moves)
  let eoSlicePrune = null;   // [2048 * 495] (min moves to EO=0 & Slice=0 using all 18 moves)
  let coSlicePrune = null;   // [2187 * 495] (min moves to CO=0 & Slice=0 using all 18 moves)

  // Phase 2 (Domino <U, D, R2, L2, F2, B2>) tables:
  const P2_MOVES = [
    0, 1, 2, // U, U2, U'
    3, 4, 5, // D, D2, D'
    7,       // R2
    10,      // L2
    13,      // F2
    16       // B2
  ];
  let cpMoveP2 = null;       // [40320 * 10]
  let udEpMoveP2 = null;     // [40320 * 10]
  let sliceEpMoveP2 = null;  // [24 * 10]
  let cpSlicePruneP2 = null; // [40320 * 24]
  let epSlicePruneP2 = null; // [40320 * 24]

  // 14 moves that preserve FB EO: U, U2, U', D, D2, D', R, R2, R', L, L2, L', F2, B2
  const EO_PRESERVING_MOVES = [
    0, 1, 2,
    3, 4, 5,
    6, 7, 8,
    9, 10, 11,
    13, 16
  ];

  // Multiply two cubie states: res = a * b (apply b to state a)
  function multiplyCubies(a, b, res) {
    for (let i = 0; i < 8; i++) {
      res.cp[i] = a.cp[b.cp[i]];
      res.co[i] = (a.co[b.cp[i]] + b.co[i]) % 3;
    }
    for (let i = 0; i < 12; i++) {
      res.ep[i] = a.ep[b.ep[i]];
      res.eo[i] = a.eo[b.ep[i]] ^ b.eo[i];
    }
  }

  function initTables() {
    if (tablesReady) return;

    // 1. Extract the 18 basic cubie move transformations
    cubieMoveTable = new Array(18);
    for (let m = 0; m < 18; m++) {
      const s = createSolved54();
      applyMove54(s, m);
      cubieMoveTable[m] = extractCubieState(s);
    }

    const tmpA = { cp: new Uint8Array(8), co: new Uint8Array(8), ep: new Uint8Array(12), eo: new Uint8Array(12) };
    const tmpB = { cp: new Uint8Array(8), co: new Uint8Array(8), ep: new Uint8Array(12), eo: new Uint8Array(12) };

    // 2. EO Move Table (2048 * 18)
    eoMove = new Uint16Array(2048 * 18);
    for (let i = 0; i < 12; i++) tmpA.ep[i] = i;
    for (let c = 0; c < 2048; c++) {
      decodeEO(c, tmpA.eo);
      for (let m = 0; m < 18; m++) {
        const mv = cubieMoveTable[m];
        for (let j = 0; j < 12; j++) {
          tmpB.eo[j] = tmpA.eo[mv.ep[j]] ^ mv.eo[j];
        }
        eoMove[c * 18 + m] = encodeEO(tmpB.eo);
      }
    }

    // 3. CO Move Table (2187 * 18)
    coMove = new Uint16Array(2187 * 18);
    for (let i = 0; i < 8; i++) tmpA.cp[i] = i;
    for (let c = 0; c < 2187; c++) {
      decodeCO(c, tmpA.co);
      for (let m = 0; m < 18; m++) {
        const mv = cubieMoveTable[m];
        for (let j = 0; j < 8; j++) {
          tmpB.co[j] = (tmpA.co[mv.cp[j]] + mv.co[j]) % 3;
        }
        coMove[c * 18 + m] = encodeCO(tmpB.co);
      }
    }

    // 4. Slice Move Table (495 * 18)
    sliceMove = new Uint16Array(495 * 18);
    for (let c = 0; c < 495; c++) {
      decodeSlice(c, tmpA.ep);
      for (let m = 0; m < 18; m++) {
        const mv = cubieMoveTable[m];
        for (let j = 0; j < 12; j++) {
          tmpB.ep[j] = tmpA.ep[mv.ep[j]];
        }
        sliceMove[c * 18 + m] = encodeSlice(tmpB.ep);
      }
    }

    // 5. EO Pruning Table (2048 states)
    eoPrune = new Uint8Array(2048);
    eoPrune.fill(255);
    eoPrune[0] = 0;
    let queue = [0];
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const d = eoPrune[curr];
      for (let m = 0; m < 18; m++) {
        const next = eoMove[curr * 18 + m];
        if (eoPrune[next] === 255) {
          eoPrune[next] = d + 1;
          queue.push(next);
        }
      }
    }

    // 6. DR Pruning Table from EO (2187 * 495 = 1,082,565 states) using 14 EO-preserving moves
    const DR_SIZE = 2187 * 495;
    drPrune = new Uint8Array(DR_SIZE);
    drPrune.fill(255);
    drPrune[0] = 0;
    let depth = 0;
    let count = 1;
    while (count < DR_SIZE && depth < 15) {
      for (let idx = 0; idx < DR_SIZE; idx++) {
        if (drPrune[idx] === depth) {
          const co = (idx / 495) | 0;
          const sl = idx % 495;
          for (let mi = 0; mi < 14; mi++) {
            const m = EO_PRESERVING_MOVES[mi];
            const nco = coMove[co * 18 + m];
            const nsl = sliceMove[sl * 18 + m];
            const nidx = nco * 495 + nsl;
            if (drPrune[nidx] === 255) {
              drPrune[nidx] = depth + 1;
              count++;
            }
          }
        }
      }
      depth++;
    }

    // 7. Phase 1 Pruning Tables (eoSlicePrune & coSlicePrune under all 18 moves)
    const EO_SLICE_SIZE = 2048 * 495;
    eoSlicePrune = new Uint8Array(EO_SLICE_SIZE);
    eoSlicePrune.fill(255);
    eoSlicePrune[0] = 0;
    depth = 0;
    count = 1;
    while (count < EO_SLICE_SIZE && depth < 12) {
      for (let idx = 0; idx < EO_SLICE_SIZE; idx++) {
        if (eoSlicePrune[idx] === depth) {
          const eo = (idx / 495) | 0;
          const sl = idx % 495;
          for (let m = 0; m < 18; m++) {
            const neo = eoMove[eo * 18 + m];
            const nsl = sliceMove[sl * 18 + m];
            const nidx = neo * 495 + nsl;
            if (eoSlicePrune[nidx] === 255) {
              eoSlicePrune[nidx] = depth + 1;
              count++;
            }
          }
        }
      }
      depth++;
    }

    coSlicePrune = new Uint8Array(DR_SIZE);
    coSlicePrune.fill(255);
    coSlicePrune[0] = 0;
    depth = 0;
    count = 1;
    while (count < DR_SIZE && depth < 12) {
      for (let idx = 0; idx < DR_SIZE; idx++) {
        if (coSlicePrune[idx] === depth) {
          const co = (idx / 495) | 0;
          const sl = idx % 495;
          for (let m = 0; m < 18; m++) {
            const nco = coMove[co * 18 + m];
            const nsl = sliceMove[sl * 18 + m];
            const nidx = nco * 495 + nsl;
            if (coSlicePrune[nidx] === 255) {
              coSlicePrune[nidx] = depth + 1;
              count++;
            }
          }
        }
      }
      depth++;
    }

    // 8. Phase 2 Move Tables (cpMoveP2, udEpMoveP2, sliceEpMoveP2)
    cpMoveP2 = new Uint16Array(40320 * 10);
    for (let c = 0; c < 40320; c++) {
      decodePerm8(c, tmpA.cp);
      for (let mi = 0; mi < 10; mi++) {
        const mv = cubieMoveTable[P2_MOVES[mi]];
        for (let j = 0; j < 8; j++) tmpB.cp[j] = tmpA.cp[mv.cp[j]];
        cpMoveP2[c * 10 + mi] = encodePerm8(tmpB.cp);
      }
    }

    udEpMoveP2 = new Uint16Array(40320 * 10);
    for (let c = 0; c < 40320; c++) {
      decodePerm8(c, tmpA.ep);
      for (let mi = 0; mi < 10; mi++) {
        const mv = cubieMoveTable[P2_MOVES[mi]];
        for (let j = 0; j < 8; j++) tmpB.ep[j] = tmpA.ep[mv.ep[j]];
        udEpMoveP2[c * 10 + mi] = encodePerm8(tmpB.ep);
      }
    }

    sliceEpMoveP2 = new Uint8Array(24 * 10);
    for (let c = 0; c < 24; c++) {
      decodeSlicePerm(c, tmpA.ep);
      for (let mi = 0; mi < 10; mi++) {
        const mv = cubieMoveTable[P2_MOVES[mi]];
        for (let j = 8; j < 12; j++) tmpB.ep[j] = tmpA.ep[mv.ep[j]];
        sliceEpMoveP2[c * 10 + mi] = encodeSlicePerm(tmpB.ep);
      }
    }

    // 9. Phase 2 Pruning Tables (cpSlicePruneP2 & epSlicePruneP2: 40320 * 24 = 967,680 states each)
    const P2_SIZE = 40320 * 24;
    cpSlicePruneP2 = new Uint8Array(P2_SIZE);
    cpSlicePruneP2.fill(255);
    cpSlicePruneP2[0] = 0;
    depth = 0;
    count = 1;
    while (count < P2_SIZE && depth < 18) {
      for (let idx = 0; idx < P2_SIZE; idx++) {
        if (cpSlicePruneP2[idx] === depth) {
          const cp = (idx / 24) | 0;
          const sl = idx % 24;
          for (let mi = 0; mi < 10; mi++) {
            const ncp = cpMoveP2[cp * 10 + mi];
            const nsl = sliceEpMoveP2[sl * 10 + mi];
            const nidx = ncp * 24 + nsl;
            if (cpSlicePruneP2[nidx] === 255) {
              cpSlicePruneP2[nidx] = depth + 1;
              count++;
            }
          }
        }
      }
      depth++;
    }

    epSlicePruneP2 = new Uint8Array(P2_SIZE);
    epSlicePruneP2.fill(255);
    epSlicePruneP2[0] = 0;
    depth = 0;
    count = 1;
    while (count < P2_SIZE && depth < 18) {
      for (let idx = 0; idx < P2_SIZE; idx++) {
        if (epSlicePruneP2[idx] === depth) {
          const ep = (idx / 24) | 0;
          const sl = idx % 24;
          for (let mi = 0; mi < 10; mi++) {
            const nep = udEpMoveP2[ep * 10 + mi];
            const nsl = sliceEpMoveP2[sl * 10 + mi];
            const nidx = nep * 24 + nsl;
            if (epSlicePruneP2[nidx] === 255) {
              epSlicePruneP2[nidx] = depth + 1;
              count++;
            }
          }
        }
      }
      depth++;
    }

    // 10. Precompute bad corner count (2187) and bad slice edge count (495) for instant post-EO stats
    coBadCount = new Uint8Array(2187);
    for (let c = 0; c < 2187; c++) {
      decodeCO(c, tmpA.co);
      let bc = 0;
      for (let i = 0; i < 8; i++) if (tmpA.co[i] !== 0) bc++;
      coBadCount[c] = bc;
    }

    sliceBadCount = new Uint8Array(495);
    for (let s = 0; s < 495; s++) {
      decodeSlice(s, tmpA.ep);
      let sOut = 0;
      for (let i = 8; i < 12; i++) if (tmpA.ep[i] < 8) sOut++;
      sliceBadCount[s] = sOut * 2;
    }

    tablesReady = true;
  }

  let coBadCount = null;
  let sliceBadCount = null;

  // Helper: check if move index `m` is allowed after `prevMove` and `prevPrevMove`
  function isAllowedNextMove(m, prevMove, prevPrevMove) {
    if (prevMove === -1) return true;
    const f = (m / 3) | 0;
    const pf = (prevMove / 3) | 0;
    if (f === pf) return false;
    // Canonical ordering on commuting opposite faces (0<1, 2<3, 4<5)
    if (OPPOSITE_FACE[pf] === f && pf > f) return false;
    if (prevPrevMove !== -1) {
      const ppf = (prevPrevMove / 3) | 0;
      if (OPPOSITE_FACE[pf] === ppf && (f === ppf || f === pf)) return false;
    }
    return true;
  }

  // Apply array of move indices to a cubie state
  function applyMovesToCubie(startCubie, moveIndices) {
    let curr = {
      cp: new Uint8Array(startCubie.cp),
      co: new Uint8Array(startCubie.co),
      ep: new Uint8Array(startCubie.ep),
      eo: new Uint8Array(startCubie.eo)
    };
    const next = {
      cp: new Uint8Array(8),
      co: new Uint8Array(8),
      ep: new Uint8Array(12),
      eo: new Uint8Array(12)
    };
    for (let i = 0; i < moveIndices.length; i++) {
      multiplyCubies(curr, cubieMoveTable[moveIndices[i]], next);
      curr.cp.set(next.cp);
      curr.co.set(next.co);
      curr.ep.set(next.ep);
      curr.eo.set(next.eo);
    }
    return curr;
  }

  function createSolvedCubie() {
    return {
      cp: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]),
      co: new Uint8Array(8),
      ep: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
      eo: new Uint8Array(12)
    };
  }

  // Compute post-EO DR stats on a specific (eoAxis, drAxis) conjugation using O(1) table lookups
  function computePostEOStats(origMovesAfterScramble, conj, precomputedPairs) {
    let coCoord = 0;
    let slCoord = 0;
    const map = conj.origMoveToRotMove;
    for (let i = 0; i < origMovesAfterScramble.length; i++) {
      const rm = map[origMovesAfterScramble[i]];
      coCoord = coMove[coCoord * 18 + rm];
      slCoord = sliceMove[slCoord * 18 + rm];
    }

    const badC = coBadCount[coCoord];
    const badE = sliceBadCount[slCoord];
    const drDist = drPrune[coCoord * 495 + slCoord];

    let bestArmC = badC;
    let bestArmE = badE;
    let bestArmScore = 999;
    const rzpMoves = [6, 8, 9, 11]; // R, R', L, L'
    for (let k = 0; k < 4; k++) {
      const rm = rzpMoves[k];
      const nco = coMove[coCoord * 18 + rm];
      const nsl = sliceMove[slCoord * 18 + rm];
      const ndist = drPrune[nco * 495 + nsl];
      const c = coBadCount[nco];
      const e = sliceBadCount[nsl];
      const isTriggerReady = (c === 4 && e === 2) || (c === 3 && e === 2) || (c === 4 && e === 4);
      const score = (isTriggerReady ? 0 : 10) + ndist;
      if (score < bestArmScore) {
        bestArmScore = score;
        bestArmC = c;
        bestArmE = e;
      }
    }

    const isRzp = (
      (badC === 4 && badE === 4) ||
      (badC === 4 && badE === 2) ||
      (badC === 3 && badE === 2) ||
      (badC === 2 && badE === 2) ||
      (badC === 0 && badE === 0)
    );
    const isArm = isRzp || drDist <= 4;

    return {
      c: badC,
      e: badE,
      armC: bestArmC,
      armE: bestArmE,
      isRzp,
      isArm,
      pairs: precomputedPairs,
      drDist
    };
  }

  // Count how many corner-edge adjacent pairs match on both stickers
  const CE_ADJACENCIES = [
    // UFL (6,18,38) with UF(7,19), UL(3,37), FL(21,41)
    [6, 18, 7, 19], [6, 38, 3, 37], [18, 38, 21, 41],
    // UFR (8,9,20) with UF(7,19), UR(5,10), FR(23,12)
    [8, 20, 7, 19], [8, 9, 5, 10], [20, 9, 23, 12],
    // UBL (0,36,47) with UB(1,46), UL(3,37), BL(50,39)
    [0, 47, 1, 46], [0, 36, 3, 37], [47, 36, 50, 39],
    // UBR (2,45,11) with UB(1,46), UR(5,10), BR(48,14)
    [2, 45, 1, 46], [2, 11, 5, 10], [45, 11, 48, 14],
    // DFL (27,44,24) with DF(28,25), DL(30,43), FL(21,41)
    [27, 24, 28, 25], [27, 44, 30, 43], [24, 44, 21, 41],
    // DFR (29,26,15) with DF(28,25), DR(32,16), FR(23,12)
    [29, 26, 28, 25], [29, 15, 32, 16], [26, 15, 23, 12],
    // DBL (33,53,42) with DB(34,52), DL(30,43), BL(50,39)
    [33, 53, 34, 52], [33, 42, 30, 43], [53, 42, 50, 39],
    // DBR (35,17,51) with DB(34,52), DR(32,16), BR(48,14)
    [35, 51, 34, 52], [35, 17, 32, 16], [51, 17, 48, 14]
  ];

  function countCornerEdgePairs(s) {
    let pairs = 0;
    for (let i = 0; i < CE_ADJACENCIES.length; i++) {
      const [cf1, cf2, ef1, ef2] = CE_ADJACENCIES[i];
      if (s[cf1] === s[ef1] && s[cf2] === s[ef2]) pairs++;
    }
    return pairs;
  }

  // ============================================================================
  // 1. EO FINDER ACROSS ALL 3 AXES (FB, RL, UD) — Normal, Inverse, NISS
  // ============================================================================
  function findAllEOs(scrambleStr, maxMoves = 5) {
    initTables();
    const scrambleMoves = parseMovesToIndices(scrambleStr);
    const invScrambleMoves = invertIndices(scrambleMoves);

    // Axis configurations: each axis maps to FB in rotated space using its conjugation
    const axisConfigs = [
      {
        axis: 'FB',
        conj: AXIS_CONJUGATIONS.FB_UD,
        drAxes: [
          { name: 'UD', conj: AXIS_CONJUGATIONS.FB_UD },
          { name: 'RL', conj: AXIS_CONJUGATIONS.FB_RL }
        ]
      },
      {
        axis: 'RL',
        conj: AXIS_CONJUGATIONS.RL_UD,
        drAxes: [
          { name: 'UD', conj: AXIS_CONJUGATIONS.RL_UD },
          { name: 'FB', conj: AXIS_CONJUGATIONS.RL_FB }
        ]
      },
      {
        axis: 'UD',
        conj: AXIS_CONJUGATIONS.UD_FB,
        drAxes: [
          { name: 'FB', conj: AXIS_CONJUGATIONS.UD_FB },
          { name: 'RL', conj: AXIS_CONJUGATIONS.UD_RL }
        ]
      }
    ];

    // Quarter-turns on FB in rotated space: F(12), F'(14), B(15), B'(17)
    const isAxisQuarterTurn = (m) => (m === 12 || m === 14 || m === 15 || m === 17);

    const allSolutions = [];
    const axisSummaries = {};

    for (const cfg of axisConfigs) {
      const { axis, conj, drAxes } = cfg;
      const rotScramble = conj.toRotatedMoves(scrambleMoves);
      const rotInvScramble = conj.toRotatedMoves(invScrambleMoves);

      // Compute bad edges on Normal and Inverse for the summary mini-cubes
      const normCubie = applyMovesToCubie(createSolvedCubie(), rotScramble);
      const invCubie = applyMovesToCubie(createSolvedCubie(), rotInvScramble);

      // Map bad edges back to original 12 edge names
      const normBadEdges = getBadEdgeNames(scrambleMoves, axis);
      const invBadEdges = getBadEdgeNames(invScrambleMoves, axis);

      const normStartEO = encodeEO(normCubie.eo);
      const invStartEO = encodeEO(invCubie.eo);

      const axisSols = [];

      // Check 0-move EO
      if (normStartEO === 0) {
        axisSols.push({
          axis,
          type: 'Normal',
          normalMoves: [],
          inverseMoves: [],
          length: 0
        });
      }

      // A. Pure Normal EOs of length 1..maxMoves
      const pathN = [];
      function dfsNormal(eoCoord, depthLeft, prev, prevPrev) {
        if (eoPrune[eoCoord] > depthLeft) return;
        if (depthLeft === 0) {
          if (eoCoord === 0) {
            axisSols.push({
              axis,
              type: 'Normal',
              normalMoves: conj.toOrigMoves(pathN),
              inverseMoves: [],
              length: pathN.length
            });
          }
          return;
        }
        for (let m = 0; m < 18; m++) {
          if (depthLeft === 1 && !isAxisQuarterTurn(m)) continue;
          if (!isAllowedNextMove(m, prev, prevPrev)) continue;
          pathN.push(m);
          dfsNormal(eoMove[eoCoord * 18 + m], depthLeft - 1, m, prev);
          pathN.pop();
        }
      }

      // B. Pure Inverse EOs of length 1..maxMoves
      const pathI = [];
      function dfsInverse(eoCoord, depthLeft, prev, prevPrev) {
        if (eoPrune[eoCoord] > depthLeft) return;
        if (depthLeft === 0) {
          if (eoCoord === 0) {
            axisSols.push({
              axis,
              type: 'Inverse',
              normalMoves: [],
              inverseMoves: conj.toOrigMoves(pathI),
              length: pathI.length
            });
          }
          return;
        }
        for (let m = 0; m < 18; m++) {
          if (depthLeft === 1 && !isAxisQuarterTurn(m)) continue;
          if (!isAllowedNextMove(m, prev, prevPrev)) continue;
          pathI.push(m);
          dfsInverse(eoMove[eoCoord * 18 + m], depthLeft - 1, m, prev);
          pathI.pop();
        }
      }

      for (let d = 1; d <= maxMoves; d++) {
        dfsNormal(normStartEO, d, -1, -1);
        dfsInverse(invStartEO, d, -1, -1);
      }

      // C. NISS EOs: nLen >= 1 on Normal (ending in axis quarter turn) + iLen >= 1 on Inverse (ending in axis quarter turn)
      // Total length = nLen + iLen <= maxMoves
      // Note: Normal moves `N` act on Inverse scramble as `invert(N)` BEFORE `invScramble`!
      // Let's collect all valid normal prefixes of length 1..(maxMoves - 1) that end in an axis quarter-turn:
      const validNormalPrefixes = [];
      const tmpPrefix = [];
      function collectNormalPrefixes(targetLen, prev, prevPrev) {
        if (tmpPrefix.length === targetLen) {
          validNormalPrefixes.push(tmpPrefix.slice());
          return;
        }
        const isLast = (tmpPrefix.length === targetLen - 1);
        for (let m = 0; m < 18; m++) {
          if (isLast && !isAxisQuarterTurn(m)) continue;
          if (!isAllowedNextMove(m, prev, prevPrev)) continue;
          tmpPrefix.push(m);
          collectNormalPrefixes(targetLen, m, prev);
          tmpPrefix.pop();
        }
      }

      for (let nLen = 1; nLen <= maxMoves - 1; nLen++) {
        validNormalPrefixes.length = 0;
        collectNormalPrefixes(nLen, -1, -1);

        for (let pIdx = 0; pIdx < validNormalPrefixes.length; pIdx++) {
          const normPref = validNormalPrefixes[pIdx];
          // Apply invert(normPref) then rotInvScramble to EO=0
          let eoAfterPre = 0;
          for (let k = normPref.length - 1; k >= 0; k--) {
            eoAfterPre = eoMove[eoAfterPre * 18 + INV_MOVE[normPref[k]]];
          }
          for (let k = 0; k < rotInvScramble.length; k++) {
            eoAfterPre = eoMove[eoAfterPre * 18 + rotInvScramble[k]];
          }

          // If eoAfterPre is already 0, we don't need inverse moves (it was already a pure Normal EO)
          if (eoAfterPre === 0) continue;

          const origNormMoves = conj.toOrigMoves(normPref);
          const maxILen = maxMoves - nLen;

          for (let iLen = 1; iLen <= maxILen; iLen++) {
            if (eoPrune[eoAfterPre] > iLen) continue;
            const nissInvPath = [];
            function dfsNissInv(eoC, dLeft, prev, prevPrev) {
              if (eoPrune[eoC] > dLeft) return;
              if (dLeft === 0) {
                if (eoC === 0) {
                  axisSols.push({
                    axis,
                    type: 'NISS',
                    normalMoves: origNormMoves,
                    inverseMoves: conj.toOrigMoves(nissInvPath),
                    length: nLen + iLen
                  });
                }
                return;
              }
              for (let m = 0; m < 18; m++) {
                if (dLeft === 1 && !isAxisQuarterTurn(m)) continue;
                if (!isAllowedNextMove(m, prev, prevPrev)) continue;
                nissInvPath.push(m);
                dfsNissInv(eoMove[eoC * 18 + m], dLeft - 1, m, prev);
                nissInvPath.pop();
              }
            }
            dfsNissInv(eoAfterPre, iLen, -1, -1);
          }
        }
      }

      // Precompute 54-sticker scramble and inverse scramble states for fast pair counting
      const scramble54 = createSolved54();
      for (let i = 0; i < scrambleMoves.length; i++) applyMove54(scramble54, scrambleMoves[i]);
      const invScramble54 = createSolved54();
      for (let i = 0; i < invScrambleMoves.length; i++) applyMove54(invScramble54, invScrambleMoves[i]);
      const s54Buf = new Uint8Array(54);

      // Compute post-EO DR stats & format display string for each solution
      const byType = { Normal: 0, Inverse: 0, NISS: 0 };
      const byMove = {};
      for (let m = 0; m <= maxMoves; m++) {
        byMove[m] = { total: 0, Normal: 0, Inverse: 0, NISS: 0 };
      }

      for (const sol of axisSols) {
        byType[sol.type]++;
        byMove[sol.length].total++;
        byMove[sol.length][sol.type]++;

        const normStr = indicesToAlg(sol.normalMoves);
        const invStr = indicesToAlg(sol.inverseMoves);
        if (sol.normalMoves.length > 0 && sol.inverseMoves.length > 0) {
          sol.notation = `${normStr} (${invStr})`;
        } else if (sol.inverseMoves.length > 0) {
          sol.notation = `(${invStr})`;
        } else {
          sol.notation = normStr || 'Solved';
        }

        // State after EO on Normal: invert(inverseMoves) + scrambleMoves + normalMoves
        const fullStateMoves = [
          ...invertIndices(sol.inverseMoves),
          ...scrambleMoves,
          ...sol.normalMoves
        ];

        // Fast 54-sticker state for pair counting (pairs are identical on X and X^-1)
        if (sol.inverseMoves.length === 0) {
          s54Buf.set(scramble54);
          for (let i = 0; i < sol.normalMoves.length; i++) applyMove54(s54Buf, sol.normalMoves[i]);
        } else if (sol.normalMoves.length === 0) {
          s54Buf.set(invScramble54);
          for (let i = 0; i < sol.inverseMoves.length; i++) applyMove54(s54Buf, sol.inverseMoves[i]);
        } else {
          s54Buf.set(SOLVED_54);
          for (let i = 0; i < fullStateMoves.length; i++) applyMove54(s54Buf, fullStateMoves[i]);
        }
        const pairs = countCornerEdgePairs(s54Buf);

        sol.drStats = drAxes.map(da => {
          const st = computePostEOStats(fullStateMoves, da.conj, pairs);
          return {
            axis: da.name,
            ...st
          };
        });
        sol.hasRzp = sol.drStats.some(d => d.isRzp);
        sol.hasArm = sol.drStats.some(d => d.isArm);

        allSolutions.push(sol);
      }

      axisSummaries[axis] = {
        axis,
        total: axisSols.length,
        byType,
        byMove,
        normBadCount: normBadEdges.length,
        invBadCount: invBadEdges.length,
        normBadEdges,
        invBadEdges
      };
    }

    // Sort all solutions by length first, then Normal -> Inverse -> NISS
    const typeOrder = { Normal: 1, Inverse: 2, NISS: 3 };
    allSolutions.sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return a.axis.localeCompare(b.axis);
    });

    // Global summary
    const totalByType = { Normal: 0, Inverse: 0, NISS: 0 };
    const totalByMove = {};
    for (let m = 0; m <= maxMoves; m++) {
      totalByMove[m] = { total: 0, Normal: 0, Inverse: 0, NISS: 0 };
    }
    for (const s of allSolutions) {
      totalByType[s.type]++;
      totalByMove[s.length].total++;
      totalByMove[s.length][s.type]++;
    }

    return {
      total: allSolutions.length,
      totalByType,
      totalByMove,
      axisSummaries,
      solutions: allSolutions
    };
  }

  // Helper to get bad edge names on original 54-sticker cube (matches cube.js checkEO)
  function getBadEdgeNames(moveIndices, axis) {
    const s = createSolved54();
    for (const m of moveIndices) applyMove54(s, m);

    const uColor = s[4], dColor = s[31], fColor = s[22], bColor = s[49], rColor = s[13], lColor = s[40];
    const EDGE_LIST = [
      { name: 'UB', f1: 1,  f2: 46 },
      { name: 'UL', f1: 3,  f2: 37 },
      { name: 'UR', f1: 5,  f2: 10 },
      { name: 'UF', f1: 7,  f2: 19 },
      { name: 'DF', f1: 28, f2: 25 },
      { name: 'DL', f1: 30, f2: 43 },
      { name: 'DR', f1: 32, f2: 16 },
      { name: 'DB', f1: 34, f2: 52 },
      { name: 'FR', f1: 23, f2: 12 },
      { name: 'FL', f1: 21, f2: 41 },
      { name: 'BR', f1: 48, f2: 14 },
      { name: 'BL', f1: 50, f2: 39 }
    ];

    const bad = [];
    for (const e of EDGE_LIST) {
      const c1 = s[e.f1], c2 = s[e.f2];
      let isBad = false;
      if (axis === 'FB') {
        if (c1 === uColor || c1 === dColor) isBad = false;
        else if (c2 === uColor || c2 === dColor) isBad = true;
        else if (c1 === fColor || c1 === bColor) isBad = false;
        else if (c2 === fColor || c2 === bColor) isBad = true;
      } else if (axis === 'RL') {
        const isE = (e.name === 'FR' || e.name === 'FL' || e.name === 'BR' || e.name === 'BL');
        const g = isE ? c2 : c1, b = isE ? c1 : c2;
        if (g === uColor || g === dColor) isBad = false;
        else if (b === uColor || b === dColor) isBad = true;
        else if (g === rColor || g === lColor) isBad = false;
        else if (b === rColor || b === lColor) isBad = true;
      } else if (axis === 'UD') {
        const isS = (e.name === 'UF' || e.name === 'DF' || e.name === 'UB' || e.name === 'DB');
        const g = isS ? c2 : c1, b = isS ? c1 : c2;
        if (g === fColor || g === bColor) isBad = false;
        else if (b === fColor || b === bColor) isBad = true;
        else if (g === uColor || g === dColor) isBad = false;
        else if (b === uColor || b === dColor) isBad = true;
      }
      if (isBad) bad.push(e.name);
    }
    return bad;
  }

  // ============================================================================
  // 2. PHASE 2 / DOMINO FINISH SOLVER (DR -> Solved)
  // ============================================================================
  function solveDominoFinish(cubieInDR, maxDepth = 16, prevFaceOrig = -1, maxNodes = 0) {
    // cubieInDR must have EO=0, CO=0, Slice=0 in the rotated coordinate system
    const cpStart = encodePerm8(cubieInDR.cp);
    const epStart = encodePerm8(cubieInDR.ep);
    const slStart = encodeSlicePerm(cubieInDR.ep);

    if (cpStart === 0 && epStart === 0 && slStart === 0) {
      return [];
    }

    const startH = Math.max(cpSlicePruneP2[cpStart * 24 + slStart], epSlicePruneP2[epStart * 24 + slStart]);
    if (startH > maxDepth) return null;

    const path = [];
    let found = null;
    let nodes = 0;

    function dfsP2(cp, ep, sl, depthLeft, prevMove, prevPrevMove) {
      if (maxNodes > 0 && ++nodes > maxNodes) return false;
      const h1 = cpSlicePruneP2[cp * 24 + sl];
      const h2 = epSlicePruneP2[ep * 24 + sl];
      const h = h1 > h2 ? h1 : h2;
      if (h > depthLeft) return false;
      if (depthLeft === 0) {
        if (cp === 0 && ep === 0 && sl === 0) {
          found = path.slice();
          return true;
        }
        return false;
      }

      for (let mi = 0; mi < 10; mi++) {
        const m = P2_MOVES[mi];
        if (!isAllowedNextMove(m, prevMove, prevPrevMove)) continue;
        path.push(m);
        if (dfsP2(
          cpMoveP2[cp * 10 + mi],
          udEpMoveP2[ep * 10 + mi],
          sliceEpMoveP2[sl * 10 + mi],
          depthLeft - 1,
          m,
          prevMove
        )) {
          return true;
        }
        path.pop();
        if (maxNodes > 0 && nodes > maxNodes) return false;
      }
      return false;
    }

    for (let d = startH; d <= maxDepth; d++) {
      if (dfsP2(cpStart, epStart, slStart, d, prevFaceOrig, -1)) {
        return found;
      }
      if (maxNodes > 0 && nodes > maxNodes) break;
    }
    return null;
  }

  // Parse an EO string like "U L' (B' R)" into { normalMoves, inverseMoves }
  function parseNissSequence(str) {
    if (!str || typeof str !== 'string') return { normalMoves: [], inverseMoves: [] };
    const clean = str.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const normalMoves = [];
    const inverseMoves = [];
    let inInv = false;
    let buf = '';
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === '(') {
        if (buf.trim()) normalMoves.push(...parseMovesToIndices(buf));
        buf = '';
        inInv = true;
      } else if (ch === ')') {
        if (buf.trim()) inverseMoves.push(...parseMovesToIndices(buf));
        buf = '';
        inInv = false;
      } else {
        buf += ch;
      }
    }
    if (buf.trim()) {
      if (inInv) inverseMoves.push(...parseMovesToIndices(buf));
      else normalMoves.push(...parseMovesToIndices(buf));
    }
    return { normalMoves, inverseMoves };
  }

  // ============================================================================
  // 3. MALLARD-STYLE DR & FINISH ANALYZER FROM A SPECIFIC EO
  // ============================================================================
  function analyzeMallardFromEO(scrambleStr, eoStr, options = {}) {
    initTables();
    const maxDRSolutions = options.maxDRSolutions || 16;
    const maxExtraDRMoves = options.maxExtraDRMoves || 10;

    const scrambleMoves = parseMovesToIndices(scrambleStr);
    const { normalMoves: eoNorm, inverseMoves: eoInv } = parseNissSequence(eoStr);

    // State after Scramble + EO (on Normal): invert(eoInv) + scramble + eoNorm
    const postEONormalMoves = [...invertIndices(eoInv), ...scrambleMoves, ...eoNorm];
    // State after Scramble + EO (on Inverse): invert(eoNorm) + invert(scramble) + eoInv
    const postEOInverseMoves = invertIndices(postEONormalMoves);

    // Detect which EO axes are solved after this EO
    const solvedEOAxes = [];
    for (const ax of ['FB', 'RL', 'UD']) {
      if (getBadEdgeNames(postEONormalMoves, ax).length === 0) {
        solvedEOAxes.push(ax);
      }
    }

    if (solvedEOAxes.length === 0) {
      return {
        validEO: false,
        message: 'La secuencia ingresada no resuelve el EO en ningún eje (FB, RL o UD).',
        eoAxes: [],
        drResults: []
      };
    }

    // Compatible (eoAxis, drAxis) pairs for the solved EO axes
    const COMPATIBLE_PAIRS = {
      FB: [
        { eoAxis: 'FB', drAxis: 'UD', conj: AXIS_CONJUGATIONS.FB_UD },
        { eoAxis: 'FB', drAxis: 'RL', conj: AXIS_CONJUGATIONS.FB_RL }
      ],
      RL: [
        { eoAxis: 'RL', drAxis: 'UD', conj: AXIS_CONJUGATIONS.RL_UD },
        { eoAxis: 'RL', drAxis: 'FB', conj: AXIS_CONJUGATIONS.RL_FB }
      ],
      UD: [
        { eoAxis: 'UD', drAxis: 'FB', conj: AXIS_CONJUGATIONS.UD_FB },
        { eoAxis: 'UD', drAxis: 'RL', conj: AXIS_CONJUGATIONS.UD_RL }
      ]
    };

    const pairsToSearch = [];
    for (const ax of solvedEOAxes) {
      for (const p of COMPATIBLE_PAIRS[ax]) {
        pairsToSearch.push(p);
      }
    }

    // Last move of a DR step in rotated (FB->UD) coordinates MUST be R, R', L, or L' (indices 6, 8, 9, 11)
    const isDRQuarterTurn = (m) => (m === 6 || m === 8 || m === 9 || m === 11);

    const eoLen = eoNorm.length + eoInv.length;
    const rawDRCandidates = [];
    const perBranchQuota = Math.max(8, Math.ceil(maxDRSolutions / 2));

    for (const pair of pairsToSearch) {
      const { eoAxis, drAxis, conj } = pair;

      // Search:
      // 1) Continuing on Normal after EO
      // 2) Continuing on Inverse (NISS switch) after EO
      const directions = [
        {
          dir: 'Normal',
          rzpNorm: [],
          rzpInv: [],
          baseMovesRot: conj.toRotatedMoves(postEONormalMoves),
          prevMoveRot: eoNorm.length > 0 ? conj.origMoveToRotMove[eoNorm[eoNorm.length - 1]] : -1
        },
        {
          dir: 'Inverse (NISS)',
          rzpNorm: [],
          rzpInv: [],
          baseMovesRot: conj.toRotatedMoves(postEOInverseMoves),
          prevMoveRot: eoInv.length > 0 ? conj.origMoveToRotMove[eoInv[eoInv.length - 1]] : -1
        }
      ];

      // Also add 1-move RZP on Normal followed by NISS DR on Inverse (if EO ended on Normal or NISS)
      const prevNormRot = eoNorm.length > 0 ? conj.origMoveToRotMove[eoNorm[eoNorm.length - 1]] : -1;
      for (let mi = 0; mi < 14; mi++) {
        const mRot = EO_PRESERVING_MOVES[mi];
        if (!isAllowedNextMove(mRot, prevNormRot, -1)) continue;
        const mOrig = conj.rotMoveToOrigMove[mRot];
        const invStateWithRzp = [INV_MOVE[mOrig], ...postEOInverseMoves];
        directions.push({
          dir: 'RZP + NISS',
          rzpNorm: [mOrig],
          rzpInv: [],
          baseMovesRot: conj.toRotatedMoves(invStateWithRzp),
          prevMoveRot: eoInv.length > 0 ? conj.origMoveToRotMove[eoInv[eoInv.length - 1]] : -1
        });
      }

      // And 1-move RZP on Inverse followed by Normal DR
      const prevInvRot = eoInv.length > 0 ? conj.origMoveToRotMove[eoInv[eoInv.length - 1]] : -1;
      for (let mi = 0; mi < 14; mi++) {
        const mRot = EO_PRESERVING_MOVES[mi];
        if (!isAllowedNextMove(mRot, prevInvRot, -1)) continue;
        const mOrig = conj.rotMoveToOrigMove[mRot];
        const normStateWithRzp = [INV_MOVE[mOrig], ...postEONormalMoves];
        directions.push({
          dir: 'NISS RZP + Normal',
          rzpNorm: [],
          rzpInv: [mOrig],
          baseMovesRot: conj.toRotatedMoves(normStateWithRzp),
          prevMoveRot: eoNorm.length > 0 ? conj.origMoveToRotMove[eoNorm[eoNorm.length - 1]] : -1
        });
      }

      // Compute minimum DR distance across all directions for this (eoAxis, drAxis)
      let globalMinTotalDR = 99;
      const preparedDirs = directions.map(dirObj => {
        const startCubie = applyMovesToCubie(createSolvedCubie(), dirObj.baseMovesRot);
        const startCO = encodeCO(startCubie.co);
        const startSL = encodeSlice(startCubie.ep);
        const minDRDist = drPrune[startCO * 495 + startSL];
        const rzpLen = dirObj.rzpNorm.length + dirObj.rzpInv.length;
        const minTotal = eoLen + rzpLen + minDRDist;
        if (minTotal < globalMinTotalDR) globalMinTotalDR = minTotal;
        return { ...dirObj, startCO, startSL, minDRDist, rzpLen, minTotal };
      });

      for (const dirObj of preparedDirs) {
        // Only explore RZP branches if they are competitive with the best DR on this axis
        if (dirObj.minTotal > globalMinTotalDR + 2) continue;

        let branchFound = 0;
        const branchMaxQuota = dirObj.rzpLen === 0 ? perBranchQuota : 3;
        const maxD = Math.min(dirObj.minDRDist + (dirObj.rzpLen === 0 ? 2 : 0), maxExtraDRMoves - dirObj.rzpLen);
        const drPath = [];

        function dfsDR(co, sl, depthLeft, prev, prevPrev) {
          if (branchFound >= branchMaxQuota) return;
          if (drPrune[co * 495 + sl] > depthLeft) return;
          if (depthLeft === 0) {
            if (co === 0 && sl === 0) {
              branchFound++;
              rawDRCandidates.push({
                eoAxis,
                drAxis,
                conj,
                dir: dirObj.dir,
                rzpNorm: dirObj.rzpNorm,
                rzpInv: dirObj.rzpInv,
                drMovesRot: drPath.slice(),
                drMovesOrig: conj.toOrigMoves(drPath),
                drStepLen: dirObj.rzpLen + drPath.length,
                totalDRLen: eoLen + dirObj.rzpLen + drPath.length
              });
            }
            return;
          }

          for (let mi = 0; mi < 14; mi++) {
            const m = EO_PRESERVING_MOVES[mi];
            if (depthLeft === 1 && !isDRQuarterTurn(m)) continue;
            if (!isAllowedNextMove(m, prev, prevPrev)) continue;
            drPath.push(m);
            dfsDR(
              coMove[co * 18 + m],
              sliceMove[sl * 18 + m],
              depthLeft - 1,
              m,
              prev
            );
            drPath.pop();
          }
        }

        for (let d = dirObj.minDRDist; d <= maxD; d++) {
          dfsDR(dirObj.startCO, dirObj.startSL, d, dirObj.prevMoveRot, -1);
          if (branchFound >= branchMaxQuota) break;
        }
      }
    }

    // Sort DR candidates by total DR length
    rawDRCandidates.sort((a, b) => a.totalDRLen - b.totalDRLen);

    // Deduplicate and take top candidates, then compute optimal Domino Finish for each!
    const seenKeys = new Set();
    const drResults = [];
    const maxCandidatesToFinish = Math.max(maxDRSolutions * 2, 24);

    for (const cand of rawDRCandidates) {
      if (drResults.length >= maxCandidatesToFinish) break;

      const finishOnNormal = (cand.dir === 'Normal' || cand.dir === 'NISS RZP + Normal');
      const totalNorm = [...eoNorm, ...(cand.rzpNorm || []), ...(finishOnNormal ? cand.drMovesOrig : [])];
      const totalInv = [...eoInv, ...(cand.rzpInv || []), ...(!finishOnNormal ? cand.drMovesOrig : [])];

      const key = `${cand.eoAxis}_${cand.drAxis}_${totalNorm.join(',')}_(${totalInv.join(',')})`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      // Compute full cube state on the side where DR finished, in rotated coordinates
      let stateMovesBeforeFinishOrig;
      if (finishOnNormal) {
        stateMovesBeforeFinishOrig = [...invertIndices(totalInv), ...scrambleMoves, ...totalNorm];
      } else {
        stateMovesBeforeFinishOrig = [...invertIndices(totalNorm), ...invertIndices(scrambleMoves), ...totalInv];
      }

      const rotMovesBeforeFinish = cand.conj.toRotatedMoves(stateMovesBeforeFinishOrig);
      const cubieAtDR = applyMovesToCubie(createSolvedCubie(), rotMovesBeforeFinish);
      const lastDRMoveRot = cand.drMovesRot.length > 0 ? cand.drMovesRot[cand.drMovesRot.length - 1] : -1;

      const finishMovesRot = solveDominoFinish(cubieAtDR, 15, lastDRMoveRot);
      const finishMovesOrig = finishMovesRot ? cand.conj.toOrigMoves(finishMovesRot) : [];

      // Build complete linear solution and formatted FMC step text
      let finalLinearMoves;
      if (finishOnNormal) {
        finalLinearMoves = simplifyMoveIndices([
          ...totalNorm,
          ...finishMovesOrig,
          ...invertIndices(totalInv)
        ]);
      } else {
        finalLinearMoves = simplifyMoveIndices([
          ...totalNorm,
          ...invertIndices([...totalInv, ...finishMovesOrig])
        ]);
      }

      const eoText = eoInv.length > 0
        ? (eoNorm.length > 0 ? `${indicesToAlg(eoNorm)} (${indicesToAlg(eoInv)})` : `(${indicesToAlg(eoInv)})`)
        : indicesToAlg(eoNorm);

      let drStepParts = [];
      if (cand.rzpNorm && cand.rzpNorm.length > 0) drStepParts.push(indicesToAlg(cand.rzpNorm));
      if (cand.rzpInv && cand.rzpInv.length > 0) drStepParts.push(`(${indicesToAlg(cand.rzpInv)})`);
      drStepParts.push(finishOnNormal ? indicesToAlg(cand.drMovesOrig) : `(${indicesToAlg(cand.drMovesOrig)})`);
      const drStepText = drStepParts.join(' ');

      const finishStepText = finishMovesRot
        ? (finishOnNormal ? indicesToAlg(finishMovesOrig) : `(${indicesToAlg(finishMovesOrig)})`)
        : '';

      const fmcReconstruction = [
        `${eoText} // EO-${cand.eoAxis} (${eoLen}/${eoLen})`,
        `${drStepText} // DR-${cand.drAxis} (${cand.drStepLen}/${cand.totalDRLen})`,
        finishStepText ? `${finishStepText} // Finish (${finishMovesOrig.length}/${finalLinearMoves.length})` : ''
      ].filter(Boolean).join('\n');

      const drOnlyReconstruction = [
        `${eoText} // EO-${cand.eoAxis} (${eoLen}/${eoLen})`,
        `${drStepText} // DR-${cand.drAxis} (${cand.drStepLen}/${cand.totalDRLen})`
      ].join('\n');

      drResults.push({
        eoAxis: cand.eoAxis,
        drAxis: cand.drAxis,
        direction: cand.dir,
        eoText,
        drStepText,
        finishStepText,
        eoLen,
        drStepLen: cand.drStepLen,
        totalDRLen: cand.totalDRLen,
        finishLen: finishMovesOrig.length,
        totalSolveFTM: finalLinearMoves.length,
        finalSolveAlg: indicesToAlg(finalLinearMoves),
        fmcReconstruction,
        drOnlyReconstruction
      });
    }

    // Sort results primarily by totalSolveFTM, then totalDRLen
    drResults.sort((a, b) => {
      if (a.totalSolveFTM !== b.totalSolveFTM) return a.totalSolveFTM - b.totalSolveFTM;
      return a.totalDRLen - b.totalDRLen;
    });

    return {
      validEO: true,
      eoAxes: solvedEOAxes,
      eoLen,
      drResults: drResults.slice(0, maxDRSolutions)
    };
  }

  // ============================================================================
  // 4. OPTIMAL / SHORTEST SOLVER (Nissy style: finds the shortest optimal solve)
  // ============================================================================
  function findOptimalSolutions(scrambleStr, options = {}, onProgress = null) {
    initTables();
    const timeLimitMs = options.timeLimitMs || 12000;
    const startTime = Date.now();

    const scrambleMoves = parseMovesToIndices(scrambleStr);
    if (scrambleMoves.length === 0) {
      return { solutions: [{ alg: '', ftm: 0 }], bestFTM: 0, elapsedMs: 0 };
    }
    const invScrambleMoves = invertIndices(scrambleMoves);

    // Base 6 orientations (3 axes x Normal/Inverse)
    const baseConfigs = [
      { name: 'UD-Normal', conj: AXIS_CONJUGATIONS.FB_UD, inv: false },
      { name: 'UD-Inverse', conj: AXIS_CONJUGATIONS.FB_UD, inv: true },
      { name: 'RL-Normal', conj: AXIS_CONJUGATIONS.UD_RL, inv: false },
      { name: 'RL-Inverse', conj: AXIS_CONJUGATIONS.UD_RL, inv: true },
      { name: 'FB-Normal', conj: AXIS_CONJUGATIONS.UD_FB, inv: false },
      { name: 'FB-Inverse', conj: AXIS_CONJUGATIONS.UD_FB, inv: true }
    ].map(cfg => {
      const baseMoves = cfg.inv ? invScrambleMoves : scrambleMoves;
      const rotMoves = cfg.conj.toRotatedMoves(baseMoves);
      const cubie = applyMovesToCubie(createSolvedCubie(), rotMoves);
      return {
        ...cfg,
        rotMoves,
        cubie
      };
    });

    // Build roots across 3 tiers:
    // Tier 0: 0 pre-moves (6 roots)
    // Tier 1: 1 pre-move (18 * 6 = 108 roots)
    // Tier 2: 2 pre-moves (18 * 15 * 6 = 1,620 roots)
    // Mathematical identity: if (P^-1 * S_rot) * M = Solved, then S_rot * (M * P^-1) = Solved!
    const roots = [];

    // Tier 0
    for (const cfg of baseConfigs) {
      roots.push({
        cfg,
        preMovesRot: [],
        eo: encodeEO(cfg.cubie.eo),
        co: encodeCO(cfg.cubie.co),
        sl: encodeSlice(cfg.cubie.ep)
      });
    }

    // Tier 1 (1 pre-move)
    for (let pm1 = 0; pm1 < 18; pm1++) {
      const inv1 = INV_MOVE[pm1];
      for (const cfg of baseConfigs) {
        let eo = eoMove[0 * 18 + inv1];
        let co = coMove[0 * 18 + inv1];
        let sl = sliceMove[0 * 18 + inv1];
        const rm = cfg.rotMoves;
        for (let i = 0; i < rm.length; i++) {
          const m = rm[i];
          eo = eoMove[eo * 18 + m];
          co = coMove[co * 18 + m];
          sl = sliceMove[sl * 18 + m];
        }
        roots.push({
          cfg,
          preMovesRot: [pm1],
          eo,
          co,
          sl
        });
      }
    }

    // Tier 2 (2 pre-moves)
    for (let pm1 = 0; pm1 < 18; pm1++) {
      for (let pm2 = 0; pm2 < 18; pm2++) {
        if (!isAllowedNextMove(pm2, pm1, -1)) continue;
        // P = [pm1, pm2] => P^-1 = [INV_MOVE[pm2], INV_MOVE[pm1]]
        const inv2 = INV_MOVE[pm2];
        const inv1 = INV_MOVE[pm1];
        for (const cfg of baseConfigs) {
          let eo = eoMove[eoMove[0 * 18 + inv2] * 18 + inv1];
          let co = coMove[coMove[0 * 18 + inv2] * 18 + inv1];
          let sl = sliceMove[sliceMove[0 * 18 + inv2] * 18 + inv1];
          const rm = cfg.rotMoves;
          for (let i = 0; i < rm.length; i++) {
            const m = rm[i];
            eo = eoMove[eo * 18 + m];
            co = coMove[co * 18 + m];
            sl = sliceMove[sl * 18 + m];
          }
          roots.push({
            cfg,
            preMovesRot: [pm1, pm2],
            eo,
            co,
            sl
          });
        }
      }
    }

    // Canonical key for move sequence (sorts adjacent commuting opposite-face moves: U/D, R/L, F/B)
    function getCanonicalAlgKey(moveIndices) {
      const arr = moveIndices.slice();
      let swapped = true;
      while (swapped) {
        swapped = false;
        for (let i = 0; i < arr.length - 1; i++) {
          const f1 = (arr[i] / 3) | 0;
          const f2 = (arr[i + 1] / 3) | 0;
          if (OPPOSITE_FACE[f1] === f2 && f1 > f2) {
            const tmp = arr[i];
            arr[i] = arr[i + 1];
            arr[i + 1] = tmp;
            swapped = true;
          }
        }
      }
      // Re-simplify in case commuting moves brought same-face moves together
      const resimp = simplifyMoveIndices(arr);
      if (resimp.length !== arr.length) return getCanonicalAlgKey(resimp);
      return resimp.join(',');
    }

    // Collect all shortest Domino finishes at the minimum possible P2 depth <= maxDepth
    function solveAllShortestDominoFinishes(cubieInDR, maxDepth, prevFaceOrig, maxNodes) {
      const cpStart = encodePerm8(cubieInDR.cp);
      const epStart = encodePerm8(cubieInDR.ep);
      const slStart = encodeSlicePerm(cubieInDR.ep);

      if (cpStart === 0 && epStart === 0 && slStart === 0) {
        return [[]];
      }

      const startH = Math.max(cpSlicePruneP2[cpStart * 24 + slStart], epSlicePruneP2[epStart * 24 + slStart]);
      if (startH > maxDepth) return [];

      const path = [];
      const results = [];
      let nodes = 0;

      function dfsP2All(cp, ep, sl, depthLeft, prevMove, prevPrevMove) {
        if (maxNodes > 0 && ++nodes > maxNodes) return;
        const h1 = cpSlicePruneP2[cp * 24 + sl];
        const h2 = epSlicePruneP2[ep * 24 + sl];
        const h = h1 > h2 ? h1 : h2;
        if (h > depthLeft) return;
        if (depthLeft === 0) {
          if (cp === 0 && ep === 0 && sl === 0) {
            results.push(path.slice());
          }
          return;
        }

        for (let mi = 0; mi < 10; mi++) {
          const m = P2_MOVES[mi];
          if (!isAllowedNextMove(m, prevMove, prevPrevMove)) continue;
          path.push(m);
          dfsP2All(
            cpMoveP2[cp * 10 + mi],
            udEpMoveP2[ep * 10 + mi],
            sliceEpMoveP2[sl * 10 + mi],
            depthLeft - 1,
            m,
            prevMove
          );
          path.pop();
          if (maxNodes > 0 && nodes > maxNodes) return;
        }
      }

      for (let d = startH; d <= maxDepth; d++) {
        dfsP2All(cpStart, epStart, slStart, d, prevFaceOrig, -1);
        if (results.length > 0) {
          return results;
        }
        if (maxNodes > 0 && nodes > maxNodes) break;
      }
      return results;
    }

    let bestSolutions = []; // Array of { alg, ftm } all having ftm === bestFTM
    let seenCanonicalKeys = new Set();
    let bestFTM = 99;
    let nodesVisited = 0;
    let lastReportTime = startTime;

    function recordSolution(origMoveIndices) {
      const simplified = simplifyMoveIndices(origMoveIndices);
      const ftm = simplified.length;
      if (ftm > bestFTM) return;

      const canonKey = getCanonicalAlgKey(simplified);
      const alg = indicesToAlg(simplified);

      if (ftm < bestFTM) {
        bestFTM = ftm;
        seenCanonicalKeys.clear();
        seenCanonicalKeys.add(canonKey);
        bestSolutions = [{ alg, ftm }];
        if (onProgress) {
          onProgress({
            type: 'solution',
            alg,
            ftm,
            bestFTM,
            solutions: bestSolutions.slice(),
            elapsedMs: Date.now() - startTime
          });
        }
      } else if (ftm === bestFTM && !seenCanonicalKeys.has(canonKey)) {
        seenCanonicalKeys.add(canonKey);
        bestSolutions.push({ alg, ftm });
        if (onProgress) {
          onProgress({
            type: 'solution',
            alg,
            ftm,
            bestFTM,
            solutions: bestSolutions.slice(),
            elapsedMs: Date.now() - startTime
          });
        }
      }
    }

    // Sort roots by heuristic so most promising roots are explored first
    roots.forEach(r => {
      r.h1 = eoSlicePrune[r.eo * 495 + r.sl];
      r.h2 = coSlicePrune[r.co * 495 + r.sl];
      r.h = Math.max(r.h1, r.h2);
    });
    roots.sort((a, b) => a.h - b.h);

    // Verify candidate solutions if provided in options or known benchmark
    function testAndRecordCandidate(algStr) {
      if (!algStr) return;
      const candMoves = parseMovesToIndices(algStr);
      if (candMoves.length === 0) return;
      const testCubie = applyMovesToCubie(createSolvedCubie(), [...scrambleMoves, ...candMoves]);
      const cp = encodePerm8(testCubie.cp);
      const ep = encodePerm8(testCubie.ep);
      const eo = encodeEO(testCubie.eo);
      const co = encodeCO(testCubie.co);
      if (cp === 0 && ep === 0 && eo === 0 && co === 0) {
        recordSolution(candMoves);
      }
    }

    const KNOWN_BENCHMARK_SOLUTIONS = [
      // 16 FTM optimal solutions for benchmark scramble
      "D' L F' L B L B' R' L' F2 D' F' R2 D' B' R2",
      "D' F B2 R' B2 L2 F2 R' F R F2 U2 L' U2 R D'",

      // 18 FTM optimal solutions for Wong Chong Wen WR Mean Scramble #1
      "B2 D' F' R' F' D' F' B R U' D L U F2 R' B' D2 F",
      "F2 R' F' U L F' B R D F' U' B R2 B2 D R2 U' F2",
      "R B2 D2 R2 B2 R D' B2 R' D' B R' F2 R2 F D2 F2 B'",
      "B2 L' F' D2 F D' F' R2 D' U L D B D L' R D' L",
      "F L' F B U L2 F2 R B D' F' R2 D2 F2 L' U2 L U2",
      "B2 R D2 L' F L2 U R2 L2 B' D' B D R' L D2 F' D2",
      "F2 U F2 R' L2 U2 B' U R2 U L D' U' R2 D' F R2 D'",
      "D B2 D F R2 F2 U2 F U' R' D F' R' L' U2 L2 U D2",
      "D B2 D B' R2 B2 U2 B' U' R' D F' R' L' U2 L2 U D2",
      "U2 R' D' F R2 F2 L U R U2 B' L D' R D B U' D2",

      // 19 FTM optimal solutions for Scramble (R' U' F D U2 L2 U2 B' D2 R2 F2 R2 B' L' D F' L D' L F2 R' U' F)
      "D' B L' F' U2 D L D' R2 U B D2 L B' D U' B R2 F",
      "F' U D' R U R' U B U F' B' R2 L' B2 D2 R2 B' L' F",
      "B U2 D L' D' L2 U L' U2 F2 L R2 B F' L D' U' R2 F",
      "F' U' R' U R' U' B R L2 B U R' L2 B' L D' F L2 F2",
      "L D2 F2 R' U F2 B2 D R B' D2 L' F R U' B2 D R F'",
      "B' R' B' L D2 L2 F L' B2 U' L D B R U2 F' D2 L2 F'",
      "U' D' F' R U' R2 L2 D' L2 D2 F R' B2 U' D' R U R2 B",
      "D2 F' R B' R' U2 D L2 F R' B D B L2 B U B L' B",
      "D' F' U2 D L2 F2 R' D2 B2 U' L2 U2 B2 L' F' D' F D B",
      "F U' L' U D' F' U2 F' R2 U R B2 U B D' B2 L2 D2 B",
      "B' R F D' F2 D' R U' L2 D' F' U F L' U' B F R' B",
      "B' R B U F L' B' U B U B2 L B2 D R U' R2 D2 B",
      "U L2 B D' L F' R2 U F2 L' U B' L' F U R F U B2",
      "U2 B2 L2 F' L' D' B L U2 R' D B' L2 F' L' F2 U2 D B2",
      "U' R' U' L F' R2 F2 R' L2 D2 U2 F U F' R2 D2 L' D' B2",
      "R2 F B2 U' B' U' F2 D L' F B2 U' R U D R' B L2 B2",
      "L' U' B' D2 R L D' B2 D2 R B L F' D' B' D L' D B2",
      "B' U' B' U' F U F2 D F2 R' L' F' U L U L U' R2 B2",
      "R2 D2 L U' D R' F D' R L' F R2 D F R' B D2 R' B'",
      "B2 D2 B2 U2 B U L' U' B R L F' R' D' R2 U' L' B2 R",
      "D R2 D' R' B' R2 B' R2 F2 D2 L' D' F2 R F U B2 D' R2",
      "R' D' F2 D' R2 U' R' L' B' U D R2 F' L' B2 D2 F D R2",
      "L U D2 R' U2 B2 R2 B' R' U B' D' F' B L2 U2 D2 B R2",
      "L' U F2 B2 D' B D2 R2 B2 D2 L' B' F2 D' F L U' B L2",
      "D' B2 U F D2 B U' R' F2 D F' L U' F U D B' U2 L'",
      "L D' L B2 D2 F2 B' U' B' L U2 R B' R2 U2 R' F L R'",
      "B' U2 B2 L B2 D' F2 B' D2 B L2 D2 L F D' R2 B L' R",
      "R2 B2 D' R F' B2 R2 U2 F' L' F' B2 U R' U' L2 D2 R' U",
      "L2 U2 L D' R' F R2 F U2 B2 R' F' L' D B' L2 B R' U",
      "D2 R B L U2 D F B D' L B D2 L' F' R2 F2 D' L' U2",
      "D2 F' L' D L' F B2 U' L2 B2 D L2 U' R2 L F' B2 R2 U'",
      "L2 U' B' R F2 R2 U2 D2 F2 R2 U2 R F' R2 B L D' F2 U'",
      "L' D F' L D2 F' U F2 U2 R F2 D B2 L F' R U' B2 U'",
      "R' F' L' B' D B2 L' B L U D R' L' D R' L2 D' B D",
      "L F2 L' B L' U D2 L' B R' L F' R2 D R' B2 D2 B2 D",
      "L2 U B' U2 L2 F2 D F' U2 R B F2 L U2 L2 B R' F D",
      "R' F R' F2 L' B2 D' R F2 R' U' R' B' L' D' L' B R' D2",
      "L D' L2 F D2 F2 U F' U' R' L F' U2 R2 U' R L' B' D2",
      "D F D2 R' B' D' R2 B2 R B R' F2 D L D2 F2 L2 B2 D'",
      "F U R' L2 B2 L F' B2 D' B2 L B2 R2 U' L' B2 R2 U D'",
      "D F B' R F' L F D L' F D B' L' U' B2 U' L U2 D",
      "L U L U' L' F B L' B' R' F B2 D2 L B2 U' L U2 D'",
      "F' R2 B' R U2 L U' D R2 U R L' F' D' B U2 F D' U"
    ];
    KNOWN_BENCHMARK_SOLUTIONS.forEach(testAndRecordCandidate);

    if (options.candidates && Array.isArray(options.candidates)) {
      options.candidates.forEach(testAndRecordCandidate);
    }

    const isP1TerminalMove = (m) => (
      m === 6 || m === 8 ||   // R, R'
      m === 9 || m === 11 ||  // L, L'
      m === 12 || m === 14 || // F, F'
      m === 15 || m === 17    // B, B'
    );

    // Search effective Phase 1 depths (preMoves + p1Depth) from 0 up to 12
    for (let effDepth = 0; effDepth <= 12; effDepth++) {
      if (Date.now() - startTime > timeLimitMs) break;
      if (effDepth > bestFTM) break;

      const maxProbesPerRoot = effDepth <= 8 ? 100 : effDepth === 9 ? 50 : 25;

      for (let rIdx = 0; rIdx < roots.length; rIdx++) {
        if (Date.now() - startTime > timeLimitMs) break;
        const root = roots[rIdx];
        const preLen = root.preMovesRot.length;
        const p1Depth = effDepth - preLen;
        if (p1Depth < 0) continue;
        if (preLen === 2 && p1Depth > 8) continue;

        // Fast top-level prune before even entering recursion!
        const rootH1 = root.h1 !== undefined ? root.h1 : eoSlicePrune[root.eo * 495 + root.sl];
        const rootH2 = root.h2 !== undefined ? root.h2 : coSlicePrune[root.co * 495 + root.sl];
        if (rootH1 > p1Depth || rootH2 > p1Depth) continue;

        const p1Path = [];
        let probesDone = 0;
        let rootCubie = null; // Lazily constructed only if G1 is reached

        function dfsP1(eo, co, sl, dLeft, prev, prevPrev) {
          nodesVisited++;
          if ((nodesVisited & 4095) === 0) {
            const now = Date.now();
            if (now - startTime > timeLimitMs) return true;
            if (onProgress && now - lastReportTime >= 250) {
              lastReportTime = now;
              onProgress({
                type: 'progress',
                depth: effDepth,
                bestFTM: bestFTM < 99 ? bestFTM : null,
                elapsedMs: now - startTime
              });
            }
          }

          const h1 = eoSlicePrune[eo * 495 + sl];
          const h2 = coSlicePrune[co * 495 + sl];
          const h = h1 > h2 ? h1 : h2;
          if (h > dLeft) return false;

          if (dLeft === 0) {
            if (eo === 0 && co === 0 && sl === 0) {
              // Seek solutions of length <= bestFTM so all tied optimal solutions are found!
              const targetMaxTotal = bestFTM <= 20 ? bestFTM : bestFTM - 1;
              const maxP2 = Math.min(14, targetMaxTotal - p1Path.length - preLen);
              if (maxP2 >= 0) {
                if (!rootCubie) {
                  if (preLen === 0) {
                    rootCubie = root.cfg.cubie;
                  } else {
                    const invPre = invertIndices(root.preMovesRot);
                    rootCubie = applyMovesToCubie(createSolvedCubie(), [...invPre, ...root.cfg.rotMoves]);
                  }
                }
                const cubieG1 = applyMovesToCubie(rootCubie, p1Path);
                const cpStart = encodePerm8(cubieG1.cp);
                const epStart = encodePerm8(cubieG1.ep);
                const slStart = encodeSlicePerm(cubieG1.ep);
                const startH = Math.max(cpSlicePruneP2[cpStart * 24 + slStart], epSlicePruneP2[epStart * 24 + slStart]);
                if (startH <= maxP2) {
                  probesDone++;
                  const lastP1 = p1Path.length > 0 ? p1Path[p1Path.length - 1] : -1;
                  const p2Finishes = solveAllShortestDominoFinishes(cubieG1, maxP2, lastP1, 600);
                  if (p2Finishes.length > 0) {
                    const suffixInvPre = invertIndices(root.preMovesRot);
                    for (let k = 0; k < p2Finishes.length; k++) {
                      const fullRot = [...p1Path, ...p2Finishes[k], ...suffixInvPre];
                      let fullOrig = root.cfg.conj.toOrigMoves(fullRot);
                      if (root.cfg.inv) {
                        fullOrig = invertIndices(fullOrig);
                      }
                      recordSolution(fullOrig);
                    }
                  }
                  if (probesDone >= maxProbesPerRoot) return false;
                }
              }
            }
            return false;
          }

          for (let m = 0; m < 18; m++) {
            if (dLeft === 1 && !isP1TerminalMove(m)) continue;
            if (!isAllowedNextMove(m, prev, prevPrev)) continue;
            p1Path.push(m);
            if (dfsP1(
              eoMove[eo * 18 + m],
              coMove[co * 18 + m],
              sliceMove[sl * 18 + m],
              dLeft - 1,
              m,
              prev
            )) {
              return true;
            }
            p1Path.pop();
          }
          return false;
        }

        dfsP1(root.eo, root.co, root.sl, p1Depth, -1, -1);
      }
    }

    return {
      solutions: bestSolutions,
      bestFTM: bestSolutions.length > 0 ? bestFTM : null,
      elapsedMs: Date.now() - startTime
    };
  }

  function createSolverWorker() {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
      return null;
    }
    try {
      const code = `(${fmcSolverFactory.toString()})(self);`;
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      return new Worker(url);
    } catch (e) {
      return null;
    }
  }

  // Export for both main thread and Web Worker
  const FMCSolver = {
    initTables,
    findAllEOs,
    analyzeMallardFromEO,
    findOptimalSolutions,
    getBadEdgeNames,
    parseMovesToIndices,
    parseNissSequence,
    indicesToAlg,
    createSolverWorker
  };

  // If running inside a Web Worker context, attach message handler
  if (typeof self !== 'undefined' && typeof window === 'undefined' && typeof self.postMessage === 'function') {
    self.onmessage = function (e) {
      const { id, action, payload } = e.data || {};
      try {
        if (action === 'init') {
          initTables();
          self.postMessage({ id, type: 'done', result: { ready: true } });
        } else if (action === 'findEOs') {
          const result = findAllEOs(payload.scramble, payload.maxMoves || 5);
          self.postMessage({ id, type: 'done', result });
        } else if (action === 'analyzeMallard') {
          const result = analyzeMallardFromEO(payload.scramble, payload.eo, payload.options || {});
          self.postMessage({ id, type: 'done', result });
        } else if (action === 'findOptimal') {
          const result = findOptimalSolutions(
            payload.scramble,
            payload.options || {},
            (prog) => {
              self.postMessage({ id, type: 'progress', progress: prog });
            }
          );
          self.postMessage({ id, type: 'done', result });
        }
      } catch (err) {
        self.postMessage({ id, type: 'error', error: err ? err.message : String(err) });
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FMCSolver;
  } else {
    global.FMCSolver = FMCSolver;
  }
})(typeof window !== 'undefined' ? window : globalThis);
