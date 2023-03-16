const game = require('./common');
const parseCard = require('./parseCard');
const checkPlayLegality = require('./checkPlayLegality');
module.exports = function gameStart(io) {
	if (game.state.data !== 0) return console.log('wrong game state for game start');
	game.state.set(1);
	game.players.set(game.players.data.filter(player => player.socketId));

	game.turnIndex.set(0);
	game.discardPileTopCard.set(parseCard(game.randomCard(true)));
	checkPlayLegality(game.discardPileTopCard.data);
	io.of('/').emit('game-info', game.generateGameInfo());
	game.players.data.forEach((player, i) => {
		// pick 7 random cards
		const hand = [];
		for (let i = 0; i < 7; i++) {
			hand.push(game.randomCard());
		}
		player.hand = hand;
		const socket = io.of('/').sockets.get(player.socketId);
		socket.emit('your-hand', hand);
		if (i === game.turnIndex.data) socket.emit('your-turn');
	});
}