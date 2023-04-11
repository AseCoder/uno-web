const cards = require('../cards.json');

/**
 * Represents a card and its visual properties
 * @typedef {object} Card
 * @property {string} name The long name
 * @property {string} color The color (red, gree, blue, yellow) (in case of wild*, empty initially but changes when player chooses color)
 * @property {string} symbol The number or action
 */

/**
 * @param {string} cardName The long name of the card that should be parsed
 * @returns {Card} The parsed card
 */
function parseCard(cardName) {
	if (!cards.some(x => x[0] + '_' + x[1] === cardName)) return undefined;
	const split = cardName.slice(0, -2).split('-');
	const color = split[0] === 'wild' ? undefined : split[0];
	const symbol = split.slice(1).join('-') || 'wild';
	return {
		name: cardName,
		color,
		symbol
	}
}
module.exports = parseCard;