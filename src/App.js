import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Switch, Route, NavLink } from "react-router-dom";
import Login from "./components/login";
import PartyHUD from "./components/partyhud";
import PartyHUDLite from "./components/partyhudlite";
import PartyEffects from "./components/partyeffects";
import { GameContext, init } from "./components/contextManager";

// import Native from "./components/native";
import Menu from "./components/menu";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [game, setGame] = useState(null);
  return (
    <div
      className="App"
      style={{ fontFamily: '"Signika", sans-serif', color: "#4b4a44" }}
    >
      <GameContext.Provider value={game}>
        <BrowserRouter
          basename={
            window.location.href.includes("streamdeck")
              ? "/modules/streamdeck"
              : ""
          }
        >
          <div>
            <div className="content">
              <Switch>
                <Route path="/menu" component={Menu} />
                <Route
                  path="/partyhud"
                  render={(props) => {
                    if (game === null) init(setGame);
                    else if (game.data.userId === null)
                      props.history.push("login");
                    else return <PartyHUD {...props} />;
                  }}
                />
                <Route
                  path="/partyhudlite"
                  render={(props) => {
                    if (game === null) init(setGame);
                    else if (game.data.userId === null)
                      props.history.push("login");
                    else return <PartyHUDLite {...props} />;
                  }}
                />
                <Route
                  path="/partyeffects"
                  render={(props) => {
                    if (game === null) init(setGame);
                    else if (game.data.userId === null)
                      props.history.push("login");
                    else return <PartyEffects {...props} />;
                  }}
                />
                <Route
                  path="/"
                  render={(props) => (
                    <Login {...props} setGame={setGame}></Login>
                  )}
                />
              </Switch>
            </div>
          </div>
        </BrowserRouter>
      </GameContext.Provider>
    </div>
  );
}

export default App;
