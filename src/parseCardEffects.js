/**
 * The effects of a card on players
 * @typedef {object} CardEffects
 * @property {number} nextDraws The amount of cards the next player has to draw
 * @property {boolean} changeDirection If the play direction should change
 * @property {boolean} chooseColor If the current player should choose a new play color
 * @property {boolean} skipNext If the next player should be skipped
 */
/**
 * 
 * @param {Card} card The card whose effects should be parsed
 * @returns {CardEffects} The effects of the card
 */
function parseCardEffects(card) {
	const effects = {
		nextDraws: 0,
		changeDirection: false,
		chooseColor: false,
		skipNext: 0
	};
	if (card.symbol === 'draw-two') effects.nextDraws = 2;
	if (card.symbol === 'reverse') effects.changeDirection = true;
	if (card.symbol === 'skip') effects.skipNext = 1;
	if (card.symbol === 'wild') effects.chooseColor = true;
	if (card.symbol === 'draw-four') {
		effects.nextDraws = 4;
		effects.chooseColor = true;
	}
	return effects;
}
module.exports = parseCardEffects;