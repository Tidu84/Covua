// =============================================================================
// WESTERN CHESS LOGIC ENGINE (Powered by chess.js)
// =============================================================================

import { Chess, type Move as ChessJsMove, type Square, type PieceSymbol, type Color } from 'chess.js';

export interface WesternPiece {
  id: string;
  type: PieceSymbol; // 'p' | 'r' | 'n' | 'b' | 'q' | 'k'
  color: Color; // 'w' | 'b'
  square: Square;
  row: number; // 0..7 (0 = rank 8 Black, 7 = rank 1 White)
  col: number; // 0..7 (0 = file a, 7 = file h)
}

export const CHESS_PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

export const CHESS_PIECE_NAMES: Record<Color, Record<PieceSymbol, string>> = {
  w: {
    p: 'White Pawn',
    n: 'White Knight',
    b: 'White Bishop',
    r: 'White Rook',
    q: 'White Queen',
    k: 'White King'
  },
  b: {
    p: 'Black Pawn',
    n: 'Black Knight',
    b: 'Black Bishop',
    r: 'Black Rook',
    q: 'Black Queen',
    k: 'Black King'
  }
};

export function coordToSquare(r: number, c: number): Square {
  const file = String.fromCharCode('a'.charCodeAt(0) + c);
  const rank = 8 - r;
  return `${file}${rank}` as Square;
}

export function squareToCoord(sq: Square): { r: number; c: number } {
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(sq[1], 10);
  return { r: 8 - rank, c: file };
}

export class WesternChessEngine {
  private chess: Chess;

  constructor() {
    this.chess = new Chess();
  }

  reset() {
    this.chess.reset();
  }

  getTurn(): Color {
    return this.chess.turn();
  }

  isCheck(): boolean {
    return this.chess.inCheck();
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  getLegalMoves(sq: Square): ChessJsMove[] {
    return this.chess.moves({ square: sq, verbose: true });
  }

  getAllLegalMoves(): ChessJsMove[] {
    return this.chess.moves({ verbose: true });
  }

  makeMove(from: Square, to: Square, promotion: PieceSymbol = 'q'): ChessJsMove | null {
    try {
      return this.chess.move({ from, to, promotion });
    } catch {
      return null;
    }
  }

  getBoardState(): (WesternPiece | null)[][] {
    const rawBoard = this.chess.board();
    const board: (WesternPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = rawBoard[r][c];
        if (p) {
          board[r][c] = {
            id: `${p.color}_${p.type}_${r}_${c}`,
            type: p.type,
            color: p.color,
            square: coordToSquare(r, c),
            row: r,
            col: c
          };
        }
      }
    }
    return board;
  }

  // AI Move Selector with material evaluation and positional heuristics
  getAIMove(): ChessJsMove | null {
    const moves = this.getAllLegalMoves();
    if (moves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMoves: ChessJsMove[] = [];
    const aiColor = this.getTurn();

    for (const move of moves) {
      let score = 0;

      // 1. Capture value
      if (move.captured) {
        score += CHESS_PIECE_VALUES[move.captured] * 1.5;
        // Capturing with a lower-value piece is especially good
        const attackerVal = CHESS_PIECE_VALUES[move.piece];
        if (attackerVal < CHESS_PIECE_VALUES[move.captured]) {
          score += 150;
        }
      }

      // 2. Promotion bonus
      if (move.promotion) {
        score += 800;
      }

      // 3. Center control (e4, d4, e5, d5)
      const toCoord = squareToCoord(move.to);
      const distFromCenter = Math.hypot(toCoord.r - 3.5, toCoord.c - 3.5);
      score += (4 - distFromCenter) * 15;

      // 4. Test simulate move to evaluate check
      this.chess.move(move);
      if (this.chess.inCheck()) {
        score += 90;
      }
      if (this.chess.isCheckmate()) {
        score += 100000;
      }

      // 5. Penalize leaving a high-value piece undefended
      const opponentMoves = this.chess.moves({ verbose: true });
      for (const oppMove of opponentMoves) {
        if (oppMove.to === move.to) {
          const pieceVal = CHESS_PIECE_VALUES[move.piece];
          score -= pieceVal * 0.9;
          break;
        }
      }

      this.chess.undo(); // Undo simulation

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
}
