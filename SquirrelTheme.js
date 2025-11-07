// SquirrelTheme.js - Squirrel theme for all game modes

class SquirrelTheme {
    static applyTheme() {
        document.body.classList.add('squirrel');
        this.addSquirrelCSS();
        this.setupPieceImages();
    }
    
    static setupPieceImages() {
        // Override the global getPieceImageUrl function for squirrel theme
        window.getPieceImageUrl = function(piece) {
            if (piece === '♙') {
                return 'https://admin-dev.michdev.org/images/squirrel-dancing-squirrel.gif';
            }
            // Return null for other pieces to use default Unicode rendering
            return null;
        };
    }

    static addSquirrelCSS() {
        const squirrelCSS = `
        .squirrel {
            background: linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #CD853F 100%);
        }
        
        .squirrel #chessboard {
            border: 4px solid #8B4513;
            box-shadow: 0 0 30px rgba(139, 69, 19, 0.8);
        }
        
        .squirrel .light {
            background: linear-gradient(135deg, #DEB887 0%, #D2B48C 100%);
        }
        
        .squirrel .dark {
            background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
        }
        
        .squirrel .timer, .squirrel .turn-indicator {
            background: rgba(139, 69, 19, 0.9);
            color: #FFE4B5;
        }
        
        .squirrel .square {
            background-size: 80%;
            background-repeat: no-repeat;
            background-position: center;
        }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = squirrelCSS;
        document.head.appendChild(styleSheet);
    }
}

// Make available globally
window.SquirrelTheme = SquirrelTheme;

// Global function to get piece image URL
window.getPieceImageUrl = window.getPieceImageUrl || function(piece) {
    return null; // Default: no images, use Unicode
};