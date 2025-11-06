class ChessDriver {
    constructor(color) {
        this.color = color; // 'white' or 'black'
        this.board = this.initializeBoard();
    }

    /**
     * Move a piece to a target square
     * @param {string} piece - The piece to move (e.g., 'e2')
     * @param {string} targetSquare - The square to move to (e.g., 'e4')
     * @throws {Error} If the move is not allowed
     */
    movePiece(piece, targetSquare) {
        if (!this.isValidMove(piece, targetSquare)) {
            throw new Error(`Invalid move: ${piece} to ${targetSquare}`);
        }
        
        // Execute the move
        const pieceData = this.board[piece];
        this.board[targetSquare] = pieceData;
        delete this.board[piece];
    }

    /**
     * Get the current board state
     * @returns {Object} The current state of the board
     */
    getBoardState() {
        return { ...this.board };
    }

    initializeBoard() {
        // Initialize with standard chess starting position
        return {
            'a1': 'R', 'b1': 'N', 'c1': 'B', 'd1': 'Q', 'e1': 'K', 'f1': 'B', 'g1': 'N', 'h1': 'R',
            'a2': 'P', 'b2': 'P', 'c2': 'P', 'd2': 'P', 'e2': 'P', 'f2': 'P', 'g2': 'P', 'h2': 'P',
            'a7': 'p', 'b7': 'p', 'c7': 'p', 'd7': 'p', 'e7': 'p', 'f7': 'p', 'g7': 'p', 'h7': 'p',
            'a8': 'r', 'b8': 'n', 'c8': 'b', 'd8': 'q', 'e8': 'k', 'f8': 'b', 'g8': 'n', 'h8': 'r'
        };
    }

    isValidMove(from, to) {
        // Basic validation - piece exists and target is valid square
        return this.board[from] && /^[a-h][1-8]$/.test(to);
    }
}

module.exports = ChessDriver;
