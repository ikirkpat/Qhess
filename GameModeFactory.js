// GameModeFactory.js - Factory pattern following SOLID principles

class GameModeFactory {
    static createGameMode(gameType, aiConfig) {
        const modeConfig = {
            gameType: gameType,
            aiConfig: aiConfig,
            isClassicVariant: ['classic', 'zombie'].includes(gameType),
            hasAI: aiConfig !== 'human-vs-human'
        };

        switch (gameType) {
            case 'classic':
                return new ClassicChessMode(modeConfig);
            case 'zombie':
                return new ZombieChessMode(modeConfig);
            case 'survival':
                return new SurvivalMode(modeConfig);
            case 'shooter':
                return new ShooterMode(modeConfig);
            default:
                throw new Error(`Unknown game type: ${gameType}`);
        }
    }
}

// Base class for all game modes
class GameMode {
    constructor(config) {
        this.config = config;
        this.gameOver = false;
    }

    initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }

    handleSquareClick(square) {
        throw new Error('handleSquareClick() must be implemented by subclass');
    }

    shouldShowTimeControl() {
        return this.config.isClassicVariant;
    }

    shouldShowStartingPosition() {
        return this.config.isClassicVariant;
    }

    getTheme() {
        return this.config.gameType === 'zombie' ? 'zombie' : 
               this.config.gameType === 'survival' ? 'haunted' : 'classic';
    }
}

class ClassicChessMode extends GameMode {
    constructor(config) {
        super(config);
        this.classicGameMode = new ClassicGameMode();
    }

    initialize() {
        this.classicGameMode.initializeGame(this.config.aiConfig, false);
    }

    handleSquareClick(square) {
        this.classicGameMode.handleSquareClick(square);
    }

    makeAIMove() {
        return this.classicGameMode.makeAIMove();
    }
}

class ZombieChessMode extends GameMode {
    constructor(config) {
        super(config);
        this.classicGameMode = new ClassicGameMode();
    }

    initialize() {
        if (this.config.aiConfig === 'human-vs-human') {
            initializeZombieMode();
            document.getElementById('turn-indicator').textContent = '🧟 Convert or Be Converted! 🧟';
        } else {
            this.classicGameMode.initializeGame(this.config.aiConfig, true);
            document.getElementById('turn-indicator').textContent = '🧟 Chess with Zombie Conversion! 🧟';
        }
    }

    handleSquareClick(square) {
        if (this.config.aiConfig === 'human-vs-human') {
            // Use original zombie mode logic for human vs human
            handleZombieSquareClick(square);
        } else {
            this.classicGameMode.handleSquareClick(square);
        }
    }

    makeAIMove() {
        if (this.classicGameMode) {
            return this.classicGameMode.makeAIMove();
        }
    }
}



class ShooterMode extends GameMode {
    initialize() {
        initializeShooterMode();
    }

    handleSquareClick(square) {
        // Shooter mode doesn't use square clicks
    }

    shouldShowTimeControl() {
        return false;
    }

    shouldShowStartingPosition() {
        return false;
    }
}