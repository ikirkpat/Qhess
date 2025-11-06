class ChessDriver {
    constructor(color) {
        this.color = color; // 'white' or 'black'
    }

    /**
     * Move a piece to a target square
     * @param {string} fromSquare - The square to move from (e.g., 'e2')
     * @param {string} toSquare - The square to move to (e.g., 'e4')
     * @throws {Error} If the move is not allowed
     */
    movePiece(fromSquare, toSquare) {
        const fromCoords = this.algebraicToCoords(fromSquare);
        const toCoords = this.algebraicToCoords(toSquare);
        
        // Check if it's the right player's turn
        const piece = gameBoard[fromCoords.row][fromCoords.col];
        if (!piece) {
            throw new Error('No piece at source square');
        }
        
        const isPieceWhite = isWhitePiece(piece);
        if ((this.color === 'white' && !isPieceWhite) || (this.color === 'black' && isPieceWhite)) {
            throw new Error('Not your piece');
        }
        
        const invalidReason = getInvalidMoveReason(fromCoords.row, fromCoords.col, toCoords.row, toCoords.col);
        if (invalidReason) {
            throw new Error(invalidReason);
        }
        
        // Handle zombie mode captures if applicable
        if (selectedGameMode === 'zombie' && gameBoard[toCoords.row][toCoords.col]) {
            handleZombieCapture(fromCoords.row, fromCoords.col, toCoords.row, toCoords.col);
        }
        
        // Execute the move by calling the game's move logic
        if (gameBoard[toCoords.row][toCoords.col]) {
            if (isWhitePiece(gameBoard[toCoords.row][toCoords.col])) {
                capturedWhite.push(gameBoard[toCoords.row][toCoords.col]);
            } else {
                capturedBlack.push(gameBoard[toCoords.row][toCoords.col]);
            }
        }
                
        gameBoard[toCoords.row][toCoords.col] = piece;
        gameBoard[fromCoords.row][fromCoords.col] = '';
    }

    /**
     * Get the current board state
     * @returns {Array} The current state of the board as 8x8 array
     */
    getBoardState() {
        return gameBoard.map(row => [...row]);
    }

    algebraicToCoords(square) {
        const col = square.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
        const row = 8 - parseInt(square[1]); // '8' = 0, '7' = 1, etc.
        return { row, col };
    }
}

module.exports = ChessDriver;
