/** Creates a player
 * @param {string} name The username that this player has chosen
 * @param {string} socketId The socket id of this player
 * @property {string} name The username that this player has chosen
 * @property {string} socketId The socket id of this player
 * @property {string[]} hand An array of cards in this player's hand
*/
class Player {
	constructor(name, socketId) {
		this.name = name;
		this.socketId = socketId;
		this.hand = [];
	}
	/**
	 * Disconnects the socket from the player by removing the socket id from the player
	 */
	disconnect() {
		this.socketId = undefined;
	}
	/**
	 * Reconnects the player by adding a socket id
	 * @param {string} socketId 
	 */
	reconnect(socketId) {
		if (this.socketId) throw new Error();
		this.socketId = socketId;
	}
	/**
	 * Renames a player by assigning them a new name
	 * @param {string} newName 
	 */
	rename(newName) {
		this.name = newName;
	}
	/**
	 * Checks if this player's socket id is equal to otherId
	 * @param {string} otherId 
	 * @returns {boolean} If the ID's match
	 */
	idEquals(otherId) {
		return this.socketId === otherId;
	}
	/**
	 * Checks if this player's name is equal to otherName
	 * @param {string} otherName 
	 * @returns {boolean} If the names match
	 */
	nameEquals(otherName) {
		return this.name == otherName;
	}
	/**
	 * Adds cards to a player's hand
	 * @param {string[]} cards 
	 * @returns {string[]} this.hand
	 */
	addCards(cards) {
		this.hand.push(...cards);
		return this.hand;
	}
	/**
	 * Removes cards from the hand
	 * @param {string[]} cards
	 * @returns {string[]} this.hand
	 */
	removeCards(cards) {
		if (!cards || cards.length === 0) return this.hand;
		cards.forEach(card => {
			const i = this.hand.indexOf(card);
			if (i === -1) return console.error(new Error(`${this.name}'s hand doesnt include ${card}`));
			this.hand.splice(i, 1);
		});
		return this.hand;
	}
}
module.exports = Player;