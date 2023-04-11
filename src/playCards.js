const applyCardEffects = require("./applyCardEffects");
const checkPlayLegality = require("./checkPlayLegality");
const game = require("./common");
const endGame = require("./endGame");
const nextTurn = require("./nextTurn");
const parseCard = require("./parseCard");

async function actuallyPlayCards(cardsPlayed, cbLegal, player, jumpedIn) {
	const playLegalityResult = checkPlayLegality(cardsPlayed, game.discardPileTopCard.data, player.hand, jumpedIn);
	cbLegal(playLegalityResult.legal, playLegalityResult.reason);
	if (playLegalityResult.legal) game.stopEverything(); else return false;
	game.turnIndex.set(game.players.data.findIndex(x => x.idEquals(player.socketId)));
	player.removeCards(cardsPlayed);
	player.socket?.emit('your-hand', player.parseHand());
	game.discardPileTopCard.set(parseCard(cardsPlayed[cardsPlayed.length - 1]), cardsPlayed);
	if (player.hand.length === 0) {
		endGame(player.name);
		return false;
	}
	await applyCardEffects(playLegalityResult.effects, { jumpedIn });
	return true;
}

async function playCards(cardsPlayed, cbLegal) {
	// game active
	if (game.state.data !== 1) return cbLegal(false, 8);
	// accepting plays
	if (!game.acceptingPlays) return cbLegal(false, 9);
	// cardsPlayed must be an array
	if (!Array.isArray(cardsPlayed)) return cbLegal(false, 3);

	const playerIndex = game.players.data.findIndex(x => x.idEquals(this.id));
	const player = game.players.data[playerIndex];
	if (!player) return;
	// if their turn
	if (game.players.currentTurn.socketId === this.id) {
		player.skippedTurns = 0;
		// played any cards?
		if (cardsPlayed.length === 0) {
			cbLegal(true);
			game.stopEverything();
			// do they have to draw many cards?
			if (game.proactivePenalties && game.outstandingDrawPenalty > 0) {
				// draw that amount of cards
				const drawn = [];
				for (let i = 0; i < game.outstandingDrawPenalty; i++) {
					drawn.push(game.randomCard());
				}
				// add those cards to the player
				player.addCards(drawn);
				// tell the player about this
				this.emit('your-hand', player.parseHand());
				// reset penalty
				game.outstandingDrawPenalty = 0;
				// next turn
				return nextTurn();
			}
			// they have to draw 1 card
			// draw a card
			const drawn = game.randomCard();
			// add that card to the player
			player.addCards([drawn]);
			// tell the player about this
			this.emit('your-hand', player.parseHand());
			// if can be played
			const drawnCardPlayLegalityResult = checkPlayLegality([drawn], game.discardPileTopCard.data, player.hand);
			if (drawnCardPlayLegalityResult.legal) {
				// ask if want to play
				const removeDrawEmitter = player.persistentEmit('play-draw-one', drawn);
				const turnsTotalBeforeDecision = game.turnIndex.totalTurns;
				// wait until they decide or it times out
				const { decision, cbLegal2 } = await new Promise(res => {
					player.once('play-draw-one-decision', (decision, cbLegal2) => res({ decision, cbLegal2 }));
					setTimeout(() => {
						res({ decision: true });
					}, 30 * 1000);
					game.addStopEverythingListener(() => res({}));
				});
				// cancel emit and listener
				removeDrawEmitter();
				player.removeAllListeners('play-draw-one-decision');
				// if not same turn, cannot play (turn has changed due to jump in)
				if (game.turnIndex.totalTurns !== turnsTotalBeforeDecision && cbLegal2) return cbLegal2(false, 10);
				cbLegal2(true);
				// if played the card
				if (decision) {
					player.removeCards([drawn]);
					player.socket?.emit('your-hand', player.parseHand());
					game.discardPileTopCard.set(parseCard(drawn), [drawn]);
					await applyCardEffects(drawnCardPlayLegalityResult.effects);
					// turn cannot have changed during this promise, because acceptingPlays, except it may have because nextDraws
				}
			}
			// next turn
			return nextTurn();
		} else {
			// check if the cards they played were legal
			const result = await actuallyPlayCards(cardsPlayed, cbLegal, player);
			if (result) return nextTurn();
		}
	} else { // if not their turn
		// if no jump-in house rule active
		if (!(game.houseRules.jumpInMattel || game.houseRules.jumpInSingle) || cardsPlayed.length === 0) return cbLegal(false, 1);
		// if someone is choosing to play a drawn card, that client notices that a jump in happened (turn changed)
		const result = await actuallyPlayCards(cardsPlayed, cbLegal, player, true);
		if (result) nextTurn(true);
		return;
	}
}
module.exports = playCards;