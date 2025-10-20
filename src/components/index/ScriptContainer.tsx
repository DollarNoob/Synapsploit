import { Menu } from "@tauri-apps/api/menu";
import { useRef } from "react";

interface Props {
  onContextMenu: (id: string, name: string | null) => void;
  children?: React.ReactNode;
}

export default function ScriptContainer({ onContextMenu, children }: Props) {
  const self = useRef<HTMLDivElement>(null);

  const timestamp = "ScriptContainer:" + Date.now().toString(36);
  const menuPromise = Menu.new({
    items: [
      { id: "open:" + timestamp, text: "Open Folder", icon: "ListView", action: (id) => onContextMenu(id.split(":")[0], null) },
      { id: "refresh:" + timestamp, text: "Refresh", icon: "Refresh", action: (id) => onContextMenu(id.split(":")[0], null) }
    ]
  });

  async function onRightClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target !== self.current) return;

    event.preventDefault();
    const menu = await menuPromise;
    await menu.popup();
  }

  const style: React.CSSProperties = {
    width: 120,
    minWidth: 120,
    backgroundColor: "#3C3C3C",
    color: "white",
    overflowY: "scroll"
  };

  return (<>
    <div style={ style } onContextMenu={ onRightClick } ref={ self }>
      { children }
    </div>
  </>);
}
