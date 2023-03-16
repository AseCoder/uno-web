const cards = require('../cards.json');
module.exports = cardName => {
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