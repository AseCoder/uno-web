const io = require("../server");
const game = require("./common");
const endGame = require("./endGame");

/**
 * Removes a player from the game
 * @param {number} index The index of the player to be removed, in the [game.players.data]{@linkcode game.players.data} array
 */
function kickPlayer(index) {
	// take note of next to play
	const nextPlayer = game.players.data[game.turnIndex.getNext()];
	// handle the player to be deleted
	const currentPlayer = game.players.data[index];
	currentPlayer?.removeAllListeners();
	if (currentPlayer?.socketId) io.sockets.sockets.get(currentPlayer.socketId).disconnect();
	console.log('kicked a player');
	// kick
	game.players.splice(index, 1);
	// check if game has to end
	if (game.players.data.length === 0) return endGame();
	// get index of nextplayer
	const nextIndex = game.players.data.findIndex(x => x.socketId === nextPlayer.socketId || x.name === nextPlayer.name);
	// set turn
	game.turnIndex.set(nextIndex);
}
module.exports = kickPlayer;