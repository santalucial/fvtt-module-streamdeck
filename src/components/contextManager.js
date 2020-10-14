import React from "react";
import { Game } from "./TinyClient/tiny";

export const GameContext = React.createContext(null);

export async function init(setGame) {
  await Game.create(() => {}).then(async (game) => {
    window.game = game;
    console.log(game);
    if (game.data.userId !== null) game.initialize();

    setGame(game);
  });
}
