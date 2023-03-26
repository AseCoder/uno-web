const socket = io({ timeout: 3000 });
let game = {
	set myTurn(bool) {
		this._myTurn = bool;
		document.getElementById('myturn').hidden = !bool;
	},
	get myTurn() { return this._myTurn },
	removablePopups: [],
};

class InfoMessage {
	constructor(msg, duration = 10000) {
		this.msg = msg;
		this.duration = duration;
	}
	draw() {
		const message = document.createElement('div');
		message.classList.add('message');
		if (this.msg[0].startsWith('Success')) {
			message.classList.add('greenBorder');
		}
		if (this.msg[0].startsWith('Error')) {
			message.classList.add('redBorder');
		}
		this.msg.forEach(x => {
			const y = document.createElement('p');
			y.textContent = x;
			message.appendChild(y);
		})
		document.getElementById('messages').appendChild(message);
		setTimeout(() => message.remove(), this.duration);
	}
}

class Popup {
	constructor(msg, options, callback) {
		this.msg = msg;
		this.options = options;
		this.callback = callback;
		this.closed = false;
		this.element;
	}
	draw() {
		const bg = document.createElement('div');
		bg.classList.add('darkbg');
		const div = document.createElement('div')
		div.classList.add('popup');
		this.msg.forEach(x => {
			if (typeof x === 'string') {
				const p = document.createElement('p');
				p.textContent = x;
				div.appendChild(p);
			} else div.appendChild(x);
		});
		this.options.forEach((x, i) => {
			const button = document.createElement('button');
			button.textContent = x;
			button.onclick = () => {
				try {
					this.callback(x);
				} catch (err) {console.log(err)}
				bg.remove();
				this.closed = true;
				game.removablePopups = game.removablePopups.filter(x => !x.closed);
			};
			div.appendChild(button);
		});
		bg.appendChild(div);
		document.body.appendChild(bg);
		this.element = bg;
		return this;
	}
	remove() {
		this.callback();
		this.element.remove();
		this.closed = true;
	}
}

let setnameCodes;
function getSetnameCodes() {
	if (setnameCodes) return setnameCodes;
	return new Promise((res, rej) => {
		fetch('setnameCodes.json').then((response) => {
			const json = response.json();
			setnameCodes = json;
			res(json);
		}).catch(rej);
	});
}
let playcrimes;
function getPlayCrimes() {
	if (playcrimes) return playcrimes;
	return new Promise((res, rej) => {
		fetch('playCrimes.json').then((response) => {
			const json = response.json();
			playcrimes = json;
			res(json);
		}).catch(rej);
	});
}

function setName() {
	const username = document.getElementById('name').value;
	if (username.length === 0) return console.log('name cannot have length 0');
	socket.emit('set-name', username, async status => {
		console.log(`set-name ack'd with status ${status}`);
		const msg = (await getSetnameCodes())[status.toString()];
		new InfoMessage(msg).draw();
		game.username = username;
		if (game.turnIndex !== undefined) game.myTurn = game.turnIndex === game.players?.findIndex(x => x[0] === game.username);
	});
}

document.getElementById('set-name').onclick = setName;

function playCards(cards) {
	if (!game.myTurn) return console.log('not my turn');
	socket.emit('play-cards', cards, async (legal, reason) => {
		console.log(`turn was legal: ${legal} for reason ${reason}`);
		if (legal) {
			game.myTurn = false;
		}
		if (legal === false && reason === 1) {
			console.log('played on wrong turn');
			socket.emit('give-game-info');
			game.myTurn = false;
		}
		if (!legal) {
			const reasonDesc = (await getPlayCrimes())[reason.toString()];
			(new InfoMessage(['Error: Illegal play: ' + reasonDesc[0], reasonDesc[1]], 'Try again.')).draw();
		}
	});
}

socket.on('disconnect', reason => {
	console.log(`disconnected. reason: ${reason}`);
	socket.once('connect', setName);
	(new InfoMessage(['Error: disconnected', 'Server connection lost. Reconnecting...'])).draw();
	game.removablePopups.forEach(x => x.remove());
});

socket.on('your-hand', hand => {
	console.log(hand);
	game.hand = hand;
	const btns = [];
	hand.forEach(card => {
		const btn = document.createElement('button');
		btn.classList.add('handCard');
		const img = document.createElement('img');
		img.src = '/cards/' + card + '.svg';
		img.alt = card;
		btn.appendChild(img);
		btn.onclick = e => playCards([card]);
		btns.push(btn);
	});
	const div = document.getElementById('hand');
	div.replaceChildren(...btns);
});
socket.on('game-info', data => {
	console.log(data);
	if (data.discardPileTopCard) {
		game.discardPileTopCard = data.discardPileTopCard;
		document.getElementById('discard').src = '/cards/' + data.discardPileTopCard.name + '.svg';
		document.getElementById('discardcolor').textContent = 'color (incase wild): ' + data.discardPileTopCard.color || '';
	};
	if (data.players) {
		game.players = data.players;
		const plrs = [];
		game.players.forEach((player, i) => {
			const div = document.createElement('div');
			div.classList.add('player');
			div.id = 'player' + i.toString();
			const name = document.createElement('p');
			name.textContent = player[0];
			const cards = document.createElement('p');
			cards.textContent = player[1] + ' cards';
			div.replaceChildren(name, cards);
			plrs.push(div);
		});
		document.getElementById('players').replaceChildren(...plrs);
	}
	if (data.turnIndex !== undefined) {
		game.turnIndex = data.turnIndex;
		game.myTurn = game.turnIndex === game.players.findIndex(x => x[0] === game.username);
	}
	if (data.players || data.turnIndex) {
		for (const child of document.getElementById('players').children) {
			child.classList.remove('redBorder');
		}
		document.getElementById('player' + game.turnIndex)?.classList.add('redBorder');
	}
});
socket.on('your-turn', () => {
	console.log('my turn');
	game.myTurn = true;
});
socket.on('choose-color', () => {
	console.log('you have to choose a color');
	const cb = option => {
		if (!option) return;
		socket.emit('chosen-color', option.toLowerCase());
	};
	const colorPopup = new Popup(['Choose a color to be played'], ['Red', 'Green', 'Blue', 'Yellow'], cb);
	console.log('popup', colorPopup);
	game.removablePopups.push(colorPopup.draw());
});
socket.on('play-draw-one', drawn => {
	const img = document.createElement('img');
	img.src = '/cards/' + drawn + '.svg';
	img.alt = drawn;
	new Popup(['You drew a', img, 'Would you like to play it?'], ['Yes', 'No'], option => {
		socket.emit('play-draw-one-decision', option === 'Yes');
	}).draw();
});
socket.on('end-game', winner => {
	const endPopup = new Popup([`The game has ended. ${winner} won. Reload the page to play again.`], ['Reload'], () => {
		location.reload();
	});
	endPopup.draw();
});
