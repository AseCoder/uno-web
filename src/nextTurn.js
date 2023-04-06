const io = require("../server");
const game = require("./common");
const kickPlayer = require("./kickPlayer");

/**
 * Sets the turn to the next and sets a timeout in case nothing is played
 * @param {boolean} jumpedIn 
 */
async function nextTurn(jumpedIn, beginning) {
	// while turns keep timing out, do
	let removeTurnEmitter = () => { };
	while (game.state.data === 1) {
		if (!beginning) {
			// next turn
			removeTurnEmitter();
			game.turnIndex.setNext(jumpedIn);
			beginning = false;
		}
		const player = game.players.currentTurn;
		removeTurnEmitter = player.persistentEmit('your-turn');
		console.log(`it's "${player.name}"'s turn`);
		io.emit('game-info', game.generateGameInfo());
		try {
			// if the timeout does not finish, ie there was a legal play-cards, stop loop and return
			await new Promise((res, rej) => {
				setTimeout(rej, (player.isConnected ? 45 : 18) * 1000);
				game.addStopEverythingListener(res);
			});
		} catch (error) {
			// theyve skipped a turn
			player.skippedTurns++;
			if (player.skippedTurns > 1) {
				kickPlayer(game.turnIndex.data);
				break;
			} else {
				// do they have to draw many cards?
				console.log('houserule', game.houseRules.stackNextDraws, 'outstandingDrawPenalty', game.outstandingDrawPenalty);
				if (game.houseRules.stackNextDraws && game.outstandingDrawPenalty > 0) {
					// draw that amount of cards
					const drawn = [];
					for (let i = 0; i < game.outstandingDrawPenalty; i++) {
						drawn.push(game.randomCard());
					}
					// add those cards to the player
					player.addCards(drawn);
					// tell the player about this
					player.socket?.emit('your-hand', player.parseHand());
					// reset penalty
					game.outstandingDrawPenalty = 0;
					// next turn
					continue;
				}
				// give them a card
				const drawn = game.randomCard();
				// add that card to the player
				player.addCards([drawn]);
				// tell the player about this
				player.socket?.emit('your-hand', player.parseHand());
				// next turn
				continue;
			}
		}
		// timeout did not finish
		// this will be handed elsewhere
		break;
	}
	return;
}
module.exports = nextTurn;