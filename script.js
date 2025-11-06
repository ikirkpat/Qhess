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
let selectedGameMode = '2player';
let selectedTimeControl = 'classical';
let aiPlayer = null;
let chessInterface = null;
let whiteAI = null;
let whiteChessInterface = null;
let selectedTheme = 'classic';
let survivalMode = false;
let aiPieces = [];
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
    } else if (selectedGameMode === 'zombie') {
        // Zombie mode: Regular chess with piece conversion on capture
        initializeZombieMode();
        document.getElementById('turn-indicator').textContent = 'Convert or Be Converted!';
    } else {
        // Normal chess game
        gameBoard = [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ];
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

    // Initialize AI if needed
    if (selectedGameMode === 'ai') {
        chessInterface = new ChessInterface('black');
        aiPlayer = new AI();
    } else if (selectedGameMode === 'ai-vs-ai') {
        chessInterface = new ChessInterface('black');
        aiPlayer = new AI();
        whiteChessInterface = new ChessInterface('white');
        whiteAI = new AI();

        // Start AI vs AI game
        setTimeout(() => makeAIMove(), 1000);
    }
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
    if (gameOver) return;

    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = gameBoard[row][col];

    if (selectedSquare) {
        const fromRow = parseInt(selectedSquare.dataset.row);
        const fromCol = parseInt(selectedSquare.dataset.col);

        let invalidReason = null;
        if (!survivalMode) {
            invalidReason = getInvalidMoveReason(fromRow, fromCol, row, col);
        } else {
            // In survival mode, king can only move one square
            const rowDiff = Math.abs(row - fromRow);
            const colDiff = Math.abs(col - fromCol);
            if (rowDiff > 1 || colDiff > 1) {
                invalidReason = "King can only move one square";
            }
        }

        if (!invalidReason) {
            const piece = gameBoard[fromRow][fromCol];

            // In survival mode, only allow king moves
            if (survivalMode && piece !== '♔') {
                showMessage('You can only move the king in survival mode!');
                selectedSquare.classList.remove('selected');
                selectedSquare = null;
                clearHighlights();
                return;
            }

            // Handle zombie mode captures before making the move
            if (selectedGameMode === 'zombie' && gameBoard[row][col]) {
                handleZombieCapture(fromRow, fromCol, row, col);
            }

            // Track piece movement for castling
            trackPieceMovement(fromRow, fromCol, piece);

            // Capture piece if present
            if (gameBoard[row][col]) {
                if (isWhitePiece(gameBoard[row][col])) {
                    capturedWhite.push(gameBoard[row][col]);
                } else {
                    capturedBlack.push(gameBoard[row][col]);
                }
                updateCapturedPieces();
            }

            // Check if this is a castling move
            if (isCastlingMove(fromRow, fromCol, row, col)) {
                performCastling(fromRow, fromCol, row, col);
                updateBoard();
            } else {
                // Check for pawn promotion
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

            // In survival mode, don't switch turns - player always moves
            if (survivalMode) {
                // Just update the board, no turn switching
                updateBoard();
            } else {
                // Check for checkmate BEFORE switching turns
                const opponent = currentPlayer === 'white' ? 'black' : 'white';
                if (isInCheck(opponent) && !hasLegalMoves(opponent)) {
                    gameOver = true;
                    const winner = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
                    document.getElementById('turn-indicator').textContent = `🎉 CHECKMATE! ${winner} Wins! 🎉`;
                    createConfetti();
                } else {
                    addIncrement(); // Add increment after move
                    currentPlayer = opponent;
                    if (!checkGameEnd()) {
                        updateTurnIndicator();
                        updateTimers();
                        clearMessage();

                        // AI move if it's AI's turn
                        if ((selectedGameMode === 'ai' && currentPlayer === 'black') ||
                            (selectedGameMode === 'ai-vs-ai')) {
                            if (!gameOver) {
                                setTimeout(() => makeAIMove(), 1000);
                            }
                        }
                    }
                }
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
    turnEl.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
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

async function makeAIMove() {
    if (gameOver) return;

    try {
        let currentAI, currentInterface;

        if (currentPlayer === 'white') {
            if (!whiteChessInterface) whiteChessInterface = new ChessInterface('white');
            if (!whiteAI) whiteAI = new AI();
            currentAI = whiteAI;
            currentInterface = whiteChessInterface;
        } else {
            if (!chessInterface) chessInterface = new ChessInterface('black');
            if (!aiPlayer) aiPlayer = new AI();
            currentAI = aiPlayer;
            currentInterface = chessInterface;
        }

        await currentAI.promptTurn(currentInterface);
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
                if (selectedGameMode === 'ai-vs-ai' && !gameOver) {
                    setTimeout(() => makeAIMove(), 1000);
                }
            }
        }
    } catch (error) {
        console.error('AI move error:', error);
    }
}

function initializeAI() {
    if (selectedGameMode === 'ai') {
        chessInterface = new ChessInterface('black');
        aiPlayer = new AI();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Setup screen event listeners
    document.querySelectorAll('.setup-btn[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('disabled')) return;
            document.querySelectorAll('.setup-btn[data-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedGameMode = btn.dataset.mode;
        });
    });

    document.querySelectorAll('.setup-btn[data-time]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.setup-btn[data-time]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTimeControl = btn.dataset.time;
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

        // Check game mode
        survivalMode = selectedGameMode === 'survival';
        if (survivalMode) {
            document.body.className = 'haunted';
            selectedTheme = 'haunted';
        } else if (selectedGameMode === 'zombie') {
            document.body.className = 'haunted';
            selectedTheme = 'haunted';
        } else {
            document.body.className = selectedTheme;
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