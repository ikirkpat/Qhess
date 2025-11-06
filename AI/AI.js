class AI {
    /**
     * Analyze the board and make a move
     * @param {ChessInterface} chessInterface - The chess interface instance
     */
    promptTurn(chessInterface) {
        const boardState = chessInterface.getBoardState();
        const availableMoves = this.getAvailableMoves(boardState);
        
        if (availableMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        
        // Simple AI: pick a random valid move
        const selectedMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        chessInterface.movePiece(selectedMove.from, selectedMove.to);
    }

    getAvailableMoves(boardState) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                if (piece && isBlackPiece(piece)) {
                    const fromSquare = this.coordsToAlgebraic(row, col);
                    const validTargets = this.getValidTargetsForPiece(row, col, boardState);
                    validTargets.forEach(target => {
                        moves.push({ from: fromSquare, to: target });
                    });
                }
            }
        }
        
        return moves;
    }

    getValidTargetsForPiece(fromRow, fromCol, boardState) {
        const targets = [];
        
        for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
                if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                    targets.push(this.coordsToAlgebraic(toRow, toCol));
                }
            }
        }
        
        return targets;
    }

    coordsToAlgebraic(row, col) {
        const file = String.fromCharCode(97 + col); // 0 = 'a', 1 = 'b', etc.
        const rank = (8 - row).toString(); // 0 = '8', 1 = '7', etc.
        return file + rank;
    }
}

module.exports = AI;