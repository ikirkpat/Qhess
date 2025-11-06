// Zombie Mode Logic - Regular chess with piece conversion on capture
let zombieMode = false;

function initializeZombieMode() {
    zombieMode = true;
    
    // Start with standard chess setup
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
}

function convertPieceToPlayerSide(piece) {
    // Convert black pieces to white when captured
    const conversionMap = {
        '♚': '♔', // Black king to white king
        '♛': '♕', // Black queen to white queen
        '♜': '♖', // Black rook to white rook
        '♝': '♗', // Black bishop to white bishop
        '♞': '♘', // Black knight to white knight
        '♟': '♙'  // Black pawn to white pawn
    };
    
    return conversionMap[piece] || piece;
}

function convertPieceToAISide(piece) {
    // Convert white pieces to black when captured by AI
    const conversionMap = {
        '♔': '♚', // White king to black king
        '♕': '♛', // White queen to black queen
        '♖': '♜', // White rook to black rook
        '♗': '♝', // White bishop to black bishop
        '♘': '♞', // White knight to black knight
        '♙': '♟'  // White pawn to black pawn
    };
    
    return conversionMap[piece] || piece;
}

function handleZombieCapture(fromRow, fromCol, toRow, toCol) {
    const capturedPiece = gameBoard[toRow][toCol];
    const attackingPiece = gameBoard[fromRow][fromCol];
    
    if (capturedPiece && capturedPiece !== '') {
        // Convert captured piece to attacker's color
        let convertedPiece;
        if (isWhitePiece(attackingPiece)) {
            convertedPiece = convertPieceToPlayerSide(capturedPiece);
        } else {
            convertedPiece = convertPieceToAISide(capturedPiece);
        }
        
        // Place converted piece on empty square
        placeConvertedPiece(convertedPiece);
    }
}

function placeConvertedPiece(piece) {
    // Find a random empty square to place the converted piece
    const emptySquares = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameBoard[row][col] === '') {
                emptySquares.push({row, col});
            }
        }
    }
    
    if (emptySquares.length > 0) {
        const randomSquare = emptySquares[Math.floor(Math.random() * emptySquares.length)];
        gameBoard[randomSquare.row][randomSquare.col] = piece;
    }
}

