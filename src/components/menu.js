import React from "react";
import { NavLink } from "react-router-dom";

export default function Menu() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* <NavLink exact activeClassName="active" to="/">
        Login
      </NavLink> */}
      <NavLink activeClassName="active" to="/partyhud">
        Party HUD
      </NavLink>
      <NavLink activeClassName="active" to="/partyhudlite">
        Party HUD Lite
      </NavLink>
    </div>
  );
}
