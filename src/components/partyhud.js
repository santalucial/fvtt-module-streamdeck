import React, { useContext, useEffect, useState } from "react";
import { GameContext } from "./contextManager";
import { Button, Row, Col, Media, Container } from "react-bootstrap";

function useForceUpdate() {
  const [value, setValue] = useState(0); // integer state
  return () => setValue((value) => ++value); // update the state to force render
}

export default function PartyHUD() {
  const game = useContext(GameContext);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    game.hookUpdate(forceUpdate);
    return () => {};
  }, []);

  return (
    <Container
      className="float-left"
      style={{ maxWidth: "300px", marginLeft: 0 }}
    >
      {[
        ...game.actors.filter((actor) => {
          return actor.permission === 3;
        }),
      ].map(
        (actor) =>
          actor.isPC && (
            <Media
              key={actor._id}
              className="my-1"
              style={{
                background: "url(/ui/parchment.jpg) repeat",
                border: "2px solid #6f6c66",
                borderRadius: "5px",
              }}
            >
              <img
                width={64}
                height={64}
                className="mr-3 my-auto ml-2"
                src={"/" + actor.data.img}
                alt="Generic placeholder"
              />
              <Media.Body>
                <div className="my-2">
                  <h5 style={{ marginBottom: 0, fontWeight: "bold" }}>
                    {actor.data.name}
                  </h5>
                  <p>
                    {actor.data.data.attributes.hp.value}/
                    {actor.data.data.attributes.hp.max}
                  </p>
                </div>
              </Media.Body>
            </Media>
          )
      )}
    </Container>
  );
}
