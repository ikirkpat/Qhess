// Chess Shooter Mode
let shooterMode = false;
let shooterGame = {
    canvas: null,
    ctx: null,
    player: { x: 200, y: 350, piece: '♔' },
    bullets: [],
    enemies: [],
    score: 0,
    gameRunning: false,
    keys: {},
    lastEnemySpawn: 0
};

function initializeShooterMode() {
    shooterMode = true;
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div id="shooter-container">
            <canvas id="shooter-canvas" width="800" height="600"></canvas>
            <div id="shooter-ui">
                <div id="shooter-score">Score: 0</div>
                <div id="shooter-controls">Arrow Keys: Move | Space: Shoot</div>
            </div>
        </div>
    `;
    
    shooterGame.canvas = document.getElementById('shooter-canvas');
    shooterGame.ctx = shooterGame.canvas.getContext('2d');
    shooterGame.gameRunning = true;
    shooterGame.score = 0;
    shooterGame.bullets = [];
    shooterGame.enemies = [];
    shooterGame.player = { x: 400, y: 500, piece: '♔' };
    shooterGame.lastEnemySpawn = Date.now();
    
    setupShooterControls();
    gameLoop();
}

function setupShooterControls() {
    document.addEventListener('keydown', (e) => {
        shooterGame.keys[e.code] = true;
        if (e.code === 'Space') {
            e.preventDefault();
            shoot();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        shooterGame.keys[e.code] = false;
    });
}

function shoot() {
    if (!shooterGame.gameRunning) return;
    
    shooterGame.bullets.push({
        x: shooterGame.player.x + 15,
        y: shooterGame.player.y,
        speed: 8
    });
    
    playShootSound();
}

function spawnEnemy() {
    const pieces = ['♛', '♜', '♝', '♞', '♟'];
    const enemy = {
        x: Math.random() * 750,
        y: -50,
        piece: pieces[Math.floor(Math.random() * pieces.length)],
        speed: 2 + Math.random() * 3
    };
    shooterGame.enemies.push(enemy);
}

function updateGame() {
    if (!shooterGame.gameRunning) return;
    
    // Move player
    if (shooterGame.keys['ArrowLeft'] && shooterGame.player.x > 0) {
        shooterGame.player.x -= 5;
    }
    if (shooterGame.keys['ArrowRight'] && shooterGame.player.x < 750) {
        shooterGame.player.x += 5;
    }
    if (shooterGame.keys['ArrowUp'] && shooterGame.player.y > 0) {
        shooterGame.player.y -= 5;
    }
    if (shooterGame.keys['ArrowDown'] && shooterGame.player.y < 550) {
        shooterGame.player.y += 5;
    }
    
    // Update bullets
    shooterGame.bullets = shooterGame.bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        return bullet.y > 0;
    });
    
    // Update enemies
    shooterGame.enemies = shooterGame.enemies.filter(enemy => {
        enemy.y += enemy.speed;
        return enemy.y < 650;
    });
    
    // Spawn enemies
    if (Date.now() - shooterGame.lastEnemySpawn > 1000) {
        spawnEnemy();
        shooterGame.lastEnemySpawn = Date.now();
    }
    
    // Check collisions
    checkCollisions();
}

function checkCollisions() {
    // Bullet-enemy collisions
    shooterGame.bullets.forEach((bullet, bulletIndex) => {
        shooterGame.enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x > enemy.x && bullet.x < enemy.x + 30 &&
                bullet.y > enemy.y && bullet.y < enemy.y + 30) {
                shooterGame.bullets.splice(bulletIndex, 1);
                shooterGame.enemies.splice(enemyIndex, 1);
                shooterGame.score += 10;
                playHitSound();
                updateShooterScore();
            }
        });
    });
    
    // Player-enemy collisions
    shooterGame.enemies.forEach((enemy, index) => {
        if (shooterGame.player.x < enemy.x + 30 && shooterGame.player.x + 30 > enemy.x &&
            shooterGame.player.y < enemy.y + 30 && shooterGame.player.y + 30 > enemy.y) {
            shooterGameOver();
        }
    });
}

function drawGame() {
    const ctx = shooterGame.ctx;
    
    // Clear canvas
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 800, 600);
    
    // Draw chess floor pattern
    drawChessFloor();
    
    // Draw player
    ctx.fillStyle = '#f1c40f';
    ctx.font = '30px Arial';
    ctx.fillText(shooterGame.player.piece, shooterGame.player.x, shooterGame.player.y + 30);
    
    // Draw bullets
    ctx.fillStyle = '#e74c3c';
    shooterGame.bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, 4, 10);
    });
    
    // Draw enemies
    ctx.fillStyle = '#8e44ad';
    ctx.font = '30px Arial';
    shooterGame.enemies.forEach(enemy => {
        ctx.fillText(enemy.piece, enemy.x, enemy.y + 30);
    });
}

function drawChessFloor() {
    const ctx = shooterGame.ctx;
    const squareSize = 50;
    
    for (let x = 0; x < 800; x += squareSize) {
        for (let y = 0; y < 600; y += squareSize) {
            const isLight = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
            ctx.fillStyle = isLight ? '#f0d9b5' : '#b58863';
            ctx.fillRect(x, y, squareSize, squareSize);
        }
    }
}

function updateShooterScore() {
    document.getElementById('shooter-score').textContent = `Score: ${shooterGame.score}`;
}

function shooterGameOver() {
    shooterGame.gameRunning = false;
    playGameOverSound();
    
    const ctx = shooterGame.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 800, 600);
    
    ctx.fillStyle = '#e74c3c';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', 400, 250);
    
    ctx.fillStyle = '#f1c40f';
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${shooterGame.score}`, 400, 300);
    
    ctx.fillStyle = '#3498db';
    ctx.font = '18px Arial';
    ctx.fillText('Press R to restart', 400, 350);
    
    document.addEventListener('keydown', restartHandler);
}

function restartHandler(e) {
    if (e.code === 'KeyR') {
        document.removeEventListener('keydown', restartHandler);
        initializeShooterMode();
    }
}

function gameLoop() {
    if (shooterGame.gameRunning) {
        updateGame();
        drawGame();
        requestAnimationFrame(gameLoop);
    }
}

// Sound effects
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