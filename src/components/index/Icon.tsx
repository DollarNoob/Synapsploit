import { useState } from "react";
import synapsex from "../../assets/synapsex.ico";
import { message } from "@tauri-apps/plugin-dialog";

interface Props {
  children?: React.ReactNode;
}

export default function Icon({ children }: Props) {
  const [ clicks, setClicks ] = useState(0);

  function onMouseDown() {
    const currentClicks = clicks + 1;
    setClicks(currentClicks);

    if (currentClicks % 5 === 0) {
      message([
        "Synapsploit was developed by DollarNoob.",
        "",
        "Additional credits:",
        "- Nexus42: Bypassing Hyperion",
        "- ChatGPT: Technical support"
      ].join("\n"), {
        title: "Synapsploit Credits"
      });
    } else {
      message([
        "Synapse X was developed by 3dsboy08,",
        "brack4712, Louka, DefCon42, and Eternal.",
        "",
        "Additional credits:",
        "- Rain: Emotional support and testing"
      ].join("\n"), {
        title: "Synapse X Credits"
      });
    }
  }

  const style: React.CSSProperties = {
    width: 30,
    height: 30,
    marginLeft: 5
  };

  return (<>
    <img src={ synapsex } style={ style } alt="Synapse X Icon" draggable={ false } onMouseDown={ onMouseDown }>
      { children }
    </img>
  </>);
}
