import React, {useState} from "react";
import "./App.css";
import { BrowserRouter, Switch, Route, NavLink } from 'react-router-dom';
import Login from './components/login';
import PartyHUD from "./components/partyhud";
import {  GameContext } from "./components/contextManager";

// import Native from "./components/native";
import Menu from "./components/menu";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [game, setGame] = useState(null)
  return (
    <div className="App" style={{fontFamily: '"Signika", sans-serif', color: '#4b4a44'}}>
    <GameContext.Provider value={game}>
     <BrowserRouter basename={
										window.location.href.includes(
											'streamdeck'
										)
											? '/modules/streamdeck'
											: ''
									}>
        <div>
          {/* <div className="header">
            <NavLink exact activeClassName="active" to="/">Home</NavLink>
            <NavLink activeClassName="active" to="/login">Login</NavLink><small>(Access without token only)</small>
            <NavLink activeClassName="active" to="/dashboard">Dashboard</NavLink><small>(Access with token only)</small>
          </div> */}
          <div className="content" >
            <Switch>
              <Route path="/menu" component={Menu} />
              <Route path="/partyhud" component={PartyHUD} />
              <Route path="/" ><Login setGame={setGame}></Login></Route>
            </Switch>
          </div>
        </div>
      </BrowserRouter>
      </GameContext.Provider>
    </div>
  );
}

export default App;
