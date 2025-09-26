import WhoisitGame from "./game.mjs";

async function command() {
  const game = new WhoisitGame();
  await game.start();
}

const stylesheets = ["whoisit"];
const templates = ["whoisit"];
export { stylesheets, templates };
export default command;
