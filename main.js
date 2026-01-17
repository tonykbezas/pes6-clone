import Game from './Game.js';

// Alert to confirm file update (can be removed later)
console.log("Main.js loaded successfully");

const game = new Game("renderCanvas");
game.start();
