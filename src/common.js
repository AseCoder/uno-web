const parseCard = require('./parseCard');
/** The global Game object
 * @namespace
 */
const game = {
	/**
	 * All the house rules and their activation status
	 * @type {object}
	 */
	houseRules: {
		stacking: false,
		allowIllegalWD4: false
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
	 * Returns up-to-date information about the ongoing game for players. Will only include the chosen parts.
	 * @param {object} parts
	 * @param {boolean} [parts.players=true]
	 * @param {boolean} [parts.turnIndex=true]
	 * @param {boolean} [parts.discardPileTopCard=true]
	 * @returns {GameInfo}
	 */
	generateGameInfo: function (parts) {
		const players = this.players.data.map(player => [player.name, player.hand.length]);
		const turnIndex = this.turnIndex.data;
		const discardPileTopCard = this.discardPileTopCard.data;
		if (!parts) return { players, turnIndex, discardPileTopCard };
		return {
			players: parts.players === true ? players : undefined,
			turnIndex: parts.turnIndex === true ? turnIndex : undefined,
			discardPileTopCard: parts.discardPileTopCard === true ? discardPileTopCard : undefined,
		}
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
		/**
		 * 
		 * @param {Card} newCard New Discard
		 */
		set: function (newCard) {
			if (!newCard) return;
			if (typeof newCard === 'string') {
				newCard = parseCard(newCard);
				console.error(new TypeError('newCard is type string, expected parsed card'));
			}
			this.data = newCard;
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
		 * 
		 * @param {number} newIndex New turnIndex
		 */
		set: function (newIndex) {
			this.data = newIndex;
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
		setNext() {
			this.set(this.getNext());
			game.direction.skipNext = 0;
			console.log('turnindex', this.data);
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
		}
	}
}
module.exports = game;