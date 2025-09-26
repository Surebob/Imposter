import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer, Socket } from "socket.io";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const CLIENT_BUILD_PATH = path.join(__dirname, "../client/dist");

type Stage = "lobby" | "clue" | "discussion" | "vote" | "reveal";

interface Player {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  clue?: string;
  vote?: string;
  isImpostor?: boolean;
  word?: string;
}

interface WordPair {
  shared: string;
  impostor: string;
  category: string;
}

interface GameRoom {
  code: string;
  hostId: string;
  stage: Stage;
  players: Map<string, Player>;
  wordPair?: WordPair;
  impostorId?: string;
  cluesRevealed: boolean;
  votesRevealed: boolean;
}

type RoomSummary = Omit<GameRoom, "players"> & {
  players: Player[];
};

const wordPairs: WordPair[] = [
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
];

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? true,
  },
});

const rooms = new Map<string, GameRoom>();

function emitRoomUpdate(code: string) {
  const room = rooms.get(code);
  if (!room) return;

  const summary: RoomSummary = {
    ...room,
    players: Array.from(room.players.values()).map((player) => ({
      ...player,
      word: player.isImpostor ? undefined : player.word,
      isImpostor: undefined,
    })),
  };

  io.to(code).emit("room:update", summary);
}

function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function resetRound(room: GameRoom) {
  room.stage = "lobby";
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

function assignWords(room: GameRoom) {
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

function serializePlayer(player: Player): Player {
  return {
    ...player,
    word: undefined,
    isImpostor: undefined,
  };
}

io.on("connection", (socket: Socket) => {
  socket.on("room:create", ({ name }: { name: string }) => {
    const code = generateCode();
    const player: Player = {
      id: socket.id,
      name,
      socketId: socket.id,
      isHost: true,
    };

    const room: GameRoom = {
      code,
      hostId: player.id,
      stage: "lobby",
      players: new Map([[player.id, player]]),
      cluesRevealed: false,
      votesRevealed: false,
    };

    rooms.set(code, room);
    socket.join(code);
    socket.emit("room:joined", { room: code, player: serializePlayer(player) });
    emitRoomUpdate(code);
  });

  socket.on("room:join", ({ code, name }: { code: string; name: string }) => {
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

    const player: Player = {
      id: socket.id,
      name,
      socketId: socket.id,
      isHost: false,
    };

    room.players.set(player.id, player);
    socket.join(normalizedCode);
    socket.emit("room:joined", { room: normalizedCode, player: serializePlayer(player) });
    emitRoomUpdate(normalizedCode);
  });

  socket.on("room:leave", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;

    room.players.delete(socket.id);
    socket.leave(code);

    if (room.players.size === 0) {
      rooms.delete(code);
      return;
    }

    if (room.hostId === socket.id) {
      const [nextHost] = room.players.values();
      if (nextHost) {
        nextHost.isHost = true;
        room.hostId = nextHost.id;
      }
    }

    emitRoomUpdate(code);
  });

  socket.on("round:start", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.hostId !== socket.id) return;

    try {
      resetRound(room);
      assignWords(room);
      room.stage = "clue";

      room.players.forEach((player) => {
        io.to(player.socketId).emit("round:word", {
          word: player.word,
          category: room.wordPair?.category,
          isImpostor: player.isImpostor,
        });
      });

      emitRoomUpdate(code);
    } catch (error) {
      if (error instanceof Error) {
        socket.emit("room:error", { message: error.message });
      }
    }
  });

  socket.on("clue:submit", ({ code, clue }: { code: string; clue: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || room.stage !== "clue") return;

    player.clue = clue.trim().slice(0, 60);

    const allSubmitted = Array.from(room.players.values()).every((p) => p.clue);
    if (allSubmitted) {
      room.stage = "discussion";
      room.cluesRevealed = true;
    }

    emitRoomUpdate(code);
  });

  socket.on("discussion:advance", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    if (room.stage !== "discussion") return;

    room.stage = "vote";
    room.votesRevealed = false;
    room.players.forEach((player) => {
      player.vote = undefined;
    });

    emitRoomUpdate(code);
  });

  socket.on("vote:submit", ({ code, targetId }: { code: string; targetId: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.stage !== "vote") return;
    const player = room.players.get(socket.id);
    if (!player) return;

    player.vote = targetId;

    const allVoted = Array.from(room.players.values()).every((p) => p.vote);
    if (allVoted) {
      room.stage = "reveal";
      room.votesRevealed = true;
      emitRoomUpdate(code);

      const voteCounts = new Map<string, number>();
      room.players.forEach((p) => {
        if (!p.vote) return;
        voteCounts.set(p.vote, (voteCounts.get(p.vote) ?? 0) + 1);
      });

      let eliminated: Player | undefined;
      voteCounts.forEach((count, playerId) => {
        if (!eliminated || count > (voteCounts.get(eliminated.id) ?? 0)) {
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
    } else {
      emitRoomUpdate(code);
    }
  });

  socket.on("round:reset", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.hostId !== socket.id) return;

    resetRound(room);
    emitRoomUpdate(code);
  });

  socket.on("disconnect", () => {
    rooms.forEach((room, code) => {
      if (!room.players.has(socket.id)) return;
      const wasHost = room.hostId === socket.id;
      room.players.delete(socket.id);
      if (room.players.size === 0) {
        rooms.delete(code);
        return;
      }

      if (wasHost) {
        const [nextHost] = room.players.values();
        if (nextHost) {
          nextHost.isHost = true;
          room.hostId = nextHost.id;
        }
      }

      emitRoomUpdate(code);
    });
  });
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(CLIENT_BUILD_PATH));
  // Express 5 with path-to-regexp v7 requires different syntax
  // Using middleware approach for catch-all instead of route pattern
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/socket.io') || req.path === '/health') {
      return next();
    }
    // Serve index.html for all other routes (SPA fallback)
    res.sendFile(path.join(CLIENT_BUILD_PATH, "index.html"));
  });
}

// Bind to 0.0.0.0 for cloud environments
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});
