const game = require("./common");
const checkPlayLegality = require('./checkPlayLegality');
const parseCard = require("./parseCard");
const applyCardEffects = require('./applyCardEffects');
const endGame = require("./endGame");
const io = require("../server");
const kickPlayer = require("./kickPlayer");

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
		try {
			const result = await new Promise(async (res, rej) => {
				setTimeout(rej, (player.socketId ? 45 : 18) * 1000); // is player disconnected?
				while (true) {
					const playSuccess = await new Promise(playResolve => {
						player.once('play-cards', (cardsPlayed, cbLegal) => {
							console.log(`2/2 "${player.name}" played cards ${cardsPlayed}`);
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
					// if -1 (illegal play), continue loop
					// if 0 (played empty), rej
					// if 1 (played cards), res
					if (playSuccess.status === 1) {
						res(playSuccess);
						break;
					} else if (playSuccess.status === 0) {
						rej(true);
						break;
					}
				}
				// rej means they draw a card
				// res means they play cards
				// param of rej is if they should be allowed to play the drawn card
				rej(false);
			});
			player.removeAllListeners('play-cards');
			console.log('play result:', result);
			player.removeCards(result.cardsPlayed);
			player.socket?.emit('your-hand', player.hand);
			player.skippedTurns = 0;
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
				player.skippedTurns = 0;
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
			} else {
				player.skippedTurns++;
			}
		}
		removeTurnEmitter();
		if (player.skippedTurns > 1) kickPlayer(game.turnIndex.data); else game.turnIndex.setNext();
		io.emit('game-info', game.generateGameInfo());
	}
}
module.exports = gameLoop;