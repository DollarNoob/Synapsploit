import { Menu } from "@tauri-apps/api/menu";
import { useSessionStore, ScriptSession, removeScript } from "../../stores/session";
import { ask } from "@tauri-apps/plugin-dialog";

interface Props {
  session: ScriptSession;
  onContextMenu: (id: string, session: ScriptSession) => void;
  children?: React.ReactNode;
}

export default function Tab({ session, onContextMenu }: Props) {
  const sessionStore = useSessionStore();

  const timestamp = "Tab:" + Date.now().toString(36);
  const menuPromise = Menu.new({
    items: [
      { id: "execute:" + timestamp, text: "Execute", icon: "FollowLinkFreestanding", action: (id) => onContextMenu(id.split(":")[0], session) },
      { id: "rename:" + timestamp, text: "Rename", icon: "Refresh", action: (id) => onContextMenu(id.split(":")[0], session) },
      { id: "close:" + timestamp, text: "Close", icon: "StopProgress", action: () => onClose(null) }
    ]
  });

  async function onRightClick(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const menu = await menuPromise;
    await menu.popup();
  }

  function onClick() {
    sessionStore.setSession(session);
  }

  async function onClose(event: React.MouseEvent<HTMLDivElement> | null) {
    if (!sessionStore.session) return;

    if (event) event.stopPropagation();

    if (sessionStore.session.edited) {
      const close = await ask("Are you sure you want to discard changes?", {
        title: "You have unsaved changes left",
        kind: "error"
      });

      if (!close) return;
    }

    sessionStore.removeSession(session.id);
    removeScript(session.id);
  }

  const style: React.CSSProperties = {
    display: "flex",
    minWidth: "min-content",
    height: 20,
    backgroundColor: sessionStore.session?.id === session.id ? "#757575" : "#858585",
    paddingLeft: 5
  };

  const textStyle: React.CSSProperties = {
    lineHeight: 1.8,
    marginRight: 2,
    fontFamily: "Segoe UI",
    fontSize: 12
  };

  const closeStyle: React.CSSProperties = {
    lineHeight: 1.4,
    paddingLeft: 2,
    paddingRight: 5,
    fontSize: 14
  };

  return (<>
    <div style={ style } onClick={ onClick } onContextMenu={ onRightClick }>
      <span style={ textStyle }>{ session.edited && "*" }{ session.name }</span>
      <div style={ closeStyle } onClick={ onClose }>×</div>
    </div>
  </>);
}
