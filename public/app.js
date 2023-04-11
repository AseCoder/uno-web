// these two return promises that resolve to the json data
function setnameCodes() {
	return new Promise((res, rej) => {
		fetch('setnameCodes.json', { cache: "force-cache" }).then(response => res(response.json())).catch(rej);
	});
}
function playCrimes() {
	return new Promise((res, rej) => {
		fetch('playCrimes.json', { cache: "force-cache" }).then(response => res(response.json())).catch(rej);
	});
}

const game = {
	// get previous username from localstorage
	username: localStorage.getItem('username'),
	_myTurn: false,
	get myTurn() {
		return this._myTurn;
	},
	set myTurn(bool) {
		this._myTurn = bool;
		console.log('myTurn', bool);
		onMyTurn();
	},
	_muliselect: false,
	get multiselect() {
		return this._muliselect;
	},
	set multiselect(bool) {
		console.log('multiselect', bool);
		this._muliselect = bool;
		const multiselectBtn = document.getElementById('multiselect');
		if (bool) {
			multiselectBtn.classList.add('controlactive');
			multiselectBtn.classList.remove('controlinactive');
			// create playcards element
			const btn = document.createElement('button');
			btn.textContent = 'Play Cards';
			btn.classList.add('controlbutton', 'controlred');
			game.playCardsButton = btn;
			btn.onclick = () => playCards();
			document.getElementById('rightcontrols').appendChild(btn);
			
			game.playCardsButton = btn;
		} else {
			multiselectBtn.classList.remove('controlactive');
			multiselectBtn.classList.add('controlinactive');
			// remove playcards element
			game.playCardsButton?.remove();
		}
		drawHand();
	},
	get selectedCards() {
		return Array.from(document.querySelectorAll('.selectedCard').values()).sort((a, b) => parseInt(a.textContent) - parseInt(b.textContent)).map(x => x.id.slice(10));
	}
};

// put the previous username in the input field
document.getElementById('input-username').value = game.username;

// connect to server. socket times out if ping is 3 seconds late
const socket = io({ timeout: 3000 });

// a message on the message board
class Message {
	constructor(textLines, color) {
		this.textLines = textLines;
		this.color = color;
		this.timeCreated = Date.now();
	}
	draw() {
		// create container div and put paragraphs in it for each line of text
		const div = document.createElement('div');
		this.textLines.forEach(line => {
			const p = document.createElement('p');
			p.textContent = line;
			div.appendChild(p);
		});
		// div gets id "message-XXXXXXXX"
		div.id = 'message-' + this.timeCreated;
		// class "message-green"
		if (this.color) div.classList.add('message-' + this.color);
		document.getElementById('messages').appendChild(div);
	}
	remove() {
		// find the element and remove it
		const div = document.getElementById('message-' + this.timeCreated);
		div?.remove();
	}
}

// a popup that fills the whole screen
class Popup {
	constructor(params = {}) {
		this.elements = params.elements;
		this.options = params.options;
		this.cb = params.cb;
		this.priority = params.priority || 0;
		this.type = params.type;
		this.onclick = () => {};
		this.id = Date.now();
	}
	draw() {
		const div = document.createElement('div');
		this.elements.forEach(x => {
			if (typeof x === 'string') {
				const p = document.createElement('p');
				p.textContent = x;
				div.appendChild(p);
			} else div.appendChild(x);
		});
		this.options.forEach(x => {
			const btn = document.createElement('button');
			btn.textContent = x.text;
			btn.onclick = () => {
				this.cb(x.id);
				this.onclick();
			}
			btn.classList.add('popup-option-' + x.color);
			div.appendChild(btn);
		});
		this.div = div;
		return div;
	}
}

// handles the message board, top right
const messagesManager = {
	messages: [],
	defaultTimeout: 10000,
	new(textLines, color) {
		const createdMessage = new Message(textLines, color);
		createdMessage.draw();
		this.messages.push(createdMessage);
		this.remove(createdMessage.timeCreated);
	},
	remove(timestamp, timeout = this.defaultTimeout) {
		setTimeout(() => {
			const i = this.messages.findIndex(message => message.timeCreated === timestamp);
			this.messages[i].remove();
			this.messages.splice(i, 1);
		}, timeout);
	}
};

// handles the popups
const popupManager = {
	popups: [],
	topPopup: undefined,
	bgEl: undefined,
	new(params) {
		const createdPopup = new Popup(params);
		this.popups.push(createdPopup);
		// when an option is chosen, rip off this popup
		createdPopup.onclick = () => this.removeTopPopup();
		console.log('popupmanager.new');
		if (this.popups.every(x => x.priority <= createdPopup.priority)) {
			console.log('displaying popup');
			this.displayPopup(createdPopup);
		}
	},
	displayPopup(popup) {
		if (this.bgEl) {
			this.bgEl.innerHTML = '';
		} else {
			this.bgEl = document.createElement('div');
			this.bgEl.classList.add('popup-bg');
		}
		this.topPopup = popup;
		console.log('toppopup', this.topPopup);
		this.bgEl.appendChild(popup.draw());
		document.body.appendChild(this.bgEl);
	},
	removeTopPopup() {
		// remove current popup
		this.topPopup.div.remove();
		this.popups.splice(this.popups.findIndex(x => x.id === this.topPopup.id), 1);
		// find next popup
		if (this.popups.length) {
			this.popups.sort((a, b) => b.priority - a.priority);
			this.displayPopup(this.popups[0]);
		} else this.bgEl.remove();
	},
}

// creates a prefab color selection popup
function chooseColorPopup() {
	popupManager.new({
		elements: ['Choose a color to be played'],
		options: [
			{ text: 'Red', id: 'red', color: 'red' },
			{ text: 'Green', id: 'green', color: 'green' },
			{ text: 'Blue', id: 'blue', color: 'blue' },
			{ text: 'Yellow', id: 'yellow', color: 'yellow' }
		],
		cb: optionId => {
			if (!optionId) return;
			socket.emit('chosen-color', optionId);
		},
		type: 'chooseColor'
	});
}

// creates a prefab "play drawn card?" popup
function playdrawonePopup(card) {
	const img = document.createElement('img');
	img.classList.add('cardImg');
	img.src = '/cards/' + card + '.svg';
	img.alt = card;
	popupManager.new({
		elements: [
			'You drew a',
			img,
			'Would you like to play it?'
		],
		options: [
			{ text: 'Yes', id: 'yes', color: 'green' },
			{ text: 'No', id: 'no', color: 'red' }
		],
		cb: optionId => {
			socket.emit('play-draw-one-decision', optionId === 'yes', async (legal, reason) => {
				if (!legal) {
					const lines = (await playCrimes())[reason.toString()];
					messagesManager.new(lines, 'red');
				}
			});
		},
		type: 'playDrawOne'
	});
}

// ran when the join button is pressed
function setUsername() {
	// get username string from input
	const username = document.getElementById('input-username').value;
	console.log('1/2 username', username);
	// check length requirements, inform user
	if (username.length === 0 || username.length > 35) return console.log('wrong length');
	// check if connected
	if (!socket.connected) socket.connect();
	// ask the server to set the username
	socket.emit('set-name', username, async statusCode => {
		console.log('2/2 username code', statusCode);
		const parsedStatusCode = parseInt(statusCode);
		// get meaning of code
		const codeLookup = (await setnameCodes())[parsedStatusCode];
		// if successful, put new name in localstorage and game object
		if (statusCode > 0) {
			localStorage.setItem('username', username);
			game.username = username;
		};
		messagesManager.new(
			codeLookup,
			parsedStatusCode > 0 ?
				parsedStatusCode >= 4 ?
					'gray'
					: 'green'
				: 'red'
		)
	});
}

// called when clicking a card or Play Cards
function playCards(card) {
	const playedCards = card ? [card] : game.selectedCards;
	if (!playCards) return console.log('no card selected');
	socket.emit('play-cards', playedCards, async (legal, reason) => {
		console.log('playedCards', playedCards, 'legal', legal, 'reason', reason);
		if (!legal) {
			const lines = (await playCrimes())[reason.toString()];
			messagesManager.new(lines, 'red');
		}
	});
}

// called when clicking the draw one button
function drawOne() {
	socket.emit('play-cards', [], (legal, reason) => {
		console.log('playedCards', [], 'legal', legal, 'reason', reason);
	});
}

// draws all the player boxes and red outline if avail
function drawPlayers() {
	if (!game.players) return;
	const playersDiv = document.getElementById('players');
	playersDiv.innerHTML = '';
	game.players.forEach((player, i) => {
		const div = document.createElement('div');
		div.classList.add('player', 'darkinput');
		if (game.turnIndex != undefined && game.turnIndex === i) div.classList.add('activeplayer');
		div.id = 'player-' + player[0];
		[player[2] ? '⬤ Connected' : '⬤ Offline', player[0], player[1] + ' cards'].forEach((line, j) => {
			const p = document.createElement('p');
			p.textContent = line;
			if (j === 0) {
				p.classList.add('xxsmalltext');
				if (player[2]) p.classList.add('greentext'); else p.classList.add('redtext');
			}
			if (j === 1) p.classList.add('smallertext');
			if (j === 2 && player[1] === 1) {
				p.classList.add('redtext');
				p.textContent = line.slice(0, -1);
			}
			div.appendChild(p);
		});
		playersDiv.appendChild(div);
	});
}

// draws only the red outline
function drawTurnIndex() {
	if (game.turnIndex == undefined) return;
	const divId = 'player-' + game.players[game.turnIndex][0];
	document.querySelectorAll('.activeplayer').forEach(element => {
		if (element.id !== divId) element.classList.remove('activeplayer');
	});
	document.getElementById(divId).classList.add('activeplayer');
}

// draws the little direction arrow
function drawDirection() {
	if (!game.direction) return;
	if (game.direction.data === 1) document.getElementById('direction').textContent = 'Direction →';
	else document.getElementById('direction').textContent = '← Direction';
}

// draws the discard
function drawDiscardPileTopCard() {
	if (!game.discardPileTopCard) return;
	const div = document.getElementById('discard');
	div.innerHTML = '';
	const img = document.createElement('img');
	img.classList.add('cardImg');
	img.src = '/cards/' + game.discardPileTopCard.name + '.svg';
	img.alt = game.discardPileTopCard.name;
	if (game.discardPileTopCard.name.startsWith('wild') && game.discardPileTopCard.color) img.classList.add('discard-' + game.discardPileTopCard.color);
	div.appendChild(img);
}

// draw cards in hand
function drawHand() {
	if (!game.hand) return;
	const handEl = document.getElementById('hand');
	handEl.innerHTML = '';
	game.hand.forEach(card => {
		const btn = document.createElement('button');
		btn.classList.add('cardBtn');
		const img = document.createElement('img');
		img.src = '/cards/' + card.name + '.svg';
		img.alt = card.name;
		img.classList.add('cardImg');
		btn.appendChild(img);
		if (game.multiselect) {
			const checkmark = document.createElement('div');
			checkmark.classList.add('select-checkmark');
			checkmark.id = 'checkmark-' + card.name;
			btn.appendChild(checkmark);
		}
		btn.onclick = () => {
			if (game.multiselect) {
				// toggle checkmark
				btn.lastElementChild.classList.toggle('selectedCard');
				// add number
				const stillSelected = document.querySelectorAll('.selectedCard');
				if (btn.lastElementChild.classList.contains('selectedCard')) btn.lastElementChild.textContent = stillSelected.length; else {
					const createdGap = parseInt(btn.lastElementChild.textContent);
					stillSelected.forEach(x => {
						const parsed = parseInt(x.textContent);
						if (parsed > createdGap) {
							x.textContent = parsed - 1;
						}
					});
					btn.lastElementChild.textContent = '';
				}
			} else playCards(card.name);
		}
		handEl.appendChild(btn);
	});
}

// when cards are played, put them next to the pile first
async function animatePlayedCards() {
	if (game.lastPlayed?.length < 1 || !game.discardPileTopCard) return;
	const container = document.getElementById('playedcards');
	const initTimeout = 500;
	const animLength = 600;
	const interval = 300;
	const divsToRemove = [];
	setTimeout(() => {
		drawDiscardPileTopCard();
		divsToRemove.forEach(x => x.remove());
	}, initTimeout + (game.lastPlayed.length - 1) * interval + animLength);
	game.lastPlayed.forEach((card, i) => {
		const div = document.createElement('div');
		const img = document.createElement('img');
		img.src = '/cards/' + card + '.svg';
		img.alt = card;
		div.appendChild(img);
		container.appendChild(div);
		divsToRemove.push(div);
		setTimeout(() => {
			div.style.transform = `translate(calc(-40px - var(--card-width) * (1 + ${i}/3)), 0)`;
		}, initTimeout + i * interval);
	});
}

// make a button that can be clicked to claim the outstanding draw penalty, and draw an indicator that shows even when its not your turn
function drawOutstandingDrawPenalty() {
	const foundIndicator = document.getElementById('outstandingpenaltyIndicator');
	if (foundIndicator) {
		if (game.outstandingDrawPenalty === 0 || game.outstandingDrawPenalty === undefined) {
			foundIndicator.remove();
		} else {
			foundIndicator.lastElementChild.textContent = '+' + game.outstandingDrawPenalty;
			foundIndicator.className = '';
			if (game.discardPileTopCard.color) foundIndicator.classList.add(game.discardPileTopCard.color);
		}
	} else if (game.outstandingDrawPenalty > 0) {
		// todo: draw it
		const indicator = document.createElement('div');
		const p1 = document.createElement('p');
		const p2 = document.createElement('p');
		p1.textContent = 'Penalty:';
		p2.textContent = '+' + game.outstandingDrawPenalty;
		indicator.append(p1, p2);
		indicator.id = 'outstandingpenaltyIndicator';
		if (game.discardPileTopCard.color) indicator.classList.add(game.discardPileTopCard.color);
		document.getElementById('middle-left').appendChild(indicator);
	}

	// todo: if its my turn
	// draw button to receive penalty
	const foundButton = document.getElementById('outstandingPenaltyButton');
	if (game.outstandingDrawPenalty === 0 || game.outstandingDrawPenalty === undefined || !game.myTurn) {
		foundButton?.remove();
	} else if (foundButton) {
		foundButton.textContent = `Draw ${game.outstandingDrawPenalty} card${game.outstandingDrawPenalty === 1 ? '' : 's'}`;
	} else {
		const container = document.getElementById('penaltyaction-container');
		const btn = document.createElement('button');
		btn.textContent = `Draw ${game.outstandingDrawPenalty} card${game.outstandingDrawPenalty === 1 ? '' : 's'}`;
		btn.id = 'outstandingPenaltyButton';
		btn.onclick = () => playCards();
		container.appendChild(btn);
	}
}

function onMyTurn() {
	const indicator = document.getElementById('yourturnindicator');
	if (game.myTurn) indicator.classList.add('activeturnindicator');
	else indicator.classList.remove('activeturnindicator');
}

// when game info is received, save the data and call functions that use the new data
socket.on('game-info', gameInfo => {
	Object.assign(game, gameInfo);
	console.log('gameinfo', gameInfo);
	if (gameInfo.players) drawPlayers();
	else if (gameInfo.turnIndex !== undefined) {
		drawTurnIndex();
	}
	if (gameInfo.turnIndex !== undefined) {
		if (game.turnIndex === game.players.findIndex(x => x[0] === game.username)) game.myTurn = true; else game.myTurn = false;
	}

	if (gameInfo.direction) drawDirection();
	if (gameInfo.discardPileTopCard) {
		if (gameInfo.lastPlayed?.length > 0) {
			animatePlayedCards();
		} else {
			drawDiscardPileTopCard();
		}
	}
	if (gameInfo.outstandingDrawPenalty) {
		drawOutstandingDrawPenalty()
	} else {
		document.getElementById('outstandingPenaltyButton')?.remove();
		document.getElementById('outstandingpenaltyIndicator')?.remove();
	}
});

// when connected, try to auto-set name
socket.on('connect', () => {
	messagesManager.new(['Connected to the server'], 'green');
	setUsername();
});

// if disconnected accidentally, try to reconnect
socket.on('disconnect', reason => {
	const textLines = ['Disconnected: ' + reason];
	if (!['io server disconnect', 'io client disconnect'].includes(reason)) {
		textLines.push('Reconnecting...')
	}
	messagesManager.new(textLines, 'red');
});

// update to cards in hand
socket.on('your-hand', cards => {
	console.log('my hand', cards);
	game.hand = cards.sort((a, b) => {
		a.color ||= 'zzz';
		b.color ||= 'zzz';
		if (a?.color > b?.color) return 1;
		else if (a?.color < b?.color) return -1;
		else if (a?.symbol > b?.symbol) return 1;
		else if (a?.symbol < b?.symbol) return -1;
		else return 0;
	});
	drawHand();
});

// when it is my turn
socket.on('your-turn', () => {
	game.myTurn = true;
});

// when i have to choose a color to play
socket.on('choose-color', chooseColorPopup);

// when i have to choose to play the card i drew
socket.on('play-draw-one', playdrawonePopup);

// log server errors
socket.on('connect_error', console.log);

// when game ends, tell them to reload page
socket.on('end-game', winner => {
	popupManager.new({
		elements: ['The game has ended.', `${winner} won.`, 'Reload the page to play again.'],
		options: [{ text: 'Reload', color: 'gray' }],
		cb: () => location.reload(),
		priority: 10,
		type: 'endGame'
	});
});