// SquirrelTheme.js - Squirrel theme for all game modes

class SquirrelTheme {
    static applyTheme() {
        document.body.classList.add('squirrel');
        this.addSquirrelCSS();
        this.setupPieceImages();
        this.addDancingSquirrel();
    }
    
    static addDancingSquirrel() {
        const squirrel = document.createElement('img');
        squirrel.src = 'https://admin-dev.michdev.org/images/squirrel-dancing-squirrel.gif';
        squirrel.className = 'dancing-squirrel';
        document.body.appendChild(squirrel);
        
        const leftSquirrel = document.createElement('img');
        leftSquirrel.src = 'https://i.pinimg.com/originals/b2/5e/bf/b25ebf2fa97fc8c06ddb9cd99f999f9a.gif';
        leftSquirrel.className = 'dancing-squirrel-left';
        document.body.appendChild(leftSquirrel);
    }
    
    static setupPieceImages() {
        // Override the global getPieceImageUrl function for squirrel theme
        window.getPieceImageUrl = function(piece) {
            if (piece === '♙') {
                return 'https://admin-dev.michdev.org/images/squirrel-dancing-squirrel.gif';
            }
            if (piece === '♟') {
                return 'https://i.pinimg.com/originals/b2/5e/bf/b25ebf2fa97fc8c06ddb9cd99f999f9a.gif';
            }
            if (piece === '♖') {
                return 'https://media.tenor.com/vfn-ZFnYViUAAAAM/yeah-squirrel.gif';
            }
            if (piece === '♜') {
                return 'https://i.pinimg.com/originals/9d/db/c6/9ddbc6f04145c2e7086c4bb9b2bc6ad5.gif';
            }
            if (piece === '♘') {
                return 'https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUybW80NXI2ZnQ1bXhweWVpZ3h5b2VkOXVid2NsZXp6Zjdud2F1aHEzZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WIBreSdARYNt6/200w.gif';
            }
            if (piece === '♞') {
                return 'https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUydWE5cTFha3hteGN0ZjBuZHNidGdjZzBodWhkdTZ1cmwzd2l1Ynl6NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/eg4LsfTm6HY0TAsnpg/200w.gif';
            }
            if (piece === '♗') {
                return 'https://dl.glitter-graphics.com/pub/3305/3305949o3u42zrs2f.gif';
            }
            if (piece === '♝') {
                return 'https://i.pinimg.com/originals/b6/e5/2a/b6e52ac37565f955e3133bea91f40c58.gif';
            }
            if (piece === '♕') {
                return 'https://gifdb.com/images/high/graceful-ballet-dancer-dancing-squirrel-b42jytrt8l5wim9f.gif';
            }
            if (piece === '♛') {
                return 'https://giffiles.alphacoders.com/877/87755.gif';
            }
            if (piece === '♔') {
                return 'https://media0.giphy.com/media/3osxY7eI6enqNBo2mQ/giphy.gif';
            }
            if (piece === '♚') {
                return 'https://media.tenor.com/GEEgVauNAm8AAAAM/screaming-yell.gif';
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
        
        .dancing-squirrel {
            position: fixed;
            width: 240px;
            height: 240px;
            right: 50px;
            top: 50%;
            transform-origin: 150px 0;
            animation: circularMotion 5s linear infinite;
            z-index: 1000;
        }
        
        .dancing-squirrel-left {
            position: fixed;
            width: 240px;
            height: 240px;
            left: 50px;
            top: 50%;
            transform-origin: -150px 0;
            animation: circularMotionLeft 5s linear infinite;
            z-index: 1000;
        }
        
        @keyframes circularMotion {
            from {
                transform: translateY(-50%) rotate(0deg) translateX(150px) rotate(0deg);
            }
            to {
                transform: translateY(-50%) rotate(360deg) translateX(150px) rotate(-360deg);
            }
        }
        
        @keyframes circularMotionLeft {
            from {
                transform: translateY(-50%) rotate(0deg) translateX(-150px) rotate(0deg);
            }
            to {
                transform: translateY(-50%) rotate(360deg) translateX(-150px) rotate(-360deg);
            }
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