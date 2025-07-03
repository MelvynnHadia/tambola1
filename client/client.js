const socket = io();

// DOM elements
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
const claimBtn = document.getElementById('claimBtn');
const waitingText = document.getElementById('waitingText');
const leaderboard = document.getElementById('leaderboard');
const errorBox = document.getElementById('error-box');

let myTicket = [];
let drawnNumbers = [];
let isHost = false;
let roomCode = '';
let hasClaimed = false;

// Handle Host button
hostBtn.onclick = () => {
  const name = document.getElementById('nameInput').value.trim();
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  if (!name) return alert('Enter name');
  roomCode = code;
  isHost = true;
  socket.emit('host-create', { name, roomCode });
};

// Handle Join button
joinBtn.onclick = () => {
  const name = document.getElementById('nameInput').value.trim();
  const code = document.getElementById('roomCodeInput').value.trim();
  if (!name || !code) return alert('Enter name and room code');
  roomCode = code;
  socket.emit('player-join', { name, roomCode });
};

// Set minimum players
setMinBtn.onclick = () => {
  const min = parseInt(minPlayersInput.value);
  if (isNaN(min) || min < 2) return alert('Enter valid number >= 2');
  socket.emit('set-min-players', { roomCode, min });
};

// Host starts the game
startBtn.onclick = () => {
  socket.emit('host-start', { roomCode });
};

// Host draws number
drawBtn.onclick = () => {
  socket.emit('host-draw', { roomCode });
};

// Host ends game
endBtn.onclick = () => {
  location.reload(); // reload to reset everything
};

// Player claims full house
claimBtn.onclick = () => {
  if (!hasClaimed) {
    socket.emit('claim-full-house', { roomCode, ticket: myTicket, drawn: drawnNumbers });
    hasClaimed = true;
    claimBtn.disabled = true;
  }
};

// Socket Listeners
socket.on('host-created', ({ roomCode }) => {
  switchToLobby();
  document.getElementById('lobby-room-code').innerText = roomCode;
  document.getElementById('host-controls').style.display = 'block';
});

socket.on('player-joined-success', ({ roomCode }) => {
  switchToLobby();
  document.getElementById('lobby-room-code').innerText = roomCode;
  waitingText.style.display = 'block';
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

socket.on('ticket', (ticket) => {
  myTicket = ticket;
  renderTicket();
});

socket.on('game-started', () => {
  screenLobby.style.display = 'none';
  screenJoin.style.display = 'none';
  screenGame.style.display = 'block';
  if (isHost) document.getElementById('game-host-controls').style.display = 'block';
});

socket.on('number-drawn', (number) => {
  drawnNumbers.push(number);
  drawnNumberEl.innerText = number;
  renderTicket();
});

socket.on('full-house-winner', (name) => {
  const li = document.createElement('li');
  li.innerText = name;
  leaderboard.appendChild(li);
});

socket.on('invalid-claim', () => {
  errorBox.style.display = 'inline-block';
});

// Utility Functions
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
        if (drawnNumbers.includes(num)) {
          td.classList.add('highlighted');
        }
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  ticketContainer.appendChild(table);
}
