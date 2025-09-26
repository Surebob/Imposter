import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { io, Socket } from "socket.io-client";

type Stage = "lobby" | "clue" | "discussion" | "vote" | "reveal";

type Player = {
  id: string;
  name: string;
  isHost: boolean;
  clue?: string;
  vote?: string;
  word?: string;
};

type RoomSummary = {
  code: string;
  hostId: string;
  stage: Stage;
  players: Player[];
  cluesRevealed: boolean;
  votesRevealed: boolean;
};

type WordInfo = {
  word: string;
  category?: string;
  isImpostor?: boolean;
};

type RevealData = {
  impostorId?: string;
  wordPair?: {
    shared: string;
    impostor: string;
    category: string;
  };
  eliminatedId?: string;
};

type JoinResponse = {
  room: string;
  player: Player;
};

type WordPayload = WordInfo;

type ErrorPayload = {
  message: string;
};

type VoteOption = string | null;

const socketUrl = window.location.origin;

export default function App() {
  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clueDraft, setClueDraft] = useState("");
  const [voteDraft, setVoteDraft] = useState<VoteOption>(null);

  useEffect(() => {
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect_error", () => {
      setError("Unable to connect to server. Please try again later.");
    });

    socket.on("room:error", (payload: ErrorPayload) => {
      setError(payload.message);
    });

    socket.on("room:joined", ({ room: roomCode, player: playerInfo }: JoinResponse) => {
      setError(null);
      setRoom((current) =>
        current ? { ...current, code: roomCode } : { code: roomCode, hostId: playerInfo.id, stage: "lobby", players: [], cluesRevealed: false, votesRevealed: false }
      );
      setPlayer(playerInfo);
      setWordInfo(null);
      setRevealData(null);
    });

    socket.on("room:update", (summary: RoomSummary) => {
      setRoom(summary);
      if (summary.stage !== "reveal") {
        setRevealData(null);
      }
    });

    socket.on("round:word", (payload: WordPayload) => {
      setWordInfo(payload);
      setClueDraft("");
      setVoteDraft(null);
    });

    socket.on("round:reveal", (payload: RevealData) => {
      setRevealData(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!room || !player) return;
    const freshPlayer = room.players.find((p) => p.id === player.id);
    if (freshPlayer) {
      setPlayer(freshPlayer);
    }
  }, [room, player?.id]);

  const isHost = player ? room?.hostId === player.id : false;
  const hasSubmittedClue = Boolean(player?.clue);
  const hasVoted = Boolean(player?.vote);

  const sortedPlayers = useMemo(() => {
    return room?.players.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? [];
  }, [room?.players]);

  function emit(event: string, payload?: Record<string, unknown>) {
    const socket = socketRef.current;
    if (!socket || !room) return;
    socket.emit(event, { code: room.code, ...(payload ?? {}) });
  }

  function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = (data.get("name") as string).trim();
    if (!name) return;
    socketRef.current?.emit("room:create", { name });
  }

  function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = (data.get("name") as string).trim();
    const code = (data.get("code") as string).trim();
    if (!name || !code) return;
    socketRef.current?.emit("room:join", { name, code });
  }

  function handleLeaveRoom() {
    if (!room) return;
    emit("room:leave");
    setRoom(null);
    setPlayer(null);
    setWordInfo(null);
    setRevealData(null);
  }

  function handleSubmitClue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clueDraft.trim()) return;
    emit("clue:submit", { clue: clueDraft });
  }

  function handleAdvanceDiscussion() {
    emit("discussion:advance");
  }

  function handleStartRound() {
    emit("round:start");
  }

  function handleResetRound() {
    emit("round:reset");
    setWordInfo(null);
    setRevealData(null);
  }

  function handleSubmitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!voteDraft) return;
    emit("vote:submit", { targetId: voteDraft });
  }

  function renderLobby() {
    if (!room) return null;
    return (
      <div className="panel">
        <h2>Lobby</h2>
        <p className="muted">Share the room code with friends to join.</p>
        <div className="room-code">{room.code}</div>
        <ul className="player-list">
          {sortedPlayers.map((p) => (
            <li key={p.id} className={classNames({ you: p.id === player?.id })}>
              <span>{p.name}</span>
              <span className="tag">{p.id === room.hostId ? "Host" : "Player"}</span>
            </li>
          ))}
        </ul>
        {isHost ? (
          <button className="primary" onClick={handleStartRound} disabled={sortedPlayers.length < 3}>
            Start round
          </button>
        ) : (
          <p className="muted">Waiting for host to begin.</p>
        )}
      </div>
    );
  }

  function renderClueStage() {
    if (!room) return null;
    return (
      <div className="panel">
        <h2>Give a clue</h2>
        <div className="word-card">
          <p className="category">Category</p>
          <p className="value">{wordInfo?.category ?? "Unknown"}</p>
          <p className="category">Your word</p>
          <p className="value">{wordInfo?.word ?? "??"}</p>
          {wordInfo?.isImpostor ? <p className="warning">You might be the impostor...</p> : null}
        </div>
        <form onSubmit={handleSubmitClue} className="form-inline">
          <input
            type="text"
            name="clue"
            maxLength={60}
            placeholder="Write a clever clue"
            value={clueDraft}
            onChange={(event) => setClueDraft(event.target.value)}
            disabled={hasSubmittedClue}
            required
          />
          <button className="primary" type="submit" disabled={hasSubmittedClue}>
            {hasSubmittedClue ? "Clue sent" : "Submit clue"}
          </button>
        </form>
        <ul className="player-list">
          {sortedPlayers.map((p) => (
            <li key={p.id} className={classNames({ submitted: Boolean(p.clue), you: p.id === player?.id })}>
              <span>{p.name}</span>
              <span className="tag">{p.clue ? "Submitted" : "Waiting"}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderDiscussion() {
    if (!room) return null;
    return (
      <div className="panel">
        <h2>Discuss</h2>
        <p className="muted">Talk it out and figure out who is bluffing.</p>
        <ul className="clue-list">
          {sortedPlayers.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong>
              <span>{p.clue ?? "(no clue)"}</span>
            </li>
          ))}
        </ul>
        {isHost ? (
          <button className="primary" onClick={handleAdvanceDiscussion}>
            Move to voting
          </button>
        ) : (
          <p className="muted">Waiting for host to start the vote.</p>
        )}
      </div>
    );
  }

  function renderVote() {
    if (!room) return null;
    return (
      <div className="panel">
        <h2>Vote</h2>
        <p className="muted">Select who you think is the impostor.</p>
        <form onSubmit={handleSubmitVote} className="vote-form">
          <div className="vote-options">
            {sortedPlayers.map((p) => (
              <label key={p.id} className={classNames("vote-option", { selected: voteDraft === p.id })}>
                <input
                  type="radio"
                  name="vote"
                  value={p.id}
                  checked={voteDraft === p.id}
                  onChange={() => setVoteDraft(p.id)}
                  disabled={hasVoted}
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
          <button className="primary" type="submit" disabled={hasVoted || !voteDraft}>
            {hasVoted ? "Vote submitted" : "Submit vote"}
          </button>
        </form>
      </div>
    );
  }

  function renderReveal() {
    if (!room) return null;
    return (
      <div className="panel">
        <h2>Results</h2>
        {revealData ? (
          <div className="results">
            <p>
              <strong>Impostor:</strong> {sortedPlayers.find((p) => p.id === revealData.impostorId)?.name ?? "Unknown"}
            </p>
            <p>
              <strong>Eliminated:</strong> {sortedPlayers.find((p) => p.id === revealData.eliminatedId)?.name ?? "Nobody"}
            </p>
            {revealData.wordPair ? (
              <div className="word-card">
                <p className="category">Category</p>
                <p className="value">{revealData.wordPair.category}</p>
                <div className="split">
                  <div>
                    <p className="category">Team word</p>
                    <p className="value">{revealData.wordPair.shared}</p>
                  </div>
                  <div>
                    <p className="category">Impostor word</p>
                    <p className="value">{revealData.wordPair.impostor}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p>Waiting for results...</p>
        )}
        {isHost ? (
          <button className="primary" onClick={handleResetRound}>
            Play again
          </button>
        ) : (
          <p className="muted">Waiting for host to start a new round.</p>
        )}
      </div>
    );
  }

  function renderStage() {
    if (!room) return null;
    switch (room.stage) {
      case "lobby":
        return renderLobby();
      case "clue":
        return renderClueStage();
      case "discussion":
        return renderDiscussion();
      case "vote":
        return renderVote();
      case "reveal":
        return renderReveal();
      default:
        return null;
    }
  }

  if (!player || !room) {
    return (
      <div className="container">
        <header>
          <h1>Imposter</h1>
          <p className="muted">
            A social deduction party game. Give clever clues, sniff out the impostor, and protect your secret word.
          </p>
        </header>
        <div className="card-grid">
          <form className="panel" onSubmit={handleCreateRoom}>
            <h2>Create room</h2>
            <label className="field">
              <span>Display name</span>
              <input name="name" type="text" placeholder="Jane" maxLength={20} required />
            </label>
            <button className="primary" type="submit">
              Create
            </button>
          </form>
          <form className="panel" onSubmit={handleJoinRoom}>
            <h2>Join room</h2>
            <label className="field">
              <span>Display name</span>
              <input name="name" type="text" placeholder="Jane" maxLength={20} required />
            </label>
            <label className="field">
              <span>Room code</span>
              <input name="code" type="text" placeholder="ABCD" maxLength={6} required />
            </label>
            <button className="primary" type="submit">
              Join
            </button>
          </form>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="container">
      <header className="room-header">
        <div>
          <h1>Imposter</h1>
          <p className="muted">Room {room.code}</p>
          {wordInfo ? (
            <p className="muted">
              You are {wordInfo.isImpostor ? "the impostor" : "on the majority"}. Keep your word secret!
            </p>
          ) : null}
        </div>
        <div className="header-actions">
          <button onClick={handleLeaveRoom} className="secondary">
            Leave room
          </button>
        </div>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {renderStage()}
    </div>
  );
}
