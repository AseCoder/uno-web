const socket = io();

document.getElementById('start-game').onclick = e => {
	socket.emit('start-game', { pin: document.getElementById('pin').value });
}

document.getElementById('end-game').onclick = e => {
	socket.emit('end-game', { pin: document.getElementById('pin').value });
}

document.getElementById('fetch-players').onclick = e => {
	socket.emit('fetch-players', { pin: document.getElementById('pin').value }, console.log);
}
