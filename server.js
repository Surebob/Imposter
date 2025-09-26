import cors from "cors";
import express from "express";
import { createServer } from "http";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Server as SocketIOServer } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Game types and interfaces (converted from TypeScript)
const STAGES = {
  LOBBY: "lobby",
  CLUE: "clue", 
  DISCUSSION: "discussion",
  VOTE: "vote",
  REVEAL: "reveal"
};

// Word pairs for the game
const wordPairs = [
  { category: "Basketball", shared: "Kobe Bryant", impostor: "Michael Jordan" },
  { category: "Desserts", shared: "Chocolate Cake", impostor: "Brownie" },
  { category: "Cities", shared: "Paris", impostor: "Rome" },
  { category: "Fantasy Creatures", shared: "Dragon", impostor: "Phoenix" },
  { category: "Video Games", shared: "Minecraft", impostor: "Roblox" },
  { category: "Space", shared: "Milky Way", impostor: "Andromeda" },
  { category: "Animals", shared: "Elephant", impostor: "Hippopotamus" },
  { category: "Snacks", shared: "Potato Chips", impostor: "Popcorn" },
  { category: "Streaming", shared: "Netflix", impostor: "Hulu" },
  { category: "Music", shared: "Taylor Swift", impostor: "Olivia Rodrigo" },
  { category: "Technology", shared: "iPhone", impostor: "Samsung Galaxy" },
  { category: "Cars", shared: "Tesla", impostor: "BMW" },
  { category: "Movies", shared: "Star Wars", impostor: "Star Trek" },
  { category: "Social Media", shared: "Instagram", impostor: "TikTok" },
  { category: "Food", shared: "Pizza", impostor: "Burger" }
];

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (the CRT terminal)
app.use(express.static(__dirname));

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? true,
  },
});

// Game state
const rooms = new Map();

function createPlayer(socketId, name, isHost = false) {
  return {
    id: socketId,
    name: name.trim(),
    socketId,
    isHost,
    clue: undefined,
    vote: undefined,
    isImpostor: undefined,
    word: undefined
  };
}

function createRoom(code, hostPlayer) {
  return {
    code,
    hostId: hostPlayer.id,
    stage: STAGES.LOBBY,
    players: new Map([[hostPlayer.id, hostPlayer]]),
    wordPair: undefined,
    impostorId: undefined,
    cluesRevealed: false,
    votesRevealed: false
  };
}

function emitRoomUpdate(code) {
  const room = rooms.get(code);
  if (!room) return;

  const summary = {
    ...room,
    players: Array.from(room.players.values()).map((player) => ({
      ...player,
      word: player.isImpostor ? undefined : player.word,
      isImpostor: undefined,
    })),
  };

  io.to(code).emit("room:update", summary);
}

function generateCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function resetRound(room) {
  room.stage = STAGES.LOBBY;
  room.wordPair = undefined;
  room.impostorId = undefined;
  room.cluesRevealed = false;
  room.votesRevealed = false;
  room.players.forEach((player) => {
    player.clue = undefined;
    player.vote = undefined;
    player.isImpostor = undefined;
    player.word = undefined;
  });
}

function assignWords(room) {
  const players = Array.from(room.players.values());
  if (players.length < 3) {
    throw new Error("Need at least 3 players to start a round.");
  }

  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
  if (!pair) {
    throw new Error("No word pairs available. Add more to keep the party going!");
  }

  const impostor = players[Math.floor(Math.random() * players.length)];
  if (!impostor) {
    throw new Error("Unable to assign an impostor. Try adding more players.");
  }

  room.wordPair = pair;
  room.impostorId = impostor.id;

  players.forEach((player) => {
    if (player.id === impostor.id) {
      player.isImpostor = true;
      player.word = pair.impostor;
    } else {
      player.isImpostor = false;
      player.word = pair.shared;
    }
  });
}

function serializePlayer(player) {
  return {
    ...player,
    word: undefined,
    isImpostor: undefined,
  };
}

// Socket.IO event handlers
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("room:create", ({ name }) => {
    try {
      const code = generateCode();
      const player = createPlayer(socket.id, name, true);
      const room = createRoom(code, player);

      rooms.set(code, room);
      socket.join(code);
      socket.emit("room:joined", { room: code, player: serializePlayer(player) });
      emitRoomUpdate(code);
      
      console.log(`Room created: ${code} by ${name}`);
    } catch (error) {
      socket.emit("room:error", { message: error.message });
    }
  });

  socket.on("room:join", ({ code, name }) => {
    try {
      const normalizedCode = code.trim().toUpperCase();
      const room = rooms.get(normalizedCode);
      
      if (!room) {
        socket.emit("room:error", { message: "Room not found." });
        return;
      }

      const existingName = Array.from(room.players.values()).find(
        (player) => player.name.toLowerCase() === name.trim().toLowerCase()
      );
      
      if (existingName) {
        socket.emit("room:error", { message: "Name already in use in this room." });
        return;
      }

      const player = createPlayer(socket.id, name, false);
      room.players.set(player.id, player);
      socket.join(normalizedCode);
      socket.emit("room:joined", { room: normalizedCode, player: serializePlayer(player) });
      emitRoomUpdate(normalizedCode);
      
      console.log(`${name} joined room: ${normalizedCode}`);
    } catch (error) {
      socket.emit("room:error", { message: error.message });
    }
  });

  socket.on("room:leave", ({ code }) => {
    try {
      const room = rooms.get(code);
      if (!room) return;

      const player = room.players.get(socket.id);
      const playerName = player?.name || "Unknown";
      
      room.players.delete(socket.id);
      socket.leave(code);

      if (room.players.size === 0) {
        rooms.delete(code);
        console.log(`Room ${code} deleted (empty)`);
        return;
      }

      // Transfer host if needed
      if (room.hostId === socket.id) {
        const [nextHost] = room.players.values();
        if (nextHost) {
          nextHost.isHost = true;
          room.hostId = nextHost.id;
          console.log(`Host transferred to ${nextHost.name} in room ${code}`);
        }
      }

      emitRoomUpdate(code);
      console.log(`${playerName} left room: ${code}`);
    } catch (error) {
      console.error("Error in room:leave:", error);
    }
  });

  socket.on("round:start", ({ code }) => {
    try {
      const room = rooms.get(code);
      if (!room) return;
      if (room.hostId !== socket.id) return;

      resetRound(room);
      assignWords(room);
      room.stage = STAGES.CLUE;

      room.players.forEach((player) => {
        io.to(player.socketId).emit("round:word", {
          word: player.word,
          category: room.wordPair?.category,
          isImpostor: player.isImpostor,
        });
      });

      emitRoomUpdate(code);
      console.log(`Round started in room: ${code}`);
    } catch (error) {
      socket.emit("room:error", { message: error.message });
    }
  });

  socket.on("clue:submit", ({ code, clue }) => {
    try {
      const room = rooms.get(code);
      if (!room) return;
      
      const player = room.players.get(socket.id);
      if (!player || room.stage !== STAGES.CLUE) return;

      player.clue = clue.trim().slice(0, 60);

      const allSubmitted = Array.from(room.players.values()).every((p) => p.clue);
      if (allSubmitted) {
        room.stage = STAGES.DISCUSSION;
        room.cluesRevealed = true;
      }

      emitRoomUpdate(code);
      console.log(`${player.name} submitted clue in room: ${code}`);
    } catch (error) {
      console.error("Error in clue:submit:", error);
    }
  });

  socket.on("discussion:advance", ({ code }) => {
    try {
      const room = rooms.get(code);
      if (!room) return;
      if (room.hostId !== socket.id) return;
      if (room.stage !== STAGES.DISCUSSION) return;

      room.stage = STAGES.VOTE;
      room.votesRevealed = false;
      room.players.forEach((player) => {
        player.vote = undefined;
      });

      emitRoomUpdate(code);
      console.log(`Voting phase started in room: ${code}`);
    } catch (error) {
      console.error("Error in discussion:advance:", error);
    }
  });

  socket.on("vote:submit", ({ code, targetId }) => {
    try {
      const room = rooms.get(code);
      if (!room) return;
      if (room.stage !== STAGES.VOTE) return;
      
      const player = room.players.get(socket.id);
      if (!player) return;

      player.vote = targetId;

      const allVoted = Array.from(room.players.values()).every((p) => p.vote);
      if (allVoted) {
        room.stage = STAGES.REVEAL;
        room.votesRevealed = true;
        emitRoomUpdate(code);

        // Calculate vote results
        const voteCounts = new Map();
        room.players.forEach((p) => {
          if (!p.vote) return;
          voteCounts.set(p.vote, (voteCounts.get(p.vote) || 0) + 1);
        });

        let eliminated = undefined;
        voteCounts.forEach((count, playerId) => {
          if (!eliminated || count > (voteCounts.get(eliminated.id) || 0)) {
            const target = room.players.get(playerId);
            if (target) {
              eliminated = target;
            }
          }
        });

        io.to(code).emit("round:reveal", {
          impostorId: room.impostorId,
          wordPair: room.wordPair,
          eliminatedId: eliminated?.id,
        });
        
        console.log(`Round ended in room: ${code}, eliminated: ${eliminated?.name}`);
      } else {
        emitRoomUpdate(code);
      }
    } catch (error) {
      console.error("Error in vote:submit:", error);
    }
  });

  socket.on("round:reset", ({ code }) => {
    try {
      const room = rooms.get(code);
      if (!room) return;
      if (room.hostId !== socket.id) return;

      resetRound(room);
      emitRoomUpdate(code);
      console.log(`Round reset in room: ${code}`);
    } catch (error) {
      console.error("Error in round:reset:", error);
    }
  });

  socket.on("disconnect", () => {
    try {
      console.log(`Player disconnected: ${socket.id}`);
      
      rooms.forEach((room, code) => {
        if (!room.players.has(socket.id)) return;
        
        const wasHost = room.hostId === socket.id;
        const player = room.players.get(socket.id);
        const playerName = player?.name || "Unknown";
        
        room.players.delete(socket.id);
        
        if (room.players.size === 0) {
          rooms.delete(code);
          console.log(`Room ${code} deleted (empty after disconnect)`);
          return;
        }

        if (wasHost) {
          const [nextHost] = room.players.values();
          if (nextHost) {
            nextHost.isHost = true;
            room.hostId = nextHost.id;
            console.log(`Host transferred to ${nextHost.name} in room ${code}`);
          }
        }

        emitRoomUpdate(code);
        console.log(`${playerName} disconnected from room: ${code}`);
      });
    } catch (error) {
      console.error("Error in disconnect:", error);
    }
  });
});

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ 
    status: "ok", 
    rooms: rooms.size,
    totalPlayers: Array.from(rooms.values()).reduce((sum, room) => sum + room.players.size, 0)
  });
});

// API endpoint to get room info (for debugging)
app.get("/api/rooms", (_, res) => {
  const roomsInfo = Array.from(rooms.entries()).map(([code, room]) => ({
    code,
    stage: room.stage,
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map(p => ({ name: p.name, isHost: p.isHost }))
  }));
  res.json(roomsInfo);
});

// Serve the CRT terminal as the main page
app.get("/", (_, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

// Catch-all route for production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    // Skip API routes and socket.io
    if (req.path.startsWith('/socket.io') || req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    // Serve index.html for all other routes
    res.sendFile(join(__dirname, "index.html"));
  });
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🖥️  Who Is It? CRT Terminal running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🎮 Game terminal: http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔌 Shutting down server...');
  server.close(() => {
    console.log('💀 Server terminated');
    process.exit(0);
  });
});

export default app;
