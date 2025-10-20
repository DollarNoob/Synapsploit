import { Menu } from "@tauri-apps/api/menu";
import { useEffect, useState } from "react";

interface Props {
  name: string;
  onContextMenu: (id: string, name: string | null) => void;
  children?: React.ReactNode;
}

export default function Script({ name, onContextMenu }: Props) {
  const [ active, setActive ] = useState(false);
  const [ hover, setHover ] = useState(false);

  const timestamp = "Script:" + Date.now().toString(36);
  const menuPromise = Menu.new({
    items: [
      { id: "execute:" + timestamp, text: "Execute", icon: "FollowLinkFreestanding", action: (id) => onContextMenu(id.split(":")[0], name) },
      { id: "load:" + timestamp, text: "Load to Editor", icon: "GoLeft", action: (id) => onContextMenu(id.split(":")[0], name) },
      { id: "open:" + timestamp, text: "Open Folder", icon: "ListView", action: (id) => onContextMenu(id.split(":")[0], null) },
      { id: "refresh:" + timestamp, text: "Refresh", icon: "Refresh", action: (id) => onContextMenu(id.split(":")[0], name) }
    ]
  });

  async function onRightClick(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const menu = await menuPromise;
    await menu.popup();
    setActive(false);
  }

  function onMouseUp() {
    setActive(false);
    window.removeEventListener("mouseup", onMouseUp);
  }

  const style: React.CSSProperties = {
    height: 20,
    lineHeight: 1.6,
    paddingLeft: 6,
    paddingRight: 6,
    backgroundColor: active ? "#304565" : (hover ? "#354555" : "inherit"),
    boxShadow: active ? "0 0 0 1px inset #354555" : (hover ? "0 0 0 1px inset gray" : "inherit"),
    fontFamily: "Segoe UI",
    fontSize: 12,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis"
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
    <div style={ style } onContextMenu={ onRightClick } onDoubleClick={ () => onContextMenu("load", name) } onMouseDown={ () => setActive(true) } onMouseEnter={ () => setHover(true) } onMouseLeave={ () => setHover(false) }>
      { name }
    </div>
  </>);
}
