import WhoisitGame from "./game.mjs";

async function command() {
  const game = new WhoisitGame();
  await game.start();
}

export default command;
