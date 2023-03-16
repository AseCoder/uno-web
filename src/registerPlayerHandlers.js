const game = require('./common');
const Player = require('./playerClass');
const checkPlayLegality = require('./checkPlayLegality');
module.exports = (io, socket) => {
	socket.on('disconnect', reason => {
		console.log(`${new Date()} ${socket.id} disconnected. reason: ${reason}`);
		const i = game.players.data.findIndex(x => x.idEquals(socket.id));
		if (i === -1) return;
		// player shall only persist if game has started
		if (game.state.data === 1) {
			game.players.data[i].disconnect();
		} else {
			game.players.splice(i, 1);
		}
	});
	socket.on('set-name', (name, cb) => {
		console.log(`${socket.id} wants to set name "${name}"`);

		if (typeof name !== 'string' || name.length === 0) return cb(-1); // must give a name

		// socket id wants to register itself with a name
		// 4 possibilities:
		// 1. neither name nor id exist in players
		//   => new player
		// 2. name exists but id not
		//   => user is reconnecting. assign id to name
		//      SHOULD ONLY HAPPEN IF USER HAS DISCONNECTED
		// 3. name doesnt exist, id does
		//   => user wants to rename, assign name to id
		// 4. both name and id exist
		//   => user wants to register though nothing changed. ignore

		const nameExists = game.players.data.some(x => x.nameEquals(name));
		const idExists = game.players.data.some(x => x.idEquals(socket.id));

		// 1.
		if (!nameExists && !idExists) {
			if (game.state.data !== 0) return cb(-1); // cannot join during game
			game.players.unshift(new Player(name, socket.id));
			return cb(1);
		}

		// 2.
		if (nameExists && !idExists) {
			game.players.data.find(x => x.nameEquals(name)).reconnect(socket.id);
			return cb(2);
		}

		// 3.
		if (!nameExists && idExists) {
			game.players.data.find(x => x.idEquals(socket.id)).rename(name);
			return cb(3);
		}

		// 4.
		if (nameExists && idExists) {
			return cb(4);
		}
	});
	socket.on('play-cards', (cardsPlayed, cbLegal) => {
		// 1 = wrong turn
		// 2 = fake cards
		// 3 = not an array
		// 4 = too many cards
		// 5 = not matching color or symbol
		// 6 = illegal WD4
		const playerIndex = game.players.data.findIndex(x => x.idEquals(socket.id));
		if (playerIndex !== game.turnIndex.data) {
			cbLegal(false, 1);
		}
		const player = game.players.data[playerIndex];
		console.log(`${player.name} (${player.socketId}) wants to play card(s)`, cardsPlayed);
		const result = checkPlayLegality(cardsPlayed, game.discardPileTopCard.data, player.hand);
		console.log('legality:', result);
		cbLegal(true);
	});
	socket.on('give-game-info', () => {
		socket.emit('game-info', game.generateGameInfo());
	});
	socket.on('give-hand', cb => {
		cb(game.players.data.find(x => x.idEquals(socket.id))?.hand);
	});
}