const io = require('../server');
const game = require('./common');
const endGame = require('./endGame');
const gameStart = require('./gameStart');
/** Creates socket.io event listeners for admin requests.
 * @param {Socket} socket The socket that these event listeners will be assigned to
 * @returns {void}
*/
function registerAdminHandlers(socket) {
	socket.on('start-game', data => {
		if (data.pin !== process.env.ADMINPIN) return;
		gameStart();
	});
	socket.on('end-game', data => {
		if (data.pin !== process.env.ADMINPIN) return;
		if (game.state.data !== 1) return console.log('wrong game state for game end');
		endGame();
	});
	socket.on('fetch-players', (data, cb) => {
		if (data.pin !== process.env.ADMINPIN) return;
		cb(game.players.data);
	});
	socket.on('toggle-houserule', (data, cb) => {
		if (data.pin !== process.env.ADMINPIN) return;
		cb(game.toggleHouseRule(data.ruleName));
	});
	socket.on('fetch-houserulesconfig', (data, cb) => {
		if (data.pin !== process.env.ADMINPIN) return;
		cb(game.houseRulesConfig());
	});
	socket.on('import-houserulesconfig', (data, cb) => {
		if(data.pin !== process.env.ADMINPIN) return;
		cb(game.importHouseRulesConfig(data.str));
	});
}
module.exports = registerAdminHandlers;