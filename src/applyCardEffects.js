const game = require('./common');
/**
 * Applies the effects of a card by sending messages to people
 * @param {CardEffects} effects
 * @param {number} effects.thisDraws How many cards this player should draw
 * @param {httpServer} io The socket.io server
 * @param {boolean} beginning If this card turned up at the beginning of play (effects only on current player)
 * @returns {void}
 */
function applyCardEffects(effects, io, beginning) { return new Promise(async (res, rej) => {
	const thisPlayer = game.players.currentTurn();
	const thisSocket = io.of('/').sockets.get(thisPlayer.socketId);
	if (effects.thisDraws > 0) {
		const drawnCards = [];
		for (let i = 0; i < effects.thisDraws; i++) {
			drawnCards.push(game.randomCard());
		}
		thisSocket.emit('your-hand', thisPlayer.addCards(drawnCards));
	}
	if (effects.changeDirection) {
		if (game.players.data.length > 2) game.direction.reverse(); else game.direction.skipNext += 1;
	}
	if (effects.nextDraws > 0) {
		const drawnCards = [];
		for (let i = 0; i < effects.nextDraws; i++) {
			drawnCards.push(game.randomCard());
		}
		if (beginning) thisSocket.emit('your-hand', thisPlayer.addCards(drawnCards));
		else {
			const nextplayer = game.players.data[game.turnIndex.getNext()];
			io.of('/').sockets.get(nextplayer.socketId).emit('your-hand', nextplayer.addCards(drawnCards));
		}
	}
	if (effects.chooseColor) {
		const p1 = new Promise(res1 => {
				thisSocket.once('chosen-color', color => {
					console.log(`${thisSocket.id} chose color ${color}`);
					game.discardPileTopCard.setColor(color);
					res1();
				});
				thisSocket.emit('choose-color');
		});
		const p2 = new Promise((res2, rej2) => setTimeout(rej2, 60 * 1000));
		try {
			await Promise.race([p1, p2]);
		} catch (error) {
			thisSocket.removeAllListeners('chosen-color');
			game.discardPileTopCard.setColor(['red', 'green', 'blue', 'yellow'][Math.floor(Math.random() * 4)]);
		}
	}
	if (effects.skipNext > 0) {
		game.direction.skipNext += effects.skipNext;
	}
	if (beginning && (effects.skipNext > 0 || effects.changeDirection) || effects.nextDraws > 0) game.turnIndex.setNext();
	res();
})}
module.exports = applyCardEffects;