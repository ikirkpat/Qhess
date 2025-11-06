class ChessInterface {
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
        
        const invalidReason = getInvalidMoveReason(fromCoords.row, fromCoords.col, toCoords.row, toCoords.col);
        if (invalidReason) {
            throw new Error(invalidReason);
        }
        
        // Execute the move by calling the game's move logic
        if (gameBoard[toCoords.row][toCoords.col]) {
            if (isWhitePiece(gameBoard[toCoords.row][toCoords.col])) {
                capturedWhite.push(gameBoard[toCoords.row][toCoords.col]);
            } else {
                capturedBlack.push(gameBoard[toCoords.row][toCoords.col]);
            }
        }
        
        gameBoard[toCoords.row][toCoords.col] = gameBoard[fromCoords.row][fromCoords.col];
        gameBoard[fromCoords.row][fromCoords.col] = '';
        
        // Switch turns
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
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

module.exports = ChessInterface;
