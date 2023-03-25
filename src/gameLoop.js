const game = require("./common");
const checkPlayLegality = require('./checkPlayLegality');
const parseCard = require("./parseCard");
const applyCardEffects = require('./applyCardEffects');
const endGame = require("./endGame");
const io = require("../server");

/**
 * Loops over turns, keeps the game running
 */
async function gameLoop() {
	// while the game has started and not ended
	while (game.state.data === 1) {
		const player = game.players.currentTurn;
		// turn has just changed, tell them to play cards
		const removeTurnEmitter = player.persistentEmit('your-turn');
		console.log(`it's "${player.name}"'s turn`);

		// they play cards
		// you get 3 tries or you draw a card and your turn is skipped, alternatively 2 minutes
		// idea: 2 promises, first is play-cards and second is timeout. see which one resolves first
		// play cards loops until legal, otherwise rejects
		try {
			const result = await new Promise(async (res, rej) => {
				setTimeout(rej, 45 * 1000);
				for (let i = 0; i < 3; i++) {
					const playSuccess = await new Promise(playResolve => {
						player.once('play-cards', (cardsPlayed, cbLegal) => {
							console.log(`"${player.name}" played cards ${cardsPlayed}`);
							if (cardsPlayed.length === 0) {
								cbLegal(true);
								return playResolve({ status: 0 });
							}
							const playLegalityResult = checkPlayLegality(cardsPlayed, game.discardPileTopCard.data, player.hand);
							cbLegal(playLegalityResult.legal, playLegalityResult.reason);
							if (playLegalityResult.legal) {
								playResolve({ status: 1, cardsPlayed, playLegalityResult });
							} else {
								playResolve({ status: -1 });
							}
						});
					});
					// if -1 continue
					// if 0, rej
					// if 1, res
					if (playSuccess.status === 1) {
						res(playSuccess);
						break;
					} else if (playSuccess.status === 0) {
						rej(true);
						break;
					}
				}
				rej(false);
			});
			player.removeAllListeners('play-cards');
			console.log('play result:', result);
			player.removeCards(result.cardsPlayed);
			player.socket?.emit('your-hand', player.hand);
			game.discardPileTopCard.set(parseCard(result.cardsPlayed[result.cardsPlayed.length - 1]));
			if (player.hand.length === 0) {
				return endGame(player.name);
			}
			await applyCardEffects(result.playLegalityResult.effects);
		} catch (bool) {
			player.removeAllListeners('play-cards');
			const drawn = game.randomCard();
			const cardsPlayed = [drawn];
			player.addCards(cardsPlayed);
			player.socket?.emit('your-hand', player.hand);
			if (bool) {
				const drawnCardPlayLegalityResult = checkPlayLegality(cardsPlayed, game.discardPileTopCard.data, player.hand);
				if (drawnCardPlayLegalityResult.legal === true) {
					let removeDrawEmitter = () => {};
					const playsDrawnCard = await new Promise((res, rej) => {
						player.once('play-draw-one-decision', res);
						removeDrawEmitter = player.persistentEmit('play-draw-one', drawn);
						setTimeout(() => {
							res(true);
						}, 30 * 1000);
					});
					removeDrawEmitter();
					player.removeAllListeners('play-draw-one-decision');
					if (playsDrawnCard) {
						player.removeCards(cardsPlayed);
						player.socket?.emit('your-hand', player.hand);
						game.discardPileTopCard.set(parseCard(cardsPlayed[cardsPlayed.length - 1]));
						await applyCardEffects(drawnCardPlayLegalityResult.effects);
					}
				}
			}
		}
		removeTurnEmitter();
		game.turnIndex.setNext();
		io.emit('game-info', game.generateGameInfo());
	}
}
module.exports = gameLoop;