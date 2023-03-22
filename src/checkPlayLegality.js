const game = require('./common');
const parseCard = require('./parseCard');
const parseCardEffects = require('./parseCardEffects');
const combineCardsEffects = require('./combineCardsEffects');

// rules source:
// https://service.mattel.com/instruction_sheets/GDJ85-Eng.pdf
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
function checkPlayLegality(cardsPlayed, discardPileTopCard, hand) {
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
		result.effects = parseCardEffects(parseCard(cardsPlayed[0].name || cardsPlayed[0]));
		return result;
	}

	// requirements for a legal move:
	// there cant be too many cards
	if (!Array.isArray(cardsPlayed)) {
		result.reason = 3;
		return result;
	}
	if (!game.houseRules.stacking && cardsPlayed.length > 1) {
		result.reason = 4;
		return result;
	}
	// all played cards must be real cards and in their hand, if cards are played
	if (cardsPlayed.length > 0 && !cardsPlayed.every(playedCard => hand.includes(playedCard))) {
		result.reason = 2;
		return result;
	}
	if (cardsPlayed.length > 0) { // if any cards are played
		// WD4
		if (cardsPlayed[0] === 'wild-draw-four_4' && !game.houseRules.allowIllegalWD4 && hand.some(x => parseCard(x).color === discardPileTopCard.color)) {
			result.reason = 6;
			return result;
		}
		if (cardsPlayed.length === 1) {
			// match either number, color or action (NOT WILD)
			const cardPlayed = parseCard(cardsPlayed[0]);
			if (cardPlayed.color && cardPlayed.color !== discardPileTopCard.color && cardPlayed.symbol !== discardPileTopCard.symbol) {
				result.reason = 5;
				return result;
			}
		} else if (cardsPlayed.length > 1) {
			// recursive?
		}
	}
	result.legal = true;
	result.effects = combineCardsEffects(cardsPlayed.map(x => parseCardEffects(parseCard(x))));
	return result;
}
module.exports = checkPlayLegality;