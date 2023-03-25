const game = require('./common');
const parseCard = require('./parseCard');
const checkPlayLegality = require('./checkPlayLegality');
const applyCardEffects = require('./applyCardEffects');
const gameLoop = require('./gameLoop');
const io = require('../server');

/**
 * Starts the game
 * @returns {void}
 */
async function gameStart() {
	if (game.state.data !== 0) return console.log('wrong game state for game start');
	if (game.players.data.length < 1) return console.log('not enough players');
	game.state.set(1);
	game.players.set(game.players.data.filter(player => player.socketId));
	game.turnIndex.set(0);
	
	game.players.data.forEach((player, i) => {
		// pick 7 random cards
		const hand = [];
		for (let i = 0; i < 7; i++) {
			hand.push(game.randomCard());
		}
		player.hand = hand;
		player.socket?.emit('your-hand', hand);
	});
	game.discardPileTopCard.set(parseCard(game.randomCard(true)));
	const result = checkPlayLegality([game.discardPileTopCard.data]);
	io.emit('game-info', game.generateGameInfo());
	await new Promise((res) => setTimeout(res, 2000));
	await applyCardEffects(result.effects, true);
	io.emit('game-info', game.generateGameInfo({ players: true }));
	gameLoop();
}
module.exports = gameStart;