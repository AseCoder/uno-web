const socket = io();
let game = {};

function setName() {
	const value = document.getElementById('name').value;
	if (value.length === 0) return console.log('name cannot have length 0');
	socket.emit('set-name', value, status => console.log(`set-name ack'd with status ${status}`));
}

socket.on('disconnect', reason => {
	console.log(`disconnected. reason: ${reason}`);
	socket.once('connect', setName);
});

document.getElementById('set-name').onclick = setName;

socket.on('your-hand', hand => {
	console.log(hand);
	const btns = [];
	hand.forEach(card => {
		const btn = document.createElement('button');
		btn.textContent = card;
		btn.onclick = e => {
			if (!game.myTurn) return;
			socket.emit('play-cards', [card], (legal, reason) => {
				console.log(`turn was legal: ${legal} for reason ${reason}`);
				if (legal) myTurn = false;
				if (legal === false && reason === 1) {
					console.log('played on wrong turn');
					socket.emit('give-game-info');
				}
			});
		}
		btns.push(btn);
	});
	const div = document.getElementById('hand');
	div.replaceChildren(...btns);
});
socket.on('game-info', data => {
	console.log(data);
	game.discardPileTopCard = data.discardPileTopCard;
	game.players = data.players;
	game.turnIndex = data.turnIndex;
});
socket.on('your-turn', () => {
	console.log('my turn');
	game.myTurn = true;
});