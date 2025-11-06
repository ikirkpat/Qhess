class SurvivalEscaperAI {
    /**
     * Make a survival move for the king - tries to maximize distance from enemies
     * @param {ChessDriver} chessDriver - The chess driver instance (not used in survival mode)
     */
    async promptTurn(chessDriver) {
        const kingPos = findKing('white');
        if (!kingPos) return;
        
        const possibleMoves = [];
        for (let deltaRow = -1; deltaRow <= 1; deltaRow++) {
            for (let deltaCol = -1; deltaCol <= 1; deltaCol++) {
                if (deltaRow === 0 && deltaCol === 0) continue;
                
                const toRow = kingPos.row + deltaRow;
                const toCol = kingPos.col + deltaCol;
                
                if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8 && gameBoard[toRow][toCol] === '') {
                    possibleMoves.push({ row: toRow, col: toCol });
                }
            }
        }
        
        if (possibleMoves.length > 0) {
            // Choose move that maximizes distance from nearest enemy
            let bestMove = possibleMoves[0];
            let maxMinDistance = 0;
            
            for (const move of possibleMoves) {
                let minDistance = Infinity;
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        if (gameBoard[row][col] && isBlackPiece(gameBoard[row][col])) {
                            const distance = Math.abs(move.row - row) + Math.abs(move.col - col);
                            minDistance = Math.min(minDistance, distance);
                        }
                    }
                }
                if (minDistance > maxMinDistance) {
                    maxMinDistance = minDistance;
                    bestMove = move;
                }
            }
            
            gameBoard[bestMove.row][bestMove.col] = '♔';
            gameBoard[kingPos.row][kingPos.col] = '';
            updateBoard();
        }
    }
}

