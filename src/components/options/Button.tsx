import { useEffect, useState } from "react";

interface Props {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
}

export default function Button({ onClick, children }: Props) {
  const [ active, setActive ] = useState(false);
  const [ hover, setHover ] = useState(false);

  function onMouseUp() {
    setActive(false);
    window.removeEventListener("mouseup", onMouseUp);
  }

  const style: React.CSSProperties = {
    height: 30,
    flex: 1,
    backgroundColor: active ? "#354555" : (hover ? "#354555" : "#3C3C3C"),
    color: "white",
    boxShadow: active ? "0 0 0 1px #354555" : (hover ? "0 0 0 1px gray" : "inherit"),
    fontFamily: "Segoe UI",
    fontSize: 13
  };

  useEffect(() => {
    if (active) {
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [ active ]);

  return (<>
    <button style={ style } onClick={ onClick } onMouseDown={ () => setActive(true) } onMouseEnter={ () => setHover(true) } onMouseLeave={ () => setHover(false) }>
      { children }
    </button>
  </>);
}
