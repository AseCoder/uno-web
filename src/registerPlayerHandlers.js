const io = require('../server');
const game = require('./common');
const endGame = require('./endGame');
const Player = require('./playerClass');

/** Creates socket.io event listeners for player requests.
 * @param {Socket} socket The socket that these event listeners will be assigned to
 * @returns {void}
*/
function registerPlayerHandlers(socket) {
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
		if (game.players.data.every(player => !player.socketId)) endGame();
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
			io.emit('game-info', game.generateGameInfo({ players: true }));
			return cb(1);
		}

		// 2.
		if (nameExists && !idExists) {
			try {
				game.players.data.find(x => x.nameEquals(name)).reconnect(socket.id);
			} catch (error) {
				return cb(-2);
				// -2 = name taken
			}
			socket.emit('game-info', game.generateGameInfo());
			socket.emit('your-hand', game.players.data.find(x => x.nameEquals(name)).hand);
			return cb(2);
		}

		// 3.
		if (!nameExists && idExists) {
			game.players.data.find(x => x.idEquals(socket.id)).rename(name);
			io.emit('game-info', game.generateGameInfo({ players: true }));
			return cb(3);
		}

		// 4.
		if (nameExists && idExists) {
			return cb(4);
		}
	});
	socket.on('give-game-info', () => {
		socket.emit('game-info', game.generateGameInfo());
	});
	socket.on('give-hand', cb => {
		cb(game.players.data.find(x => x.idEquals(socket.id))?.hand);
	});
}
module.exports = registerPlayerHandlers;