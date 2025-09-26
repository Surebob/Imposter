# Imposter

An online social deduction party game inspired by classic "find the impostor" word games. Host a private room, give clever clues,
bluff your way through the discussion, and try to survive the vote.

## Tech stack

- **Node.js + Express** backend written in TypeScript
- **Socket.IO** for real-time room updates
- **React + Vite** TypeScript client bundled into the production build

## Getting started

```bash
# Install dependencies for the server and client
npm install

# Run the development server (starts the Socket.IO API)
npm run dev

# In another terminal, launch the Vite dev server for the client UI
npm run client:dev

# Build server and client assets
npm run build

# Start the compiled server (serves the built client from dist/)
npm start
```

The production server automatically serves the compiled client from `client/dist`, making deployment to services such as DigitalOcean
App Platform straightforward.

## Gameplay overview

1. The host creates a room and shares the room code with friends.
2. When the host starts a round, most players receive the same secret word, while one unlucky player receives a different word.
3. Everyone submits a short clue hinting at their word—clear enough to earn trust but vague enough to hide the exact answer.
4. After discussing the clues, players vote for who they believe is the impostor.
5. The results reveal the impostor, the eliminated player, and both words. Start another round to keep the party going!

## Project structure

```
/ (project root)
├── src/             # Express + Socket.IO backend
├── client/          # React + Vite frontend
├── dist/            # Compiled server output (generated)
└── client/dist/     # Compiled client assets (generated)
```

Contributions are welcome—add more word packs, polish the UI, or extend the rules with additional modes.
