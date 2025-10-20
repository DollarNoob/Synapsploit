import { useEffect, useImperativeHandle, useState } from "react";
import ace from "ace-builds";
import useSessionStore, { ScriptSession } from "../../stores/session";

interface Props {
  ref?: React.Ref<(title?: string | null, text?: string | null, path?: string) => void>;
  children?: React.ReactNode;
}

export default function NewTab({ ref }: Props) {
  const [ hover, setHover ] = useState(false);
  const sessionStore = useSessionStore();

  function createSession(title: string | null = null, text: string | null = null, path?: string) {
    // @ts-ignore
    const editSession = ace.createEditSession(text ?? "", "ace/mode/lua");
    const sessionId = crypto.randomUUID();

    // default name (Script n)
    if (!title) {
      let sessionIndex = 1;
      for (const script of sessionStore.sessions) {
        const nameMatch = script.name.match(/Script (\d+)/);
        if (nameMatch) {
          const index = parseInt(nameMatch[1]);
          if (sessionIndex <= index) sessionIndex = index + 1;
        }
      }
      title = `Script ${sessionIndex}`;
    }

    const session: ScriptSession = {
      id: sessionId,
      name: title,
      absolutePath: path ?? null,
      edited: false
    };

    sessionStore.addEditSession(sessionId, editSession);
    sessionStore.addSession(session);
    sessionStore.setSession(session);
  }

  useImperativeHandle(ref, () => createSession, []);

  // very hacky solution
  useEffect(() => {
    if (sessionStore.sessions.length === 0) {
      createSession();
    }
  }, [ sessionStore.sessions ]);

  const style: React.CSSProperties = {
    display: "flex",
    width: 12,
    minWidth: 12,
    height: 12,
    minHeight: 12,
    marginLeft: 5,
    backgroundColor: hover ? "#555555" : "#757575",
    border: hover ? "1px solid #656565" : "1px solid #959595",
    marginTop: "auto",
    marginBottom: "auto"
  };

  return (<>
    <div style={ style } onClick={ () => createSession() } onMouseEnter={ () => setHover(true) } onMouseLeave={ () => setHover(false) }>
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
        <path d="M6 2V10M2 6H10" stroke="white" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    </div>
  </>);
}
