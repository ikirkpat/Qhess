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
    } else if (selectedGameMode === 'shooter') {
        // Shooter mode: Chess piece shooter game
        initializeShooterMode();
        return; // Skip normal chess setup
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
            } else {
                // Make normal move
                gameBoard[row][col] = piece;
                gameBoard[fromRow][fromCol] = '';
            }
            updateBoard();

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

// Shooter Mode Functions
let shooterMode = false;
let shooterGame = {
    canvas: null, ctx: null, player: { x: 400, y: 500, piece: '♔' },
    bullets: [], enemies: [], powerups: [], score: 0, highScore: 0, gameRunning: false, keys: {}, 
    lastEnemySpawn: 0, lastPowerupSpawn: 0, activePowers: {}
};

function initializeShooterMode() {
    shooterMode = true;
    shooterGame.highScore = localStorage.getItem('chessShooterHighScore') || 0;
    document.getElementById('game-container').innerHTML = `
        <div id="shooter-container">
            <canvas id="shooter-canvas" width="800" height="600"></canvas>
            <div id="shooter-ui">
                <div id="shooter-score">Score: 0</div>
                <div id="shooter-high-score">High Score: ${shooterGame.highScore}</div>
                <div id="shooter-controls">Arrow Keys: Move | Space: Shoot</div>
            </div>
        </div>`;
    
    shooterGame.canvas = document.getElementById('shooter-canvas');
    shooterGame.ctx = shooterGame.canvas.getContext('2d');
    shooterGame.gameRunning = true;
    shooterGame.score = 0;
    shooterGame.bullets = [];
    shooterGame.enemies = [];
    shooterGame.lastEnemySpawn = Date.now();
    
    document.addEventListener('keydown', (e) => {
        if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
        shooterGame.keys[e.code] = true;
        if (e.code === 'Space') {
            if (shooterGame.activePowers.rapid) {
                // Rapid fire mode
                shoot();
                setTimeout(() => shoot(), 100);
                setTimeout(() => shoot(), 200);
            } else {
                shoot();
            }
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.code.startsWith('Arrow')) e.preventDefault();
        shooterGame.keys[e.code] = false;
    });
    gameLoop();
}

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
    } else {
        // Normal shot
        shooterGame.bullets.push({ x: shooterGame.player.x + 15, y: shooterGame.player.y, speed: 8, type: 'normal' });
    }
    
    playShootSound();
}

function activatePower(type) {
    switch(type) {
        case 'bomb':
            // Bomb - destroys all enemies on screen
            shooterGame.score += shooterGame.enemies.length * 20;
            shooterGame.enemies = [];
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
    
    // Update bullets
    shooterGame.bullets = shooterGame.bullets.filter(b => { 
        if (b.type === 'spread') {
            b.x += b.dx;
            b.y -= b.speed;
        } else if (b.type !== 'laser') {
            b.y -= b.speed;
        }
        return b.y > -10 && b.x > -10 && b.x < 810; 
    });
    shooterGame.enemies = shooterGame.enemies.filter(e => { e.y += e.speed; return e.y < 650; });
    
    // Spawn enemies
    if (Date.now() - shooterGame.lastEnemySpawn > 1000) {
        const pieces = ['♛', '♜', '♝', '♞', '♟'];
        shooterGame.enemies.push({ x: Math.random() * 750, y: -50, piece: pieces[Math.floor(Math.random() * pieces.length)], speed: 2 + Math.random() * 3 });
        shooterGame.lastEnemySpawn = Date.now();
    }
    
    // Spawn powerups
    if (Date.now() - shooterGame.lastPowerupSpawn > 8000) {
        const powerTypes = ['bomb', 'spread', 'rapid', 'shield', 'laser'];
        const powerColors = ['🔥', '💥', '⚡', '🛡️', '🌟'];
        const type = powerTypes[Math.floor(Math.random() * powerTypes.length)];
        shooterGame.powerups.push({ 
            x: Math.random() * 750, y: -30, type: type, 
            icon: powerColors[powerTypes.indexOf(type)], speed: 1.5 
        });
        shooterGame.lastPowerupSpawn = Date.now();
    }
    
    // Update powerups
    shooterGame.powerups = shooterGame.powerups.filter(p => { p.y += p.speed; return p.y < 650; });
    
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
                shooterGame.score += 10;
                playHitSound();
                document.getElementById('shooter-score').textContent = `Score: ${shooterGame.score}`;
            }
        });
    });
    
    // Player-enemy collisions
    shooterGame.enemies.forEach(enemy => {
        if (shooterGame.player.x < enemy.x + 30 && shooterGame.player.x + 30 > enemy.x &&
            shooterGame.player.y < enemy.y + 30 && shooterGame.player.y + 30 > enemy.y) {
            if (!shooterGame.activePowers.shield) {
                shooterGameOver();
            } else {
                // Shield absorbs hit
                shooterGame.enemies.splice(shooterGame.enemies.indexOf(enemy), 1);
                shooterGame.activePowers.shield = false;
            }
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
    
    // Draw everything
    const ctx = shooterGame.ctx;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 800, 600);
    
    // Chess floor
    for (let x = 0; x < 800; x += 50) {
        for (let y = 0; y < 600; y += 50) {
            ctx.fillStyle = (Math.floor(x/50) + Math.floor(y/50)) % 2 === 0 ? '#f0d9b5' : '#b58863';
            ctx.fillRect(x, y, 50, 50);
        }
    }
    
    // Player
    ctx.fillStyle = '#f1c40f';
    ctx.font = '30px Arial';
    ctx.fillText(shooterGame.player.piece, shooterGame.player.x, shooterGame.player.y + 30);
    
    // Bullets
    shooterGame.bullets.forEach(b => {
        if (b.type === 'laser') {
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(b.x, 0, b.width || 4, 600);
        } else {
            ctx.fillStyle = b.type === 'spread' ? '#ff00ff' : '#e74c3c';
            ctx.fillRect(b.x, b.y, 4, 10);
        }
    });
    
    // Enemies
    ctx.fillStyle = '#8e44ad';
    shooterGame.enemies.forEach(e => ctx.fillText(e.piece, e.x, e.y + 30));
    
    // Powerups
    ctx.font = '24px Arial';
    shooterGame.powerups.forEach(p => ctx.fillText(p.icon, p.x, p.y + 24));
    
    // Active power indicators
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    let powerY = 20;
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
    }
    
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
        } else if (selectedGameMode === 'shooter') {
            startNewGame();
            return;
        } else {
            document.body.className = selectedTheme;
        }

        createChessBoard();
        startNewGame();
    });

    document.getElementById('reset-btn').addEventListener('click', resetGame);
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