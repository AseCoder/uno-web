/**
 * Combines effects of stacked cards
 * @param {CardEffects[]} array The effects that should be combined
 * @returns {CardEffects}
 */
function combineCardsEffects(array) {
	return {
		nextDraws: array.reduce((a, b) => a + (b.nextDraws || 0), 0),
		changeDirection:  array.reduce((a, b) => a + !!b.changeDirection, 0) % 2 === 1,
		chooseColor: array.some(x => x.chooseColor),
		skipNext: array.reduce((a, b) => a + (b.skipNext || 0), 0)
	}
}
module.exports = combineCardsEffects;
