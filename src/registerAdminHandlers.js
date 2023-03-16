const game = require('./common');
const gameStart = require('./gameStart');
module.exports = (io, socket) => {
	socket.on('start-game', data => {
		if (data.pin !== process.env.ADMINPIN) return;
		gameStart(io);
	});
	socket.on('end-game', data => {
		if (data.pin !== process.env.ADMINPIN) return;
		if (game.state.data !== 1) return console.log('wrong game state for game end');
		game.players.reset();
		game.state.set(0);
	});
	socket.on('fetch-players', (data, cb) => {
		if (data.pin !== process.env.ADMINPIN) return;
		cb(game.players.data);
	});
}