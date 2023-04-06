const game = require('./common');
const parseCard = require('./parseCard');
const parseCardEffects = require('./parseCardEffects');
const combineCardsEffects = require('./combineCardsEffects');

// rules source:
// https://service.mattel.com/instruction_sheets/GDJ85-Eng.pdf
// https://en.wikipedia.org/wiki/Uno_(card_game)#Official_rules
// except pre 2018 deck
/**
 * @typedef PlayLegalityResult
 * @type {object}
 * @property {boolean} legal
 * @property {string} [reason]
 * @property {CardEffects} effects
 * @property {number} effects.thisDraws How many cards this player should draw
 * 
 */
/**
 * Determines if a play was legal and returns a suggested resolution
 * @param {string[]} cardsPlayed The cards played by the player
 * @param {Card} discardPileTopCard The Discard
 * @param {string[]} hand The player's hand (including cards they played)
 * @returns {PlayLegalityResult}
 */
function checkPlayLegality(cardsPlayed, discardPileTopCard, hand, jumpedIn) {
	const result = {
		legal: false,
		reason: undefined,
		effects: {
			thisDraws: 0,
		}
	}
	// if no dis card, play is legal, apply effects (for first card)
	if (!discardPileTopCard?.name) {
		result.legal = true;
		result.effects = parseCardEffects(cardsPlayed);
		return result;
	}
	
	const parsedBottomCard = parseCard(cardsPlayed[0]);

	// requirements for a legal move:
	// there cant be too many cards
	if (!Array.isArray(cardsPlayed)) {
		result.reason = 3;
		return result;
	}
	if (!game.houseRules.multipleCards && cardsPlayed.length > 1) {
		result.reason = 4;
		return result;
	}
	// all played cards must be real cards and in their hand, if cards are played
	const mockHand = new Array(...hand);
	const ALL_PLAYED_CARDS_IN_HAND = cardsPlayed.every(cardPlayed => {
		for (let i = 0; i < mockHand.length; i++) {
			if (mockHand[i] === cardPlayed) {
				mockHand.splice(i, 1);
				return true;
			}
		}
		return false;
	});
	if (cardsPlayed.length > 0 && !ALL_PLAYED_CARDS_IN_HAND) {
		result.reason = 2;
		return result;
	}
	if (cardsPlayed.length > 0) { // if any cards are played
		// WD4
		if (cardsPlayed[0] === 'wild-draw-four_4' && !game.houseRules.allowIllegalWD4 && hand.some(x => parseCard(x).color === discardPileTopCard.color)) {
			result.reason = 6;
			return result;
		}
		// if player jumped in and the bottom card they played isnt exactly the discard, then illegal
		console.log('playlegality jumpin');
		console.log('jumpedIn', jumpedIn);
		console.log('cardsPlayed[0]', cardsPlayed[0]);
		console.log('discardPileTopCard.name', discardPileTopCard.name);
		if (jumpedIn && cardsPlayed[0] !== discardPileTopCard.name) {
			result.reason = 12;
			return result;
		}
		// if there is an outstanding penalty and the player chose to play a card, it must match by symbol
		if (game.outstandingDrawPenalty > 0 && parsedBottomCard.symbol !== discardPileTopCard.symbol) {
			result.reason = 14;
			return result;
		}
		if (cardsPlayed.length === 1) {
			// match either number, color or action (NOT WILD)
			if (parsedBottomCard.color && parsedBottomCard.color !== discardPileTopCard.color && parsedBottomCard.symbol !== discardPileTopCard.symbol) {
				result.reason = 5;
				return result;
			}
		} else if (cardsPlayed.length > 1) {
			// if their symbol isnt the same, illegal
			if (!cardsPlayed.map(x => parseCard(x)).every((x, i, a) => x.symbol === a[0].symbol)) {
				result.reason = 7;
				return result;
			}
			// if the bottom one doesnt match the discard, illegal
			if (parsedBottomCard.symbol !== discardPileTopCard.symbol && parsedBottomCard.color !== discardPileTopCard.color && !parsedBottomCard.name.startsWith('wild')) {
				result.reason = 13;
				return result;
			}
		}
	}
	result.legal = true;
	if (cardsPlayed.length > 0) result.effects = combineCardsEffects(cardsPlayed.map(x => parseCardEffects(parseCard(x))));
	return result;
}
module.exports = checkPlayLegality;