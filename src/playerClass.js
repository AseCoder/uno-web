class Player {
	constructor(name, socketId) {
		this.name = name;
		this.socketId = socketId;
		this.hand = [];
	}
	disconnect() {
		this.socketId = undefined;
	}
	reconnect(socketId) {
		if (this.socketId) throw new Error();
		this.socketId = socketId;
	}
	rename(newName) {
		this.name = newName;
	}
	idEquals(otherId) {
		return this.socketId === otherId;
	}
	nameEquals(otherName) {
		return this.name == otherName;
	}
}
module.exports = Player;