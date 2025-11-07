class RNGAI {
    /**
     * Make a random move
     * @param {ChessDriver} chessDriver - The chess driver instance
     */
    async promptTurn(chessDriver) {
        const boardState = chessDriver.getBoardState();
        const availableMoves = this.getAvailableMoves(boardState, chessDriver.color);
        
        if (availableMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        
        // Select random move
        const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        chessDriver.movePiece(randomMove.from, randomMove.to);
    }

    algebraicToCoords(square) {
        const col = square.charCodeAt(0) - 97;
        const row = 8 - parseInt(square[1]);
        return { row, col };
    }

    getAvailableMoves(boardState, color) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                if (piece && ((color === 'white' && isWhitePiece(piece)) || (color === 'black' && isBlackPiece(piece)))) {
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
        const file = String.fromCharCode(97 + col);
        const rank = (8 - row).toString();
        return file + rank;
    }

    choosePromotionPiece() {
        // Random promotion piece
        const pieces = ['queen', 'rook', 'bishop', 'knight'];
        return pieces[Math.floor(Math.random() * pieces.length)];
    }
}

export { RNGAI };