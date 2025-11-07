class AI {
    constructor(color) {
        this.color = color;
    }
    
    /**
     * Analyze the board and make a move using strategic analysis
     * @param {ChessDriver} chessDriver - The chess driver instance
     */
    async promptTurn(chessDriver) {
        const boardState = chessDriver.getBoardState();
        const availableMoves = this.getAvailableMoves(boardState, this.color);
        
        if (availableMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        
        // Select best move using strategic evaluation
        const selectedMove = this.selectStrategicMove(boardState, availableMoves, this.color);
        
        // Make the move through the driver
        chessDriver.movePiece(selectedMove.from, selectedMove.to);
    }

    getAvailableMoves(boardState, color) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                if (piece && this.isPieceColor(piece, color)) {
                    const fromSquare = this.coordsToAlgebraic(row, col);
                    const validTargets = this.getValidTargetsForPiece(row, col, boardState);
                    validTargets.forEach(target => {
                        const targetCoords = this.algebraicToCoords(target);
                        // Only include moves that don't leave king in check
                        if (this.wouldMoveResolveCheck(row, col, targetCoords.row, targetCoords.col, boardState, color)) {
                            moves.push({ from: fromSquare, to: target });
                        }
                    });
                }
            }
        }
        
        return moves;
    }

    isPieceColor(piece, color) {
        const whitePieces = '♔♕♖♗♘♙';
        const blackPieces = '♚♛♜♝♞♟';
        return (color === 'white' && whitePieces.includes(piece)) || 
               (color === 'black' && blackPieces.includes(piece));
    }

    getValidTargetsForPiece(fromRow, fromCol, boardState) {
        const targets = [];
        const piece = boardState[fromRow][fromCol];
        
        for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
                if (this.isValidMove(fromRow, fromCol, toRow, toCol, boardState)) {
                    targets.push(this.coordsToAlgebraic(toRow, toCol));
                }
            }
        }
        
        return targets;
    }

    isValidMove(fromRow, fromCol, toRow, toCol, boardState) {
        const piece = boardState[fromRow][fromCol];
        const target = boardState[toRow][toCol];
        
        // Can't capture own piece
        if (target && this.isPieceColor(piece, 'white') === this.isPieceColor(target, 'white')) {
            return false;
        }
        
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        // Basic piece movement validation
        switch (piece) {
            case '♙': return this.isValidPawnMove(fromRow, fromCol, toRow, toCol, boardState, true);
            case '♟': return this.isValidPawnMove(fromRow, fromCol, toRow, toCol, boardState, false);
            case '♖': case '♜': return (rowDiff === 0 || colDiff === 0) && this.isPathClear(fromRow, fromCol, toRow, toCol, boardState);
            case '♗': case '♝': return rowDiff === colDiff && this.isPathClear(fromRow, fromCol, toRow, toCol, boardState);
            case '♕': case '♛': return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && this.isPathClear(fromRow, fromCol, toRow, toCol, boardState);
            case '♔': case '♚': return rowDiff <= 1 && colDiff <= 1;
            case '♘': case '♞': return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
            default: return false;
        }
    }

    isValidPawnMove(fromRow, fromCol, toRow, toCol, boardState, isWhite) {
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        const target = boardState[toRow][toCol];
        
        if (fromCol === toCol && !target) {
            return toRow === fromRow + direction || (fromRow === startRow && toRow === fromRow + 2 * direction);
        }
        return Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction && target;
    }

    isPathClear(fromRow, fromCol, toRow, toCol, boardState) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let row = fromRow + rowStep;
        let col = fromCol + colStep;
        
        while (row !== toRow || col !== toCol) {
            if (boardState[row][col]) return false;
            row += rowStep;
            col += colStep;
        }
        return true;
    }

    selectStrategicMove(boardState, availableMoves, color) {
        let bestMoves = [];
        let bestScore = -Infinity;

        for (const move of availableMoves) {
            let score = 0;
            const fromCoords = this.algebraicToCoords(move.from);
            const toCoords = this.algebraicToCoords(move.to);
            const piece = boardState[fromCoords.row][fromCoords.col];
            const targetPiece = boardState[toCoords.row][toCoords.col];

            // Prioritize captures
            if (targetPiece) {
                const pieceValues = {
                    '♟': 1, '♙': 1, '♞': 3, '♘': 3, '♝': 3, '♗': 3,
                    '♜': 5, '♖': 5, '♛': 9, '♕': 9, '♚': 100, '♔': 100
                };
                score += pieceValues[targetPiece] || 0;
            }

            // Prefer center control
            if (toCoords.row >= 3 && toCoords.row <= 4 && toCoords.col >= 3 && toCoords.col <= 4) {
                score += 0.5;
            }

            // Prefer piece development
            if ((color === 'white' && fromCoords.row === 7) || (color === 'black' && fromCoords.row === 0)) {
                score += 0.3;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    algebraicToCoords(square) {
        const col = square.charCodeAt(0) - 97;
        const row = 8 - parseInt(square[1]);
        return { row, col };
    }

    coordsToAlgebraic(row, col) {
        const file = String.fromCharCode(97 + col);
        const rank = (8 - row).toString();
        return file + rank;
    }

    wouldMoveResolveCheck(fromRow, fromCol, toRow, toCol, boardState, color) {
        // Simulate the move
        const newBoard = boardState.map(row => [...row]);
        const piece = newBoard[fromRow][fromCol];
        newBoard[toRow][toCol] = piece;
        newBoard[fromRow][fromCol] = '';
        
        // Check if king would still be in check after this move
        return !this.isInCheck(newBoard, color);
    }
    
    isInCheck(boardState, color) {
        const kingPiece = color === 'white' ? '♔' : '♚';
        let kingPos = null;
        
        // Find king position
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (boardState[row][col] === kingPiece) {
                    kingPos = { row, col };
                    break;
                }
            }
            if (kingPos) break;
        }
        
        if (!kingPos) return false;
        
        // Check if any opponent piece can attack the king
        const opponentColor = color === 'white' ? 'black' : 'white';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                if (piece && this.isPieceColor(piece, opponentColor)) {
                    if (this.canPieceAttack(row, col, kingPos.row, kingPos.col, boardState)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    canPieceAttack(fromRow, fromCol, toRow, toCol, boardState) {
        const piece = boardState[fromRow][fromCol];
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        switch (piece) {
            case '♙': return colDiff === 1 && toRow === fromRow - 1;
            case '♟': return colDiff === 1 && toRow === fromRow + 1;
            case '♖': case '♜': return (rowDiff === 0 || colDiff === 0) && this.isPathClear(fromRow, fromCol, toRow, toCol, boardState);
            case '♗': case '♝': return rowDiff === colDiff && this.isPathClear(fromRow, fromCol, toRow, toCol, boardState);
            case '♕': case '♛': return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && this.isPathClear(fromRow, fromCol, toRow, toCol, boardState);
            case '♔': case '♚': return rowDiff <= 1 && colDiff <= 1;
            case '♘': case '♞': return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
            default: return false;
        }
    }

    choosePromotionPiece() {
        return 'queen';
    }
}

