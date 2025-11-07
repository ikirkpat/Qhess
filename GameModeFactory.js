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
                return new ClassicMode(modeConfig);
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

