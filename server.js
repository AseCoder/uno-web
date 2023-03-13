const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// game vars
const adminPin = '1234';
const absDeck = require('./cards.json').flatMap(card => (new Array(card[1])).fill(card[0] + '_' + card[1]));
let players = [];
let gameState = 0;
/*
0 = not started
1 = started
*/
const Player = require('./src/playerClass');

app.use('/', express.static(__dirname + '/public'));

io.on('connection', (socket) => {
	console.log(`${new Date()} ${socket.id} connected`);

	socket.on('disconnect', reason => {
		console.log(`${new Date()} ${socket.id} disconnected. reason: ${reason}`);
		const i = players.findIndex(x => x.idEquals(socket.id));
		if (i === -1) return;
		// player shall only persist if game has started
		if (gameState === 1) {
			players[i].disconnect();
		} else {
			players.splice(i, 1);
		}
	});
	
	socket.on('set-name', (name, cb) => {
		console.log(`${socket.id} wants to set name "${name}"`);

		if (typeof name !== 'string' || name.length === 0) return cb(-1);

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

		const nameExists = players.some(x => x.nameEquals(name));
		const idExists = players.some(x => x.idEquals(socket.id));

		// 1.
		if (!nameExists && !idExists) {
			if (gameState !== 0) return cb(-1);
			players.push(new Player(name, socket.id));
			return cb(1);
		}

		// 2.
		if (nameExists && !idExists) {
			players.find(x => x.nameEquals(name)).reconnect(socket.id);
			return cb(2);
		}

		// 3.
		if (!nameExists && idExists) {
			players.find(x => x.idEquals(socket.id)).rename(name);
			return cb(3);
		}

		// 4.
		if (nameExists && idExists) {
			return cb(4);
		}
	});

	socket.on('start-game', (data) => {
		if (data.pin !== adminPin) return;
		if (gameState !== 0) return console.log('wrong game state for game start');
		gameState = 1;
		players = players.filter(player => player.socketId);
		players.forEach((player, i) => {
			// pick 7 random cards
			const hand = [];
			for (let i = 0; i < 7; i++) {
				hand.push(absDeck[Math.floor(Math.random() * absDeck.length)]);
			}
			player.hand = hand;
			io.of('/').sockets.get(player.socketId).emit('your-hand', hand);
		});
	});

	socket.on('end-game', data => {
		if (data.pin !== adminPin) return;
		if (gameState !== 1) return console.log('wrong game state for game end');
		players = [];
		gameState = 0;
	});

	socket.on('fetch-players', (data, cb) => {
		if (data.pin !== adminPin) return;
		cb(players);
	});
});

server.listen(process.env.PORT || 3000, () => {
	console.log(`listening on *:${process.env.PORT || 3000}`);
});

