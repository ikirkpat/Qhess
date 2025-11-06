class SurvivalMode extends GameMode {
    constructor(config) {
        super(config);
        this.kingAI = null;
    }

    initialize() {
        survivalMode = true;
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
        aiPieces = ['♛', '♜', '♜', '♝', '♝', '♞', '♞'];
        placeSurvivalPieces();
        
        if (this.config.aiConfig !== 'human-vs-human') {
            this.kingAI = new SurvivalEscaperAI();
            document.getElementById('turn-indicator').textContent = 'AI King vs AI Hunters!';
        } else {
            document.getElementById('turn-indicator').textContent = 'Survive the Hunt!';
        }
        
        setTimeout(() => this.startSurvivalGame(), 2000);
    }

    startSurvivalGame() {
        if (this.config.aiConfig !== 'human-vs-human') {
            this.makeKingAIMove();
        }
        moveAIPieces();
    }

    async makeKingAIMove() {
        if (gameOver || !this.kingAI) return;
        
        await this.kingAI.promptTurn(null);
        
        setTimeout(() => this.makeKingAIMove(), 1600);
    }

    handleSquareClick(square) {
        if (this.config.aiConfig === 'human-vs-human') {
            handleSurvivalSquareClick(square);
        }
    }

    shouldShowTimeControl() {
        return false;
    }

    shouldShowStartingPosition() {
        return false;
    }
}