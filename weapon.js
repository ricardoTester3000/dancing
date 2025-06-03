import { playSound } from './audio.js';

export const WeaponType = {
    MELEE: 'melee',
    RANGED: 'ranged' // For future use
};

const ATTACK_VISUAL_DURATION = 150; // ms, how long the attack visual stays

export class Weapon {
    constructor(name, type, damage, range, cooldown, attackSfxKey, owner) {
        this.name = name;
        this.type = type;
        this.damage = damage;
        this.range = range; // Used by subclasses for hitbox calculation
        this.cooldown = cooldown; // ms
        this.attackSfxKey = attackSfxKey;
        this.owner = owner; // The player or entity wielding it, needed for position, angle
    }

    // Called when player initiates an attack
    // game is the main game instance
    tryAttack(game) {
        if (this.owner.attackCooldownTimer > 0) return false;

        this.owner.isAttacking = true;
        this.owner.attackTimer = ATTACK_VISUAL_DURATION; // Visual duration
        this.owner.attackCooldownTimer = this.cooldown;

        const onBeat = game.isActionOnBeat();
        let currentDamage = this.damage;
        let scoreForHit = 10; // Base score for a hit

        if (onBeat) {
            currentDamage *= 1.5; // Damage bonus
            scoreForHit += 20; // Score bonus for on-beat hit
            // console.log("ON BEAT ATTACK!");
        }

        if (this.attackSfxKey && game.sounds[this.attackSfxKey]) {
            playSound(game.sounds[this.attackSfxKey], false, 0.7);
        }
        
        const attackHitbox = this.getAttackHitbox();
        let hitSomeone = false;

        game.enemies.forEach(enemy => {
            if (!enemy.isDead && game.checkCollision(attackHitbox, enemy.getHitbox())) {
                enemy.takeDamage(currentDamage); // Pass damage, though it just sets isDead for now
                game.addScore(100 + (onBeat ? 50 : 0)); // Kill score + on-beat bonus
                
                // Hit SFX is played by game.js if enemy takes damage
                // Enemy death SFX is played by game.js when enemy is confirmed dead
                hitSomeone = true;
            }
        });
        
        if (hitSomeone && game.sounds.hitSfx) { // Play general hit sfx if any enemy was hit
             playSound(game.sounds.hitSfx, false, 0.7);
        }


        return true; // Attack performed (or attempted)
    }

    getAttackHitbox() {
        // Abstract: must be implemented by subclasses
        // Should return an object like {x, y, width, height} or more complex shape
        throw new Error("getAttackHitbox() not implemented");
    }

    renderAttack(ctx) {
        // Abstract: must be implemented by subclasses
        throw new Error("renderAttack() not implemented");
    }
}

export class Knife extends Weapon {
    constructor(owner) {
        super('Knife', WeaponType.MELEE, 10, 35, 300, null, owner); // Knife uses player's default attack sfx, or none explicitly
        this.attackWidth = 30; // Width of the knife slash
    }

    getAttackHitbox() {
        // Reusing player's original attack hitbox logic for knife for consistency
        const player = this.owner;
        const attackRange = this.range;
        const attackWidth = this.attackWidth;

        const dx = Math.cos(player.angle);
        const dy = Math.sin(player.angle);

        const hitboxStartX = player.x + dx * (player.size / 2);
        const hitboxStartY = player.y + dy * (player.size / 2);
        const hitboxEndX = player.x + dx * (player.size / 2 + attackRange);
        const hitboxEndY = player.y + dy * (player.size / 2 + attackRange);

        const px = -dy; // Perpendicular vector
        const py = dx;

        const c1x = hitboxStartX - px * attackWidth / 2;
        const c1y = hitboxStartY - py * attackWidth / 2;
        const c2x = hitboxEndX - px * attackWidth / 2;
        const c2y = hitboxEndY - py * attackWidth / 2;
        const c3x = hitboxEndX + px * attackWidth / 2;
        const c3y = hitboxEndY + py * attackWidth / 2;
        const c4x = hitboxStartX + px * attackWidth / 2;
        const c4y = hitboxStartY + py * attackWidth / 2;
        
        const minX = Math.min(c1x, c2x, c3x, c4x);
        const minY = Math.min(c1y, c2y, c3y, c4y);
        const maxX = Math.max(c1x, c2x, c3x, c4x);
        const maxY = Math.max(c1y, c2y, c3y, c4y);

        return {
            x: minX, y: minY, width: maxX - minX, height: maxY - minY,
            // For debugging oriented hitbox:
            // corners: [{x:c1x,y:c1y},{x:c2x,y:c2y},{x:c3x,y:c3y},{x:c4x,y:c4y}]
        };
    }

    renderAttack(ctx) {
        const player = this.owner;
        ctx.save();
        ctx.strokeStyle = '#ffffff'; // White attack slash
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;

        const startX = player.x + Math.cos(player.angle) * (player.size * 0.6);
        const startY = player.y + Math.sin(player.angle) * (player.size * 0.6);
        const endX = player.x + Math.cos(player.angle) * (player.size / 2 + this.range);
        const endY = player.y + Math.sin(player.angle) * (player.size / 2 + this.range);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Simple line for knife, could be arced
        ctx.lineTo(endX, endY); 
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

export class Bat extends Weapon {
    constructor(owner) {
        super('Bat', WeaponType.MELEE, 20, 50, 500, 'batSwingSfx', owner);
        this.sweepAngle = Math.PI / 2; // 90 degree sweep
    }

    getAttackHitbox() {
        // Bat has a wider, arcing hitbox
        const player = this.owner;
        const attackRange = this.range;
        
        // A simplified AABB for the sweep area
        // The sweep extends from -sweepAngle/2 to +sweepAngle/2 relative to player angle
        const angleStart = player.angle - this.sweepAngle / 2;
        const angleEnd = player.angle + this.sweepAngle / 2;

        const points = [
            { x: player.x, y: player.y }, // Player center
            // Points at max range for the sweep
            { x: player.x + Math.cos(angleStart) * attackRange, y: player.y + Math.sin(angleStart) * attackRange },
            { x: player.x + Math.cos(player.angle) * attackRange, y: player.y + Math.sin(player.angle) * attackRange }, // Mid point
            { x: player.x + Math.cos(angleEnd) * attackRange, y: player.y + Math.sin(angleEnd) * attackRange },
        ];

        // Also include points closer to the player to make the AABB more accurate for the arc
        const innerRange = attackRange * 0.3; // Example inner radius of sweep
        points.push({ x: player.x + Math.cos(angleStart) * innerRange, y: player.y + Math.sin(angleStart) * innerRange });
        points.push({ x: player.x + Math.cos(angleEnd) * innerRange, y: player.y + Math.sin(angleEnd) * innerRange });


        const minX = Math.min(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxX = Math.max(...points.map(p => p.x));
        const maxY = Math.max(...points.map(p => p.y));
        
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, type: 'arc', points: points }; // points for debug rendering
    }

    renderAttack(ctx) {
        const player = this.owner;
        ctx.save();
        ctx.strokeStyle = '#ff00ff'; // Magenta for bat swing
        ctx.lineWidth = 5;
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 12;

        const startAngle = player.angle - this.sweepAngle / 3; // Visual sweep can be slightly different
        const endAngle = player.angle + this.sweepAngle / 3;

        ctx.beginPath();
        ctx.arc(player.x, player.y, this.range * 0.8, startAngle, endAngle); // Draw an arc
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

export class GlowStick extends Weapon {
    constructor(owner) {
        // Low damage, fast cooldown, short range. No specific sound, uses default hit sound.
        super('GlowStick', WeaponType.MELEE, 5, 30, 200, null, owner); 
        this.attackWidth = 20; // Width of the glow stick swing/slash
    }

    getAttackHitbox() {
        // Similar to Knife's linear attack hitbox, but maybe slightly shorter/wider
        const player = this.owner;
        const attackRange = this.range;
        const attackWidth = this.attackWidth;

        const dx = Math.cos(player.angle);
        const dy = Math.sin(player.angle);

        // Center of the attack area in front of the player
        const hitboxCenterX = player.x + dx * (player.size / 2 + attackRange / 2);
        const hitboxCenterY = player.y + dy * (player.size / 2 + attackRange / 2);
        
        // AABB for a line directly in front of player
        // For simplicity, let's make it a rectangle centered on the attack direction
        const halfWidth = attackWidth / 2;
        const halfRange = attackRange / 2;

        // Create a rectangle and then find its AABB if it were rotated (simplified)
        // This is an approximation. For a true oriented rectangle, we'd need more complex collision.
        // For now, a simple rectangle aligned with player's front.
        const x1 = hitboxCenterX - Math.abs(dx * halfRange) - Math.abs(dy * halfWidth);
        const y1 = hitboxCenterY - Math.abs(dy * halfRange) - Math.abs(dx * halfWidth);
        const x2 = hitboxCenterX + Math.abs(dx * halfRange) + Math.abs(dy * halfWidth);
        const y2 = hitboxCenterY + Math.abs(dy * halfRange) + Math.abs(dx * halfWidth);
        
        return {
            x: Math.min(x1,x2), 
            y: Math.min(y1,y2), 
            width: Math.abs(x2-x1), 
            height: Math.abs(y2-y1)
        };
    }

    renderAttack(ctx) {
        const player = this.owner;
        ctx.save();
        ctx.strokeStyle = '#00ff00'; // Bright Green for glow stick
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 15;

        const startX = player.x + Math.cos(player.angle) * (player.size * 0.5);
        const startY = player.y + Math.sin(player.angle) * (player.size * 0.5);
        const endX = player.x + Math.cos(player.angle) * (player.size / 2 + this.range);
        const endY = player.y + Math.sin(player.angle) * (player.size / 2 + this.range);
        
        // Add a slight arc or flourish to the glow stick swing
        const controlX = player.x + Math.cos(player.angle + Math.PI / 8) * (player.size / 2 + this.range * 0.7);
        const controlY = player.y + Math.sin(player.angle + Math.PI / 8) * (player.size / 2 + this.range * 0.7);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}