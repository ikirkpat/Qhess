class ZombieChessMode extends GameMode {
    constructor(config) {
        super(config);
        this.coreEngine = new CoreGameEngine();
    }

    initialize() {
        if (this.config.aiConfig === 'human-vs-human') {
            initializeZombieMode();
            document.getElementById('turn-indicator').textContent = '🧟 Convert or Be Converted! 🧟';
        } else {
            this.coreEngine.initializeGame(this.config.aiConfig, true);
            document.getElementById('turn-indicator').textContent = '🧟 Chess with Zombie Conversion! 🧟';
        }
    }

    handleSquareClick(square) {
        if (this.config.aiConfig === 'human-vs-human') {
            // Use original zombie mode logic for human vs human
            handleZombieSquareClick(square);
        } else {
            this.coreEngine.handleSquareClick(square);
        }
    }

    makeAIMove() {
        if (this.coreEngine) {
            return this.coreEngine.makeAIMove();
        }
    }
}