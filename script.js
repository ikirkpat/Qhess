const whitePieces = '♔♕♖♗♘♙';
const blackPieces = '♚♛♜♝♞♟';

let gameBoard = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
];

let selectedSquare = null;
let currentPlayer = 'white';
let capturedWhite = [];
let capturedBlack = [];
let gameOver = false;
let whiteTime = 5400; // 90 minutes in seconds (Classical default)
let blackTime = 5400;
let timerInterval = null;
let increment = 30; // 30 seconds increment (Classical default)
let selectedGameType = 'classic';
let selectedAIConfig = 'human-vs-human';
let selectedTimeControl = 'classical';
let currentGameMode = null;
let selectedTheme = 'classic';
let selectedScenario = 'standard';
let survivalMode = false;
let aiPieces = [];
let pendingPromotion = null;

const scenarios = {
    standard: [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ],
    endgame: [
        ['', '', '', '', '♚', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '♕', '', '', '', ''],
        ['', '', '', '', '♔', '', '', '']
    ],
    promotion: [
        ['', '', '', '', '♚', '', '', ''],
        ['', '', '♙', '', '', '♟', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '♔', '', '', '']
    ],
    castling: [
        ['♜', '', '', '', '♚', '', '', '♜'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['♖', '', '', '', '♔', '', '', '♖']
    ]
};
let pieceMoved = {
    whiteKing: false,
    blackKing: false,
    whiteRookKingside: false,
    whiteRookQueenside: false,
    blackRookKingside: false,
    blackRookQueenside: false
};

const timeControls = {
    classical: { time: 5400, increment: 30 }, // 90 minutes + 30 seconds
    rapid: { time: 900, increment: 10 },      // 15 minutes + 10 seconds
    blitz: { time: 300, increment: 5 },       // 5 minutes + 5 seconds
    bullet: { time: 120, increment: 1 }       // 2 minutes + 1 second
};

function isWhitePiece(piece) {
    return whitePieces.includes(piece);
}

function isBlackPiece(piece) {
    return blackPieces.includes(piece);
}

function isPawnPromotion(piece, toRow) {
    return (piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7);
}

function showPromotionModal(isWhite) {
    const choice = prompt('Choose promotion piece:\n1 - Queen\n2 - Rook\n3 - Bishop\n4 - Knight', '1');

    let promotedPiece;
    switch (choice) {
        case '2': promotedPiece = isWhite ? '♖' : '♜'; break;
        case '3': promotedPiece = isWhite ? '♗' : '♝'; break;
        case '4': promotedPiece = isWhite ? '♘' : '♞'; break;
        default: promotedPiece = isWhite ? '♕' : '♛'; break;
    }

    if (pendingPromotion) {
        gameBoard[pendingPromotion.toRow][pendingPromotion.toCol] = promotedPiece;
        gameBoard[pendingPromotion.fromRow][pendingPromotion.fromCol] = '';
        pendingPromotion = null;
        updateBoard();

        // Continue game flow
        if (!survivalMode) {
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

                    if ((selectedGameMode === 'ai' && currentPlayer === 'black') || selectedGameMode === 'ai-vs-ai') {
                        if (!gameOver) setTimeout(() => makeAIMove(), 1000);
                    }
                }
            }
        }
    }
}

function hidePromotionModal() {
    // Not needed for prompt-based approach
}

// Expose functions globally for AI
window.isWhitePiece = isWhitePiece;
window.isBlackPiece = isBlackPiece;
window.isValidMove = isValidMove;

function getInvalidMoveReason(fromRow, fromCol, toRow, toCol) {
    const piece = gameBoard[fromRow][fromCol];
    const target = gameBoard[toRow][toCol];

    // Can't capture own piece
    if (target && ((isWhitePiece(piece) && isWhitePiece(target)) || (isBlackPiece(piece) && isBlackPiece(target)))) {
        return "Cannot capture your own piece";
    }

    // Check if move would leave king in check
    const originalPiece = gameBoard[toRow][toCol];
    gameBoard[toRow][toCol] = gameBoard[fromRow][fromCol];
    gameBoard[fromRow][fromCol] = '';

    const playerColor = isWhitePiece(piece) ? 'white' : 'black';
    const wouldBeInCheck = isInCheck(playerColor);

    // Undo move
    gameBoard[fromRow][fromCol] = gameBoard[toRow][toCol];
    gameBoard[toRow][toCol] = originalPiece;

    if (wouldBeInCheck) {
        return "Cannot move into check or leave king in check";
    }

    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    // Basic movement rules
    switch (piece) {
        case '♙': // White pawn
            if (fromCol === toCol && !target) {
                if (toRow === fromRow - 1) {
                    // Normal one square move
                } else if (fromRow === 6 && toRow === 4) {
                    // Two square move from starting position - check if path is clear
                    if (gameBoard[5][fromCol]) {
                        return "Pawn cannot jump over pieces";
                    }
                } else {
                    return "Pawns can only move forward 1 square (or 2 from starting position)";
                }
            } else if (!(colDiff === 1 && toRow === fromRow - 1 && target)) {
                return "Pawns can only capture diagonally forward";
            }
            break;

        case '♟': // Black pawn
            if (fromCol === toCol && !target) {
                if (toRow === fromRow + 1) {
                    // Normal one square move
                } else if (fromRow === 1 && toRow === 3) {
                    // Two square move from starting position - check if path is clear
                    if (gameBoard[2][fromCol]) {
                        return "Pawn cannot jump over pieces";
                    }
                } else {
                    return "Pawns can only move forward 1 square (or 2 from starting position)";
                }
            } else if (!(colDiff === 1 && toRow === fromRow + 1 && target)) {
                return "Pawns can only capture diagonally forward";
            }
            break;

        case '♖': case '♜': // Rook
            if (!(rowDiff === 0 || colDiff === 0)) {
                return "Rooks can only move horizontally or vertically";
            }
            if (!isPathClear(fromRow, fromCol, toRow, toCol)) {
                return "Path is blocked by another piece";
            }
            break;

        case '♗': case '♝': // Bishop
            if (rowDiff !== colDiff) {
                return "Bishops can only move diagonally";
            }
            if (!isPathClear(fromRow, fromCol, toRow, toCol)) {
                return "Path is blocked by another piece";
            }
            break;

        case '♕': case '♛': // Queen
            if (!(rowDiff === 0 || colDiff === 0 || rowDiff === colDiff)) {
                return "Queens move like rooks and bishops combined";
            }
            if (!isPathClear(fromRow, fromCol, toRow, toCol)) {
                return "Path is blocked by another piece";
            }
            break;

        case '♔': case '♚': // King
            if (rowDiff <= 1 && colDiff <= 1) {
                // Normal king move
            } else if (rowDiff === 0 && colDiff === 2) {
                // Potential castling move
                const castlingError = getCastlingError(fromRow, fromCol, toRow, toCol, piece);
                if (castlingError) return castlingError;
            } else {
                return "Kings can only move one square in any direction (or castle)";
            }
            break;

        case '♘': case '♞': // Knight
            if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
                return "Knights move in an L-shape (2+1 or 1+2 squares)";
            }
            break;

        default:
            return "Invalid piece";
    }
    return null;
}

function getCastlingError(fromRow, fromCol, toRow, toCol, piece) {
    const isWhite = piece === '♔';
    const kingRow = isWhite ? 7 : 0;

    // Check if king is on starting square
    if (fromRow !== kingRow || fromCol !== 4) {
        return "King must be on starting square to castle";
    }

    // Check if king has moved
    if ((isWhite && pieceMoved.whiteKing) || (!isWhite && pieceMoved.blackKing)) {
        return "Cannot castle after king has moved";
    }

    // Check if king is in check
    if (isInCheck(isWhite ? 'white' : 'black')) {
        return "Cannot castle while in check";
    }

    const isKingside = toCol === 6;
    const rookCol = isKingside ? 7 : 0;
    const rookPiece = gameBoard[kingRow][rookCol];

    // Check if rook is present and hasn't moved
    if (!rookPiece || (isWhite && rookPiece !== '♖') || (!isWhite && rookPiece !== '♜')) {
        return "Rook must be present to castle";
    }

    if (isWhite) {
        if ((isKingside && pieceMoved.whiteRookKingside) || (!isKingside && pieceMoved.whiteRookQueenside)) {
            return "Cannot castle after rook has moved";
        }
    } else {
        if ((isKingside && pieceMoved.blackRookKingside) || (!isKingside && pieceMoved.blackRookQueenside)) {
            return "Cannot castle after rook has moved";
        }
    }

    // Check if squares between king and rook are empty
    const start = Math.min(4, rookCol) + 1;
    const end = Math.max(4, rookCol);
    for (let col = start; col < end; col++) {
        if (gameBoard[kingRow][col]) {
            return "Cannot castle with pieces between king and rook";
        }
    }

    // Check if king passes through or ends in check
    const kingPath = isKingside ? [5, 6] : [3, 2];
    for (const col of kingPath) {
        // Simulate king on this square
        const originalPiece = gameBoard[kingRow][col];
        gameBoard[kingRow][col] = piece;
        gameBoard[fromRow][fromCol] = '';

        const inCheck = isInCheck(isWhite ? 'white' : 'black');

        // Restore board
        gameBoard[fromRow][fromCol] = piece;
        gameBoard[kingRow][col] = originalPiece;

        if (inCheck) {
            return "Cannot castle through or into check";
        }
    }

    return null;
}

function isCastlingMove(fromRow, fromCol, toRow, toCol) {
    const piece = gameBoard[fromRow][fromCol];
    return (piece === '♔' || piece === '♚') && fromRow === toRow && Math.abs(toCol - fromCol) === 2;
}

function performCastling(fromRow, fromCol, toRow, toCol) {
    const piece = gameBoard[fromRow][fromCol];
    const isKingside = toCol === 6;
    const rookFromCol = isKingside ? 7 : 0;
    const rookToCol = isKingside ? 5 : 3;
    const rookPiece = gameBoard[fromRow][rookFromCol];

    // Move king
    gameBoard[toRow][toCol] = piece;
    gameBoard[fromRow][fromCol] = '';

    // Move rook
    gameBoard[fromRow][rookToCol] = rookPiece;
    gameBoard[fromRow][rookFromCol] = '';
}

function trackPieceMovement(fromRow, fromCol, piece) {
    if (piece === '♔') pieceMoved.whiteKing = true;
    if (piece === '♚') pieceMoved.blackKing = true;
    if (piece === '♖') {
        if (fromRow === 7 && fromCol === 0) pieceMoved.whiteRookQueenside = true;
        if (fromRow === 7 && fromCol === 7) pieceMoved.whiteRookKingside = true;
    }
    if (piece === '♜') {
        if (fromRow === 0 && fromCol === 0) pieceMoved.blackRookQueenside = true;
        if (fromRow === 0 && fromCol === 7) pieceMoved.blackRookKingside = true;
    }
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    return getInvalidMoveReason(fromRow, fromCol, toRow, toCol) === null;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

    let row = fromRow + rowStep;
    let col = fromCol + colStep;

    while (row !== toRow || col !== toCol) {
        if (gameBoard[row][col]) return false;
        row += rowStep;
        col += colStep;
    }
    return true;
}

function showPossibleMoves(fromRow, fromCol) {
    clearHighlights();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (isValidMove(fromRow, fromCol, row, col)) {
                const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (gameBoard[row][col]) {
                    square.classList.add('possible-capture');
                } else {
                    square.classList.add('possible-move');
                }
            }
        }
    }
}

function clearHighlights() {
    document.querySelectorAll('.possible-move, .possible-capture').forEach(square => {
        square.classList.remove('possible-move', 'possible-capture');
    });
}

function findKing(color) {
    const kingPiece = color === 'white' ? '♔' : '♚';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameBoard[row][col] === kingPiece) {
                return { row, col };
            }
        }
    }
    return null;
}

function isInCheck(color) {
    const king = findKing(color);
    if (!king) return false;

    const opponent = color === 'white' ? 'black' : 'white';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameBoard[row][col];
            if (piece && ((opponent === 'white' && isWhitePiece(piece)) || (opponent === 'black' && isBlackPiece(piece)))) {
                if (canAttackSquare(row, col, king.row, king.col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function canAttackSquare(fromRow, fromCol, toRow, toCol) {
    const piece = gameBoard[fromRow][fromCol];
    const target = gameBoard[toRow][toCol];

    // Can't capture own piece (but for attack checking, we ignore this for the king)
    if (target && ((isWhitePiece(piece) && isWhitePiece(target)) || (isBlackPiece(piece) && isBlackPiece(target)))) {
        // Allow attacking the king for check detection
        const targetIsKing = target === '♔' || target === '♚';
        if (!targetIsKing) {
            return false;
        }
    }

    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    // Basic movement rules (same as in getInvalidMoveReason but without check validation)
    switch (piece) {
        case '♙': // White pawn
            return colDiff === 1 && toRow === fromRow - 1;

        case '♟': // Black pawn
            return colDiff === 1 && toRow === fromRow + 1;

        case '♖': case '♜': // Rook
            return (rowDiff === 0 || colDiff === 0) && isPathClear(fromRow, fromCol, toRow, toCol);

        case '♗': case '♝': // Bishop
            return rowDiff === colDiff && isPathClear(fromRow, fromCol, toRow, toCol);

        case '♕': case '♛': // Queen
            return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && isPathClear(fromRow, fromCol, toRow, toCol);

        case '♔': case '♚': // King
            return rowDiff <= 1 && colDiff <= 1;

        case '♘': case '♞': // Knight
            return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

        default:
            return false;
    }
}

function hasLegalMoves(color) {
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = gameBoard[fromRow][fromCol];
            if (piece && ((color === 'white' && isWhitePiece(piece)) || (color === 'black' && isBlackPiece(piece)))) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                            // Simulate move to check if king would still be in check
                            const originalPiece = gameBoard[toRow][toCol];
                            gameBoard[toRow][toCol] = gameBoard[fromRow][fromCol];
                            gameBoard[fromRow][fromCol] = '';

                            const stillInCheck = isInCheck(color);

                            // Undo move
                            gameBoard[fromRow][fromCol] = gameBoard[toRow][toCol];
                            gameBoard[toRow][toCol] = originalPiece;

                            if (!stillInCheck) return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

function createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 5000);
    }
}

function resetGame() {
    document.getElementById('setup-screen').classList.remove('hidden');
    document.getElementById('game-container').classList.add('hidden');

    if (timerInterval) clearInterval(timerInterval);
}

function startNewGame() {
    const timeControl = timeControls[selectedTimeControl];

    if (survivalMode) {
        // Survival mode: Player king vs AI pieces
        gameBoard = [
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '♔', '', '', '']
        ];

        // Add AI pieces randomly
        aiPieces = ['♛', '♜', '♜', '♝', '♝', '♞', '♞'];
        placeSurvivalPieces();

        document.getElementById('turn-indicator').textContent = 'Survive the Hunt!';

        // Start AI movement
        setTimeout(moveAIPieces, 2000);
    } else {
        // Create and initialize game mode using factory
        currentGameMode = GameModeFactory.createGameMode(selectedGameType, selectedAIConfig);
        currentGameMode.initialize();

        if (selectedGameType === 'shooter') {
            return; // Skip normal chess setup
        }

        if (['classic', 'zombie'].includes(selectedGameType)) {
            gameBoard = scenarios[selectedScenario].map(row => [...row]);
        }
    }

    if (selectedSquare) {
        selectedSquare.classList.remove('selected');
    }
    selectedSquare = null;
    currentPlayer = 'white';
    capturedWhite = [];
    capturedBlack = [];
    gameOver = false;
    whiteTime = timeControl.time;
    blackTime = timeControl.time;
    increment = timeControl.increment;
    pieceMoved = {
        whiteKing: false,
        blackKing: false,
        whiteRookKingside: false,
        whiteRookQueenside: false,
        blackRookKingside: false,
        blackRookQueenside: false
    };

    if (timerInterval) clearInterval(timerInterval);

    clearHighlights();
    clearMessage();
    updateBoard();
    updateTurnIndicator();
    updateCapturedPieces();
    updateTimers();
    if (!survivalMode) startTimer();

    // Game mode initialization is handled by the factory pattern above
}

function placeSurvivalPieces() {
    const positions = [];

    // Generate random positions for AI pieces
    while (positions.length < aiPieces.length) {
        const row = Math.floor(Math.random() * 6); // Top 6 rows
        const col = Math.floor(Math.random() * 8);

        if (gameBoard[row][col] === '' && !positions.some(p => p.row === row && p.col === col)) {
            positions.push({ row, col });
        }
    }

    // Place AI pieces
    aiPieces.forEach((piece, index) => {
        const pos = positions[index];
        gameBoard[pos.row][pos.col] = piece;
    });
}

function moveAIPieces() {
    if (gameOver || !survivalMode) return;

    // Find king position
    const kingPos = findKing('white');
    if (!kingPos) return;

    let pieceMoved = false;

    // Move one AI piece closer to the king (ignoring chess rules)
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameBoard[row][col];
            if (piece && isBlackPiece(piece) && !pieceMoved) {
                // Get adjacent moves only (one square at a time)
                const possibleMoves = [];
                for (let deltaRow = -1; deltaRow <= 1; deltaRow++) {
                    for (let deltaCol = -1; deltaCol <= 1; deltaCol++) {
                        if (deltaRow === 0 && deltaCol === 0) continue; // Skip current position

                        const toRow = row + deltaRow;
                        const toCol = col + deltaCol;

                        if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8) {
                            if (gameBoard[toRow][toCol] === '' || (toRow === kingPos.row && toCol === kingPos.col)) {
                                possibleMoves.push({ row: toRow, col: toCol });
                            }
                        }
                    }
                }

                if (possibleMoves.length > 0) {
                    // Choose move that gets closest to king
                    const bestMove = possibleMoves.reduce((best, move) => {
                        const distToBest = Math.abs(best.row - kingPos.row) + Math.abs(best.col - kingPos.col);
                        const distToMove = Math.abs(move.row - kingPos.row) + Math.abs(move.col - kingPos.col);
                        return distToMove < distToBest ? move : best;
                    });

                    // Move AI piece
                    gameBoard[bestMove.row][bestMove.col] = piece;
                    gameBoard[row][col] = '';
                    pieceMoved = true;

                    // Check if AI piece captured the king (game over)
                    if (bestMove.row === kingPos.row && bestMove.col === kingPos.col) {
                        updateBoard(); // Show the capture first
                        setTimeout(() => showGameOver(), 500); // Delay game over
                        return;
                    }
                }
            }
        }
    }

    updateBoard();

    // Check if king was captured (no longer on board)
    const newKingPos = findKing('white');
    if (!newKingPos) {
        // King was captured, show game over
        setTimeout(() => showGameOver(), 500);
        return;
    }

    // Also check if any AI piece is on the same square as the king
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameBoard[row][col];
            if (piece && isBlackPiece(piece) && row === newKingPos.row && col === newKingPos.col) {
                // AI piece captured the king
                gameBoard[row][col] = piece; // Keep the AI piece
                updateBoard();
                setTimeout(() => showGameOver(), 500);
                return;
            }
        }
    }

    setTimeout(moveAIPieces, 800); // Move every 0.8 seconds (faster)
}

function getValidMovesForPiece(row, col) {
    const moves = [];
    for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(row, col, toRow, toCol)) {
                moves.push({ row: toRow, col: toCol });
            }
        }
    }
    return moves;
}

function playHorrorSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create a creepy horror sound effect
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Low frequency rumble
    oscillator1.frequency.setValueAtTime(60, audioContext.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 2);
    oscillator1.type = 'sawtooth';

    // High pitched scream
    oscillator2.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
    oscillator2.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 2);
    oscillator2.type = 'square';

    // Volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.1, audioContext.currentTime + 1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 2);
    oscillator2.stop(audioContext.currentTime + 2);
}

function showGameOver() {
    gameOver = true;

    // Play horror sound effect
    playHorrorSound();

    const gameOverScreen = document.createElement('div');
    gameOverScreen.className = 'game-over-screen';

    const gameOverText = document.createElement('div');
    gameOverText.className = 'game-over-text';
    gameOverText.textContent = 'GAME OVER';

    // Add blood splatters
    for (let i = 0; i < 5; i++) {
        const splatter = document.createElement('div');
        splatter.className = 'blood-splatter';
        splatter.style.top = Math.random() * 100 + '%';
        splatter.style.left = Math.random() * 100 + '%';
        splatter.style.animationDelay = (i * 0.2) + 's';
        gameOverScreen.appendChild(splatter);
    }

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Try Again';
    resetButton.className = 'reset-btn';
    resetButton.onclick = () => {
        document.body.removeChild(gameOverScreen);
        resetGame();
    };

    gameOverScreen.appendChild(gameOverText);
    gameOverScreen.appendChild(resetButton);
    document.body.appendChild(gameOverScreen);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimers() {
    document.getElementById('white-timer').textContent = `⏱️ White: ${formatTime(whiteTime)}`;
    document.getElementById('black-timer').textContent = `⏱️ Black: ${formatTime(blackTime)}`;

    // Update active timer styling
    document.getElementById('white-timer').classList.toggle('active', currentPlayer === 'white' && !gameOver);
    document.getElementById('black-timer').classList.toggle('active', currentPlayer === 'black' && !gameOver);

    // Low time warning
    document.getElementById('white-timer').classList.toggle('low-time', whiteTime <= 30);
    document.getElementById('black-timer').classList.toggle('low-time', blackTime <= 30);
}

function addIncrement() {
    if (currentPlayer === 'white') {
        whiteTime += increment;
    } else {
        blackTime += increment;
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (gameOver) {
            clearInterval(timerInterval);
            return;
        }

        if (currentPlayer === 'white') {
            whiteTime--;
            if (whiteTime <= 0) {
                gameOver = true;
                document.getElementById('turn-indicator').textContent = '⏰ Time Up! Black Wins!';
                clearInterval(timerInterval);
                return;
            }
        } else {
            blackTime--;
            if (blackTime <= 0) {
                gameOver = true;
                document.getElementById('turn-indicator').textContent = '⏰ Time Up! White Wins!';
                clearInterval(timerInterval);
                return;
            }
        }

        updateTimers();
    }, 1000);
}

function checkGameEnd() {
    if (isInCheck(currentPlayer)) {
        if (!hasLegalMoves(currentPlayer)) {
            gameOver = true;
            const winner = currentPlayer === 'white' ? 'Black' : 'White';
            document.getElementById('turn-indicator').textContent = `🎉 CHECKMATE! ${winner} Wins! 🎉`;
            createConfetti();
            clearInterval(timerInterval);
            return true;
        } else {
            // Player is in check but has legal moves
            const playerName = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
            showMessage(`${playerName} is in CHECK! Must move king, block, or capture attacker.`);
        }
    } else if (!hasLegalMoves(currentPlayer)) {
        gameOver = true;
        document.getElementById('turn-indicator').textContent = '🤝 Stalemate - Draw!';
        clearInterval(timerInterval);
        return true;
    }
    return false;
}

function handleSquareClick(square) {
    // Delegate to current game mode
    if (currentGameMode) {
        currentGameMode.handleSquareClick(square);
        return;
    }

    // Handle special modes (survival, zombie, etc.)
    if (gameOver) return;

    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = gameBoard[row][col];

    if (selectedSquare) {
        const fromRow = parseInt(selectedSquare.dataset.row);
        const fromCol = parseInt(selectedSquare.dataset.col);

        let invalidReason = null;
        if (survivalMode) {
            const rowDiff = Math.abs(row - fromRow);
            const colDiff = Math.abs(col - fromCol);
            if (rowDiff > 1 || colDiff > 1) {
                invalidReason = "King can only move one square";
            }
        } else {
            invalidReason = getInvalidMoveReason(fromRow, fromCol, row, col);
        }

        if (!invalidReason) {
            const piece = gameBoard[fromRow][fromCol];

            if (survivalMode && piece !== '♔') {
                showMessage('You can only move the king in survival mode!');
                selectedSquare.classList.remove('selected');
                selectedSquare = null;
                clearHighlights();
                return;
            }

            if (selectedGameType === 'zombie' && gameBoard[row][col]) {
                handleZombieCapture(fromRow, fromCol, row, col);
            }

            trackPieceMovement(fromRow, fromCol, piece);

            if (gameBoard[row][col]) {
                if (isWhitePiece(gameBoard[row][col])) {
                    capturedWhite.push(gameBoard[row][col]);
                } else {
                    capturedBlack.push(gameBoard[row][col]);
                }
                updateCapturedPieces();
            }

            gameBoard[row][col] = piece;
            gameBoard[fromRow][fromCol] = '';
            updateBoard();

            if (survivalMode) {
                updateBoard();
            }
        } else {
            if (!survivalMode) {
                showMessage(invalidReason);
            }
        }

        selectedSquare.classList.remove('selected');
        selectedSquare = null;
        clearHighlights();
    } else if (piece && ((currentPlayer === 'white' && isWhitePiece(piece)) || (currentPlayer === 'black' && isBlackPiece(piece)))) {
        if (selectedSquare) selectedSquare.classList.remove('selected');
        selectedSquare = square;
        square.classList.add('selected');
        if (!survivalMode) {
            showPossibleMoves(row, col);
        }
    }
}

function updateBoard() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        square.textContent = gameBoard[row][col];
    });
}

function updateCapturedPieces() {
    const whiteJail = document.querySelector('#captured-white .pieces-jail');
    const blackJail = document.querySelector('#captured-black .pieces-jail');

    whiteJail.innerHTML = capturedWhite.map(piece =>
        `<div class="captured-piece">${piece}</div>`
    ).join('');

    blackJail.innerHTML = capturedBlack.map(piece =>
        `<div class="captured-piece">${piece}</div>`
    ).join('');
}

function showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.classList.add('show');
    setTimeout(() => messageEl.classList.remove('show'), 3000);
}

function clearMessage() {
    const messageEl = document.getElementById('message');
    messageEl.classList.remove('show');
}

function updateTurnIndicator() {
    const turnEl = document.getElementById('turn-indicator');
    if (selectedGameType === 'zombie') {
        turnEl.textContent = `🧟 ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn - Convert or Be Converted! 🧟`;
    } else {
        turnEl.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
    }
}

function handleZombieSquareClick(square) {
    if (gameOver) return;

    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = gameBoard[row][col];

    if (selectedSquare) {
        const fromRow = parseInt(selectedSquare.dataset.row);
        const fromCol = parseInt(selectedSquare.dataset.col);

        const invalidReason = getInvalidMoveReason(fromRow, fromCol, row, col);
        if (!invalidReason) {
            const piece = gameBoard[fromRow][fromCol];

            if (gameBoard[row][col]) {
                handleZombieCapture(fromRow, fromCol, row, col);
            }

            trackPieceMovement(fromRow, fromCol, piece);
            gameBoard[row][col] = piece;
            gameBoard[fromRow][fromCol] = '';
            updateBoard();

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

function handleSurvivalSquareClick(square) {
    if (gameOver) return;

    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = gameBoard[row][col];

    if (selectedSquare) {
        const fromRow = parseInt(selectedSquare.dataset.row);
        const fromCol = parseInt(selectedSquare.dataset.col);

        const rowDiff = Math.abs(row - fromRow);
        const colDiff = Math.abs(col - fromCol);

        if (rowDiff <= 1 && colDiff <= 1 && gameBoard[fromRow][fromCol] === '♔') {
            gameBoard[row][col] = gameBoard[fromRow][fromCol];
            gameBoard[fromRow][fromCol] = '';
            updateBoard();
        } else {
            showMessage('King can only move one square');
        }

        selectedSquare.classList.remove('selected');
        selectedSquare = null;
        clearHighlights();
    } else if (piece === '♔') {
        if (selectedSquare) selectedSquare.classList.remove('selected');
        selectedSquare = square;
        square.classList.add('selected');
    }
}

// Shooter Mode Variables - functions moved to shooterMode.js
let shooterMode = false;
let shooterGame = {
    canvas: null, ctx: null, player: { x: 400, y: 500, piece: '♔', health: 3, maxHealth: 3 },
    bullets: [], enemies: [], powerups: [], boss: null, score: 0, highScore: 0, gameRunning: false, keys: {},
    lastEnemySpawn: 0, lastPowerupSpawn: 0, activePowers: {}, wave: 1, enemiesKilled: 0, combo: 0, maxCombo: 0,
    particles: [], muzzleFlash: 0, screenShake: 0, bgOffset: 0
};

function shoot() {
    if (!shooterGame.gameRunning) return;

    if (shooterGame.activePowers.spread) {
        // Spread shot - 5 bullets in arc
        for (let i = -2; i <= 2; i++) {
            shooterGame.bullets.push({
                x: shooterGame.player.x + 15, y: shooterGame.player.y,
                speed: 8, dx: i * 2, type: 'spread'
            });
        }
        shooterGame.activePowers.spread = false;
    } else if (shooterGame.activePowers.laser) {
        // Laser beam - instant hit
        shooterGame.bullets.push({
            x: shooterGame.player.x + 15, y: 0,
            speed: 0, width: 8, type: 'laser'
        });
        setTimeout(() => {
            shooterGame.bullets = shooterGame.bullets.filter(b => b.type !== 'laser');
        }, 200);
    } else if (shooterGame.activePowers.homing) {
        // Homing bullet
        shooterGame.bullets.push({ x: shooterGame.player.x + 15, y: shooterGame.player.y, speed: 6, type: 'homing' });
    } else {
        // Normal shot
        shooterGame.bullets.push({ x: shooterGame.player.x + 15, y: shooterGame.player.y, speed: 8, type: 'normal' });
    }

    playShootSound();
    shooterGame.muzzleFlash = 10; // Muzzle flash duration
}

function activatePower(type) {
    switch (type) {
        case 'bomb':
            // Bomb - destroys all enemies on screen
            shooterGame.score += shooterGame.enemies.length * 20;
            shooterGame.enemies.forEach(e => createParticles(e.x + 15, e.y + 15, '#ff6600', 8));
            shooterGame.enemies = [];
            shooterGame.screenShake = 30;
            createExplosion();
            break;
        case 'spread':
            shooterGame.activePowers.spread = true;
            break;
        case 'rapid':
            shooterGame.activePowers.rapid = true;
            setTimeout(() => shooterGame.activePowers.rapid = false, 5000);
            break;
        case 'shield':
            shooterGame.activePowers.shield = true;
            break;
        case 'laser':
            shooterGame.activePowers.laser = true;
            setTimeout(() => shooterGame.activePowers.laser = false, 3000);
            break;
        case 'freeze':
            shooterGame.activePowers.freeze = true;
            setTimeout(() => shooterGame.activePowers.freeze = false, 3000);
            break;
        case 'magnet':
            shooterGame.activePowers.magnet = true;
            setTimeout(() => shooterGame.activePowers.magnet = false, 5000);
            break;
        case 'double':
            shooterGame.activePowers.double = true;
            setTimeout(() => shooterGame.activePowers.double = false, 10000);
            break;
        case 'slow':
            shooterGame.activePowers.slow = true;
            setTimeout(() => shooterGame.activePowers.slow = false, 5000);
            break;
        case 'homing':
            shooterGame.activePowers.homing = true;
            setTimeout(() => shooterGame.activePowers.homing = false, 8000);
            break;
    }
    document.getElementById('shooter-score').textContent = `Score: ${shooterGame.score}`;
}

function createExplosion() {
    const ctx = shooterGame.ctx;
    ctx.fillStyle = '#ff6600';
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            ctx.beginPath();
            ctx.arc(Math.random() * 800, Math.random() * 600, Math.random() * 50 + 10, 0, Math.PI * 2);
            ctx.fill();
        }, i * 50);
    }
}

function gameLoop() {
    if (!shooterGame.gameRunning) return;

    // Move player
    if (shooterGame.keys['ArrowLeft'] && shooterGame.player.x > 0) shooterGame.player.x -= 5;
    if (shooterGame.keys['ArrowRight'] && shooterGame.player.x < 750) shooterGame.player.x += 5;
    if (shooterGame.keys['ArrowUp'] && shooterGame.player.y > 0) shooterGame.player.y -= 5;
    if (shooterGame.keys['ArrowDown'] && shooterGame.player.y < 550) shooterGame.player.y += 5;

    // Update bullets with homing and slow motion
    const bulletSpeedMultiplier = shooterGame.activePowers.slow ? 0.5 : 1;
    shooterGame.bullets = shooterGame.bullets.filter(b => {
        if (b.type === 'homing' && shooterGame.enemies.length > 0) {
            const target = shooterGame.enemies[0];
            const dx = target.x - b.x;
            const dy = target.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                b.x += (dx / dist) * b.speed * bulletSpeedMultiplier;
                b.y += (dy / dist) * b.speed * bulletSpeedMultiplier;
            }
        } else if (b.type === 'spread') {
            b.x += b.dx * bulletSpeedMultiplier;
            b.y -= b.speed * bulletSpeedMultiplier;
        } else if (b.type !== 'laser') {
            b.y -= b.speed * bulletSpeedMultiplier;
        }
        return b.y > -10 && b.x > -10 && b.x < 810;
    });
    // Update enemies with freeze and slow motion
    const speedMultiplier = shooterGame.activePowers.slow ? 0.5 : 1;
    shooterGame.enemies = shooterGame.enemies.filter(e => {
        if (!shooterGame.activePowers.freeze) {
            updateEnemyMovement(e, speedMultiplier);
        }
        return e.y < 650;
    });

    // Update boss
    if (shooterGame.boss) {
        shooterGame.boss.x += shooterGame.boss.dx;
        if (shooterGame.boss.x <= 0 || shooterGame.boss.x >= 700) shooterGame.boss.dx *= -1;
    }

    // Spawn enemies
    const spawnRate = Math.max(500, 1200 - shooterGame.wave * 100);
    if (Date.now() - shooterGame.lastEnemySpawn > spawnRate && !shooterGame.boss) {
        spawnEnemy();
        shooterGame.lastEnemySpawn = Date.now();
    }

    // Spawn boss every 10 waves
    if (shooterGame.enemiesKilled >= shooterGame.wave * 10 && !shooterGame.boss) {
        spawnBoss();
    }

    // Spawn powerups
    if (Date.now() - shooterGame.lastPowerupSpawn > 8000) {
        const powerTypes = ['bomb', 'spread', 'rapid', 'shield', 'laser', 'freeze', 'magnet', 'double', 'slow', 'homing'];
        const powerColors = ['🔥', '💥', '⚡', '🛡️', '🌟', '❄️', '🧢', '💰', '🐌', '🎯'];
        const type = powerTypes[Math.floor(Math.random() * powerTypes.length)];
        shooterGame.powerups.push({
            x: Math.random() * 750, y: -30, type: type,
            icon: powerColors[powerTypes.indexOf(type)], speed: 1.5
        });
        shooterGame.lastPowerupSpawn = Date.now();
    }

    // Update powerups with magnet effect
    shooterGame.powerups = shooterGame.powerups.filter(p => {
        if (shooterGame.activePowers.magnet) {
            const dx = shooterGame.player.x - p.x;
            const dy = shooterGame.player.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                p.x += (dx / dist) * 3;
                p.y += (dy / dist) * 3;
            }
        } else {
            p.y += p.speed;
        }
        return p.y < 650;
    });

    // Update particles
    shooterGame.particles = shooterGame.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;
        return p.life > 0;
    });

    // Update effects
    if (shooterGame.muzzleFlash > 0) shooterGame.muzzleFlash--;
    if (shooterGame.screenShake > 0) shooterGame.screenShake--;
    shooterGame.bgOffset += 1;

    // Check bullet-enemy collisions
    shooterGame.bullets.forEach((bullet, bi) => {
        shooterGame.enemies.forEach((enemy, ei) => {
            let hit = false;
            if (bullet.type === 'laser') {
                hit = bullet.x <= enemy.x + 30 && bullet.x + (bullet.width || 4) >= enemy.x;
            } else {
                hit = bullet.x > enemy.x && bullet.x < enemy.x + 30 && bullet.y > enemy.y && bullet.y < enemy.y + 30;
            }

            if (hit) {
                if (bullet.type !== 'laser') shooterGame.bullets.splice(bi, 1);
                shooterGame.enemies.splice(ei, 1);
                shooterGame.enemiesKilled++;
                shooterGame.combo++;
                if (shooterGame.combo > shooterGame.maxCombo) shooterGame.maxCombo = shooterGame.combo;
                const comboMultiplier = Math.min(Math.floor(shooterGame.combo / 5) + 1, 5);
                const pointMultiplier = shooterGame.activePowers.double ? 2 : 1;
                shooterGame.score += 10 * comboMultiplier * pointMultiplier;
                playHitSound();
                createParticles(enemy.x + 15, enemy.y + 15, '#ff6600');
                updateUI();
            }
        });

        // Check bullet-boss collisions
        if (shooterGame.boss) {
            let hit = false;
            if (bullet.type === 'laser') {
                hit = bullet.x <= shooterGame.boss.x + 60 && bullet.x + (bullet.width || 4) >= shooterGame.boss.x;
            } else {
                hit = bullet.x > shooterGame.boss.x && bullet.x < shooterGame.boss.x + 60 &&
                    bullet.y > shooterGame.boss.y && bullet.y < shooterGame.boss.y + 60;
            }

            if (hit) {
                if (bullet.type !== 'laser') shooterGame.bullets.splice(bi, 1);
                shooterGame.boss.health--;
                shooterGame.combo++;
                if (shooterGame.combo > shooterGame.maxCombo) shooterGame.maxCombo = shooterGame.combo;
                const comboMultiplier = Math.min(Math.floor(shooterGame.combo / 5) + 1, 5);
                const pointMultiplier = shooterGame.activePowers.double ? 2 : 1;
                shooterGame.score += 50 * comboMultiplier * pointMultiplier;
                playHitSound();

                if (shooterGame.boss.health <= 0) {
                    createParticles(shooterGame.boss.x + 30, shooterGame.boss.y + 30, '#ff0000', 20);
                    shooterGame.boss = null;
                    shooterGame.wave++;
                    shooterGame.enemiesKilled = 0;
                    shooterGame.score += 500;
                    shooterGame.screenShake = 20;
                }
                updateUI();
            }
        }
    });

    // Player-enemy collisions
    shooterGame.enemies.forEach((enemy, ei) => {
        if (shooterGame.player.x < enemy.x + 30 && shooterGame.player.x + 30 > enemy.x &&
            shooterGame.player.y < enemy.y + 30 && shooterGame.player.y + 30 > enemy.y) {
            if (!shooterGame.activePowers.shield) {
                shooterGame.player.health--;
                shooterGame.combo = 0;
                shooterGame.screenShake = 15;
                if (shooterGame.player.health <= 0) {
                    shooterGameOver();
                    return;
                }
            }
            shooterGame.enemies.splice(ei, 1);
            if (shooterGame.activePowers.shield) shooterGame.activePowers.shield = false;
        }
    });

    // Player-powerup collisions
    shooterGame.powerups.forEach((powerup, pi) => {
        if (shooterGame.player.x < powerup.x + 30 && shooterGame.player.x + 30 > powerup.x &&
            shooterGame.player.y < powerup.y + 30 && shooterGame.player.y + 30 > powerup.y) {
            activatePower(powerup.type);
            shooterGame.powerups.splice(pi, 1);
            playPowerupSound();
        }
    });

    // Draw everything with screen shake
    const ctx = shooterGame.ctx;
    const shakeX = shooterGame.screenShake > 0 ? (Math.random() - 0.5) * shooterGame.screenShake : 0;
    const shakeY = shooterGame.screenShake > 0 ? (Math.random() - 0.5) * shooterGame.screenShake : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 800, 600);

    // Scrolling chess floor
    const offsetY = shooterGame.bgOffset % 100;
    for (let x = 0; x < 850; x += 50) {
        for (let y = -100 + offsetY; y < 650; y += 50) {
            ctx.fillStyle = (Math.floor(x / 50) + Math.floor((y - offsetY) / 50)) % 2 === 0 ? '#f0d9b5' : '#b58863';
            ctx.fillRect(x, y, 50, 50);
        }
    }

    // Player with muzzle flash
    if (shooterGame.muzzleFlash > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(shooterGame.player.x + 15, shooterGame.player.y, shooterGame.muzzleFlash * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#f1c40f';
    ctx.font = '30px Arial';
    ctx.fillText(shooterGame.player.piece, shooterGame.player.x, shooterGame.player.y + 30);

    // Bullets
    shooterGame.bullets.forEach(b => {
        if (b.type === 'laser') {
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(b.x, 0, b.width || 4, 600);
        } else {
            ctx.fillStyle = b.type === 'spread' ? '#ff00ff' : b.type === 'homing' ? '#00ff00' : '#e74c3c';
            ctx.fillRect(b.x, b.y, 4, 10);
        }
    });

    // Enemies with death animation
    ctx.font = '30px Arial';
    shooterGame.enemies.forEach(e => {
        if (e.dying) {
            ctx.save();
            ctx.translate(e.x + 15, e.y + 15);
            ctx.rotate(e.rotation || 0);
            ctx.globalAlpha = e.alpha || 1;
            ctx.fillStyle = '#8e44ad';
            ctx.fillText(e.piece, -15, 15);
            ctx.restore();

            e.rotation = (e.rotation || 0) + 0.3;
            e.alpha = (e.alpha || 1) - 0.05;
        } else {
            ctx.fillStyle = '#8e44ad';
            ctx.fillText(e.piece, e.x, e.y + 30);
        }
    });

    // Boss
    if (shooterGame.boss) {
        ctx.fillStyle = '#ff0000';
        ctx.font = '60px Arial';
        ctx.fillText(shooterGame.boss.piece, shooterGame.boss.x, shooterGame.boss.y + 60);

        // Boss health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(shooterGame.boss.x, shooterGame.boss.y - 20, 60, 8);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(shooterGame.boss.x, shooterGame.boss.y - 20, (shooterGame.boss.health / shooterGame.boss.maxHealth) * 60, 8);
    }

    // Powerups
    ctx.font = '24px Arial';
    shooterGame.powerups.forEach(p => ctx.fillText(p.icon, p.x, p.y + 24));

    // UI Elements
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText(`Wave: ${shooterGame.wave}`, 10, 30);
    ctx.fillText(`Combo: ${shooterGame.combo}x`, 10, 55);

    // Health hearts
    ctx.font = '20px Arial';
    for (let i = 0; i < shooterGame.player.maxHealth; i++) {
        if (i < shooterGame.player.health) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('❤️', 10 + i * 25, 80);
        } else {
            ctx.fillStyle = '#666666';
            ctx.fillText('💔', 10 + i * 25, 80);
        }
    }

    // Active power indicators
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    let powerY = 105;
    if (shooterGame.activePowers.shield) {
        ctx.fillText('🛡️ SHIELD', 10, powerY);
        powerY += 25;
    }
    if (shooterGame.activePowers.rapid) {
        ctx.fillText('⚡ RAPID FIRE', 10, powerY);
        powerY += 25;
    }
    if (shooterGame.activePowers.laser) {
        ctx.fillText('🌟 LASER', 10, powerY);
        powerY += 25;
    }
    if (shooterGame.activePowers.freeze) {
        ctx.fillText('❄️ FREEZE', 10, powerY);
        powerY += 25;
    }
    if (shooterGame.activePowers.magnet) {
        ctx.fillText('🧢 MAGNET', 10, powerY);
        powerY += 25;
    }
    if (shooterGame.activePowers.double) {
        ctx.fillText('💰 DOUBLE PTS', 10, powerY);
        powerY += 25;
    }
    if (shooterGame.activePowers.slow) {
        ctx.fillText('🐌 SLOW MO', 10, powerY);
        powerY += 25;
    }
    if (shooterGame.activePowers.homing) {
        ctx.fillText('🎯 HOMING', 10, powerY);
    }

    // Particles
    shooterGame.particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

function shooterGameOver() {
    shooterGame.gameRunning = false;
    playGameOverSound();

    // Check and update high score
    let isNewHighScore = false;
    if (shooterGame.score > shooterGame.highScore) {
        shooterGame.highScore = shooterGame.score;
        localStorage.setItem('chessShooterHighScore', shooterGame.highScore);
        isNewHighScore = true;
    }

    // Create game over overlay
    const gameOverDiv = document.createElement('div');
    gameOverDiv.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; flex-direction: column;
        align-items: center; justify-content: center; color: white;
    `;

    gameOverDiv.innerHTML = `
        <h1 style="color: #e74c3c; font-size: 48px; margin: 0;">GAME OVER</h1>
        <p style="color: #f1c40f; font-size: 24px; margin: 20px 0;">Final Score: ${shooterGame.score}</p>
        ${isNewHighScore ? '<p style="color: #00ff00; font-size: 20px; margin: 10px 0;">🎉 NEW HIGH SCORE! 🎉</p>' : ''}
        <p style="color: #ffffff; font-size: 18px; margin: 10px 0;">High Score: ${shooterGame.highScore}</p>
        <button id="restart-shooter" style="
            background: #4CAF50; color: white; border: none; padding: 15px 30px;
            border-radius: 8px; font-size: 18px; cursor: pointer; margin: 10px;
        ">Restart Game</button>
        <button id="menu-shooter" style="
            background: #2196F3; color: white; border: none; padding: 15px 30px;
            border-radius: 8px; font-size: 18px; cursor: pointer; margin: 10px;
        ">Main Menu</button>
    `;

    document.getElementById('shooter-container').appendChild(gameOverDiv);

    document.getElementById('restart-shooter').onclick = () => {
        gameOverDiv.remove();
        initializeShooterMode();
    };

    document.getElementById('menu-shooter').onclick = () => {
        resetGame();
    };
}

function playShootSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playHitSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

function playGameOverSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1);
    oscillator.type = 'triangle';
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
}

function playPowerupSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function spawnEnemy() {
    const enemyTypes = [
        { piece: '♟', type: 'pawn', speed: 2 },
        { piece: '♞', type: 'knight', speed: 1.5 },
        { piece: '♝', type: 'bishop', speed: 2.5 },
        { piece: '♜', type: 'rook', speed: 3 },
        { piece: '♛', type: 'queen', speed: 1.8 }
    ];
    const enemy = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    shooterGame.enemies.push({
        x: Math.random() * 750, y: -50, piece: enemy.piece, type: enemy.type,
        speed: enemy.speed + shooterGame.wave * 0.2, dx: 0, moveTimer: 0
    });
}

function spawnBoss() {
    shooterGame.boss = {
        x: 350, y: 50, piece: '♚', health: 10 + shooterGame.wave * 2,
        maxHealth: 10 + shooterGame.wave * 2, dx: 2
    };
}

function updateEnemyMovement(enemy, speedMultiplier = 1) {
    enemy.moveTimer += 16;
    const speed = enemy.speed * speedMultiplier;
    switch (enemy.type) {
        case 'pawn':
            enemy.y += speed;
            break;
        case 'knight':
            enemy.y += speed;
            enemy.x += Math.sin(enemy.moveTimer * 0.01) * 3 * speedMultiplier;
            break;
        case 'bishop':
            enemy.y += speed * 0.7;
            enemy.x += Math.sin(enemy.moveTimer * 0.005) * 2 * speedMultiplier;
            break;
        case 'rook':
            enemy.y += speed;
            break;
        case 'queen':
            enemy.y += speed;
            enemy.x += Math.cos(enemy.moveTimer * 0.008) * 1.5 * speedMultiplier;
            break;
    }
}

function updateUI() {
    document.getElementById('shooter-score').textContent = `Score: ${shooterGame.score}`;
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        shooterGame.particles.push({
            x: x, y: y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
            color: color, size: Math.random() * 4 + 2, life: 30, maxLife: 30, alpha: 1
        });
    }
}

function createChessBoard() {
    const board = document.getElementById('chessboard');

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;
            square.textContent = gameBoard[row][col];
            square.addEventListener('click', () => handleSquareClick(square));
            board.appendChild(square);
        }
    }
}



document.addEventListener('DOMContentLoaded', () => {
    // Game type selection
    document.querySelectorAll('.setup-btn[data-game-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.setup-btn[data-game-type]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedGameType = btn.dataset.gameType;
            updateSectionVisibility();

            // Initialize visibility on page load
            updateSectionVisibility();
        });
    });

    // AI configuration selection
    document.querySelectorAll('.setup-btn[data-ai-config]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.setup-btn[data-ai-config]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedAIConfig = btn.dataset.aiConfig;
        });
    });

    function updateSectionVisibility() {
        const tempGameMode = GameModeFactory.createGameMode(selectedGameType, 'human-vs-human');
        const scenarioSection = document.querySelector('.setup-section:has(.setup-btn[data-scenario])');
        const timeSection = document.querySelector('.setup-section:has(.setup-btn[data-time])');
        const aiSection = document.getElementById('ai-section');

        if (scenarioSection) {
            scenarioSection.style.display = tempGameMode.shouldShowStartingPosition() ? 'block' : 'none';
        }
        if (timeSection) {
            timeSection.style.display = tempGameMode.shouldShowTimeControl() ? 'block' : 'none';
        }
        if (aiSection) {
            aiSection.style.display = ['classic', 'zombie', 'survival'].includes(selectedGameType) ? 'block' : 'none';
        }
    }

    document.querySelectorAll('.setup-btn[data-time]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.setup-btn[data-time]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTimeControl = btn.dataset.time;
        });
    });

    document.querySelectorAll('.setup-btn[data-scenario]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.setup-btn[data-scenario]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedScenario = btn.dataset.scenario;
        });
    });

    document.querySelectorAll('.setup-btn[data-theme]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.setup-btn[data-theme]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTheme = btn.dataset.theme;
        });
    });

    document.getElementById('start-game-btn').addEventListener('click', () => {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');

        // Set theme based on game type
        survivalMode = selectedGameType === 'survival';
        if (currentGameMode) {
            const gameTheme = currentGameMode.getTheme();
            document.body.className = gameTheme;
            selectedTheme = gameTheme;
        } else {
            document.body.className = selectedTheme;
        }

        if (selectedGameType === 'shooter') {
            startNewGame();
            return;
        }

        createChessBoard();
        startNewGame();
    });

    document.getElementById('reset-btn').addEventListener('click', resetGame);

    // Promotion modal event listeners
    document.querySelectorAll('.promotion-piece').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!pendingPromotion) return;

            const pieceType = btn.dataset.piece;
            const isWhite = isWhitePiece(pendingPromotion.piece);

            let promotedPiece;
            switch (pieceType) {
                case 'queen': promotedPiece = isWhite ? '♕' : '♛'; break;
                case 'rook': promotedPiece = isWhite ? '♖' : '♜'; break;
                case 'bishop': promotedPiece = isWhite ? '♗' : '♝'; break;
                case 'knight': promotedPiece = isWhite ? '♘' : '♞'; break;
            }

            gameBoard[pendingPromotion.toRow][pendingPromotion.toCol] = promotedPiece;
            gameBoard[pendingPromotion.fromRow][pendingPromotion.fromCol] = '';

            hidePromotionModal();
            pendingPromotion = null;
            updateBoard();

            // Continue game flow
            if (!survivalMode) {
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

                        if ((selectedGameMode === 'ai' && currentPlayer === 'black') || selectedGameMode === 'ai-vs-ai') {
                            if (!gameOver) setTimeout(() => makeAIMove(), 1000);
                        }
                    }
                }
            }
        });
    });
});

function createChessBoard() {
    const board = document.getElementById('chessboard');
    board.innerHTML = ''; // Clear existing board

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;
            square.textContent = gameBoard[row][col];
            square.addEventListener('click', () => handleSquareClick(square));
            board.appendChild(square);
        }
    }
}