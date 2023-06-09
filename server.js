require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const game = require('./src/common');
const io = new Server(server, {
	pingInterval: 3000,
	pingTimeout: 3000,
	cors: {
		origin: true,
		methods: ["GET", "POST"],
		credentials: true,
		transports: ['websocket', 'polling'],
	},
	allowEIO3: true
});

app.use('/', express.static(__dirname + '/public'));
app.use('/', express.static(__dirname + '/public-new'));

app.get('/activehouserules', (req, res) => {
	res.json(game.houseRules);
});

io.on('connection', (socket) => {
	console.log(`${socket.id} connected`);
	require('./src/registerAdminHandlers')(socket);
	require('./src/registerPlayerHandlers')(socket);
});

server.listen(process.env.PORT || 3000, () => {
	console.log(`listening on *:${process.env.PORT || 3000}`);
});

module.exports = io;
