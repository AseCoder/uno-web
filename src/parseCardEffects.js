module.exports = card => {
	const effects = {
		nextDraws: 0,
		changeDirection: false,
		chooseColor: false,
		skipNext: false
	};
	if (card.symbol === 'draw-two') effects.nextDraws = 2;
	if (card.symbol === 'reverse') effects.changeDirection = true;
	if (card.symbol === 'skip') effects.skipNext = true;
	if (card.symbol === 'wild') effects.chooseColor = true;
	if (card.symbol === 'draw-four') {
		effects.nextDraws = 4;
		effects.chooseColor = true;
	}
	return effects; 
}