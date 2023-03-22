const game = require("./common");
function endGame(io, winner) {
	io.of('/').emit('game-info', game.generateGameInfo());
	game.players.reset();
	game.state.set(0);
	io.of('/').emit('end-game', winner);
}
module.exports = endGame;