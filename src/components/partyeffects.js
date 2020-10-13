import React, { useContext, useEffect, useState } from "react";
import { GameContext } from "./contextManager";
import { Button, Row, Col, Media, Container } from "react-bootstrap";
import "./partyeffects.css";

function useForceUpdate() {
  const [value, setValue] = useState(0); // integer state
  return () => setValue((value) => ++value); // update the state to force render
}

export default function PartyEffects() {
  const game = useContext(GameContext);
  const [size, setsize] = useState(50);
  const forceUpdate = useForceUpdate();

  const actors = () =>
    game.actors.filter((actor) => {
      return actor.permission === 3;
    });

  const currentScene = () => game.scenes.find((scene) => scene.active === true);

  const actorToken = (actor) =>
    currentScene(game).data.tokens.find((tk) => tk.actorId === actor._id);

  useEffect(() => {
    game.hookUpdate(forceUpdate);
    return () => {};
  }, []);

  return (
    <Container
      className="float-left"
      style={{
        // maxWidth: "300px",
        marginLeft: 0,
        color: "hsl(4, 50%, 50%)",
        fontFamily: "Segoe",
        wordSpacing: "1px",
      }}
      onWheel={(event) => {
        if (event.deltaY > 0) {
          setsize(size - 1);
        } else {
          setsize(size + 1);
        }
      }}
    >
      {[
        ...game.actors.filter((actor) => {
          return actor.permission === 3;
        }),
      ].map(
        (actor) =>
          actor.isPC && (
            <Row
              key={actor._id}
              style={{
                // borderBottom: "2px solid #6f6c66",
                wordSpacing: "1px",
                fontSize: size + "px",
                letterSpacing: "5px",
                textTransform: "uppercase",
                textShadow: `1px 1px hsl(4, 50%, 45%),
               2px 2px hsl(4, 50%, 40%),
               3px 3px hsl(4, 50%, 35%),
               4px 4px hsl(4, 50%, 34%)`,
                whiteSpace: "nowrap",
              }}
            >
              <Col md={8} style={{ overflow: "hidden" }}>
                <p class="marquee">
                  <span>
                    {actorToken(actor)
                      .effects.map(
                        (ef) =>
                          ef.split("/")[ef.split("/").length - 1].split(".")[0]
                      )
                      .join(", ") +
                      ((actorToken(actor).effects.length > 0 && ",") || "")}
                    &nbsp;
                  </span>
                </p>
                <p class="marquee marquee2">
                  <span>
                    {actorToken(actor)
                      .effects.map(
                        (ef) =>
                          ef.split("/")[ef.split("/").length - 1].split(".")[0]
                      )
                      .join(", ") +
                      ((actorToken(actor).effects.length > 0 && ",") || "")}
                    &nbsp;
                  </span>
                </p>
              </Col>
              <Col md={{ span: 4 }}>{actor.data.name}</Col>
            </Row>
          )
      )}
    </Container>
  );
}
