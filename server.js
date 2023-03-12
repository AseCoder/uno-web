const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// trust the secure gcloud proxy
app.set('trust proxy', true);

app.use('/', express.static(__dirname + '/public'));

io.on('connection', (socket) => {
	console.log(new Date() + ' a user connected');
});

server.listen(process.env.PORT || 3000, () => {
	console.log(`listening on *:${process.env.PORT || 3000}`);
});