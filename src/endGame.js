const game = require("./common");
function endGame(io, winner) {
	io.emit('game-info', game.generateGameInfo());
	game.players.reset();
	game.state.set(0);
	io.emit('end-game', winner);
}
module.exports = endGame;