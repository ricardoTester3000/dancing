const ENEMY_SIZE = 30; // Default size, can be overridden by type
const ENEMY_SPEED = 100; // Slower than player
const SIGHT_RANGE = 200;
// const ATTACK_RANGE = 25; // If enemies can attack

export const EnemyType = {
    SECURITY_GUARD: 'security_guard',
    RIOT_POLICE: 'riot_police',
    // Add more types as needed
};

class Enemy {
    constructor(x, y, walls, type = EnemyType.SECURITY_GUARD, weapon = null, image = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.image = image; // Preloaded image for this enemy type
        this.walls = walls;
        this.angle = Math.random() * Math.PI * 2;
        this.weaponToDrop = weapon; // e.g. new Bat(null) - null owner initially
        this.isDead = false;

        // Type-specific properties
        switch (this.type) {
            case EnemyType.RIOT_POLICE:
                this.size = 35;
                this.speed = ENEMY_SPEED * 0.8; // Slower
                this.color = '#4444ff'; // Blueish accent for fallback
                this.health = 3; // Takes more hits
                break;
            case EnemyType.SECURITY_GUARD:
            default:
                this.size = 30;
                this.speed = ENEMY_SPEED;
                this.color = '#cccccc'; // Greyish accent for fallback
                this.health = 1;
                break;
        }
    }

    getHitbox() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size
        };
    }

    takeDamage(amount = 1) {
        this.health -= amount;
        if (this.health <= 0 && !this.isDead) {
            this.isDead = true;
        }
    }

    update(player, deltaTime, walls) {
        if (this.isDead) return;

        const dxPlayer = player.x - this.x;
        const dyPlayer = player.y - this.y;
        const distanceToPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);

        let moveX = 0;
        let moveY = 0;

        if (distanceToPlayer < SIGHT_RANGE) {
            this.angle = Math.atan2(dyPlayer, dxPlayer);
            moveX = Math.cos(this.angle);
            moveY = Math.sin(this.angle);
        } else {
            // Basic patrol: slowly rotate (optional)
            // this.angle += 0.5 * deltaTime; 
        }
        
        const newX = this.x + moveX * this.speed * deltaTime;
        const newY = this.y + moveY * this.speed * deltaTime;

        const enemyRect = { x: newX - this.size / 2, y: newY - this.size / 2, width: this.size, height: this.size };
        let canMoveX = true;
        let canMoveY = true;

        const tempRectX = { ...enemyRect, y: this.y - this.size / 2 };
        for (const wall of walls) {
            if (this.checkWallCollision(tempRectX, wall)) {
                canMoveX = false;
                break;
            }
        }
        if (canMoveX) this.x = newX;
        else this.angle += Math.PI / (Math.random() > 0.5 ? 4 : -4) * (Math.random() * 0.5 + 0.5) ; // Turn if hit wall


        const tempRectY = { ...enemyRect, x: this.x - this.size / 2 };
         for (const wall of walls) {
            if (this.checkWallCollision(tempRectY, wall)) {
                canMoveY = false;
                break;
            }
        }
        if (canMoveY) this.y = newY;
        else this.angle += Math.PI / (Math.random() > 0.5 ? 4 : -4) * (Math.random() * 0.5 + 0.5); // Turn if hit wall

        this.x = Math.max(this.size / 2, Math.min(this.x, player.canvas.width - this.size / 2));
        this.y = Math.max(this.size / 2, Math.min(this.y, player.canvas.height - this.size / 2));
    }
    
    checkWallCollision(rect, wall) {
        return rect.x < wall.x + wall.width &&
               rect.x + rect.width > wall.x &&
               rect.y < wall.y + wall.height &&
               rect.y + rect.height > wall.y;
    }

    render(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2); // Rotate to align sprite top with facing direction

        if (this.image && this.image.complete && this.image.naturalWidth > 0) {
            const imgSize = this.size * 1.2; // Make sprite slightly larger for visual presence
            ctx.drawImage(this.image, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
        } else {
            // Fallback rendering if image not loaded
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
}

export default Enemy;