const game = require('./common');
const parseCard = require('./parseCard');
const checkPlayLegality = require('./checkPlayLegality');
const applyCardEffects = require('./applyCardEffects');
const io = require('../server');
const nextTurn = require('./nextTurn');

/**
 * Starts the game
 * @returns {void}
 */
async function gameStart() {
	if (game.state.data !== 0) return console.log('wrong game state for game start');
	if (game.players.data.length < 1) return console.log('not enough players');
	game.state.set(1);
	game.players.set(game.players.data.filter(player => player.socketId));
	game.turnIndex.reset();
	
	game.players.data.forEach((player, i) => {
		// pick 7 random cards
		const hand = [];
		for (let j = 0; j < 7; j++) {
			hand.push(game.randomCard());
		}
		player.hand = hand;
		player.socket?.emit('your-hand', player.parseHand());
	});
	game.discardPileTopCard.set(parseCard(game.randomCard(true)));
	const result = checkPlayLegality(game.discardPileTopCard.data);
	io.emit('game-info', game.generateGameInfo({ players: true, discardPileTopCard: true }));
	await new Promise((res) => setTimeout(res, 2000));
	console.log('started discard effects');
	await applyCardEffects(result.effects, { beginning: true });
	console.log('ended discard effects');
	nextTurn(false, true);
}
module.exports = gameStart;