import Game from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions (adjust as needed)
    canvas.width = 800;
    canvas.height = 600;

    const game = new Game(canvas, ctx);
    // game.start(); // Start is now called internally after assets are loaded.
});
