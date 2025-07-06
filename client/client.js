const socket = io();

const screenJoin = document.getElementById('screen-join');
const screenLobby = document.getElementById('screen-lobby');
const screenGame = document.getElementById('screen-game');
const joinBtn = document.getElementById('joinBtn');
const hostBtn = document.getElementById('hostBtn');
const setMinBtn = document.getElementById('setMinBtn');
const startBtn = document.getElementById('startBtn');
const minPlayersInput = document.getElementById('minPlayers');
const playerList = document.getElementById('player-list');
const drawnNumberEl = document.getElementById('drawn-number');
const ticketContainer = document.getElementById('ticket');
const drawBtn = document.getElementById('drawBtn');
const endBtn = document.getElementById('endBtn');
const claimFullHouseBtn = document.getElementById('claimFullHouse');
const claimLucky5Btn = document.getElementById('claimLucky5');
const claimCornerBtn = document.getElementById('claimCorner');
const leaderboard = document.getElementById('leaderboard');
const errorBox = document.getElementById('error-box');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

let myTicket = [];
let drawnNumbers = [];
let isHost = false;
let roomCode = '';
let playerName = '';
let hasClaimed = { fullHouse: false, lucky5: false, corner: false };

hostBtn.onclick = () => {
  const name = document.getElementById('nameInput').value.trim();
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  if (!name) return alert('Enter name');
  playerName = name;
  roomCode = code;
  isHost = true;
  socket.emit('host-create', { name, roomCode });
};

joinBtn.onclick = () => {
  const name = document.getElementById('nameInput').value.trim();
  const code = document.getElementById('roomCodeInput').value.trim();
  if (!name || !code) return alert('Enter name and room code');
  playerName = name;
  roomCode = code;
  socket.emit('player-join', { name, roomCode });
};

setMinBtn.onclick = () => {
  const min = parseInt(minPlayersInput.value);
  if (isNaN(min) || min < 2) return alert('Enter valid number >= 2');
  socket.emit('set-min-players', { roomCode, min });
};

startBtn.onclick = () => socket.emit('host-start', { roomCode });
drawBtn.onclick = () => socket.emit('host-draw', { roomCode });
endBtn.onclick = () => location.reload();

claimFullHouseBtn.onclick = () => claim('fullHouse');
claimLucky5Btn.onclick = () => claim('lucky5');
claimCornerBtn.onclick = () => claim('corner');

chatSend.onclick = () => {
  const msg = chatInput.value.trim();
  if (msg) {
    socket.emit('send-chat', { roomCode, name: playerName, message: msg });
    chatInput.value = '';
  }
};

function claim(type) {
  if (hasClaimed[type]) return;
  socket.emit('claim', { roomCode, type, ticket: myTicket, drawn: drawnNumbers });
  hasClaimed[type] = true;
}

socket.on('host-created', ({ roomCode }) => {
  switchToLobby();
  document.getElementById('lobby-room-code').innerText = roomCode;
  document.getElementById('host-controls').style.display = 'block';
});

socket.on('player-joined-success', ({ roomCode }) => {
  switchToLobby();
  document.getElementById('lobby-room-code').innerText = roomCode;
  document.getElementById('host-controls').style.display = 'none';
});

socket.on('lobby-update', ({ players }) => {
  playerList.innerHTML = '';
  players.forEach(name => {
    const li = document.createElement('li');
    li.innerText = name;
    playerList.appendChild(li);
  });
});

socket.on('ticket', ticket => {
  myTicket = ticket;
  renderTicket();
});

socket.on('host-started', () => {
  renderHostGrid();
});

socket.on('game-started', () => {
  screenLobby.style.display = 'none';
  screenJoin.style.display = 'none';
  screenGame.style.display = 'block';

  if (isHost) {
    document.getElementById('game-host-controls').style.display = 'block';
    document.getElementById('game-player-controls').style.display = 'none';
  } else {
    document.getElementById('game-host-controls').style.display = 'none';
    document.getElementById('game-player-controls').style.display = 'block';
  }
});

socket.on('number-drawn', number => {
  drawnNumbers.push(number);
  drawnNumberEl.innerText = number;
  renderTicket();
  if (isHost) renderHostGrid();
});

socket.on('claim-winner', ({ name, type }) => {
  const li = document.createElement('li');
  li.innerText = `${type.toUpperCase()}: ${name}`;
  leaderboard.appendChild(li);
});

socket.on('invalid-claim', () => {
  errorBox.style.display = 'inline-block';
});

socket.on('chat-msg', ({ name, message }) => {
  const msg = document.createElement('div');
  msg.innerText = `${name}: ${message}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
});

function switchToLobby() {
  screenJoin.style.display = 'none';
  screenLobby.style.display = 'block';
  screenGame.style.display = 'none';
}

function renderTicket() {
  ticketContainer.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'ticket-table';
  myTicket.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(num => {
      const td = document.createElement('td');
      td.className = 'ticket-cell';
      if (num) {
        td.innerText = num;
        if (drawnNumbers.includes(num)) td.classList.add('highlighted');
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  ticketContainer.appendChild(table);
}

function renderHostGrid() {
  ticketContainer.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'ticket-table';
  for (let i = 1; i <= 90; i += 10) {
    const tr = document.createElement('tr');
    for (let j = i; j < i + 10; j++) {
      const td = document.createElement('td');
      td.className = 'ticket-cell';
      td.innerText = j;
      if (drawnNumbers.includes(j)) td.classList.add('highlighted');
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  ticketContainer.appendChild(table);
}
