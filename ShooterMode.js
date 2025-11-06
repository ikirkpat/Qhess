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