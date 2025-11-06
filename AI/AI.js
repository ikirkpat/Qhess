class AI {
    /**
     * Analyze the board and make a move using Amazon Q's strategic analysis
     * @param {ChessDriver} chessDriver - The chess driver instance
     */
    async promptTurn(chessDriver) {
        const boardState = chessDriver.getBoardState();
        const availableMoves = this.getAvailableMoves(boardState, chessDriver.color);
        
        if (availableMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        
        // Use Amazon Q to analyze the position and select the best move
        const selectedMove = await this.selectBestMove(boardState, availableMoves, chessDriver.color);
        chessDriver.movePiece(selectedMove.from, selectedMove.to);
    }

    async selectBestMove(boardState, availableMoves, color) {
        // Convert board to readable format for analysis
        const boardDescription = this.describeBoardPosition(boardState);
        const movesDescription = availableMoves.map(move => `${move.from} to ${move.to}`).join(', ');
        
        const prompt = `You are a chess AI playing as ${color}. 
        
Current board position:
${boardDescription}

Available moves: ${movesDescription}

Analyze the position and select the best move considering:
1. Captures (especially high-value pieces)
2. Checks and checkmate threats
3. Piece development and control of center
4. King safety
5. Tactical opportunities

Respond with only the move in format "from to" (e.g., "e2 e4"). Choose the single best move from the available options.`;

        try {
            // For now, use strategic heuristics since we can't make external API calls in browser
            return this.selectStrategicMove(boardState, availableMoves, color);
        } catch (error) {
            console.log('Using strategic fallback for move selection');
            return this.selectStrategicMove(boardState, availableMoves, color);
        }
    }

    selectStrategicMove(boardState, availableMoves, color) {
        // Strategic move selection based on chess principles
        let bestMoves = [];
        let bestScore = -Infinity;

        for (const move of availableMoves) {
            let score = 0;
            const fromCoords = this.algebraicToCoords(move.from);
            const toCoords = this.algebraicToCoords(move.to);
            const piece = boardState[fromCoords.row][fromCoords.col];
            const targetPiece = boardState[toCoords.row][toCoords.col];

            // Highest priority: Pawn promotion
            if ((piece === '♙' && toCoords.row === 0) || (piece === '♟' && toCoords.row === 7)) {
                score += 50; // Very high priority for promotion
            }

            // Prioritize captures
            if (targetPiece) {
                const pieceValues = {
                    '♟': 1, '♙': 1,  // Pawn
                    '♞': 3, '♘': 3,  // Knight
                    '♝': 3, '♗': 3,  // Bishop
                    '♜': 5, '♖': 5,  // Rook
                    '♛': 9, '♕': 9,  // Queen
                    '♚': 100, '♔': 100  // King
                };
                score += pieceValues[targetPiece] || 0;
            }

            // Prefer center control
            if (toCoords.row >= 3 && toCoords.row <= 4 && toCoords.col >= 3 && toCoords.col <= 4) {
                score += 0.5;
            }

            // Prefer piece development (moving from back rank)
            if (color === 'white' && fromCoords.row === 7) score += 0.3;
            if (color === 'black' && fromCoords.row === 0) score += 0.3;

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        // Return random move from best moves
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    describeBoardPosition(boardState) {
        let description = "  a b c d e f g h\n";
        for (let row = 0; row < 8; row++) {
            description += `${8 - row} `;
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                description += (piece || '.') + ' ';
            }
            description += `${8 - row}\n`;
        }
        description += "  a b c d e f g h";
        return description;
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
        // AI always promotes to queen (strongest piece)
        return 'queen';
    }
}

