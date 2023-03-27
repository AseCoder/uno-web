const io = require('../server');
const game = require('./common');

/**
 * Applies the effects of a card by sending messages to people
 * @param {CardEffects} effects
 * @param {number} effects.thisDraws How many cards this player should draw
 * @param {boolean} beginning If this card turned up at the beginning of play (effects only on current player)
 * @returns {void}
 */
function applyCardEffects(effects, beginning) { return new Promise(async (res, rej) => {
	const currentPlayer = game.players.currentTurn;
	if (effects.thisDraws > 0) {
		const drawnCards = [];
		for (let i = 0; i < effects.thisDraws; i++) {
			drawnCards.push(game.randomCard());
		}
		currentPlayer.addCards(drawnCards);
	}
	if (effects.changeDirection) {
		if (game.players.data.length > 2) game.direction.reverse(); else game.direction.skipNext += 1;
	}
	if (effects.nextDraws > 0) {
		const drawnCards = [];
		for (let i = 0; i < effects.nextDraws; i++) {
			drawnCards.push(game.randomCard());
		}
		if (beginning) {
			currentPlayer.addCards(drawnCards);
		} else {
			const nextplayer = game.players.data[game.turnIndex.getNext()];
			const hand = nextplayer.addCards(drawnCards);
			nextplayer.socket?.emit('your-hand', hand);
		}
	}
	if (effects.thisDraws > 0 || (effects.nextDraws > 0 && beginning)) currentPlayer.socket?.emit('your-hand', currentPlayer.hand);
	if (effects.chooseColor) {
		let removeColorEmitter = () => {};
		if (!beginning) io.emit('game-info', game.generateGameInfo({ players: true, discardPileTopCard: true }));
		const p1 = new Promise(res1 => {
			currentPlayer.once('chosen-color', color => {
				console.log(`"${currentPlayer.name}" chose to play color ${color}`);
				game.discardPileTopCard.setColor(color);
				res1();
			});
			removeColorEmitter = currentPlayer.persistentEmit('choose-color');
		});
		const p2 = new Promise((res2, rej2) => setTimeout(rej2, 30 * 1000));
		try {
			await Promise.race([p1, p2]);
		} catch (error) {
			game.discardPileTopCard.setColor(['red', 'green', 'blue', 'yellow'][Math.floor(Math.random() * 4)]);
		}
		currentPlayer.removeAllListeners('chosen-color');
		removeColorEmitter();
		io.emit('game-info', game.generateGameInfo({ discardPileTopCard: true }));
	}
	if (effects.skipNext > 0) {
		game.direction.skipNext += effects.skipNext;
	}
	if (beginning && (effects.skipNext > 0 || effects.changeDirection) || effects.nextDraws > 0) game.turnIndex.setNext();
	res();
})}
module.exports = applyCardEffects;