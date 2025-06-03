const TILE_SIZE = 40;

// Level tile types
const TILE = {
    FLOOR: 0,
    WALL_STANDARD: 1, // Nightclub wall
    WALL_RED: 2,      // Red hallway wall
    WALL_MIRROR: 3,   // Mirror hall wall
    DEBRIS: 4         // Destroyed dressing room clutter
};

class Level {
    constructor(canvas) {
        this.canvas = canvas;
        this.tileSize = TILE_SIZE;
        this.grid = [ // Example layout
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 0, 0, 3, 1],
            [1, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 3, 0, 0, 3, 1],
            [1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 3, 3, 3, 3, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 4, 0, 1],
            [1, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 4, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 1, 4, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 0, 4, 0, 1],
            [1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 4, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1, 0, 4, 4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 4, 0, 4, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ];
        this.tiles = this.getWallRects(); // For collision
    }

    getWallRects() {
        const wallRects = [];
        for (let row = 0; row < this.grid.length; row++) {
            for (let col = 0; col < this.grid[row].length; col++) {
                if (this.grid[row][col] !== TILE.FLOOR) { // Any non-floor tile is a wall/obstacle
                    wallRects.push({
                        x: col * this.tileSize,
                        y: row * this.tileSize,
                        width: this.tileSize,
                        height: this.tileSize,
                        type: this.grid[row][col]
                    });
                }
            }
        }
        return wallRects;
    }
    
    isWall(worldX, worldY) {
        const col = Math.floor(worldX / this.tileSize);
        const row = Math.floor(worldY / this.tileSize);
        if (row >= 0 && row < this.grid.length && col >= 0 && col < this.grid[row].length) {
            return this.grid[row][col] !== TILE.FLOOR;
        }
        return true; // Out of bounds is considered a wall
    }

    render(ctx) {
        for (let row = 0; row < this.grid.length; row++) {
            for (let col = 0; col < this.grid[row].length; col++) {
                const tileX = col * this.tileSize;
                const tileY = row * this.tileSize;
                const tileType = this.grid[row][col];

                // Default floor for all tiles first (dark grey)
                ctx.fillStyle = '#1a1a1a'; // Darker floor for nightclubs
                ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);

                let wallColor = null;
                let shadowColor = null;

                switch (tileType) {
                    case TILE.WALL_STANDARD: // Nightclub Neon Wall
                        wallColor = '#0d0d25'; // Dark blue/purple base
                        shadowColor = '#3030ff'; // Blue neon glow
                        ctx.fillStyle = wallColor;
                        ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);
                        ctx.strokeStyle = shadowColor;
                        ctx.lineWidth = 2;
                        ctx.shadowColor = shadowColor;
                        ctx.shadowBlur = 10;
                        ctx.strokeRect(tileX + 1, tileY + 1, this.tileSize - 2, this.tileSize - 2);
                        ctx.shadowBlur = 0; // Reset shadow
                        break;
                    case TILE.WALL_RED: // Red Hallway Wall
                        wallColor = '#550000'; // Dark red base
                        shadowColor = '#ff0000'; // Red neon glow
                        ctx.fillStyle = wallColor;
                        ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);
                        ctx.strokeStyle = shadowColor;
                        ctx.lineWidth = 2;
                        ctx.shadowColor = shadowColor;
                        ctx.shadowBlur = 10;
                        ctx.strokeRect(tileX + 1, tileY + 1, this.tileSize - 2, this.tileSize - 2);
                        ctx.shadowBlur = 0;
                        break;
                    case TILE.WALL_MIRROR: // Mirror Hall Wall
                        wallColor = '#a0dde0'; // Light cyan/silver base for mirror
                        shadowColor = '#ccffff'; // White/bright cyan glow
                        ctx.fillStyle = wallColor;
                        ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);
                        // Add some reflective lines
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.lineWidth = 1;
                        ctx.shadowColor = shadowColor;
                        ctx.shadowBlur = 8;
                        for(let i=0; i < 3; i++) {
                            ctx.beginPath();
                            ctx.moveTo(tileX + Math.random()*this.tileSize, tileY);
                            ctx.lineTo(tileX + Math.random()*this.tileSize, tileY + this.tileSize);
                            ctx.stroke();
                        }
                        ctx.shadowBlur = 0;
                        break;
                    case TILE.DEBRIS: // Destroyed Dressing Room Clutter
                        ctx.fillStyle = '#404040'; // Dark grey for debris
                        ctx.fillRect(tileX + this.tileSize * 0.2, tileY + this.tileSize * 0.2, this.tileSize * 0.6, this.tileSize * 0.6);
                        // Could add more varied debris shapes
                        ctx.fillStyle = '#503020'; // Brownish
                         ctx.fillRect(tileX + this.tileSize * Math.random()*0.3, tileY + this.tileSize * Math.random()*0.3, this.tileSize * 0.4, this.tileSize * 0.4);
                        break;
                    case TILE.FLOOR:
                        // Floor is already drawn, but can add details
                        // For example, nightclub floor might have subtle patterns
                        if (Math.random() < 0.01) { // Sparsely add some "glint"
                            ctx.fillStyle = 'rgba(200, 200, 255, 0.05)';
                            ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);
                        }
                        break;
                }
            }
        }
    }
}

export default Level;

