import { useEffect, useState } from "react";

interface Props {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
}

export default function HeaderButton({ onClick, children }: Props) {
  const [ active, setActive ] = useState(false);
  const [ hover, setHover ] = useState(false);

  function onMouseUp() {
    setActive(false);
    window.removeEventListener("mouseup", onMouseUp);
  }

  const style: React.CSSProperties = {
    width: 22,
    height: 22,
    backgroundColor: active ? "#354555" : (hover ? "#354555" : "#3C3C3C"),
    color: "white",
    border: active ? "1px solid #354555" : (hover ? "1px solid gray" : "inherit"),
    fontFamily: "Segoe UI",
    fontSize: 12
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
    <button style={ style } onClick={ onClick } onMouseDown={ () => setActive(true) } onMouseUp={ () => setActive(false) } onMouseEnter={ () => setHover(true) } onMouseLeave={ () => setHover(false) }>
      { children }
    </button>
  </>);
}
