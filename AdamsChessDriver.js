import { Chess } from 'chess.js';
import { ChessAIClient } from './external_client.js';

export class AdamsChessDriver {
    constructor(color, gameId) {
        this.color = color;
        this.gameId = gameId;
        this.chessBoard = new Chess();
        this.client = new ChessAIClient();
    }

    movePiece(fromSquare, toSquare) {
        const move = this.chessBoard.move({ from: fromSquare, to: toSquare });
        if (!move) {
            throw new Error('Invalid move');
        }
        
        // Send move to Firebase
        this.client.makeMove(this.gameId, fromSquare, toSquare, this.chessBoard.fen());
        
        return move;
    }

    getBoardState() {
        const board = this.chessBoard.board();
        return board.map(row => 
            row.map(square => {
                if (!square) return '';
                const piece = square.type;
                const color = square.color;
                
                // Convert chess.js notation to Unicode pieces
                const pieceMap = {
                    'p': color === 'w' ? '♙' : '♟',
                    'r': color === 'w' ? '♖' : '♜',
                    'n': color === 'w' ? '♘' : '♞',
                    'b': color === 'w' ? '♗' : '♝',
                    'q': color === 'w' ? '♕' : '♛',
                    'k': color === 'w' ? '♔' : '♚'
                };
                
                return pieceMap[piece] || '';
            })
        );
    }

    algebraicToCoords(square) {
        const col = square.charCodeAt(0) - 97;
        const row = 8 - parseInt(square[1]);
        return { row, col };
    }

    updateFromFen(fen) {
        this.chessBoard.load(fen);
    }
}