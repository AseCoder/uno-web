const game = require("./common");
const checkPlayLegality = require('./checkPlayLegality');
const parseCard = require("./parseCard");
const applyCardEffects = require('./applyCardEffects');
const endGame = require("./endGame");
/**
 * Loops over turns, keeps the game running
 * @param {httpServer} io 
 */
async function gameLoop(io) {
	// while the game has started and not ended
	while (game.state.data === 1) {
		const player = game.players.currentTurn();
		const socket = io.of('/').sockets.get(player.socketId);
		// turn has just changed, tell them to play cards
		socket.emit('your-turn');

		// they play cards
		// you get 3 tries or you draw a card and your turn is skipped, alternatively 2 minutes
		// idea: 2 promises, first is play-cards and second is timeout. see which one resolves first
		// play cards loops until legal, otherwise rejects
		try {
			const result = await new Promise(async (res, rej) => {
				setTimeout(rej, 2 * 60 * 1000);
				for (let i = 0; i < 3; i++) {
					const playSuccess = await new Promise(playResolve => {
						socket.once('play-cards', (cardsPlayed, cbLegal) => {
							console.log(`${socket.id} ${player.name} played cards ${cardsPlayed}`);
							if (cardsPlayed.length === 0) {
								cbLegal(true);
								return playResolve({ status: 0 });
							}
							const playLegalityResult = checkPlayLegality(cardsPlayed, game.discardPileTopCard.data, player.hand);
							cbLegal(playLegalityResult.legal, playLegalityResult.reason);
							console.log(playLegalityResult);
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
			socket.removeAllListeners('play-cards');
			console.log(result);
			player.removeCards(result.cardsPlayed);
			socket.emit('your-hand', player.hand);
			game.discardPileTopCard.set(parseCard(result.cardsPlayed[result.cardsPlayed.length - 1]));
			if (player.hand.length === 0) {
				return endGame(io, player.name);
			}
			await applyCardEffects(result.playLegalityResult.effects, io);
		} catch (bool) {
			socket.removeAllListeners('play-cards');
			console.error(bool);
			const drawn = game.randomCard();
			const cardsPlayed = [drawn];
			player.addCards(cardsPlayed);
			socket.emit('your-hand', player.hand);
			if (bool) {
				const drawnCardPlayLegalityResult = checkPlayLegality(cardsPlayed, game.discardPileTopCard.data, player.hand);
				if (drawnCardPlayLegalityResult.legal === true) {
					const playsDrawnCard = await new Promise((res, rej) => {
						socket.once('play-draw-one-decision', res);
						socket.emit('play-draw-one', drawn);
						setTimeout(() => {
							res(true);
						}, 30 * 1000);
					});
					if (playsDrawnCard) {
						player.removeCards(cardsPlayed);
						socket.emit('your-hand', player.hand);
						game.discardPileTopCard.set(parseCard(cardsPlayed[cardsPlayed.length - 1]));
						await applyCardEffects(drawnCardPlayLegalityResult.effects, io);
					}
				}
			}
		}
		// idea: rej means they need to draw a card. res means they have successfully played a card / completed their turn
		// rej bool is if they should be given a chance to play that card
		// next turn
		game.turnIndex.setNext();
		io.of('/').emit('game-info', game.generateGameInfo());
	}
}
module.exports = gameLoop;