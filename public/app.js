const socket = io();

function setName() {
	const value = document.getElementById('name').value;
	if (value.length === 0) return console.log('name cannot have length 0');
	socket.emit('set-name', value, status => console.log(`set-name ack'd with status ${status}`));
}

socket.on('disconnect', reason => {
	console.log(`disconnected. reason: ${reason}`);
	socket.once('connect', setName);
});

document.getElementById('set-name').onclick = setName;

socket.on('your-hand', console.log);