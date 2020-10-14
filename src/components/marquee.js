import React, { useContext, useEffect, useRef } from "react";
import { GameContext } from "./contextManager";
import { Linear, TimelineMax } from "gsap";

export default function Marquee(props) {
  const game = useContext(GameContext);
  const marquee = useRef(null);
  const l = useRef(null);
  const cl = useRef(null);

  const currentScene = () => game.scenes.find((scene) => scene.active === true);

  const actorToken = (actor) =>
    currentScene(game).data.tokens.find((tk) => tk.actorId === actor._id);

  var listWidth = 10;

  actorToken(props.actor).effects.map((ef) => {
    listWidth +=
      ef.split("/")[ef.split("/").length - 1].split(".")[0].length * props.size;
  });

  var infinite = new TimelineMax({ repeat: -1, paused: true });
  var time = 5;
  actorToken(props.actor).effects.map((ef) => {
    time += 5;
  });

  useEffect(() => {
    infinite
      .fromTo(
        l.current,
        time,
        { rotation: 0.01, x: 0 },
        { force3D: true, x: -listWidth, ease: Linear.easeNone },
        0
      )
      .fromTo(
        cl.current,
        time,
        { rotation: 0.01, x: listWidth },
        { force3D: true, x: 0, ease: Linear.easeNone },
        0
      )
      .set(l.current, { force3D: true, rotation: 0.01, x: listWidth })
      .to(
        cl.current,
        time,
        { force3D: true, rotation: 0.01, x: -listWidth, ease: Linear.easeNone },
        time
      )
      .to(
        l.current,
        time,
        { force3D: true, rotation: 0.01, x: 0, ease: Linear.easeNone },
        time
      )
      .progress(1)
      .progress(0)
      .play();
    return () => {};
  });

  const effectsLength = actorToken(props.actor).effects.length;

  return (
    <div
      ref={marquee}
      className="tickerwrapper"
      style={{ width: listWidth + "px" }}
    >
      <ul ref={l} className="list" style={{ width: listWidth + "px" }}>
        {actorToken(props.actor).effects.map((ef, i) => (
          <li key={i} className="listitem">
            <span>
              {ef.split("/")[ef.split("/").length - 1].split(".")[0] +
                (effectsLength === i + 1 ? "." : ",")}
            </span>
          </li>
        ))}
      </ul>
      <ul ref={cl} className="list cloned" style={{ width: listWidth + "px" }}>
        {actorToken(props.actor).effects.map((ef, i) => (
          <li key={i} className="listitem">
            <span>
              {ef.split("/")[ef.split("/").length - 1].split(".")[0] +
                (effectsLength === i + 1 ? "." : ",")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
