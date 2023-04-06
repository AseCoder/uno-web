const io = require("../server");
const game = require("./common");

/**
 * Ends the game. Removes players, sets state to 0, announces winner and tells people to refresh.
 * @param {string} winner The name of the winner
 * @returns {void}
 */
function endGame(winner) {
	io.emit('game-info', game.generateGameInfo());
	game.players.reset();
	game.state.set(0);
	game.resetStopEverythingListeners();
	game.acceptingPlays = true;
	game.direction.reset();
	io.emit('end-game', winner);
}
module.exports = endGame;