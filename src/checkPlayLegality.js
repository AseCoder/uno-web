const parseCard = require('./parseCard');
const game = require('./common');
const parseCardEffects = require('./parseCardEffects');
// rules source:
// https://service.mattel.com/instruction_sheets/GDJ85-Eng.pdf
// except pre 2018 deck
module.exports = (cardsPlayed, discardPileTopCard, hand) => {
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
		result.effects = parseCardEffects(parseCard(cardsPlayed[0]));
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
	// all played cards must be real cards
	const deck = require('../cards.json');
	if (!cardsPlayed.every(playedCard => deck.includes(playedCard))) {
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
	} else {
		result.effects.thisDraws = 1;
	}
	result.legal = true;
	return result;
}