const PLAYER_SIZE = 30; // Adjusted for new sprite
const PLAYER_SPEED = 250; // pixels per second

import { Knife, Bat, GlowStick } from './weapon.js'; // Import weapon classes

class Player {
    constructor(x, y, canvas, playerImage) {
        this.x = x;
        this.y = y;
        this.size = PLAYER_SIZE;
        this.speed = PLAYER_SPEED;
        this.angle = 0; // For aiming with mouse
        this.canvas = canvas; // For boundary checks
        this.playerImage = playerImage; // Loaded image for the player

        this.isAttacking = false;
        this.attackTimer = 0; // Visual duration of attack
        this.attackCooldownTimer = 0; // Time until next attack is possible

        this.equippedWeapon = new Knife(this); // Player starts with a knife

        this.movementState = 'idle';
        this.animationTimer = 0; // Used for continuous animations
    }

    getHitbox() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size
        };
    }
    
    equipWeapon(weaponInstance) {
        // Unequip current? For now, just replace.
        // Player becomes the owner of the new weapon
        weaponInstance.owner = this; 
        this.equippedWeapon = weaponInstance;
        console.log(`Player equipped ${this.equippedWeapon.name}`);
        // Future: Add to inventory, allow switching, drop old weapon, etc.
    }

    update(input, mousePos, deltaTime, walls, game) { 
        // Aiming
        const dxMouse = mousePos.x - this.x;
        const dyMouse = mousePos.y - this.y;
        this.angle = Math.atan2(dyMouse, dxMouse);

        // Movement
        let moveX = 0;
        let moveY = 0;
        if (input.up) moveY -= 1;
        if (input.down) moveY += 1;
        if (input.left) moveX -= 1;
        if (input.right) moveX += 1;

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX = (moveX / length);
            moveY = (moveY / length);
        }
        
        // Set movement state for animation
        if (input.down) {
            this.movementState = 'backward';
        } else if (input.up) {
            this.movementState = 'forward';
        } else if (input.left) {
            this.movementState = 'strafeLeft';
        } else if (input.right) {
            this.movementState = 'strafeRight';
        } else {
            this.movementState = 'idle';
        }
        this.animationTimer += deltaTime;


        const newX = this.x + moveX * this.speed * deltaTime;
        const newY = this.y + moveY * this.speed * deltaTime;

        // Collision with walls
        const playerRect = { x: newX - this.size / 2, y: newY - this.size / 2, width: this.size, height: this.size };
        let canMoveX = true;
        let canMoveY = true;

        // Check X movement collision
        const tempRectX = { ...playerRect, y: this.y - this.size / 2 }; // Check only X movement
        for (const wall of walls) {
            if (this.checkWallCollision(tempRectX, wall)) {
                canMoveX = false;
                break;
            }
        }
        if (canMoveX) this.x = newX;

        // Check Y movement collision
        const tempRectY = { ...playerRect, x: this.x - this.size / 2 }; // Check only Y movement
        for (const wall of walls) {
            if (this.checkWallCollision(tempRectY, wall)) {
                canMoveY = false;
                break;
            }
        }
        if (canMoveY) this.y = newY;


        // Boundary checks for canvas (simple version)
        this.x = Math.max(this.size / 2, Math.min(this.x, this.canvas.width - this.size / 2));
        this.y = Math.max(this.size / 2, Math.min(this.y, this.canvas.height - this.size / 2));

        // Attack logic is now handled by the weapon. Player just signals intent.
        if (input.attack && this.equippedWeapon) {
            this.equippedWeapon.tryAttack(game); // Pass game instance
            // tryAttack will handle cooldown, setting isAttacking, sfx, hit detection etc.
        }
        input.attack = false; // Consume the attack command, whether successful or not

        if (this.isAttacking) {
            this.attackTimer -= deltaTime * 1000;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
        }
    }
    
    checkWallCollision(rect, wall) {
        // Assuming wall is { x, y, width, height }
        return rect.x < wall.x + wall.width &&
               rect.x + rect.width > wall.x &&
               rect.y < wall.y + wall.height &&
               rect.y + rect.height > wall.y;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Base aiming rotation
        ctx.rotate(this.angle);

        // Apply dance-like animations
        let currentAngleOffset = 0; // For spins
        let currentScale = 1;
        let localYOffset = 0;
        let localXOffset = 0; // For moonwalk effect

        switch (this.movementState) {
            case 'idle':
                currentScale = 1 + Math.sin(this.animationTimer * 3) * 0.05; // Breathing effect
                break;
            case 'forward':
                localYOffset = Math.sin(this.animationTimer * 12) * 2; // Bobbing effect
                break;
            case 'backward': // Moonwalk
                // Player moves backward, sprite "slides" by appearing to step forward against movement
                localXOffset = Math.sin(this.animationTimer * 20) * 3; // Local X shuffle for slide effect
                break;
            case 'strafeLeft':
                currentAngleOffset = this.animationTimer * Math.PI * 2.5; // Continuous spin left (2.5 rotations per second)
                break;
            case 'strafeRight':
                currentAngleOffset = -this.animationTimer * Math.PI * 2.5; // Continuous spin right
                break;
        }
        
        ctx.rotate(currentAngleOffset); // Apply additional spin for strafing
        ctx.scale(currentScale, currentScale); // Apply scaling for idle

        if (this.playerImage && this.playerImage.complete && this.playerImage.naturalWidth > 0) {
            const imgWidth = PLAYER_SIZE * 1.2; // Make sprite slightly larger than hitbox for visual presence
            const imgHeight = PLAYER_SIZE * 1.2;
             // Apply local offsets before drawing. Translate in sprite's local space.
            ctx.drawImage(this.playerImage, -imgWidth / 2 + localXOffset, -imgHeight / 2 + localYOffset, imgWidth, imgHeight);
        } else {
            // Fallback to old triangle if image not loaded (should not happen with preloading)
            ctx.fillStyle = '#00ffff'; 
            ctx.shadowColor = '#00ffff'; 
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(this.size / 2, 0);
            ctx.lineTo(-this.size / 2, -this.size / 3);
            ctx.lineTo(-this.size / 2, this.size / 3);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        ctx.restore(); // Restores to state before player translation and rotation

        // Render attack visual using the equipped weapon's method
        if (this.isAttacking && this.equippedWeapon) {
            this.equippedWeapon.renderAttack(ctx);
        }
    }
}

export default Player;