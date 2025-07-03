const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'client')));
const rooms = {};

io.on('connection', socket => {
  socket.on('host-create', ({ name, roomCode }) => {
    rooms[roomCode] = {
      hostId: socket.id,
      players: { [socket.id]: { name } },
      minPlayers: 2,
      drawSequence: [],
      drawIndex: 0,
      leaderboard: []
    };
    socket.join(roomCode);
    socket.emit('host-created', { roomCode });
    io.to(roomCode).emit('lobby-update', getLobbyInfo(roomCode));
  });

  socket.on('player-join', ({ name, roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit('error', 'Room not found');
    room.players[socket.id] = { name };
    socket.join(roomCode);
    socket.emit('player-joined-success', { roomCode });
    io.to(roomCode).emit('lobby-update', getLobbyInfo(roomCode));
  });

  socket.on('set-min-players', ({ roomCode, min }) => {
    if (rooms[roomCode]?.hostId === socket.id) {
      rooms[roomCode].minPlayers = min;
      io.to(roomCode).emit('lobby-update', getLobbyInfo(roomCode));
    }
  });

  socket.on('host-start', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    const ids = Object.keys(room.players);
    if (ids.length < room.minPlayers) return;

    const tickets = generateTickets(ids.length);
    room.drawSequence = generateNumberSequence();
    room.drawIndex = 0;

    ids.forEach((sid, i) => {
      room.players[sid].ticket = tickets[i];
      io.to(sid).emit('ticket', tickets[i]);
    });

    io.to(roomCode).emit('game-started');
  });

  socket.on('host-draw', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    const idx = room.drawIndex;
    if (idx >= room.drawSequence.length) return;
    const number = room.drawSequence[idx];
    room.drawIndex++;
    io.to(roomCode).emit('number-drawn', number);
  });

  socket.on('claim-full-house', ({ roomCode, ticket, drawn }) => {
    const room = rooms[roomCode];
    const name = room?.players[socket.id]?.name;
    if (!room || !name) return;

    const allNumbers = ticket.flat().filter(n => n !== null);
    const isValid = allNumbers.every(num => drawn.includes(num));

    if (isValid && !room.leaderboard.includes(name)) {
      room.leaderboard.push(name);
      io.to(roomCode).emit('full-house-winner', name);
    } else {
      socket.emit('invalid-claim');
    }
  });
});

function getLobbyInfo(roomCode) {
  const room = rooms[roomCode];
  return {
    players: Object.values(room.players).map(p => p.name),
    minPlayers: room.minPlayers
  };
}

function generateNumberSequence() {
  const nums = Array.from({ length: 90 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

function generateTickets(count) {
  const tickets = [];
  for (let i = 0; i < count; i++) {
    const ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
    const columnNumbers = Array.from({ length: 9 }, (_, col) => {
      const start = col * 10 + 1;
      const end = col === 8 ? 90 : start + 9;
      const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      return shuffle(nums).slice(0, 3);
    });
    for (let row = 0; row < 3; row++) {
      const cols = shuffle([...Array(9).keys()]).slice(0, 5).sort((a, b) => a - b);
      cols.forEach(col => ticket[row][col] = columnNumbers[col].pop());
    }
    tickets.push(ticket);
  }
  return tickets;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

server.listen(3000, () => console.log('✅ Server running at http://localhost:3000'));
