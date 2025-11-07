// Chess Shooter Mode
const waveThemes = ['default', 'cyberpunk', 'neon', 'space', 'haunted', 'zombie'];

// Initialize shooterGame object - completely replace any existing one
window.shooterGame = {
    canvas: null, ctx: null,
    player: { x: 400, y: 500, piece: '♔', health: 3, maxHealth: 3 },
    bullets: [], enemies: [], powerups: [], boss: null,
    score: 0, highScore: 0, gameRunning: false, keys: {},
    lastEnemySpawn: 0, lastPowerupSpawn: 0, activePowers: {},
    wave: 1, enemiesKilled: 0, combo: 0, maxCombo: 0,
    particles: [], muzzleFlash: 0, screenShake: 0, bgOffset: 0,
    difficulty: 'normal',
    lastShot: 0,
    currentWave: 1,
    currentTheme: 'default',
    startTime: 0,
    bgScrollY: 0,
    scrollSpeed: 1,
    totalScrolled: 0,
    lives: 3,
    lastBossShot: 0
};

// Progression System
let progressionData = {
    stats: {
        totalEnemiesKilled: 0,
        totalTimePlayed: 0,
        gamesPlayed: 0,
        highScore: 0
    },
    achievements: {
        firstKill: false,
        destroyer100: false,
        survivor5min: false,
        speedDemon: false,
        untouchable: false
    },
    unlockedPieces: ['♔'],
    currentPiece: '♔'
};

const pieceAbilities = {
    '♔': { speed: 5, fireRate: 200, bulletSpeed: 8, name: 'King' },
    '♕': { speed: 4, fireRate: 150, bulletSpeed: 10, name: 'Queen' },
    '♖': { speed: 3, fireRate: 100, bulletSpeed: 12, name: 'Rook' },
    '♗': { speed: 6, fireRate: 250, bulletSpeed: 6, name: 'Bishop' },
    '♘': { speed: 7, fireRate: 300, bulletSpeed: 5, name: 'Knight' },
    '♙': { speed: 4, fireRate: 80, bulletSpeed: 15, name: 'Pawn' }
};

const difficultySettings = {
    easy: { enemySpeed: 1.5, spawnRate: 1500, name: 'Easy' },
    normal: { enemySpeed: 2.5, spawnRate: 1000, name: 'Normal' },
    hard: { enemySpeed: 4, spawnRate: 600, name: 'Hard' }
};

// Load progression data
function loadProgressionData() {
    const saved = localStorage.getItem('chessShooterProgression');
    if (saved) {
        progressionData = { ...progressionData, ...JSON.parse(saved) };
    }
}

// Save progression data
function saveProgressionData() {
    localStorage.setItem('chessShooterProgression', JSON.stringify(progressionData));
}

// Audio System
let audioContext;
let backgroundMusic;
let audioEnabled = true;

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        audioEnabled = false;
    }
}

function createBackgroundMusic() {
    if (!audioEnabled || !audioContext) return;

    try {
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Haunted elevator music - minor chord progression
        oscillator1.frequency.setValueAtTime(110, audioContext.currentTime); // Low drone
        oscillator2.frequency.setValueAtTime(165, audioContext.currentTime); // Minor third

        oscillator1.type = 'sine';
        oscillator2.type = 'triangle';

        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator1.start();
        oscillator2.start();

        backgroundMusic = { oscillator1, oscillator2, gainNode };
    } catch (e) {
    }
}

function stopBackgroundMusic() {
    if (backgroundMusic) {
        backgroundMusic.oscillator1.stop();
        backgroundMusic.oscillator2.stop();
        if (backgroundMusic.oscillator3) backgroundMusic.oscillator3.stop();
        backgroundMusic = null;
    }
}

function playVoiceAnnouncement(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
    }
}

function playPieceSound(piece) {
    if (!audioEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    const frequencies = {
        '♔': 440, '♕': 523, '♖': 349, '♗': 392, '♘': 466, '♙': 294
    };

    oscillator.frequency.setValueAtTime(frequencies[piece] || 440, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function initializeShooterMode() {
    loadProgressionData();
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div id="shooter-container">
            <div id="shooter-menu">
                <h2>Chess Shooter</h2>
                <div id="piece-selector">
                    <label>Piece:</label>
                    <select id="piece-select"></select>
                </div>
                <div id="difficulty-selector">
                    <label>Difficulty:</label>
                    <select id="difficulty-select">
                        <option value="easy">Easy</option>
                        <option value="normal" selected>Normal</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <button id="start-shooter">Start Game</button>
                <div id="stats-display"></div>
                <div id="achievements-display"></div>
            </div>
            <div id="shooter-game" style="display:none;">
                <canvas id="shooter-canvas" width="800" height="600"></canvas>
                <div id="shooter-ui" style="position: absolute; top: 60px; left: 250px; z-index: 100; display: flex; flex-direction: column; gap: 4px; font-family: Arial, sans-serif;">
                    <div id="shooter-score" style="background: rgba(0,0,0,0.8); color: #f1c40f; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Score: 0</div>
                    <div id="shooter-time" style="background: rgba(0,0,0,0.8); color: #3498db; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Time: 0s</div>
                    <div id="shooter-powerup" style="background: rgba(0,0,0,0.8); color: #9b59b6; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">No Power</div>
                    <div id="shooter-lives" style="background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 4px; font-size: 14px;">❤️❤️❤️</div>
                    <div id="shooter-controls" style="background: rgba(0,0,0,0.7); color: #bdc3c7; padding: 3px 6px; border-radius: 3px; font-size: 10px;">Arrow Keys: Move | Space: Shoot | P: Pause</div>
                </div>
            </div>
        </div>
    `;

    setupShooterMenu();
}

function setupShooterMenu() {
    initAudio();
    updatePieceSelector();
    updateStatsDisplay();
    updateAchievementsDisplay();

    document.getElementById('start-shooter').onclick = startShooterGame;
    document.getElementById('difficulty-select').onchange = (e) => {
        shooterGame.difficulty = e.target.value;
    };
    document.getElementById('piece-select').onchange = (e) => {
        progressionData.currentPiece = e.target.value;
        playPieceSound(e.target.value);
    };
}

function startShooterGame() {
    document.getElementById('shooter-menu').style.display = 'none';
    document.getElementById('shooter-game').style.display = 'block';

    shooterGame.canvas = document.getElementById('shooter-canvas');
    shooterGame.ctx = shooterGame.canvas.getContext('2d');
    shooterGame.gameRunning = true;
    shooterGame.score = 0;
    shooterGame.bullets = [];
    shooterGame.enemies = [];
    shooterGame.enemiesKilled = 0;
    shooterGame.startTime = Date.now();
    shooterGame.lastShot = 0;
    shooterGame.currentWave = 1;
    shooterGame.currentTheme = 'default';
    shooterGame.bgScrollY = 0;
    shooterGame.scrollSpeed = 1;
    shooterGame.totalScrolled = 0;
    shooterGame.player = { x: 400, y: 500, piece: progressionData.currentPiece };
    shooterGame.lives = 3;
    shooterGame.keys = {};
    shooterGame.lastEnemySpawn = Date.now();
    shooterGame.boss = null;
    shooterGame.lastBossShot = 0;
    shooterGame.powerups = [];
    shooterGame.lastPowerupSpawn = Date.now();
    shooterGame.activePowers = {};

    progressionData.stats.gamesPlayed++;

    createBackgroundMusic();
    playVoiceAnnouncement('Game Start! Good luck!');

    setupShooterControls();
    gameLoop();
}

function setupShooterControls() {
    document.addEventListener('keydown', (e) => {
        shooterGame.keys[e.code] = true;
        if (e.code === 'Space' || e.code.startsWith('Arrow')) {
            e.preventDefault();
        }
        if (e.code === 'Space') {
            shoot();
        }
        if (e.code === 'KeyP') {
            togglePause();
        }
    });

    document.addEventListener('keyup', (e) => {
        shooterGame.keys[e.code] = false;
    });
}

function togglePause() {
    shooterGame.gameRunning = !shooterGame.gameRunning;
    if (shooterGame.gameRunning) {
        gameLoop();
    }
}

function shoot() {
    if (!shooterGame.gameRunning) return;

    const now = Date.now();
    const ability = pieceAbilities[shooterGame.player.piece];
    const fireRate = shooterGame.activePowers.rapidFire ? ability.fireRate / 5 : ability.fireRate;

    if (now - shooterGame.lastShot < fireRate) return;

    if (shooterGame.activePowers.rapidFire) {
        for (let i = -2; i <= 2; i++) {
            shooterGame.bullets.push({
                x: shooterGame.player.x + 15 + i * 5,
                y: shooterGame.player.y,
                speed: ability.bulletSpeed,
                type: 'rapid'
            });
        }
    } else if (shooterGame.activePowers.laser) {
        shooterGame.bullets.push({
            x: shooterGame.player.x + 15,
            y: 0,
            speed: 0,
            width: 8,
            type: 'laser'
        });
        setTimeout(() => {
            shooterGame.bullets = shooterGame.bullets.filter(b => b.type !== 'laser');
        }, 200);
    } else if (shooterGame.activePowers.homing) {
        shooterGame.bullets.push({
            x: shooterGame.player.x + 15,
            y: shooterGame.player.y,
            speed: ability.bulletSpeed * 0.8,
            type: 'homing'
        });
    } else {
        shooterGame.bullets.push({
            x: shooterGame.player.x + 15,
            y: shooterGame.player.y,
            speed: ability.bulletSpeed,
            type: 'normal'
        });
    }

    shooterGame.lastShot = now;
    playWeaponSound(shooterGame.player.piece);
}

function spawnEnemy() {
    const pieces = ['♛', '♜', '♝', '♞', '♟'];
    const difficulty = difficultySettings[shooterGame.difficulty];
    const enemy = {
        x: Math.random() * 750,
        y: -50,
        piece: pieces[Math.floor(Math.random() * pieces.length)],
        speed: difficulty.enemySpeed + Math.random() * 2
    };
    shooterGame.enemies.push(enemy);
}

function updateGame() {
    if (!shooterGame.gameRunning) return;

    const ability = pieceAbilities[shooterGame.player.piece];
    const difficulty = difficultySettings[shooterGame.difficulty];

    // Update scrolling background
    shooterGame.totalScrolled += shooterGame.scrollSpeed;
    shooterGame.bgScrollY += shooterGame.scrollSpeed;
    if (shooterGame.bgScrollY >= 50) { // Reset when one square has scrolled
        shooterGame.bgScrollY = 0;
    }

    // Move player
    if (shooterGame.keys['ArrowLeft'] && shooterGame.player.x > 0) {
        shooterGame.player.x -= ability.speed;
    }
    if (shooterGame.keys['ArrowRight'] && shooterGame.player.x < 750) {
        shooterGame.player.x += ability.speed;
    }
    if (shooterGame.keys['ArrowUp'] && shooterGame.player.y > 0) {
        shooterGame.player.y -= ability.speed;
    }
    if (shooterGame.keys['ArrowDown'] && shooterGame.player.y < 550) {
        shooterGame.player.y += ability.speed;
    }

    // Update bullets
    shooterGame.bullets = shooterGame.bullets.filter(bullet => {
        if (bullet.type === 'homing' && shooterGame.enemies.length > 0) {
            const nearest = shooterGame.enemies.reduce((closest, enemy) => {
                const dist = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);
                const closestDist = Math.sqrt((bullet.x - closest.x) ** 2 + (bullet.y - closest.y) ** 2);
                return dist < closestDist ? enemy : closest;
            });
            const dx = nearest.x - bullet.x;
            const dy = nearest.y - bullet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            bullet.x += (dx / dist) * bullet.speed * 0.3;
            bullet.y += (dy / dist) * bullet.speed * 0.3;
        }
        bullet.y -= bullet.speed;
        return bullet.y > 0;
    });

    // Update enemies
    const enemySpeed = shooterGame.activePowers.slowMotion ? 0.5 : 1;
    shooterGame.enemies = shooterGame.enemies.filter(enemy => {
        if (!shooterGame.activePowers.freeze) {
            enemy.y += enemy.speed * enemySpeed;
        }
        return enemy.y < 650;
    });

    // Spawn boss every 20 enemies killed
    if (shooterGame.enemiesKilled % 20 === 0 && shooterGame.enemiesKilled > 0 && !shooterGame.boss) {
        spawnBoss();
    }

    // Spawn enemies (not during boss fight)
    if (!shooterGame.boss && Date.now() - shooterGame.lastEnemySpawn > difficulty.spawnRate) {
        spawnEnemy();
        shooterGame.lastEnemySpawn = Date.now();
    }

    // Update boss
    if (shooterGame.boss) {
        updateBoss();
    }

    // Spawn power-ups
    if (Date.now() - shooterGame.lastPowerupSpawn > 15000) {
        spawnPowerup();
        shooterGame.lastPowerupSpawn = Date.now();
    }

    // Update power-ups
    shooterGame.powerups = shooterGame.powerups.filter(powerup => {
        powerup.y += 2;
        return powerup.y < 650;
    });

    // Check collisions
    checkCollisions();

    // Update UI
    updateShooterUI();
}

function checkCollisions() {
    // Bullet-enemy collisions
    shooterGame.bullets.forEach((bullet, bulletIndex) => {
        shooterGame.enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x > enemy.x && bullet.x < enemy.x + 30 &&
                bullet.y > enemy.y && bullet.y < enemy.y + 30) {
                shooterGame.bullets.splice(bulletIndex, 1);
                shooterGame.enemies.splice(enemyIndex, 1);
                const points = shooterGame.activePowers.doublePoints ? 20 : 10;
                shooterGame.score += points;
                shooterGame.enemiesKilled++;
                progressionData.stats.totalEnemiesKilled++;
                playHitSound();
                changeTheme();
                checkAchievements();
            }
        });

        // Bullet-boss collisions
        if (shooterGame.boss && bullet.x > shooterGame.boss.x && bullet.x < shooterGame.boss.x + 60 &&
            bullet.y > shooterGame.boss.y && bullet.y < shooterGame.boss.y + 60) {
            shooterGame.bullets.splice(bulletIndex, 1);
            shooterGame.boss.health -= 10;
            playHitSound();
            if (shooterGame.boss.health <= 0) {
                const points = shooterGame.activePowers.doublePoints ? 1000 : 500;
                shooterGame.score += points;
                shooterGame.boss = null;
                playVoiceAnnouncement('Boss defeated!');
            }
        }
    });

    // Player-powerup collisions
    shooterGame.powerups.forEach((powerup, index) => {
        if (shooterGame.player.x < powerup.x + 20 && shooterGame.player.x + 30 > powerup.x &&
            shooterGame.player.y < powerup.y + 20 && shooterGame.player.y + 30 > powerup.y) {
            shooterGame.powerups.splice(index, 1);
            activatePowerup(powerup.type);
        }
    });

    // Player-enemy collisions
    for (let i = shooterGame.enemies.length - 1; i >= 0; i--) {
        const enemy = shooterGame.enemies[i];
        if (shooterGame.player.x < enemy.x + 30 && shooterGame.player.x + 30 > enemy.x &&
            shooterGame.player.y < enemy.y + 30 && shooterGame.player.y + 30 > enemy.y) {

            shooterGame.lives--;
            shooterGame.enemies.splice(i, 1);

            if (shooterGame.lives <= 0) {
                shooterGameOver();
                return;
            }
        }
    }

    // Player-boss collisions
    if (shooterGame.boss && shooterGame.player.x < shooterGame.boss.x + 60 && shooterGame.player.x + 30 > shooterGame.boss.x &&
        shooterGame.player.y < shooterGame.boss.y + 60 && shooterGame.player.y + 30 > shooterGame.boss.y) {
        shooterGame.lives--;
        if (shooterGame.lives <= 0) {
            shooterGameOver();
        }
    }
}

function drawGame() {
    const ctx = shooterGame.ctx;

    // Theme changes based on kills now

    // Clear canvas with theme background
    const backgroundColor = getThemeBackground(shooterGame.currentTheme);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, 800, 600);

    // Draw chess floor pattern
    drawChessFloor();

    // Draw player with theme colors
    const playerColor = getThemePlayerColor(shooterGame.currentTheme);
    ctx.fillStyle = playerColor;
    ctx.font = '30px Arial';
    ctx.fillText(shooterGame.player.piece, shooterGame.player.x, shooterGame.player.y + 30);

    // Draw bullets with theme colors
    const bulletColor = getThemeBulletColor(shooterGame.currentTheme);
    shooterGame.bullets.forEach(bullet => {
        if (bullet.type === 'laser') {
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(bullet.x, 0, bullet.width, 600);
        } else if (bullet.type === 'homing') {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(bullet.x, bullet.y, 6, 12);
        } else {
            ctx.fillStyle = bulletColor;
            ctx.fillRect(bullet.x, bullet.y, 4, 10);
        }
    });

    // Draw power-ups
    ctx.font = '20px Arial';
    shooterGame.powerups.forEach(powerup => {
        ctx.fillStyle = powerup.color;
        ctx.fillText(powerup.symbol, powerup.x, powerup.y + 20);
    });

    // Draw enemies with theme colors
    const enemyColor = getThemeEnemyColor(shooterGame.currentTheme);
    ctx.fillStyle = enemyColor;
    ctx.font = '30px Arial';
    shooterGame.enemies.forEach(enemy => {
        ctx.fillText(enemy.piece, enemy.x, enemy.y + 30);
    });

    // Draw boss
    if (shooterGame.boss) {
        ctx.fillStyle = '#ff0000';
        ctx.font = '60px Arial';
        ctx.fillText(shooterGame.boss.piece, shooterGame.boss.x, shooterGame.boss.y + 60);

        // Boss health bar
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(200, 20, 400, 20);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(200, 20, (shooterGame.boss.health / shooterGame.boss.maxHealth) * 400, 20);
    }
}

function getThemeBackground(theme) {
    switch (theme) {
        case 'cyberpunk': return '#0a0a1a';
        case 'neon': return '#001122';
        case 'space': return '#1a1a2e';
        case 'haunted': return '#1a0000';
        case 'zombie': return '#1a4d1a';
        default: return '#2c3e50';
    }
}

function getThemePlayerColor(theme) {
    switch (theme) {
        case 'cyberpunk': return '#d8b4d8ff';
        case 'neon': return '#00ffff';
        case 'space': return '#4a90e2';
        case 'haunted': return '#ff0000';
        case 'zombie': return '#00ff00';
        default: return '#f1c40f';
    }
}

function getThemeBulletColor(theme) {
    switch (theme) {
        case 'cyberpunk': return '#ff00ff';
        case 'neon': return '#00ffff';
        case 'space': return '#ffffff';
        case 'haunted': return '#ff4444';
        case 'zombie': return '#ff1493';
        default: return '#e74c3c';
    }
}

function getThemeEnemyColor(theme) {
    switch (theme) {
        case 'cyberpunk': return '#00ffff';
        case 'neon': return '#ff00ff';
        case 'space': return '#87ceeb';
        case 'haunted': return '#8b0000';
        case 'zombie': return '#ff1493';
        default: return '#8e44ad';
    }
}

function drawChessFloor() {
    const ctx = shooterGame.ctx;
    const squareSize = 50;
    const offsetY = Math.floor(shooterGame.totalScrolled) % squareSize;

    for (let x = 0; x < 800; x += squareSize) {
        for (let y = -squareSize; y < 600 + squareSize; y += squareSize) {
            const drawY = y - offsetY;
            const gridX = Math.floor(x / squareSize);
            const gridY = Math.floor((y + Math.floor(shooterGame.totalScrolled)) / squareSize);
            const isLight = (gridX + gridY) % 2 === 0;
            const colors = getThemeColors(shooterGame.currentTheme);
            ctx.fillStyle = isLight ? colors.light : colors.dark;
            ctx.fillRect(x, drawY, squareSize, squareSize);
        }
    }
}

function getThemeColors(theme) {
    switch (theme) {
        case 'cyberpunk':
            return { light: '#ff00ff', dark: '#000000' };
        case 'neon':
            return { light: '#00ffff', dark: '#0000ff' };
        case 'space':
            return { light: '#ffffff', dark: '#000080' };
        case 'haunted':
            return { light: '#ff0000', dark: '#800000' };
        case 'zombie':
            return { light: '#00ff00', dark: '#008000' };
        default:
            return { light: '#f0d9b5', dark: '#b58863' };
    }
}

function changeTheme() {
    const wave = Math.floor(shooterGame.enemiesKilled / 10) + 1;
    if (wave !== shooterGame.currentWave) {
        shooterGame.currentWave = wave;
        shooterGame.currentTheme = waveThemes[(wave - 1) % waveThemes.length];
        document.body.className = shooterGame.currentTheme;

        // Increase scroll speed with each wave
        shooterGame.scrollSpeed = Math.min(1 + (wave - 1) * 0.3, 4); // Cap at 4px per frame

    }
}

function updateShooterScore() {
    document.getElementById('shooter-score').textContent = `Score: ${shooterGame.score}`;
}

function updateShooterUI() {
    const elapsed = Math.floor((Date.now() - shooterGame.startTime) / 1000);
    const scoreEl = document.getElementById('shooter-score');
    const timeEl = document.getElementById('shooter-time');
    const powerupEl = document.getElementById('shooter-powerup');
    const livesEl = document.getElementById('shooter-lives');

    if (scoreEl) scoreEl.textContent = `Score: ${shooterGame.score}`;
    if (timeEl) timeEl.textContent = `Time: ${elapsed}s`;
    if (powerupEl) {
        const activePower = Object.keys(shooterGame.activePowers).find(key => shooterGame.activePowers[key]);
        if (activePower) {
            const powerNames = {
                freeze: '❄️ Freeze',
                doublePoints: '💰 Double',
                slowMotion: '⏰ Slow',
                homing: '🎯 Homing',
                rapidFire: '💥 Rapid',
                laser: '⚡ Laser'
            };
            powerupEl.textContent = powerNames[activePower] || activePower;
        } else {
            powerupEl.textContent = 'No Power';
        }
    }
    if (livesEl) {
        const hearts = '❤️'.repeat(Math.max(0, shooterGame.lives)) + '💔'.repeat(Math.max(0, 3 - shooterGame.lives));
        livesEl.textContent = hearts;
    }
}



function checkAchievements() {
    const elapsed = (Date.now() - shooterGame.startTime) / 1000;

    // Check for wave changes
    changeTheme();

    // First Kill
    if (!progressionData.achievements.firstKill && shooterGame.enemiesKilled >= 1) {
        unlockAchievement('firstKill', 'First Blood!');
        playVoiceAnnouncement('First blood!');
    }

    // Destroy 100 enemies (total)
    if (!progressionData.achievements.destroyer100 && progressionData.stats.totalEnemiesKilled >= 100) {
        unlockAchievement('destroyer100', 'Destroyer of 100!');
        unlockPiece('♕'); // Queen
        playVoiceAnnouncement('Destroyer achievement unlocked!');
    }

    // Survive 5 minutes
    if (!progressionData.achievements.survivor5min && elapsed >= 300) {
        unlockAchievement('survivor5min', '5 Minute Survivor!');
        unlockPiece('♖'); // Rook
        playVoiceAnnouncement('Five minute survivor!');
    }

    // Speed Demon (50 kills in one game)
    if (!progressionData.achievements.speedDemon && shooterGame.enemiesKilled >= 50) {
        unlockAchievement('speedDemon', 'Speed Demon!');
        unlockPiece('♗'); // Bishop
        playVoiceAnnouncement('Speed demon!');
    }

    // Untouchable (survive 2 minutes without getting hit)
    if (!progressionData.achievements.untouchable && elapsed >= 120 && shooterGame.enemiesKilled > 0) {
        unlockAchievement('untouchable', 'Untouchable!');
        unlockPiece('♘'); // Knight
        playVoiceAnnouncement('Untouchable!');
    }

    // Check for new high score
    if (shooterGame.score > progressionData.stats.highScore) {
        progressionData.stats.highScore = shooterGame.score;
        if (shooterGame.score > 0 && shooterGame.score % 500 === 0) {
            playVoiceAnnouncement('New high score!');
        }
    }
}

function unlockAchievement(id, name) {
    progressionData.achievements[id] = true;
    showNotification(`Achievement Unlocked: ${name}`);
    saveProgressionData();
}

function unlockPiece(piece) {
    if (!progressionData.unlockedPieces.includes(piece)) {
        progressionData.unlockedPieces.push(piece);
        const pieceName = pieceAbilities[piece].name;
        showNotification(`New Piece Unlocked: ${pieceName} ${piece}`);
        playVoiceAnnouncement(`Power up! ${pieceName} unlocked!`);
        playPowerUpSound();
        saveProgressionData();
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        background: #2ecc71; color: white; padding: 10px 20px;
        border-radius: 5px; font-weight: bold;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function updatePieceSelector() {
    const select = document.getElementById('piece-select');
    select.innerHTML = '';
    progressionData.unlockedPieces.forEach(piece => {
        const option = document.createElement('option');
        option.value = piece;
        option.textContent = `${pieceAbilities[piece].name} ${piece}`;
        if (piece === progressionData.currentPiece) option.selected = true;
        select.appendChild(option);
    });
}

function updateStatsDisplay() {
    const stats = progressionData.stats;
    document.getElementById('stats-display').innerHTML = `
        <h3>Statistics</h3>
        <p>Games Played: ${stats.gamesPlayed}</p>
        <p>Total Enemies Killed: ${stats.totalEnemiesKilled}</p>
        <p>High Score: ${stats.highScore}</p>
        <p>Total Time Played: ${Math.floor(stats.totalTimePlayed / 60)}m ${stats.totalTimePlayed % 60}s</p>
    `;
}

function updateAchievementsDisplay() {
    const achievements = [
        { id: 'firstKill', name: 'First Blood', desc: 'Kill your first enemy' },
        { id: 'destroyer100', name: 'Destroyer', desc: 'Kill 100 enemies total' },
        { id: 'survivor5min', name: 'Survivor', desc: 'Survive for 5 minutes' },
        { id: 'speedDemon', name: 'Speed Demon', desc: 'Kill 50 enemies in one game' },
        { id: 'untouchable', name: 'Untouchable', desc: 'Survive 2 minutes without being hit' }
    ];

    const html = achievements.map(ach => {
        const unlocked = progressionData.achievements[ach.id];
        return `<div style="color: ${unlocked ? '#2ecc71' : '#95a5a6'}">
            ${unlocked ? '✓' : '✗'} ${ach.name}: ${ach.desc}
        </div>`;
    }).join('');

    document.getElementById('achievements-display').innerHTML = `<h3>Achievements</h3>${html}`;
}

function shooterGameOver() {
    shooterGame.gameRunning = false;
    shooterGame.gameOver = true;
    stopBackgroundMusic();

    // Update stats
    const timePlayed = Math.floor((Date.now() - shooterGame.startTime) / 1000);
    progressionData.stats.totalTimePlayed += timePlayed;
    const isNewHighScore = shooterGame.score > progressionData.stats.highScore;
    if (isNewHighScore) {
        progressionData.stats.highScore = shooterGame.score;
        playVoiceAnnouncement('New high score achieved!');
    }

    // Check final achievements
    if (shooterGame.enemiesKilled >= 20) {
        unlockPiece('♙'); // Pawn
    }

    saveProgressionData();
    playGameOverSound();
    playVoiceAnnouncement('Game over');

    document.addEventListener('keydown', gameOverHandler);
}

function drawGameOver() {
    const ctx = shooterGame.ctx;
    const timePlayed = Math.floor((Date.now() - shooterGame.startTime) / 1000);
    const isNewHighScore = shooterGame.score > progressionData.stats.highScore;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 800, 600);

    ctx.fillStyle = '#e74c3c';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', 400, 200);

    ctx.fillStyle = '#f1c40f';
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${shooterGame.score}`, 400, 250);
    ctx.fillText(`Enemies Killed: ${shooterGame.enemiesKilled}`, 400, 280);
    ctx.fillText(`Time Survived: ${timePlayed}s`, 400, 310);

    if (isNewHighScore) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillText('🏆 NEW HIGH SCORE! 🏆', 400, 340);
    }

    ctx.fillStyle = '#3498db';
    ctx.font = '18px Arial';
    ctx.fillText('Press R to restart or M for menu', 400, 380);
}

function gameOverHandler(e) {
    if (e.code === 'KeyR') {
        document.removeEventListener('keydown', gameOverHandler);
        shooterGame.gameOver = false;
        startShooterGame();
    } else if (e.code === 'KeyM') {
        document.removeEventListener('keydown', gameOverHandler);
        shooterGame.gameOver = false;
        returnToMainMenu();
    }
}

function returnToMainMenu() {
    // Return to the main chess game setup screen
    if (typeof resetGame === 'function') {
        resetGame();
    } else {
        // Fallback - manually show setup screen
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('game-container').classList.add('hidden');
    }
}

function gameLoop() {
    if (shooterGame.gameRunning) {
        updateGame();
        drawGame();
        requestAnimationFrame(gameLoop);
    } else if (shooterGame.gameOver) {
        drawGameOver();
    }
}

// Enhanced Sound Effects
function playWeaponSound(piece) {
    if (!audioEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    const weaponSounds = {
        '♔': { freq: 800, type: 'square', duration: 0.1 },
        '♕': { freq: 1000, type: 'sawtooth', duration: 0.15 },
        '♖': { freq: 600, type: 'triangle', duration: 0.2 },
        '♗': { freq: 1200, type: 'sine', duration: 0.08 },
        '♘': { freq: 900, type: 'square', duration: 0.12 },
        '♙': { freq: 1400, type: 'sawtooth', duration: 0.06 }
    };

    const sound = weaponSounds[piece] || weaponSounds['♔'];

    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(sound.freq * 0.3, audioContext.currentTime + sound.duration);
    oscillator.type = sound.type;

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
}

function playPowerUpSound() {
    if (!audioEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.3);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function playHitSound() {
    if (!audioEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);

    // Add explosion effect for kills
    setTimeout(() => {
        const explosion = audioContext.createOscillator();
        const explosionGain = audioContext.createGain();

        explosion.frequency.setValueAtTime(200, audioContext.currentTime);
        explosion.type = 'square';

        explosionGain.gain.setValueAtTime(0.2, audioContext.currentTime);
        explosionGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        explosion.connect(explosionGain);
        explosionGain.connect(audioContext.destination);

        explosion.start(audioContext.currentTime);
        explosion.stop(audioContext.currentTime + 0.1);
    }, 50);
}

function spawnBoss() {
    shooterGame.boss = {
        x: 300,
        y: 50,
        piece: '♚',
        health: 200,
        maxHealth: 200,
        speed: 1,
        direction: 1
    };
    playVoiceAnnouncement('Boss incoming!');
}

function updateBoss() {
    if (!shooterGame.boss) return;

    // Move boss horizontally
    shooterGame.boss.x += shooterGame.boss.speed * shooterGame.boss.direction;
    if (shooterGame.boss.x <= 0 || shooterGame.boss.x >= 740) {
        shooterGame.boss.direction *= -1;
        shooterGame.boss.y += 20;
    }

    // Boss shoots occasionally
    if (Date.now() - shooterGame.lastBossShot > 2000) {
        shooterGame.enemies.push({
            x: shooterGame.boss.x + 30,
            y: shooterGame.boss.y + 60,
            piece: '♟',
            speed: 3
        });
        shooterGame.lastBossShot = Date.now();
    }
}

function spawnPowerup() {
    const powerups = [
        { type: 'freeze', symbol: '❄️', color: '#00bfff' },
        { type: 'magnet', symbol: '🧲', color: '#ff6347' },
        { type: 'doublePoints', symbol: '💰', color: '#ffd700' },
        { type: 'slowMotion', symbol: '⏰', color: '#9370db' },
        { type: 'homing', symbol: '🎯', color: '#ff1493' },
        { type: 'rapidFire', symbol: '💥', color: '#ff4500' },
        { type: 'laser', symbol: '⚡', color: '#00ffff' }
    ];

    const powerup = powerups[Math.floor(Math.random() * powerups.length)];
    shooterGame.powerups.push({
        x: Math.random() * 750,
        y: -30,
        ...powerup
    });
}

function activatePowerup(type) {
    playPowerUpSound();

    switch (type) {
        case 'freeze':
            shooterGame.activePowers.freeze = true;
            setTimeout(() => shooterGame.activePowers.freeze = false, 3000);
            break;
        case 'magnet':
            shooterGame.powerups.forEach(powerup => {
                powerup.x = shooterGame.player.x;
                powerup.y = shooterGame.player.y;
            });
            break;
        case 'doublePoints':
            shooterGame.activePowers.doublePoints = true;
            setTimeout(() => shooterGame.activePowers.doublePoints = false, 10000);
            break;
        case 'slowMotion':
            shooterGame.activePowers.slowMotion = true;
            setTimeout(() => shooterGame.activePowers.slowMotion = false, 5000);
            break;
        case 'homing':
            shooterGame.activePowers.homing = true;
            setTimeout(() => shooterGame.activePowers.homing = false, 8000);
            break;
        case 'rapidFire':
            shooterGame.activePowers.rapidFire = true;
            setTimeout(() => shooterGame.activePowers.rapidFire = false, 5000);
            break;
        case 'laser':
            shooterGame.activePowers.laser = true;
            setTimeout(() => shooterGame.activePowers.laser = false, 3000);
            break;
    }
}

function playGameOverSound() {
    if (!audioEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1.5);
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.5);
}

class ShooterMode extends GameMode {
    initialize() {
        initializeShooterMode();
    }

    handleSquareClick(square) {
        return;
    }

    shouldShowTimeControl() {
        return false;
    }

    shouldShowStartingPosition() {
        return false;
    }

    getTheme() {
        return 'space';
    }
}

window.ShooterMode = ShooterMode;