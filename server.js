require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const game = require('./src/common');

app.use('/', express.static(__dirname + '/public'));

io.on('connection', (socket) => {
	console.log(`${new Date()} ${socket.id} connected`);
	require('./src/registerAdminHandlers')(io, socket);
	require('./src/registerPlayerHandlers')(io, socket);
});

server.listen(process.env.PORT || 3000, () => {
	console.log(`listening on *:${process.env.PORT || 3000}`);
});

