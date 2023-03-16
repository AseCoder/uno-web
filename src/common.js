const parseCard = require('./parseCard');
const game = {
	houseRules: {
		stacking: false,
		allowIllegalWD4: false
	},
	absDeck: require('../cards.json').flatMap(card => (new Array(card[1])).fill(card[0] + '_' + card[1])),
	randomCard: function (startingCard = false) {
		if (startingCard) {
			return absDeck[Math.floor(Math.random() * (absDeck.length - 4))]; // no wild draw four
		} else return absDeck[Math.floor(Math.random() * absDeck.length)];
	},
	generateGameInfo: function () {
		return { players: this.players.data.map(player => player.name), turnIndex: this.turnIndex.data, discardPileTopCard: this.discardPileTopCard.data };
	},
	players: {
		data: [],
		reset: function () { this.data = []; },
		set: function (newPlayers) { this.data = newPlayers; },
		unshift: function(el) { this.data.unshift(el); },
		splice: function(a, b) { this.data.splice(a, b); },
	},
	discardPileTopCard: {
		data: {},
		set: function (newCard) {
			if (typeof newCard === 'string') {
				newCard = parseCard(newCard);
				console.error(new TypeError('newCard is type string, expectted parsed card'));
			}
			this.data = newCard;
		}
	},
	state: {
		data: 0,
		set: function (newState) {
			this.data = newState;
		}
	},
	turnIndex: {
		data: 0,
		set: function (newIndex) {
			this.data = newIndex;
		}
	},
	direction: {
		data: 1,
		set: function (newDirection) {
			this.data = newDirection;
		}
	}
}
module.exports = game;