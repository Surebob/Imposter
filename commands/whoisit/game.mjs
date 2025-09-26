import { type, prompt } from "../../util/io.js";
import { authenticate, clear, getScreen } from "../../util/screens.js";
import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
import pause from "../../util/pause.js";

export default class WhoisitGame {
  constructor() {
    this.socket = null;
    this.room = null;
    this.player = null;
    this.wordInfo = null;
    this.revealData = null;
    this.gameRunning = true;
  }

  async start() {
    await this.showIntro();
    const mode = await this.selectMode();
    
    if (mode === 'host') {
      await this.hostFlow();
    } else if (mode === 'join') {
      await this.joinFlow();
    } else {
      return;
    }

    if (this.socket) {
      await this.gameLoop();
    }
  }

  async showIntro() {
    clear();
    await type([
      "╔══════════════════════════════════════════╗",
      "║          WHO IS IT?                      ║",
      "║    IMPOSTOR DETECTION PROTOCOL v2.1      ║", 
      "╚══════════════════════════════════════════╝",
      " ",
      "INITIALIZING NEURAL DECEPTION SCANNERS...",
      "LOADING QUANTUM ENTANGLEMENT MATRIX...",
      "CALIBRATING TRUST VERIFICATION SYSTEMS...",
      " ",
      "STATUS: READY FOR OPERATION"
    ], { lineWait: 200 });
  }

  async selectMode() {
    await type([
      " ",
      "SELECT OPERATIONAL MODE:",
      " ",
      "┌─────────────────────────────────────────┐",
      "│ [1] HOST NEW DETECTION SESSION          │",
      "│ [2] JOIN EXISTING SESSION               │", 
      "│ [3] ABORT MISSION                       │",
      "└─────────────────────────────────────────┘",
      " "
    ]);

    while (true) {
      const selection = await prompt("ENTER SELECTION [1-3]:");
      const choice = selection.trim();

      if (choice === '1') return 'host';
      if (choice === '2') return 'join';
      if (choice === '3') return 'abort';
      
      await type("INVALID SELECTION. TRY AGAIN.");
    }
  }

  async hostFlow() {
    clear();
    await type([
      "╔══════════════════════════════════════════╗",
      "║           HOST PROTOCOL INIT             ║",
      "╚══════════════════════════════════════════╝",
      " ",
      "ESTABLISHING COMMAND AUTHORITY..."
    ]);

    const { user } = await authenticate({
      requirePassword: false,
      successMessage: "HOST AUTHORIZATION CONFIRMED",
      usernameLabel: "HOST DESIGNATION:"
    });

    await this.connectToServer();
    
    if (this.socket) {
      this.socket.emit("room:create", { name: user });
      await this.waitForConnection();
    }
  }

  async joinFlow() {
    clear();
    await type([
      "╔══════════════════════════════════════════╗",
      "║          OPERATIVE PROTOCOL              ║", 
      "╚══════════════════════════════════════════╝",
      " ",
      "REQUESTING OPERATIVE CLEARANCE..."
    ]);

    const { user } = await authenticate({
      requirePassword: false,
      successMessage: "OPERATIVE AUTHORIZATION CONFIRMED",
      usernameLabel: "OPERATIVE DESIGNATION:"
    });

    clear();
    await type("ENTER SESSION ACCESS CODE:");
    const roomCode = await prompt("CODE:");

    await this.connectToServer();
    
    if (this.socket) {
      this.socket.emit("room:join", { code: roomCode, name: user });
      await this.waitForConnection();
    }
  }

  async connectToServer() {
    const serverUrl = window.location.origin;
    
    try {
      this.socket = io(serverUrl, {
        transports: ["websocket", "polling"],
      });

      this.setupSocketListeners();
      
      return new Promise((resolve) => {
        this.socket.on("connect", () => {
          type("QUANTUM LINK ESTABLISHED");
          resolve();
        });

        this.socket.on("connect_error", () => {
          type("ERROR: QUANTUM LINK FAILED");
          resolve();
        });
      });
    } catch (error) {
      await type("CRITICAL ERROR: SERVER UNREACHABLE");
      return null;
    }
  }

  setupSocketListeners() {
    this.socket.on("room:error", async ({ message }) => {
      await type(`SYSTEM ERROR: ${message}`);
      await pause(2);
    });

    this.socket.on("room:joined", ({ room: roomCode, player: playerInfo }) => {
      this.room = { 
        code: roomCode, 
        stage: "lobby", 
        players: [], 
        cluesRevealed: false, 
        votesRevealed: false 
      };
      this.player = playerInfo;
    });

    this.socket.on("room:update", (summary) => {
      this.room = summary;
    });

    this.socket.on("round:word", (payload) => {
      this.wordInfo = payload;
    });

    this.socket.on("round:reveal", (payload) => {
      this.revealData = payload;
    });
  }

  async waitForConnection() {
    await type("ESTABLISHING SECURE CONNECTION...");
    
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.room && this.player) {
          clearInterval(interval);
          resolve();
        }
      };
      
      const interval = setInterval(checkConnection, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        if (!this.room) {
          type("CONNECTION TIMEOUT");
        }
        resolve();
      }, 10000);
    });
  }

  async gameLoop() {
    while (this.gameRunning && this.room) {
      await this.displayGameState();
      await this.handleInput();
      await pause(0.1);
    }
  }

  async displayGameState() {
    if (!this.room) return;
    
    clear();
    
    // Header
    await type([
      "╔══════════════════════════════════════════╗",
      "║      WHO IS IT? - ACTIVE SESSION         ║",
      "╚══════════════════════════════════════════╝",
      " ",
      `SESSION ID: ${this.room.code}`,
      `MISSION STAGE: ${this.room.stage.toUpperCase()}`,
      `OPERATIVES CONNECTED: ${this.room.players.length}`,
      " "
    ]);

    // Player list
    await type("OPERATIVE ROSTER:");
    await type("┌────────────────────────┬──────────┐");
    await type("│ DESIGNATION            │ ROLE     │");
    await type("├────────────────────────┼──────────┤");
    
    for (const player of this.room.players) {
      const role = player.isHost ? "HOST    " : "AGENT   ";
      const you = player.id === this.player?.id ? " ◄" : "  ";
      const name = player.name.padEnd(22);
      await type(`│ ${name} │ ${role} │${you}`);
    }
    
    await type("└────────────────────────┴──────────┘");
    await type(" ");

    // Stage-specific display
    switch (this.room.stage) {
      case "lobby":
        await this.displayLobby();
        break;
      case "clue":
        await this.displayClueStage();
        break;
      case "discussion":
        await this.displayDiscussion();
        break;
      case "vote":
        await this.displayVoting();
        break;
      case "reveal":
        await this.displayResults();
        break;
    }

    await type(" ");
    await type("AVAILABLE COMMANDS: EXIT, HELP");
  }

  async displayLobby() {
    await type([
      "STATUS: AWAITING MISSION PARAMETERS",
      " "
    ]);
    
    if (this.player?.isHost) {
      if (this.room.players.length >= 3) {
        await type("READY FOR DEPLOYMENT.");
        await type("COMMAND: START");
      } else {
        await type("⚠️  INSUFFICIENT OPERATIVES");
        await type("MINIMUM 3 AGENTS REQUIRED FOR MISSION");
      }
    } else {
      await type("STANDBY. AWAITING HOST AUTHORIZATION...");
    }
  }

  async displayClueStage() {
    if (!this.wordInfo) return;
    
    await type([
      "╔══════════════════════════════════════════╗",
      "║           MISSION BRIEFING               ║",
      "╚══════════════════════════════════════════╝",
      " ",
      `OPERATIONAL CATEGORY: ${this.wordInfo.category}`,
      `YOUR CODENAME: ${this.wordInfo.word}`,
      " "
    ]);

    if (this.wordInfo.isImpostor) {
      await type([
        "⚠️ ⚠️ ⚠️  CLASSIFIED ALERT  ⚠️ ⚠️ ⚠️",
        " ",
        "YOU ARE THE IMPOSTOR",
        " ",
        "MISSION: BLEND IN WITHOUT DETECTION",
        "DO NOT REVEAL YOUR TRUE CODENAME",
        " "
      ]);
    } else {
      await type([
        "MISSION: IDENTIFY THE IMPOSTOR",
        " ",
        "PROVIDE A CLUE RELATED TO YOUR CODENAME",
        "BE CAREFUL - THE IMPOSTOR WILL TRY TO BLEND IN",
        " "
      ]);
    }

    // Show submission status
    await type("CLUE SUBMISSION STATUS:");
    for (const player of this.room.players) {
      const status = player.clue ? "✓ SUBMITTED" : "⏳ PENDING  ";
      await type(`  ${player.name}: ${status}`);
    }

    await type(" ");
    await type("COMMAND: CLUE [your clue here]");
  }

  async displayDiscussion() {
    await type([
      "╔══════════════════════════════════════════╗",
      "║        INTELLIGENCE ANALYSIS             ║",
      "╚══════════════════════════════════════════╝",
      " ",
      "COLLECTED CLUES:"
    ]);

    for (const player of this.room.players) {
      if (player.clue) {
        await type(`  ${player.name}: "${player.clue}"`);
      }
    }

    await type([
      " ",
      "ANALYZE THE CLUES TO IDENTIFY DECEPTION.",
      " "
    ]);
    
    if (this.player?.isHost) {
      await type("COMMAND: PROCEED (to advance to voting)");
    } else {
      await type("AWAITING HOST AUTHORIZATION TO PROCEED...");
    }
  }

  async displayVoting() {
    await type([
      "╔══════════════════════════════════════════╗",
      "║          ELIMINATION PROTOCOL            ║",
      "╚══════════════════════════════════════════╝",
      " ",
      "SELECT TARGET FOR ELIMINATION:",
      " "
    ]);

    this.room.players.forEach((player, index) => {
      const you = player.id === this.player?.id ? " (YOU)" : "";
      type(`  [${index + 1}] ${player.name}${you}`);
    });

    await type([
      " ",
      "COMMAND: VOTE [number]"
    ]);
  }

  async displayResults() {
    if (!this.revealData) return;
    
    const impostor = this.room.players.find(p => p.id === this.revealData.impostorId);
    const eliminated = this.room.players.find(p => p.id === this.revealData.eliminatedId);

    await type([
      "╔══════════════════════════════════════════╗",
      "║         MISSION ANALYSIS COMPLETE        ║",
      "╚══════════════════════════════════════════╝",
      " ",
      `IMPOSTOR IDENTIFIED: ${impostor?.name || "UNKNOWN"}`,
      `ELIMINATED OPERATIVE: ${eliminated?.name || "NONE"}`,
      " "
    ]);

    if (this.revealData.wordPair) {
      await type([
        "INTELLIGENCE BREAKDOWN:",
        "┌────────────────────────────────────────┐",
        `│ CATEGORY: ${this.revealData.wordPair.category.padEnd(29)} │`,
        `│ TEAM CODENAME: ${this.revealData.wordPair.shared.padEnd(24)} │`,
        `│ IMPOSTOR CODENAME: ${this.revealData.wordPair.impostor.padEnd(20)} │`,
        "└────────────────────────────────────────┘",
        " "
      ]);
    }

    // Determine mission outcome
    const impostorEliminated = eliminated?.id === this.revealData.impostorId;
    const missionStatus = impostorEliminated ? "SUCCESS" : "FAILURE";
    
    await type([
      `MISSION STATUS: ${missionStatus}`,
      " "
    ]);

    if (this.player?.isHost) {
      await type("COMMANDS: RESTART, EXIT");
    } else {
      await type("AWAITING HOST INSTRUCTIONS...");
    }
  }

  async handleInput() {
    const input = await prompt(">");
    const command = input.toLowerCase().trim();
    const args = input.substring(command.length).trim();

    switch (command) {
      case 'exit':
      case 'quit':
        await this.exitGame();
        break;
        
      case 'start':
        if (this.room?.stage === "lobby" && this.player?.isHost) {
          this.socket.emit("round:start", { code: this.room.code });
        }
        break;
        
      case 'clue':
        if (this.room?.stage === "clue" && args) {
          this.socket.emit("clue:submit", { code: this.room.code, clue: args });
        }
        break;
        
      case 'proceed':
        if (this.room?.stage === "discussion" && this.player?.isHost) {
          this.socket.emit("discussion:advance", { code: this.room.code });
        }
        break;
        
      case 'vote':
        if (this.room?.stage === "vote" && /^\d+$/.test(args)) {
          const index = parseInt(args) - 1;
          const targetPlayer = this.room.players[index];
          if (targetPlayer) {
            this.socket.emit("vote:submit", { 
              code: this.room.code, 
              targetId: targetPlayer.id 
            });
          }
        }
        break;
        
      case 'restart':
        if (this.room?.stage === "reveal" && this.player?.isHost) {
          this.socket.emit("round:reset", { code: this.room.code });
        }
        break;
        
      case 'help':
        await this.showHelp();
        break;
        
      default:
        await type(`UNKNOWN COMMAND: ${command}`);
    }
  }

  async showHelp() {
    await type([
      " ",
      "AVAILABLE COMMANDS:",
      "─────────────────",
      "START     - Begin mission (host only)",
      "CLUE [x]  - Submit clue during briefing phase",
      "PROCEED   - Advance to voting (host only)", 
      "VOTE [n]  - Vote for player number n",
      "RESTART   - Start new mission (host only)",
      "HELP      - Show this help",
      "EXIT      - Terminate session",
      " "
    ]);
  }

  async connectToServer() {
    const serverUrl = window.location.origin;
    
    await type("ESTABLISHING QUANTUM COMMUNICATION LINK...");
    
    try {
      this.socket = io(serverUrl, {
        transports: ["websocket", "polling"],
      });

      this.setupSocketListeners();
      
      return new Promise((resolve) => {
        this.socket.on("connect", async () => {
          await type("LINK ESTABLISHED - PROTOCOL ACTIVE");
          resolve();
        });

        this.socket.on("connect_error", async () => {
          await type("CRITICAL ERROR: QUANTUM LINK FAILED");
          resolve();
        });
      });
    } catch (error) {
      await type("FATAL ERROR: SERVER UNREACHABLE");
      return null;
    }
  }

  setupSocketListeners() {
    this.socket.on("room:error", async ({ message }) => {
      await type(`⚠️  SYSTEM ERROR: ${message}`);
    });

    this.socket.on("room:joined", async ({ room: roomCode, player: playerInfo }) => {
      this.room = { 
        code: roomCode, 
        stage: "lobby", 
        players: [], 
        cluesRevealed: false, 
        votesRevealed: false 
      };
      this.player = playerInfo;
      
      await type([
        " ",
        "SESSION JOINED SUCCESSFULLY",
        `SESSION ID: ${roomCode}`,
        " "
      ]);
    });

    this.socket.on("room:update", (summary) => {
      this.room = summary;
    });

    this.socket.on("round:word", async (payload) => {
      this.wordInfo = payload;
      await type(" ");
      await type("🔒 CLASSIFIED BRIEFING RECEIVED");
    });

    this.socket.on("round:reveal", (payload) => {
      this.revealData = payload;
    });
  }

  async waitForConnection() {
    await type("SYNCHRONIZING WITH COMMAND NETWORK...");
    
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.room && this.player) {
          clearInterval(interval);
          resolve();
        }
      };
      
      const interval = setInterval(checkConnection, 200);
      
      setTimeout(() => {
        clearInterval(interval);
        if (!this.room) {
          type("CONNECTION TIMEOUT - ABORTING");
        }
        resolve();
      }, 15000);
    });
  }

  async gameLoop() {
    let lastStage = null;
    
    while (this.gameRunning && this.room) {
      // Only redraw if stage changed
      if (this.room.stage !== lastStage) {
        await this.displayGameState();
        lastStage = this.room.stage;
      }
      
      await this.handleInput();
      await pause(0.1);
    }
  }

  async exitGame() {
    await type("TERMINATING SESSION...");
    
    if (this.socket) {
      if (this.room) {
        this.socket.emit("room:leave", { code: this.room.code });
      }
      this.socket.disconnect();
    }
    
    this.gameRunning = false;
    await type("SESSION TERMINATED");
    await pause(1);
  }
}
