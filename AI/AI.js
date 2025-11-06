class AI {
    /**
     * Analyze the board and make a move
     * @param {ChessDriver} chessDriver - The chess driver instance
     */
    promptTurn(chessDriver) {
        const boardState = chessDriver.getBoardState();
        const availableMoves = this.getAvailableMoves(boardState, chessDriver.color);
        
        if (availableMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        
        // Simple AI: pick a random valid move
        const selectedMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        chessDriver.movePiece(selectedMove.from, selectedMove.to);
    }

    getAvailableMoves(boardState, color) {
        const moves = [];
        const isWhite = color === 'white';
        
        for (const [square, piece] of Object.entries(boardState)) {
            if ((isWhite && piece === piece.toUpperCase()) || (!isWhite && piece === piece.toLowerCase())) {
                // Find valid moves for this piece
                const validTargets = this.getValidTargetsForPiece(square, piece, boardState);
                validTargets.forEach(target => {
                    moves.push({ from: square, to: target });
                });
            }
        }
        
        return moves;
    }

    getValidTargetsForPiece(from, piece, boardState) {
        const targets = [];
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
        
        // Simple implementation: try all squares and check basic validity
        for (const file of files) {
            for (const rank of ranks) {
                const target = file + rank;
                if (target !== from && this.isBasicValidMove(from, target, piece, boardState)) {
                    targets.push(target);
                }
            }
        }
        
        return targets;
    }

    isBasicValidMove(from, to, piece, boardState) {
        // Basic move validation - can be expanded for proper chess rules
        const targetPiece = boardState[to];
        
        // Can't capture own piece
        if (targetPiece) {
            const isFromWhite = piece === piece.toUpperCase();
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            if (isFromWhite === isTargetWhite) {
                return false;
            }
        }
        
        return true;
    }
}

module.exports = AI;