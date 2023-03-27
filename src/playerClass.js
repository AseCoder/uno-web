const io = require("../server");

/** Creates a player
 * @param {string} name The username that this player has chosen
 * @param {string} socketId The socket id of this player
 * @property {string} name The username that this player has chosen
 * @property {string} socketId The socket id of this player
 * @property {string[]} hand An array of cards in this player's hand
 * @property {object} socket The socket that corresponds to this.socketId
*/
class Player {
	constructor(name, socketId) {
		this.name = name;
		this.socketId = socketId;
		this.hand = [];
		this.eventListeners = {
			on: [],
			once: []
		};
		this.persistentEmits = [];
		this.skippedTurns = 0;
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
		this.eventListeners.on.forEach(arr => {
			const event = arr[0];
			const args = arr[1];
			this.socket?.on(event, ...args);
		});
		this.eventListeners.once.forEach(arr => {
			const event = arr[0];
			const args = arr[1];
			this.socket?.once(event, ...args);
		});
		this.persistentEmits.forEach(arr => {
			const event = arr[0];
			const args = arr[1];
			this.socket?.emit(event, ...args);
		});
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
	/**
	 * Wrapper for socket.on()
	 * @param {string} event The event name to listen for
	 * @param  {...any} args Other arguments, eg. data. last one can be cb
	 */
	on(event, ...args) {
		this.eventListeners.on.push([event, args]);
		this.socket?.on(event, ...args);
	}
	/**
	 * Wrapper for socket.once()
	 * @param {string} event The event name to listen for
	 * @param  {...any} args Other arguments, eg. data. last one can be cb
	 */
	once(event, ...args) {
		this.eventListeners.once.push([event, args]);
		this.socket?.once(event, ...args);
	}
	/** Removes event listeners from this player's socket
	 * @param {string} [event] The event name to remove listeners from
	 */
	removeAllListeners(event) {
		this.socket?.removeAllListeners(event);
		if (!event) return;
		this.eventListeners.on = this.eventListeners.on.filter(x => x[0] !== event);
		this.eventListeners.once = this.eventListeners.once.filter(x => x[0] !== event);
	}
	/**
	 * Emits this event and keeps emitting it upon reconnects
	 * @param {string} event The event name to listen for
	 * @param {...any} args Other arguments, eg. data. last one can be cb
	 * @returns {function} Stops emitting this event
	 */
	persistentEmit(event, ...args) {
		this.persistentEmits.push([event, args]);
		this.socket?.emit(event, ...args);
		return () => this.persistentEmits.splice(this.persistentEmits.findIndex(x => x[0] === event), 1);
	}
	get socket() {
		if (!this.socketId) return;
		return io.sockets.sockets.get(this.socketId);
	}
}
module.exports = Player;