// =============================================================================
// CỜ ÚP VIỆT NAM (VIETNAMESE MYSTERY / DARK XIANGQI) GAME LOGIC ENGINE
// =============================================================================

export type PieceColor = 'r' | 'b'; // 'r' = Red (Đỏ), 'b' = Black (Đen)

export type PieceType =
  | 'K' // King / Tướng (帥 / 將)
  | 'A' // Advisor / Sĩ (仕 / 士)
  | 'E' // Elephant / Tượng (相 / 象)
  | 'R' // Chariot / Xe (俥 / 車)
  | 'C' // Cannon / Pháo (炮 / 砲)
  | 'H' // Horse / Mã (傌 / 馬)
  | 'P'; // Pawn / Binh / Tốt (兵 / 卒)

export interface CoUpPiece {
  id: string;
  color: PieceColor;
  trueType: PieceType; // The hidden true identity of the piece
  pseudoType: PieceType; // The role determined by the starting square while Úp
  isRevealed: boolean; // false = ÚP (face-down), true = NGỬA (face-up)
  row: number; // 0..9 (0=Black base, 9=Red base)
  col: number; // 0..8
}

export type BoardGrid = (CoUpPiece | null)[][];

export interface Move {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  piece: CoUpPiece;
  captured?: CoUpPiece | null;
  revealed?: boolean;
}

export interface CoUpGameState {
  board: BoardGrid;
  turn: PieceColor; // Red moves first in Xiangqi
  selectedPiece: CoUpPiece | null;
  validMoves: { r: number; c: number }[];
  lastMove: Move | null;
  capturedRed: CoUpPiece[];
  capturedBlack: CoUpPiece[];
  isCheck: boolean;
  isCheckmate: boolean;
  winner: PieceColor | null;
  moveHistory: Move[];
}

export const PIECE_NAMES: Record<PieceColor, Record<PieceType, { han: string; vi: string }>> = {
  r: {
    K: { han: '帥', vi: 'TƯỚNG' },
    A: { han: '仕', vi: 'SĨ' },
    E: { han: '相', vi: 'TƯỢNG' },
    R: { han: '俥', vi: 'XE' },
    C: { han: '炮', vi: 'PHÁO' },
    H: { han: '傌', vi: 'MÃ' },
    P: { han: '兵', vi: 'BINH' }
  },
  b: {
    K: { han: '將', vi: 'TƯỚNG' },
    A: { han: '士', vi: 'SĨ' },
    E: { han: '象', vi: 'TƯỢNG' },
    R: { han: '車', vi: 'XE' },
    C: { han: '砲', vi: 'PHÁO' },
    H: { han: '馬', vi: 'MÃ' },
    P: { han: '卒', vi: 'TỐT' }
  }
};

export const PIECE_VALUES: Record<PieceType, number> = {
  K: 15000,
  R: 900,
  C: 450,
  H: 400,
  A: 260,
  E: 260,
  P: 140
};

// Shuffle helper
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Check board bounds: 10 rows (0..9) x 9 cols (0..8)
export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 10 && c >= 0 && c < 9;
}

// In Palace check (Cung Tướng 3x3)
export function inRedPalace(r: number, c: number): boolean {
  return r >= 7 && r <= 9 && c >= 3 && c <= 5;
}

export function inBlackPalace(r: number, c: number): boolean {
  return r >= 0 && r <= 2 && c >= 3 && c <= 5;
}

export function inPalace(color: PieceColor, r: number, c: number): boolean {
  return color === 'r' ? inRedPalace(r, c) : inBlackPalace(r, c);
}

// Initialize starting 32-piece Cờ Úp Board
export function createInitialCoUpBoard(): BoardGrid {
  const board: BoardGrid = Array.from({ length: 10 }, () => Array(9).fill(null));

  // Red Side (r = 5..9)
  // 1 King placed face-up at (9, 4)
  board[9][4] = {
    id: 'r_K_1',
    color: 'r',
    trueType: 'K',
    pseudoType: 'K',
    isRevealed: true,
    row: 9,
    col: 4
  };

  // 15 Red Úp pieces shuffled
  const redPool: PieceType[] = [
    'A', 'A', 'E', 'E', 'R', 'R', 'C', 'C', 'H', 'H', 'P', 'P', 'P', 'P', 'P'
  ];
  const shuffledRed = shuffle(redPool);

  const redSlots: { r: number; c: number; pseudo: PieceType }[] = [
    { r: 9, c: 0, pseudo: 'R' }, { r: 9, c: 1, pseudo: 'H' }, { r: 9, c: 2, pseudo: 'E' },
    { r: 9, c: 3, pseudo: 'A' }, { r: 9, c: 5, pseudo: 'A' }, { r: 9, c: 6, pseudo: 'E' },
    { r: 9, c: 7, pseudo: 'H' }, { r: 9, c: 8, pseudo: 'R' },
    { r: 7, c: 1, pseudo: 'C' }, { r: 7, c: 7, pseudo: 'C' },
    { r: 6, c: 0, pseudo: 'P' }, { r: 6, c: 2, pseudo: 'P' }, { r: 6, c: 4, pseudo: 'P' },
    { r: 6, c: 6, pseudo: 'P' }, { r: 6, c: 8, pseudo: 'P' }
  ];

  redSlots.forEach((slot, idx) => {
    board[slot.r][slot.c] = {
      id: `r_up_${idx}`,
      color: 'r',
      trueType: shuffledRed[idx],
      pseudoType: slot.pseudo,
      isRevealed: false,
      row: slot.r,
      col: slot.c
    };
  });

  // Black Side (r = 0..4)
  // 1 King placed face-up at (0, 4)
  board[0][4] = {
    id: 'b_K_1',
    color: 'b',
    trueType: 'K',
    pseudoType: 'K',
    isRevealed: true,
    row: 0,
    col: 4
  };

  // 15 Black Úp pieces shuffled
  const blackPool: PieceType[] = [
    'A', 'A', 'E', 'E', 'R', 'R', 'C', 'C', 'H', 'H', 'P', 'P', 'P', 'P', 'P'
  ];
  const shuffledBlack = shuffle(blackPool);

  const blackSlots: { r: number; c: number; pseudo: PieceType }[] = [
    { r: 0, c: 0, pseudo: 'R' }, { r: 0, c: 1, pseudo: 'H' }, { r: 0, c: 2, pseudo: 'E' },
    { r: 0, c: 3, pseudo: 'A' }, { r: 0, c: 5, pseudo: 'A' }, { r: 0, c: 6, pseudo: 'E' },
    { r: 0, c: 7, pseudo: 'H' }, { r: 0, c: 8, pseudo: 'R' },
    { r: 2, c: 1, pseudo: 'C' }, { r: 2, c: 7, pseudo: 'C' },
    { r: 3, c: 0, pseudo: 'P' }, { r: 3, c: 2, pseudo: 'P' }, { r: 3, c: 4, pseudo: 'P' },
    { r: 3, c: 6, pseudo: 'P' }, { r: 3, c: 8, pseudo: 'P' }
  ];

  blackSlots.forEach((slot, idx) => {
    board[slot.r][slot.c] = {
      id: `b_up_${idx}`,
      color: 'b',
      trueType: shuffledBlack[idx],
      pseudoType: slot.pseudo,
      isRevealed: false,
      row: slot.r,
      col: slot.c
    };
  });

  return board;
}

// Generate raw candidate moves for a piece (ignoring check)
export function getRawPieceMoves(piece: CoUpPiece, board: BoardGrid): { r: number; c: number }[] {
  const moves: { r: number; c: number }[] = [];
  const { row: r, col: c, color, isRevealed, trueType, pseudoType } = piece;
  const currentRole = isRevealed ? trueType : pseudoType;

  // 1. KING (Tướng)
  if (currentRole === 'K') {
    const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of deltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && inPalace(color, nr, nc)) {
        const dest = board[nr][nc];
        if (!dest || dest.color !== color) {
          moves.push({ r: nr, c: nc });
        }
      }
    }
  }

  // 2. ADVISOR (Sĩ)
  else if (currentRole === 'A') {
    const diagDeltas = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDeltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;

      if (!isRevealed) {
        // ÚP SĨ: Initial diagonal step from starting square (e.g. (9,3)->(8,2) or (8,4))
        const dest = board[nr][nc];
        if (!dest || dest.color !== color) {
          moves.push({ r: nr, c: nc });
        }
      } else {
        // VIETNAMESE CỜ ÚP RULE: SĨ MỞ (Revealed Sĩ) is unrestricted!
        // Can move 1 step diagonally in any direction across the entire board, including crossing the river!
        const dest = board[nr][nc];
        if (!dest || dest.color !== color) {
          moves.push({ r: nr, c: nc });
        }
      }
    }
  }

  // 3. ELEPHANT (Tượng)
  else if (currentRole === 'E') {
    const diag2Deltas = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
    for (const [dr, dc] of diag2Deltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;

      // Elephant eye obstruction check (cản chân tượng)
      const eyeR = r + dr / 2;
      const eyeC = c + dc / 2;
      if (board[eyeR][eyeC] !== null) continue; // Blocked

      if (!isRevealed) {
        // Úp Elephant moves within its half
        const dest = board[nr][nc];
        if (!dest || dest.color !== color) {
          moves.push({ r: nr, c: nc });
        }
      } else {
        // VIETNAMESE CỜ ÚP RULE: TƯỢNG MỞ (Revealed Elephant) CAN CROSS THE RIVER!
        // Unrestricted across the board as long as elephant eye is clear
        const dest = board[nr][nc];
        if (!dest || dest.color !== color) {
          moves.push({ r: nr, c: nc });
        }
      }
    }
  }

  // 4. CHARIOT (Xe)
  else if (currentRole === 'R') {
    const rays = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of rays) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const dest = board[nr][nc];
        if (!dest) {
          moves.push({ r: nr, c: nc });
        } else {
          if (dest.color !== color) {
            moves.push({ r: nr, c: nc });
          }
          break; // Ray blocked
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  // 5. CANNON (Pháo)
  else if (currentRole === 'C') {
    const rays = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of rays) {
      let nr = r + dr;
      let nc = c + dc;
      let jumpedScreen = false;

      while (inBounds(nr, nc)) {
        const dest = board[nr][nc];
        if (!jumpedScreen) {
          if (!dest) {
            moves.push({ r: nr, c: nc }); // Non-capture slide
          } else {
            jumpedScreen = true; // Found screen piece
          }
        } else {
          if (dest) {
            if (dest.color !== color) {
              moves.push({ r: nr, c: nc }); // Capture enemy piece over screen
            }
            break; // Can only jump 1 piece
          }
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  // 6. HORSE (Mã)
  else if (currentRole === 'H') {
    const horseMoves = [
      { step: [-1, 0], jumps: [[-2, -1], [-2, 1]] }, // Up
      { step: [1, 0],  jumps: [[2, -1], [2, 1]] },   // Down
      { step: [0, -1], jumps: [[-1, -2], [1, -2]] }, // Left
      { step: [0, 1],  jumps: [[-1, 2], [1, 2]] }    // Right
    ];

    for (const hm of horseMoves) {
      const legR = r + hm.step[0];
      const legC = c + hm.step[1];
      if (inBounds(legR, legC) && board[legR][legC] === null) {
        // Leg is clear, examine the two destination jumps
        for (const [jr, jc] of hm.jumps) {
          const nr = r + jr;
          const nc = c + jc;
          if (inBounds(nr, nc)) {
            const dest = board[nr][nc];
            if (!dest || dest.color !== color) {
              moves.push({ r: nr, c: nc });
            }
          }
        }
      }
    }
  }

  // 7. PAWN (Binh / Tốt)
  else if (currentRole === 'P') {
    const fwd = color === 'r' ? -1 : 1;
    const nr = r + fwd;
    if (inBounds(nr, c)) {
      const dest = board[nr][c];
      if (!dest || dest.color !== color) {
        moves.push({ r: nr, c });
      }
    }

    // After crossing the river, can also move left or right
    const hasCrossedRiver = color === 'r' ? r <= 4 : r >= 5;
    if (hasCrossedRiver) {
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (inBounds(r, nc)) {
          const dest = board[r][nc];
          if (!dest || dest.color !== color) {
            moves.push({ r, c: nc });
          }
        }
      }
    }
  }

  return moves;
}

// Check if King of given color is currently under attack
export function isKingInCheck(color: PieceColor, board: BoardGrid): boolean {
  // 1. Locate King of given color
  let kingPos: { r: number; c: number } | null = null;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.trueType === 'K') {
        kingPos = { r, c };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return true; // King eliminated (should never occur in legal play)

  const opponentColor: PieceColor = color === 'r' ? 'b' : 'r';

  // 2. Flying General (Lộ mặt tướng): Opponent King in direct line of sight with no pieces between
  let oppKingPos: { r: number; c: number } | null = null;
  for (let r = 0; r < 10; r++) {
    const p = board[r][kingPos.c];
    if (p && p.color === opponentColor && p.trueType === 'K') {
      oppKingPos = { r, c: kingPos.c };
      break;
    }
  }
  if (oppKingPos) {
    const minR = Math.min(kingPos.r, oppKingPos.r);
    const maxR = Math.max(kingPos.r, oppKingPos.r);
    let blockers = 0;
    for (let midR = minR + 1; midR < maxR; midR++) {
      if (board[midR][kingPos.c] !== null) {
        blockers++;
        break;
      }
    }
    if (blockers === 0) return true; // Kings directly facing each other
  }

  // 3. Direct attack from opponent pieces
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const oppPiece = board[r][c];
      if (oppPiece && oppPiece.color === opponentColor) {
        const oppMoves = getRawPieceMoves(oppPiece, board);
        if (oppMoves.some((m) => m.r === kingPos!.r && m.c === kingPos!.c)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Clone board for move simulation
function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null))
  );
}

// Filter raw moves to only those that do NOT leave the King in check
export function getLegalPieceMoves(piece: CoUpPiece, board: BoardGrid): { r: number; c: number }[] {
  const rawMoves = getRawPieceMoves(piece, board);
  const legalMoves: { r: number; c: number }[] = [];

  for (const m of rawMoves) {
    const testBoard = cloneBoard(board);
    const moving = testBoard[piece.row][piece.col]!;
    testBoard[piece.row][piece.col] = null;
    moving.row = m.r;
    moving.col = m.c;
    testBoard[m.r][m.c] = moving;

    if (!isKingInCheck(piece.color, testBoard)) {
      legalMoves.push(m);
    }
  }

  return legalMoves;
}

// Get all legal moves for a given side
export function getAllLegalMoves(color: PieceColor, board: BoardGrid): Move[] {
  const allMoves: Move[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const targets = getLegalPieceMoves(piece, board);
        for (const t of targets) {
          allMoves.push({
            fromRow: r,
            fromCol: c,
            toRow: t.r,
            toCol: t.c,
            piece,
            captured: board[t.r][t.c],
            revealed: !piece.isRevealed
          });
        }
      }
    }
  }
  return allMoves;
}

// AI Move Selector with positional & Cờ Úp heuristic evaluation
export function getAIMove(color: PieceColor, board: BoardGrid): Move | null {
  const legalMoves = getAllLegalMoves(color, board);
  if (legalMoves.length === 0) return null;

  const opponentColor: PieceColor = color === 'r' ? 'b' : 'r';

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of legalMoves) {
    let score = 0;

    // 1. Capture reward
    if (move.captured) {
      const capturedVal = move.captured.isRevealed
        ? PIECE_VALUES[move.captured.trueType]
        : 380; // High expected value for captured Úp piece
      score += capturedVal * 1.5;
    }

    // 2. Reveal incentive: Opening an Úp piece gives strategic flexibility
    if (move.revealed) {
      score += 120;
    }

    // 3. Positional progress toward enemy territory
    const advance = color === 'b' ? move.toRow - move.fromRow : move.fromRow - move.toRow;
    score += advance * 15;

    // 4. Central control (cols 3, 4, 5 are high value in Xiangqi)
    const distCenter = Math.abs(move.toCol - 4);
    score += (4 - distCenter) * 12;

    // 5. Check bonus: Putting opponent in check
    const simBoard = cloneBoard(board);
    const moving = simBoard[move.fromRow][move.fromCol]!;
    simBoard[move.fromRow][move.fromCol] = null;
    moving.row = move.toRow;
    moving.col = move.toCol;
    moving.isRevealed = true; // Assume revealed
    simBoard[move.toRow][move.toCol] = moving;

    if (isKingInCheck(opponentColor, simBoard)) {
      score += 240;
    }

    // 6. Hanging piece penalty: check if destination is immediately attacked by a lower-value piece
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const opp = simBoard[r][c];
        if (opp && opp.color === opponentColor) {
          const oppAttacks = getRawPieceMoves(opp, simBoard);
          if (oppAttacks.some((a) => a.r === move.toRow && a.c === move.toCol)) {
            const pieceVal = move.piece.isRevealed ? PIECE_VALUES[move.piece.trueType] : 350;
            score -= pieceVal * 0.85;
            break;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  // Pick random among the best tied moves
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
