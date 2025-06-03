const PICKUP_RANGE = 20; // How close player needs to be to auto-pickup

export class DroppedWeapon {
    constructor(x, y, weaponInstance, image) {
        this.x = x;
        this.y = y;
        this.weapon = weaponInstance; // This is the actual Weapon object (e.g., new Bat(null))
        this.image = image; // The Image object for rendering
        this.size = 30; // Hitbox size for pickup
    }

    getHitbox() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size
        };
    }
    
    isPlayerClose(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx*dx + dy*dy) < (player.size/2 + this.size/2 + PICKUP_RANGE);
    }

    render(ctx, player) { // Added player argument for proximity effects
        if (this.image && this.image.complete && this.image.naturalWidth > 0) {
            ctx.save();
            ctx.translate(this.x, this.y); // Translate to weapon's position
            
            let baseAlpha = 1.0;
            let shadowColor = '#b08000'; // Dim, less saturated yellow for default
            let shadowBlurAmount = 5;    // Subtle default glow
            let iconScale = 1.0;
            const currentTime = performance.now();

            if (player && this.isPlayerClose(player)) {
                 // Enhance glow and pulse when player is close
                shadowColor = '#ffff00'; // Bright yellow glow
                shadowBlurAmount = 10 + Math.sin(currentTime / 150) * 5; // Pulsing blur
                iconScale = 1.0 + Math.sin(currentTime / 200) * 0.05; // Slight pulsing scale
                baseAlpha = 0.85 + Math.sin(currentTime / 200) * 0.15; // Pulsing alpha
            } else {
                // Default subtle, constant appearance
                iconScale = 1.0;
                baseAlpha = 0.9; // Slightly transparent to blend a bit
                shadowBlurAmount = 5; 
            }
            
            ctx.globalAlpha = baseAlpha;
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlurAmount;
            
            ctx.scale(iconScale, iconScale);
            // Ensure image is drawn centered if its own origin isn't 0,0
            // Assuming image width/height are the intended display size
            ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
            
            ctx.restore(); // Restores globalAlpha, shadowColor, shadowBlur, and transform
        } else {
            // Fallback rendering if image not loaded
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(-10, -10, 20, 20); // A 20x20 yellow square centered
            
            ctx.fillStyle = 'black'; // Text color
            ctx.font = '10px Audiowide'; 
            ctx.textAlign = 'center';    
            ctx.textBaseline = 'middle'; 
            // Display first 3 chars of weapon name, e.g., "Bat", "Glo"
            ctx.fillText(this.weapon.name.substring(0,3).toUpperCase(), 0, 0); 
            ctx.restore();
        }
    }
}