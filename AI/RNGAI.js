import { Chess } from 'chess.js';

class RNGAI {
    /**
     * Make a random move
     * @param {AdamsChessDriver} chessDriver - The chess driver instance
     */
    async promptTurn(chessDriver) {
        // Get current game state from Firebase via the driver
        const currentFen = await this.getCurrentGameFen(chessDriver);
        
        // Create chess.js instance with current position
        const chess = new Chess(currentFen);
        
        // Get all legal moves
        const legalMoves = chess.moves({ verbose: true });
        
        if (legalMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        
        // Select random move
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        
        // Make the move through the driver
        chessDriver.movePiece(randomMove.from, randomMove.to);
    }

    async getCurrentGameFen(chessDriver) {
        // Use the driver's client to get current game state
        if (chessDriver.client && chessDriver.gameId) {
            const gameState = await chessDriver.client.getGameState(chessDriver.gameId);
            return gameState.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        }
        
        // Fallback to starting position
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }

    choosePromotionPiece() {
        // Random promotion piece
        const pieces = ['queen', 'rook', 'bishop', 'knight'];
        return pieces[Math.floor(Math.random() * pieces.length)];
    }
}

export { RNGAI };