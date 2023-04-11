const io = require('../server');
const game = require('./common');

/**
 * Applies the effects of a card by sending messages to people
 * @param {CardEffects} effects
 * @param {number} effects.thisDraws How many cards this player should draw
 * @param {object} [options={}] Options for special cases
 * @param {boolean} options.beginning If this card turned up at the beginning of play (effects only on current player)
 * @param {boolean} options.jumpedIn If these cards were played as someone jumped in
 * @returns {void}
 */
function applyCardEffects(effects, options = {}) { return new Promise(async (res, rej) => {
	const { beginning, jumpedIn } = options;
	const currentPlayer = game.players.currentTurn;
	// effects should be applied on the current player if jumpedIn NAND houserules.jumpInMattel
	const allowCurrentplayerEffects = !(jumpedIn && game.houseRules.jumpInMattel);
	if (effects.thisDraws > 0 && allowCurrentplayerEffects) {
		const drawnCards = [];
		for (let i = 0; i < effects.thisDraws; i++) {
			drawnCards.push(game.randomCard());
		}
		currentPlayer.addCards(drawnCards);
	}
	if (effects.changeDirection && allowCurrentplayerEffects) {
		if (game.players.data.length > 2) game.direction.reverse(); else game.direction.skipNext += 1;
	}
	if (effects.nextDraws > 0) {
		if (jumpedIn && game.houseRules.jumpInMattel) {
			if (game.proactivePenalties) {
				game.outstandingDrawPenalty -= effects.nextDraws;
			}
		} else {
			if (game.proactivePenalties) {
				game.outstandingDrawPenalty += effects.nextDraws;
			} else {
				const drawnCards = [];
				for (let i = 0; i < effects.nextDraws; i++) {
					drawnCards.push(game.randomCard());
				}
				if (beginning) {
					currentPlayer.addCards(drawnCards);
				} else {
					const nextplayer = game.players.data[game.turnIndex.getNext()];
					nextplayer.addCards(drawnCards);
					nextplayer.socket?.emit('your-hand', nextplayer.parseHand());
				}
			}
		}
	}
	if ((effects.thisDraws > 0 || effects.nextDraws > 0 && beginning) && allowCurrentplayerEffects) currentPlayer.socket?.emit('your-hand', currentPlayer.parseHand());
	if (effects.chooseColor) {
		let removeColorEmitter = () => {};
		game.acceptingPlays = false;
		if (!beginning) io.emit('game-info', game.generateGameInfo({ players: true, discardPileTopCard: true, lastPlayed: true, outstandingDrawPenalty: true }));
		const p1 = new Promise((res1, rej1) => {
			currentPlayer.once('chosen-color', color => {
				if (!['red', 'green', 'blue', 'yellow'].includes(color)) return rej2();
				game.discardPileTopCard.setColor(color);
				res1();
			});
			removeColorEmitter = currentPlayer.persistentEmit('choose-color');
			game.addStopEverythingListener(() => rej1({}));
		});
		const p2 = new Promise((res2, rej2) => setTimeout(rej2, 30 * 1000));
		try {
			await Promise.race([p1, p2]);
		} catch (error) {
			game.discardPileTopCard.setColor(['red', 'green', 'blue', 'yellow'][Math.floor(Math.random() * 4)]);
		}
		currentPlayer.removeAllListeners('chosen-color');
		removeColorEmitter();
		game.acceptingPlays = true;
	}
	if (effects.skipNext > 0 && allowCurrentplayerEffects) {
		game.direction.skipNext += effects.skipNext;
	}
	// this could be easier to understand
	if (beginning && allowCurrentplayerEffects && (effects.skipNext > 0 || effects.changeDirection) || (effects.nextDraws > 0 && !game.proactivePenalties)) game.turnIndex.setNext();
	res();
})}
module.exports = applyCardEffects;