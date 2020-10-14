import React, { useState, useEffect, useRef, useContext } from "react";
import { Row, Button } from "react-bootstrap";
import { Game } from "./TinyClient/tiny";
import io from "socket.io-client";
import {  withRouter} from 'react-router-dom';
import {init} from './contextManager'
import qs from 'qs'

function Login(props) {
  // const username = useFormInput("");
  // const password = useFormInput("");


  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState([]);
  const [sessionId, setsessionId] = useState(null)

  const selectRef = useRef();
  const passwdRef = useRef();

  
  // handle button click of login form
  const handleLogin = async () => {
    const data = new URLSearchParams();
    data.append("userid", selectRef.current.selectedOptions[0].value);
    data.append("password", passwdRef.current.value);

    await fetch("/join", {
      method: "post", // *GET, POST, PUT, DELETE, etc.
      mode: "no-cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: 'same-origin', // include, *same-origin, omit

      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: data,
    });
    for (let cookie of document.cookie.split("; ")) {
      const [name, value] = cookie.split("=");
      if (name === "session") {
        setsessionId(decodeURIComponent(value));
        break;
      }
    }

    // let socket = await this.connect(sessionId);
    await init (props.setGame);
    // Game.create( () =>{}).then((game) => {
    //   window.game = game;
    //   props.setGame(game);
    //   game.initialize();
    // });

    props.history.push("menu");
  };



  useEffect(() => {
    const query = qs.parse(props.location.search, { ignoreQueryPrefix: true })
  if (query.page !== undefined)
  {
     props.history.push(query.page);
     return () => {}
  }
    fetch("/join", {
      method: "get", // *GET, POST, PUT, DELETE, etc.
      mode: "no-cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    })
      .then((data) => data.text())
      .then((data) => {
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(data, "text/html");
        //    console.log(xmlDoc.getElementsByClassName('form-group split'))
        // window.test = xmlDoc.getElementsByClassName('form-group split');
        setOptions(
          xmlDoc.getElementsByClassName("form-group split")[0].children[1]
            .options
        );
      })
      .then(() => setLoading(false));

    return () => {};
  }, []);

  

  return (
    <Row
      className=" align-content-center"
      style={{
        // backgroundColor: theme[0],
        height: window.innerHeight + "px",
        overflow: "auto",
      }}
    >
      <div className="mx-auto">
        Login
        <br />
        <br />
        <div>
          Username
          <br />
          <select ref={selectRef} name="userid" required="">
            {[...options].map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* <input type="text" {...username} autoComplete="username" /> */}
        </div>
        <div style={{ marginTop: 10 }}>
          Password
          <br />
          <input
            style={{ maxWidth: "150px" }}
            ref={passwdRef}
            type="password"
            // {...password}
            autoComplete="new-password"
          />
        </div>
        {error && (
          <>
            <small style={{ color: "red" }}>{error}</small>
            <br />
          </>
        )}
        <br />
        <Button className="text-body" onClick={handleLogin} disabled={loading}>
          {loading ? "Loading..." : "Login"}
        </Button>
        <br />
      </div> 
    </Row>
  );
}

const useFormInput = (initialValue) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e) => {
    setValue(e.target.value);
  };
  return {
    value,
    onChange: handleChange,
  };
};

export default Login