const parseCard = require('./parseCard');
/** The global Game object
 * @namespace
 */
const game = {
	/**
	 * All the house rules and their activation status
	 * @type {object}
	 */
	houseRules: Object.fromEntries(Object.entries(require('../public/houseRules.json')).map(x => {
		x[1] = false;
		return x;
	})),
	/**
	 * Used to toggle a house rule on or off
	 * @param {string} ruleName the name of the rule that is to be toggled
	 * @returns {boolean} new state
	 */
	toggleHouseRule(ruleName) {
		if (this.houseRules[ruleName] == undefined) return;
		this.houseRules[ruleName] = !this.houseRules[ruleName];
		return this.houseRules[ruleName];
	},
	houseRulesConfig() {
		let num = 0;
		Object.values(this.houseRules).forEach(active => {
			num += active;
			num <<= 1;
		});
		num >>= 1;
		return num.toString(16);
	},
	importHouseRulesConfig(str) {
		const num = parseInt(str, 16);
		Object.keys(this.houseRules).reverse().forEach((houserule, i) => this.houseRules[houserule] = (num & 2 ** i) === 2 ** i);
	},
	/**
	 * The UNO deck (pre 2018), long card names
	 * @type {string[]}
	 */
	absDeck: require('../cards.json').flatMap(card => (new Array(card[1])).fill(card[0] + '_' + card[1])),
	/**
	 * Generates a random card from the [absDeck]{@link game.absDeck}
	 * @param {boolean} [startingCard=false] If the card being generated is to be the first card in the discard pile (cannot be WD4)
	 * @returns {string} A random card
	 */
	randomCard: function (startingCard = false) {
		if (startingCard) {
			return this.absDeck[Math.floor(Math.random() * (this.absDeck.length - 4))]; // no wild draw four
		} else return this.absDeck[Math.floor(Math.random() * this.absDeck.length)];
	},
	/**
	 * Up-to-date information about the ongoing game for players. Might not include all these every time
	 * @typedef {object} GameInfo
	 * @property {Array[]} [players] The players' names and card amounts, mapped from {@linkcode game.players.data}
	 * @property {number} [turnIndex] Whose turn it is, as an index of the [players]{@linkcode game.players.data} array
	 * @property {Card} [discardPileTopCard] The Discard
	 */
	/**
	 * Returns up-to-date information about the ongoing game for players. Will only include the chosen parts. If you define any part, all others will be excluded.
	 * @param {object} parts
	 * @param {boolean} [parts.players=true]
	 * @param {boolean} [parts.turnIndex=true]
	 * @param {boolean} [parts.direction=true]
	 * @param {boolean} [parts.discardPileTopCard=true]
	 * @param {boolean} [parts.outstandingDrawPenalty=true]
	 * @returns {GameInfo}
	 */
	generateGameInfo: function (wantedParts) {
		const partsData = {
			players: this.players.data.map(player => [player.name, player.hand.length, player.isConnected]),
			turnIndex: this.turnIndex.data,
			direction: this.direction,
			discardPileTopCard: this.discardPileTopCard.data,
			outstandingDrawPenalty: this.outstandingDrawPenalty,
			lastPlayed: this.discardPileTopCard.lastPlayed
		}
		if (wantedParts) {
			Object.keys(partsData).forEach(x => {
				if (!wantedParts[x]) delete partsData[x];
			});
		}
		if (!this.houseRules.stackNextDraws) delete partsData.outstandingDrawPenalty;
		// dont want to send this too many times
		if (partsData.lastPlayed) this.discardPileTopCard.lastPlayed = [];
		return partsData;
	},
	/**
	 * Handles the players of the game
	 * @type {object}
	 * @namespace
	 */
	players: {
		/**
		 * The player objects
		 * @type {Player[]}
		 */
		data: [],
		/**
		 * Sets data to an empty string
		 */
		reset: function () { this.data = []; },
		/**
		 * Sets data to {@linkcode newPlayers}
		 * @param {Player[]} newPlayers 
		 */
		set: function (newPlayers) { this.data = newPlayers; },
		/**
		 * Same as Array#unshift()
		 * @param {Player} el Player object to unshift
		 */
		unshift: function(el) { this.data.unshift(el); },
		/**
		 * Same as Array#splice()
		 * @param {number} a start
		 * @param {number} b deleteCount
		 */
		splice: function(a, b) { this.data.splice(a, b); },
		/**
		 * The player whose turn it is, depends only on turnIndex
		 * @type {Player}
		 */
		get currentTurn() {
			return this.data[game.turnIndex.data];
		},
	},
	/**
	 * Handles the Discard
	 * @type {object}
	 * @namespace
	 */
	discardPileTopCard: {
		/**
		 * The Discard
		 * @type {Card}
		 */
		data: {},
		lastPlayed: [],
		/**
		 * 
		 * @param {Card} newCard New Discard
		 */
		set: function (newCard, playedCards) {
			if (!newCard) return;
			if (typeof newCard === 'string') {
				newCard = parseCard(newCard);
				console.error(new TypeError('newCard is type string, expected parsed card'));
			}
			this.data = newCard;
			this.lastPlayed = playedCards || [];
		},
		/**
		 * Set the color of the Discard, if it isn't set yet. Meant for use with the wild card.
		 * @param {string} color The color to be set. Either red, green, blue or yellow
		 * @returns {void}
		 */
		setColor(color) {
			if (this.data.color) return console.error(new Error('discard already has a color'));
			if (!['red', 'green', 'blue', 'yellow'].includes(color)) return console.error(new Error('not a valid color'));
			this.data.color = color;
		}
	},
	/**
	 * The game state which governs how stuff functions
	 * @namespace
	 */
	state: {
		data: 0,
		set: function (newState) {
			this.data = newState;
		}
	},
	/**
	 * Handles the turn index
	 * @namespace
	 */
	turnIndex: {
		/**
		 * Whose turn it is, as an index of the [players]{@linkcode game.players.data} array
		 * @type {number}
		 */
		data: 0,
		/**
		 * The total amount of turns that have been played. Can be used to determine if the turn has changed since some point
		 * @type {number}
		 */
		totalTurns: 0,
		/**
		 * 
		 * @param {number} newIndex New turnIndex
		 */
		set(newIndex) {
			this.data = newIndex;
		},
		/**
		 * Resets turnIndex and totalTurns
		 */
		reset() {
			this.data = 0;
			this.totalTurns = 0;
		},
		/**
		 * Get the hypothetical next turnIndex, based on current turnIndex, direction (+skip) and player amount
		 * @returns {number} The next turnIndex
		 */
		getNext() {
			let nextI = this.data + game.direction.data + Math.sign(game.direction.data) * game.direction.skipNext;
			if (nextI < 0 || nextI > game.players.data.length - 1) {
				nextI = nextI - game.players.data.length * Math.floor(nextI / game.players.data.length);
			}
			return nextI;
		},
		/**
		 * Sets the turnIndex to its next value
		 * @returns {void}
		 */
		setNext(jumpedIn) {
			if (!jumpedIn) this.set(this.getNext());
			game.direction.skipNext = 0;
			this.totalTurns++;
		}
	},
	/**
	 * Handles the turn direction
	 * @namespace
	 */
	direction: {
		/**
		 * Which direction the game spins in, -1 or 1. This number is added to turnIndex after each turn.
		 * @type {number}
		 */
		data: 1,
		/**
		 * How many turns to skip, added to this.data when next turn index is being calculated
		 * @type {number}
		 */
		skipNext: 0,
		/**
		 * Sets a new direction
		 * @param {number} newDirection 
		 */
		set: function (newDirection) {
			this.data = newDirection;
		},
		/**
		 * Sets the direction to the opposite of what it is now
		 */
		reverse() {
			this.data = -this.data;
		},
		/**
		 * Resets the direction and skipNext to their default values 1 and 0.
		 */
		reset() {
			this.data = 1;
			this.skipNext = 0;
		}
	},
	_acceptingPlays: true,
	/**
	 * If play-cards should be handled for _anyone_ or if it should be returned as illegal. this will be false when choosing color
	 * @type {boolean}
	 */
	get acceptingPlays() {
		return this._acceptingPlays;
	},
	set acceptingPlays(bool) {
		this._acceptingPlays = bool;
	},
	/**
	 * The function that must be called whenever a legal answer to play-cards is sent. This is used to cancel turn timeouts.
	 * @type {function}
	 */
	stopEverythingListeners: [],
	addStopEverythingListener(func) {
		this.stopEverythingListeners.push(func);
	},
	resetStopEverythingListeners() {
		this.stopEverything();
		this.stopEverythingListeners = [];
	},
	stopEverything() {
		this.stopEverythingListeners.forEach(x => x());
	},
	_outstandingDrawPenalty: 0,
	// How many cards the next player should draw. Used only if stackNextDraws is active
	get outstandingDrawPenalty() {
		return this._outstandingDrawPenalty;
	},
	set outstandingDrawPenalty(num) {
		this._outstandingDrawPenalty = num;
	}
}
module.exports = game;