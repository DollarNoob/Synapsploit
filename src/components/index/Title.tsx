import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useImperativeHandle, useState } from "react";

interface Props {
  ref?: React.Ref<(text: string, duration: number) => void>;
  children?: React.ReactNode;
}

const prefix = "Synapse X - v";

export default function Title({ ref }: Props) {
  const [ title, setTitle ] = useState(prefix);
  const [ version, setVersion ] = useState("");
  const [ titleSession, setTitleSession ] = useState(0);

  useEffect(() => {
    getVersion().then((ver) => {
      setVersion(ver);
      setTitle(prefix + ver);
    });
  }, []);

  useImperativeHandle(ref, () => {
    return (text: string, duration: number) => {
      const fullText = prefix + version + " " + text;
      const session = titleSession + 1;

      setTitle(fullText);
      setTitleSession(session);

      setTimeout(() => {
        setTitleSession((sess) => {
          if (sess === session) {
            setTitle(prefix + version);
          }
          return sess;
        });
      }, duration);
    };
  }, [ version, titleSession ]);

  const style: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    color: "white",
    fontFamily: "Segoe UI"
  };

  return (<>
    <div style={ style } data-tauri-drag-region>
      { title }
    </div>
  </>);
}
