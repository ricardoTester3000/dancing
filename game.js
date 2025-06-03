import Player from './player.js';
import Enemy, { EnemyType } from './enemy.js';
import Level from './level.js';
import { loadSound, playSound, stopSound } from './audio.js';
import { Bat, Knife, GlowStick } from './weapon.js'; 
import { DroppedWeapon } from './dropped_weapon.js';

const GAME_STATE = {
    START_SCREEN: 'startScreen',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    LEVEL_COMPLETE: 'levelComplete'
};

async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            console.error(`Failed to load image: ${src}`, err);
            reject(err);
        };
        img.src = src;
    });
}

class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.gameState = GAME_STATE.START_SCREEN; 
        this.lastTime = 0;
        this.deltaTime = 0;

        this.mousePos = { x: 0, y: 0 };
        this.input = {
            up: false, down: false, left: false, right: false,
            attack: false,
            pickup: false 
        };
        
        this.player = null; 
        this.playerImage = null; 
        this.weaponImages = {}; 
        this.enemyImages = {}; 

        this.level = new Level(this.canvas);
        this.enemies = [];
        this.droppedWeapons = [];
        
        this.sounds = {};
        this.musicPlaying = false;
        this.musicStartTime = 0;
        this.BPM = 120; 
        this.beatInterval = 60000 / this.BPM; 
        this.beatTolerance = 80; 

        this.score = 0;

        this._initControls();
        this._loadAssetsAndInitialize();
    }

    async _loadAssetsAndInitialize() {
        try {
            this.playerImage = await loadImage('assets/player_character.png');
            this.weaponImages.bat = await loadImage('assets/bat_icon.png');
            this.weaponImages.glowstick = await loadImage('assets/glow_stick_icon.png'); 
            
            this.enemyImages[EnemyType.SECURITY_GUARD] = await loadImage('assets/security_guard_enemy.png');
            this.enemyImages[EnemyType.RIOT_POLICE] = await loadImage('assets/riot_police_enemy.png');
            
            this.sounds.backgroundMusic = await loadSound('assets/background_music.mp3');
            this.sounds.hitSfx = await loadSound('assets/hit_sfx.mp3');
            this.sounds.playerDeathSfx = await loadSound('assets/player_death_sfx.mp3');
            this.sounds.enemyDeathSfx = await loadSound('assets/enemy_death_sfx.mp3');
            this.sounds.batSwingSfx = await loadSound('assets/bat_swing_sfx.mp3');
            this.sounds.weaponPickupSfx = await loadSound('assets/weapon_pickup_sfx.mp3');

            this.start(); 

        } catch (error) {
            console.error("Error loading assets or initializing game:", error);
        }
    }

    _initControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.input.up = true;
            if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.input.down = true;
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.input.left = true;
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.input.right = true;
            if (e.key === 'e' || e.key === 'E') this.input.pickup = true; 
            if ((e.key === 'r' || e.key === 'R') && this.gameState === GAME_STATE.GAME_OVER) this.restartGame();
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.input.up = false;
            if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.input.down = false;
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.input.left = false;
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.input.right = false;
            if (e.key === 'e' || e.key === 'E') this.input.pickup = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { 
                this.input.attack = true; 
            }
        });
    }
    
    spawnEnemies() {
        this.enemies = []; 
        this.enemies.push(new Enemy(300, 200, this.level.tiles, EnemyType.SECURITY_GUARD, new Knife(null), this.enemyImages[EnemyType.SECURITY_GUARD]));
        this.enemies.push(new Enemy(500, 400, this.level.tiles, EnemyType.RIOT_POLICE, new Bat(null), this.enemyImages[EnemyType.RIOT_POLICE])); 
        this.enemies.push(new Enemy(this.canvas.width - 150, 150, this.level.tiles, EnemyType.SECURITY_GUARD, new GlowStick(null), this.enemyImages[EnemyType.SECURITY_GUARD]));
        this.enemies.push(new Enemy(this.canvas.width / 2, this.canvas.height - 100, this.level.tiles, EnemyType.RIOT_POLICE, null, this.enemyImages[EnemyType.RIOT_POLICE]));
        this.enemies.push(new Enemy(200, this.canvas.height - 200, this.level.tiles, EnemyType.SECURITY_GUARD, new GlowStick(null), this.enemyImages[EnemyType.SECURITY_GUARD]));
    }

    startGamePlay() {
        this.gameState = GAME_STATE.PLAYING;
        this.player = new Player(100, 100, this.canvas, this.playerImage);
        this.spawnEnemies();
        this.droppedWeapons = [];
        this.score = 0;
        if (this.sounds.backgroundMusic && !this.musicPlaying) {
            playSound(this.sounds.backgroundMusic, true, 0.3);
            this.musicPlaying = true;
            this.musicStartTime = performance.now();
        }
        this.lastTime = performance.now(); 
        // Note: this.input.attack is consumed in update() if it initiated the game from start screen.
        // For restarts, it's cleared in restartGame().
    }

    restartGame() {
        if (!this.playerImage) { 
            console.error("Cannot restart: Player image not loaded.");
            return;
        }
        // Clear pending attack input to prevent immediate attack on respawn
        // if the mouse button was pressed/held when the player died or during game over.
        this.input.attack = false; 
        
        this.startGamePlay(); 
    }
    
    addScore(points) {
        this.score += points;
    }

    isActionOnBeat() {
        if (!this.musicPlaying) return false;
        const timeSinceMusicStart = performance.now() - this.musicStartTime;
        const timeIntoCurrentBeat = timeSinceMusicStart % this.beatInterval;
        
        return timeIntoCurrentBeat <= this.beatTolerance || 
               timeIntoCurrentBeat >= (this.beatInterval - this.beatTolerance);
    }

    update(deltaTime) {
        if (this.gameState === GAME_STATE.START_SCREEN) {
            if (this.input.attack) { 
                this.startGamePlay();
                this.input.attack = false; // Consume attack input for starting game
            }
            return; 
        }
        
        if (this.gameState !== GAME_STATE.PLAYING || !this.player) return;

        this.player.update(this.input, this.mousePos, deltaTime, this.level.tiles, this);
        
        const newEnemies = [];
        this.enemies.forEach(enemy => {
            if (enemy.isDead) {
                if (this.sounds.enemyDeathSfx) playSound(this.sounds.enemyDeathSfx, false, 0.6);
                if (enemy.weaponToDrop) { 
                    let droppedWeaponInstance;
                    let weaponImageKey = enemy.weaponToDrop.name.toLowerCase();
                    if (weaponImageKey === "glowstick") weaponImageKey = "glowstick"; 
                    
                    if (enemy.weaponToDrop instanceof Bat) {
                        droppedWeaponInstance = new Bat(null);
                    } else if (enemy.weaponToDrop instanceof Knife) {
                        droppedWeaponInstance = new Knife(null); 
                    } else if (enemy.weaponToDrop instanceof GlowStick) {
                        droppedWeaponInstance = new GlowStick(null);
                    }

                    if (droppedWeaponInstance && this.weaponImages[weaponImageKey]) {
                        this.droppedWeapons.push(
                            new DroppedWeapon(enemy.x, enemy.y, droppedWeaponInstance, this.weaponImages[weaponImageKey])
                        );
                    } else if (droppedWeaponInstance && !this.weaponImages[weaponImageKey] && weaponImageKey !== 'knife') { 
                        console.warn(`No image found for dropped weapon: ${weaponImageKey}`);
                    }
                }
            } else {
                newEnemies.push(enemy);
            }
        });
        this.enemies = newEnemies;

        this.enemies.forEach(enemy => {
            enemy.update(this.player, deltaTime, this.level.tiles);
            if (!enemy.isDead && this.checkCollision(this.player.getHitbox(), enemy.getHitbox())) {
                this.gameState = GAME_STATE.GAME_OVER;
                if (this.sounds.playerDeathSfx) playSound(this.sounds.playerDeathSfx);
                if (this.musicPlaying && this.sounds.backgroundMusic) {
                    stopSound(this.sounds.backgroundMusic);
                    this.musicPlaying = false;
                }
            }
        });

        const remainingDroppedWeapons = [];
        for (let i = 0; i < this.droppedWeapons.length; i++) {
            const dWeapon = this.droppedWeapons[i];
            if (dWeapon.isPlayerClose(this.player) && this.checkCollision(this.player.getHitbox(), dWeapon.getHitbox())) {
                this.player.equipWeapon(dWeapon.weapon); 
                if (this.sounds.weaponPickupSfx) playSound(this.sounds.weaponPickupSfx, false, 0.8);
            } else {
                remainingDroppedWeapons.push(dWeapon);
            }
        }
        this.droppedWeapons = remainingDroppedWeapons;
        if (this.input.pickup) this.input.pickup = false; 

        if (this.enemies.length === 0 && this.gameState === GAME_STATE.PLAYING) { 
            this.gameState = GAME_STATE.LEVEL_COMPLETE;
            if (this.musicPlaying && this.sounds.backgroundMusic) {
                 stopSound(this.sounds.backgroundMusic); 
                 this.musicPlaying = false;
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    render() {
        this.ctx.fillStyle = '#0a0a0a'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === GAME_STATE.START_SCREEN) {
            this.ctx.fillStyle = '#05000f'; 
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.save();
            this.ctx.lineWidth = 3;
            const pulseAlpha = 0.5 + Math.sin(performance.now() / 600) * 0.2; 
            this.ctx.globalAlpha = pulseAlpha;

            this.ctx.strokeStyle = '#ff00ff'; 
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.canvas.height * (0.2 + Math.sin(performance.now() / 1000) * 0.02));
            this.ctx.lineTo(this.canvas.width, this.canvas.height * (0.25 + Math.sin(performance.now() / 1100) * 0.02));
            this.ctx.moveTo(0, this.canvas.height * (0.75 + Math.sin(performance.now() / 900) * 0.02));
            this.ctx.lineTo(this.canvas.width, this.canvas.height * (0.7 + Math.sin(performance.now() / 1050) * 0.02));
            this.ctx.stroke();

            this.ctx.strokeStyle = '#00ffff'; 
            this.ctx.shadowColor = '#00ffff';
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width * (0.1 + Math.cos(performance.now() / 1200) * 0.02), 0);
            this.ctx.lineTo(this.canvas.width * (0.15 + Math.cos(performance.now() / 1300) * 0.02), this.canvas.height);
            this.ctx.moveTo(this.canvas.width * (0.85 + Math.cos(performance.now() / 1150) * 0.02), 0);
            this.ctx.lineTo(this.canvas.width * (0.8 + Math.cos(performance.now() / 1250) * 0.02), this.canvas.height);
            this.ctx.stroke();
            
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeStyle = '#ff3333'; 
            this.ctx.shadowColor = '#ff3333';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width * (0.5 + Math.sin(performance.now() / 700) * 0.2), 0);
            this.ctx.lineTo(this.canvas.width * (0.45 + Math.sin(performance.now() / 750) * 0.2), this.canvas.height);
            this.ctx.moveTo(0, this.canvas.height * (0.5 + Math.cos(performance.now() / 800) * 0.15));
            this.ctx.lineTo(this.canvas.width, this.canvas.height * (0.55 + Math.cos(performance.now() / 850) * 0.15));

            this.ctx.stroke();


            this.ctx.restore(); 

            this.ctx.font = `72px Audiowide`;
            this.ctx.fillStyle = '#ff00ff'; 
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.shadowBlur = 20;
            this.ctx.fillText('Dancing Between Knives and Bullets', this.canvas.width / 2, this.canvas.height / 2 - 50);
            this.ctx.shadowBlur = 0;

            this.ctx.font = `32px Audiowide`;
            this.ctx.fillStyle = '#00ffff'; 
            const textPulse = Math.sin(performance.now() / 300) * 0.3 + 0.7; 
            this.ctx.globalAlpha = textPulse;
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
            this.ctx.fillText('Click to Start', this.canvas.width / 2, this.canvas.height / 2 + 50);
            this.ctx.globalAlpha = 1.0; 
            this.ctx.shadowBlur = 0;
            return; 
        }


        if (this.musicPlaying && this.gameState === GAME_STATE.PLAYING) {
            const timeIntoBeat = (performance.now() - this.musicStartTime) % this.beatInterval;
            const beatProgress = timeIntoBeat / this.beatInterval; 

            let glowAlpha = 0;
            if (this.isActionOnBeat()) { 
                glowAlpha = 0.5 + Math.sin(beatProgress * Math.PI * 10) * 0.3; 
            } else {
                glowAlpha = Math.sin(beatProgress * Math.PI) * 0.15; 
            }
            
            this.ctx.save();
            this.ctx.globalAlpha = glowAlpha;
            this.ctx.strokeStyle = '#00ffff'; 
            this.ctx.lineWidth = 5;
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 10 + Math.sin(beatProgress * Math.PI) * 10;
            this.ctx.strokeRect(2.5, 2.5, this.canvas.width - 5, this.canvas.height - 5); 
            this.ctx.restore();
        }

        this.level.render(this.ctx);
        // Pass player to droppedWeapons render for proximity effects
        this.droppedWeapons.forEach(dw => dw.render(this.ctx, this.player));

        if (this.player) {
            this.player.render(this.ctx);
        }
        this.enemies.forEach(enemy => enemy.render(this.ctx));

        if (this.gameState === GAME_STATE.PLAYING) {
            this.ctx.font = '24px Audiowide';
            this.ctx.fillStyle = '#00ffff';
            this.ctx.textAlign = 'left';
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 5;
            this.ctx.fillText(`Score: ${this.score}`, 20, 30);
            
            if (this.player && this.player.equippedWeapon) {
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`${this.player.equippedWeapon.name}`, this.canvas.width - 20, 30);
            }
            this.ctx.shadowBlur = 0; 
        }
        
        if (this.gameState === GAME_STATE.GAME_OVER) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.font = '48px Audiowide'; 
            this.ctx.fillStyle = '#ff0000'; 
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#ff0000';
            this.ctx.shadowBlur = 15;
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            
            this.ctx.font = '24px Audiowide';
            this.ctx.fillStyle = '#00ffff'; 
            this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.shadowBlur = 0; 
        } else if (this.gameState === GAME_STATE.LEVEL_COMPLETE) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.font = '48px Audiowide';
            this.ctx.fillStyle = '#00ff00'; 
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#00ff00';
            this.ctx.shadowBlur = 15;
            this.ctx.fillText('LEVEL COMPLETE', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.shadowBlur = 0; 
        }
    }

    gameLoop(timestamp) {
        this.deltaTime = (timestamp - this.lastTime) / 1000; 
        if (this.deltaTime > 0.1) { 
            this.deltaTime = 0.1;
        }
        this.lastTime = timestamp;

        this.update(this.deltaTime);
        this.render();
        
        requestAnimationFrame(this.gameLoop.bind(this)); 
    }

    start() {
        if (this.lastTime === 0) { 
            this.lastTime = performance.now();
            this.gameLoop(this.lastTime);
        }
    }
}

export default Game;