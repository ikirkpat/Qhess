const whitePieces = '♔♕♖♗♘♙';
const blackPieces = '♚♛♜♝♞♟';

let gameBoard = [
    ['♜','♞','♝','♛','♚','♝','♞','♜'],
    ['♟','♟','♟','♟','♟','♟','♟','♟'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['♙','♙','♙','♙','♙','♙','♙','♙'],
    ['♖','♘','♗','♕','♔','♗','♘','♖']
];

let selectedSquare = null;
let currentPlayer = 'white';
let capturedWhite = [];
let capturedBlack = [];
let gameOver = false;

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
    switch(piece) {
        case '♙': // White pawn
            if (fromCol === toCol && !target) {
                if (!((fromRow === 6 && toRow >= 4) || (toRow === fromRow - 1))) {
                    return "Pawns can only move forward 1 square (or 2 from starting position)";
                }
            } else if (!(colDiff === 1 && toRow === fromRow - 1 && target)) {
                return "Pawns can only capture diagonally forward";
            }
            break;
            
        case '♟': // Black pawn
            if (fromCol === toCol && !target) {
                if (!((fromRow === 1 && toRow <= 3) || (toRow === fromRow + 1))) {
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
            if (!(rowDiff <= 1 && colDiff <= 1)) {
                return "Kings can only move one square in any direction";
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
                if (isValidMove(row, col, king.row, king.col)) {
                    return true;
                }
            }
        }
    }
    return false;
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
    gameBoard = [
        ['♜','♞','♝','♛','♚','♝','♞','♜'],
        ['♟','♟','♟','♟','♟','♟','♟','♟'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['♙','♙','♙','♙','♙','♙','♙','♙'],
        ['♖','♘','♗','♕','♔','♗','♘','♖']
    ];
    
    if (selectedSquare) {
        selectedSquare.classList.remove('selected');
    }
    selectedSquare = null;
    currentPlayer = 'white';
    capturedWhite = [];
    capturedBlack = [];
    gameOver = false;
    
    clearHighlights();
    clearMessage();
    updateBoard();
    updateTurnIndicator();
    updateCapturedPieces();
}

function checkGameEnd() {
    if (isInCheck(currentPlayer)) {
        if (!hasLegalMoves(currentPlayer)) {
            gameOver = true;
            const winner = currentPlayer === 'white' ? 'Black' : 'White';
            document.getElementById('turn-indicator').textContent = `🎉 CHECKMATE! ${winner} Wins! 🎉`;
            createConfetti();
            return true;
        } else {
            // Player is in check but has legal moves
            const playerName = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
            showMessage(`${playerName} is in CHECK! Must move king, block, or capture attacker.`);
        }
    } else if (!hasLegalMoves(currentPlayer)) {
        gameOver = true;
        document.getElementById('turn-indicator').textContent = 'Stalemate - Draw!';
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
        
        const invalidReason = getInvalidMoveReason(fromRow, fromCol, row, col);
        if (!invalidReason) {
            // Capture piece if present
            if (gameBoard[row][col]) {
                if (isWhitePiece(gameBoard[row][col])) {
                    capturedWhite.push(gameBoard[row][col]);
                } else {
                    capturedBlack.push(gameBoard[row][col]);
                }
                updateCapturedPieces();
            }
            
            // Make move
            gameBoard[row][col] = gameBoard[fromRow][fromCol];
            gameBoard[fromRow][fromCol] = '';
            updateBoard();
            
            // Check for checkmate BEFORE switching turns
            const opponent = currentPlayer === 'white' ? 'black' : 'white';
            if (isInCheck(opponent) && !hasLegalMoves(opponent)) {
                gameOver = true;
                const winner = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
                document.getElementById('turn-indicator').textContent = `🎉 CHECKMATE! ${winner} Wins! 🎉`;
                createConfetti();
            } else {
                currentPlayer = opponent;
                if (!checkGameEnd()) {
                    updateTurnIndicator();
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

document.addEventListener('DOMContentLoaded', () => {
    createChessBoard();
    document.getElementById('reset-btn').addEventListener('click', resetGame);
});