class ZombieChessMode extends GameMode {
    constructor(config) {
        super(config);
        this.chessDriver = null;
        this.whiteAI = null;
        this.whiteChessDriver = null;
        this.aiPlayer = null;
        this.aiConfig = config.aiConfig;
    }

    initialize() {
        if (this.config.aiConfig === 'human-vs-human') {
            initializeZombieMode();
            document.getElementById('turn-indicator').textContent = '🧟 Convert or Be Converted! 🧟';
        } else {
            this.initializeGame(this.config.aiConfig, true);
            document.getElementById('turn-indicator').textContent = '🧟 Chess with Zombie Conversion! 🧟';
        }
    }

    initializeGame(aiConfig, isZombieMode = false) {
        this.isZombieMode = isZombieMode;
        this.aiConfig = aiConfig;
        
        if (aiConfig === 'human-vs-ai') {
            this.chessDriver = new ChessDriver();
            this.aiPlayer = new AI('black');
        } else if (aiConfig === 'ai-vs-ai') {
            this.chessDriver = new ChessDriver();
            this.aiPlayer = new AI('black');
            this.whiteChessDriver = new ChessDriver();
            this.whiteAI = new AI('white');
            setTimeout(() => this.makeAIMove(), 1000);
        }
        
        if (isZombieMode) {
            initializeZombieMode();
        }
    }

    async makeAIMove() {
        if (gameOver) return;

        try {
            let currentAI, currentInterface;

            if (currentPlayer === 'white') {
                if (!this.whiteChessDriver) this.whiteChessDriver = new ChessDriver();
                if (!this.whiteAI) this.whiteAI = new AI('white');
                currentAI = this.whiteAI;
                currentInterface = this.whiteChessDriver;
            } else {
                if (!this.chessDriver) this.chessDriver = new ChessDriver();
                if (!this.aiPlayer) this.aiPlayer = new AI('black');
                currentAI = this.aiPlayer;
                currentInterface = this.chessDriver;
            }

            await currentAI.promptTurn(currentInterface);
            
            // Check if AI move resulted in pawn promotion
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = gameBoard[row][col];
                    if (isPawnPromotion(piece, row)) {
                        const choice = currentAI.choosePromotionPiece();
                        const isWhite = isWhitePiece(piece);
                        let promotedPiece;
                        switch (choice) {
                            case 'rook': promotedPiece = isWhite ? '♖' : '♜'; break;
                            case 'bishop': promotedPiece = isWhite ? '♗' : '♝'; break;
                            case 'knight': promotedPiece = isWhite ? '♘' : '♞'; break;
                            default: promotedPiece = isWhite ? '♕' : '♛'; break;
                        }
                        gameBoard[row][col] = promotedPiece;
                    }
                }
            }
            
            updateBoard();
            updateCapturedPieces();

            // Check for game end after AI move
            const opponent = currentPlayer === 'white' ? 'black' : 'white';
            if (isInCheck(opponent) && !hasLegalMoves(opponent)) {
                gameOver = true;
                const winner = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
                document.getElementById('turn-indicator').textContent = `🎉 CHECKMATE! ${winner} Wins! 🎉`;
                createConfetti();
            } else {
                addIncrement();
                currentPlayer = opponent;
                if (!checkGameEnd()) {
                    updateTurnIndicator();
                    updateTimers();

                    // Continue AI vs AI
                    if (this.aiConfig === 'ai-vs-ai' && !gameOver) {
                        setTimeout(() => this.makeAIMove(), 1000);
                    }
                }
            }
        } catch (error) {
            console.error('AI move error:', error);
        }
    }

    handleSquareClick(square) {
        if (this.config.aiConfig === 'human-vs-human') {
            handleZombieSquareClick(square);
            return;
        }

        if (gameOver) return;
        if (this.aiConfig === 'ai-vs-ai') return;

        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = gameBoard[row][col];

        if (selectedSquare) {
            const fromRow = parseInt(selectedSquare.dataset.row);
            const fromCol = parseInt(selectedSquare.dataset.col);

            const invalidReason = getInvalidMoveReason(fromRow, fromCol, row, col);
            if (!invalidReason) {
                const piece = gameBoard[fromRow][fromCol];

                trackPieceMovement(fromRow, fromCol, piece);

                if (gameBoard[row][col]) {
                    handleZombieCapture(fromRow, fromCol, row, col);
                }

                if (isCastlingMove(fromRow, fromCol, row, col)) {
                    performCastling(fromRow, fromCol, row, col);
                    updateBoard();
                } else {
                    if (isPawnPromotion(piece, row)) {
                        pendingPromotion = { fromRow, fromCol, toRow: row, toCol: col, piece };
                        showPromotionModal(isWhitePiece(piece));
                        return;
                    } else {
                        gameBoard[row][col] = piece;
                        gameBoard[fromRow][fromCol] = '';
                        updateBoard();
                    }
                }

                const opponent = currentPlayer === 'white' ? 'black' : 'white';
                if (isInCheck(opponent) && !hasLegalMoves(opponent)) {
                    gameOver = true;
                    const winner = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
                    document.getElementById('turn-indicator').textContent = `🎉 CHECKMATE! ${winner} Wins! 🎉`;
                    createConfetti();
                } else {
                    addIncrement();
                    currentPlayer = opponent;
                    if (!checkGameEnd()) {
                        updateTurnIndicator();
                        updateTimers();
                        clearMessage();

                        if ((this.aiConfig === 'human-vs-ai' && currentPlayer === 'black') || this.aiConfig === 'ai-vs-ai') {
                            if (!gameOver) {
                                setTimeout(() => this.makeAIMove(), 1000);
                            }
                        }
                    }
                }
            } else {
                showMessage(invalidReason);
            }

            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            clearHighlights();
        } else if (piece && ((currentPlayer === 'white' && isWhitePiece(piece)) || (currentPlayer === 'black' && isBlackPiece(piece)))) {
            if (selectedSquare) selectedSquare.classList.remove('selected');
            selectedSquare = square;
            square.classList.add('selected');
            showPossibleMoves(row, col);
        }
    }
}