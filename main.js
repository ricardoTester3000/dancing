import Game from './game.js';

<script src="utils.js"></script>
  <script src="player.js"></script>
  <script src="enemy.js"></script>
  <script src="level.js"></script>
  <script src="game.js"></script>
  <script src="main.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions (adjust as needed)
    canvas.width = 800;
    canvas.height = 600;

    const game = new Game(canvas, ctx);
    // game.start(); // Start is now called internally after assets are loaded.
});
