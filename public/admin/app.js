const socket = io();

document.getElementById('start-game').onclick = e => {
	socket.emit('start-game', { pin: document.getElementById('pin').value });
}

document.getElementById('end-game').onclick = e => {
	socket.emit('end-game', { pin: document.getElementById('pin').value });
}

document.getElementById('fetch-players').onclick = e => {
	socket.emit('fetch-players', { pin: document.getElementById('pin').value }, console.log);
}

document.getElementById('fetch-houserules').onclick = e => {
	fetch('/activehouserules').then(async response => {
		const houserules = await response.json();
		const ul = document.getElementById('houserules');
		ul.innerHTML = '';
		Object.entries(houserules).forEach(x => {
			const li = document.createElement('li');
			const p = document.createElement('p');
			p.textContent = `${x[1] ? 'Active' : 'Inactive'} ${x[0]}`;
			const toggle = document.createElement('button');
			toggle.textContent = 'Toggle';
			toggle.onclick = () => {
				socket.emit('toggle-houserule', { pin: document.getElementById('pin').value, ruleName: x[0] }, cb => {
					p.textContent = `${cb ? 'Active' : 'Inactive'} ${x[0]}`;
				});
			}
			li.append(toggle, p);
			ul.appendChild(li);
		});
	});
	socket.emit('fetch-houserulesconfig', { pin: document.getElementById('pin').value }, str => {
		document.getElementById('houserulesnumber').value = str;
	});
};

document.getElementById('import-houserules').onclick = () => {
	socket.emit('import-houserulesconfig', { pin: document.getElementById('pin').value, str: document.getElementById('houserulesnumber').value }, console.log)
};

document.getElementById('fetch-houserules').click();