const socket = io();
let game = {
	set myTurn(bool) {
		this._myTurn = bool;
		document.getElementById('myturn').hidden = !bool;
	},
	get myTurn() { return this._myTurn }
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
	}
	draw() {
		const bg = document.createElement('div');
		bg.classList.add('darkbg');
		const div = document.createElement('div')
		div.classList.add('popup');
		this.msg.forEach(x => {
			const p = document.createElement('p');
			p.textContent = x;
			div.appendChild(p);
		});
		this.options.forEach((x, i) => {
			const button = document.createElement('button');
			button.textContent = x;
			button.onclick = () => {
				try {
					this.callback(x);
				} catch (err) {console.log(err)}
				bg.remove();
			};
			div.appendChild(button);
		});
		bg.appendChild(div);
		document.body.appendChild(bg);
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
	const value = document.getElementById('name').value;
	if (value.length === 0) return console.log('name cannot have length 0');
	socket.emit('set-name', value, async status => {
		console.log(`set-name ack'd with status ${status}`);
		const msg = (await getSetnameCodes())[status.toString()];
		new InfoMessage(msg).draw();
	});
}

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
});

document.getElementById('set-name').onclick = setName;

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
	if (data.turnIndex !== undefined) game.turnIndex = data.turnIndex;
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
	(new Popup(['Choose a color to be played'], ['Red', 'Green', 'Blue', 'Yellow'], option => {
		socket.emit('chosen-color', option.toLowerCase());
	})).draw();
});
socket.on('end-game', winner => {
	(new Popup([`The game has ended. ${winner} won. Reload the page to play again.`], ['Reload'], option => {
		location.reload();
	})).draw();
});