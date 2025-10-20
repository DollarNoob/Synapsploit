import ace from "ace-builds";
import { useEffect, useRef, useState } from "react";
import { path } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { appDataDir } from "@tauri-apps/api/path";
import { getCurrentWindow, getAllWindows } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { BaseDirectory, exists, mkdir, readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ask, message, open, save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import Icon from "../components/index/Icon";
import Button from "../components/index/Button";
import Title from "../components/index/Title";
import HeaderButton from "../components/index/HeaderButton";
import Header from "../components/index/Header";
import HeaderButtonContainer from "../components/index/HeaderButtonContainer";
import FooterContainer from "../components/index/FooterContainer";
import ButtonContainer from "../components/index/ButtonContainer";
import Main from "../components/index/Main";
import EditorContainer from "../components/index/EditorContainer";
import TabContainer from "../components/index/TabContainer";
import Editor from "../components/index/Editor";
import ScriptContainer from "../components/index/ScriptContainer";
import NewTab from "../components/index/NewTab";
import Tab from "../components/index/Tab";
import Script from "../components/index/Script";
import useSessionStore, { saveScript, ScriptSession } from "../stores/session";

export default function Index() {
  const [ attached, setAttached ] = useState(false);
  const [ scripts, setScripts ] = useState<string[]>([]);
  const [ alwaysOnTop, setAlwaysOnTop ] = useState(false);
  const [ autoAttach, setAutoAttach ] = useState(true);
  const [ client, setClient ] = useState("MacSploit");
  const [ port, setPort ] = useState(-1); // needed for Hydrogen execution
  const editor = useRef<ace.Ace.Editor>(null);
  const updateTitle = useRef<(text: string, duration: number) => void>(null);
  const createSession = useRef<(title?: string | null, text?: string | null, path?: string) => void>(null);
  const sessionStore = useSessionStore();

  function onExecute() {
    if (!editor.current || !updateTitle.current) return;

    execute(editor.current.getValue());
  }

  async function onClear() {
    if (!sessionStore.session || !editor.current) return;

    if (editor.current.getValue() !== "") {
      const close = await ask("Are you sure you want to discard changes?", {
        title: "You have unsaved changes left",
        kind: "error"
      });

      if (!close) return;
    }

    editor.current.setValue("");
    if (sessionStore.session.edited && !sessionStore.session.absolutePath) {
      sessionStore.setEdited(sessionStore.session.id, false);
    }
  }

  async function onOpenFile() {
    if (!createSession.current) return;

    const file = await open({
      title: "Synapse X - Open File",
      filters: [
        {
          name: "Script Files",
          extensions: ["lua", "txt"]
        }
      ]
    });
    if (!file) return;

    const script = await readTextFile(file);
    createSession.current(file.split("/").pop(), script, file);
  }

  async function onExecuteFile() {
    if (!updateTitle.current) return;

    if (!attached) {
      updateTitle.current("(not injected! press attach)", 3000);
      return;
    }

    const file = await open({
      title: "Synapse X - Execute File",
      filters: [
        {
          name: "Script Files",
          extensions: ["lua", "txt"]
        }
      ]
    });
    if (!file) return;

    const script = await readTextFile(file);
    await execute(script);
  }

  async function onSaveFile() {
    if (!editor.current) return;

    const file = await save({
      title: "Synapse X - Save File",
      filters: [
        {
          name: "Script Files",
          extensions: ["lua", "txt"]
        }
      ]
    });
    if (!file) return;

    const written = await writeTextFile(file, editor.current.getValue()).then(() => true)
      .catch((err: string) => message(err, { title: "Synapse X - Save File", kind: "error"}).then(() => false));
    if (written) {
      if (!sessionStore.session) return;

      const session: ScriptSession = {
        id: sessionStore.session.id,
        name: file.split("/").pop() ?? "Script 0",
        absolutePath: file,
        edited: false
      };
      const newSessions = sessionStore.sessions.map(s => s.id === session.id ? session : s);

      sessionStore.setSessions(newSessions);
      sessionStore.setSession(session);
    }
  }

  function onOptions() {
    const appWindow = new WebviewWindow("options", {
      url: "/options",
      title: "Synapse X - Options",
      width: 270,
      height: 230,
      resizable: false,
      decorations: false,
      center: true,
      acceptFirstMouse: true,
      visible: false
    });

    appWindow.once("tauri://error", (err) => {
      if (err.payload === "a webview with label `options` already exists") {
        appWindow.setFocus();
        return;
      }
      message(err.payload as string, { title: "Synapse X - Options", kind: "error"});
    });
  }

  async function onAttach() {
    if (!updateTitle.current) return;

    if (attached) { // detach
      updateTitle.current("(detaching...)", 3000);

      const status = await detach();

      if (status) {
        updateTitle.current("(detached!)", 3000);
      } else {
        updateTitle.current("(failed to detach!)", 3000);
      }
    } else { // attach
      updateTitle.current("(injecting...)", 3000);

      const status = await attach();

      let message = "";
      switch (status) {
        case AttachStatus.SUCCESS:
          message = "(ready!)";
          break;
        case AttachStatus.ALREADY_INJECTED: // huh?
          message = "(already injected!)";
          break;
        case AttachStatus.FAILED:
          message = "(failed to find roblox!)";
          break;
      }

      updateTitle.current(message, 3000);
    }
  }

  function onScriptHub() {
    message("Work in progress, sorry!", { title: "Synapse X - Script Hub" });
  }

  async function execute(script: string) {
    if (!updateTitle.current) return;

    if (!attached) {
      updateTitle.current("(not injected! press attach)", 3000);
      return;
    }

    if (client === "MacSploit") {
      invoke("execute", { script })
        .catch((err: string) => {
          if (!updateTitle.current) return;
          if (err === "NotInjected")
            updateTitle.current("(not injected! press attach)", 3000);
        });
    } else if (client === "Hydrogen") {
      const response = await fetch(`http://127.0.0.1:${port}/execute`, {
        headers: {
          "content-type": "text/plain"
        },
        method: "POST",
        body: script
      });

      if (response.ok) {
        const resultText = await response.text();
        console.log(`✅ Script submitted successfully: ${resultText}`);
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    }
  }

  enum AttachStatus {
    SUCCESS,
    ALREADY_INJECTED,
    FAILED
  }

  async function attach(): Promise<AttachStatus> {
    let status: AttachStatus = AttachStatus.FAILED;

    if (attached) return AttachStatus.ALREADY_INJECTED;

    if (client === "MacSploit") {
      // 5553 ~ 5562 for each roblox window
      for (let i = 5553; i < 5563; i++) {
        const retry = await invoke("attach", { port: i })
          .then(() => {
            setAttached(true);
            status = AttachStatus.SUCCESS;
            return false;
          })
          .catch((err: string) => {
            if (err === "ConnectionRefused") {
              return true;
            } else if (err === "AlreadyInjected") {
              setAttached(true);
              status = AttachStatus.ALREADY_INJECTED;
              return false;
            }

            console.error("Error on attach:", err);
            return false;
          });
        if (!retry) break;
      }
    } else if (client === "Hydrogen") {
      // 6969 ~ 7069 for each roblox window
      for (let i = 6969; i < 7070; i++) {
        const res = await fetch(`http://127.0.0.1:${i}/secret`)
          .catch((err) => {
            // TypeError: Could not connect to the server
            if (!(err instanceof TypeError)) {
              console.error("Error on attach:", err);
            }
            return null;
          });
        if (res && res.ok) {
          const text = await res.text();
          if (text === "0xdeadbeef") {
            setAttached(true);
            setPort(i);
            status = AttachStatus.SUCCESS;
            break;
          }
        }
      }
    }

    return status;
  }

  async function detach() {
    if (!updateTitle.current) return false;

    if (!attached) return true; // huh?

    if (client === "MacSploit") {
      updateTitle.current("(detaching...)", 3000);

      const status = await invoke("detach")
        .catch((err: string) => {
          if (err === "NotInjected") {
            return true;
          }

          console.error("Error on detach:", err);
          return false;
        });

      setAttached(false);
      return status;
    } else if (client === "Hydrogen") {
      setAttached(false);
      setPort(-1);
      return true;
    }
  }

  function onContextMenu(id: string, name: string | null) {
    (async () => {
      if (id === "execute" && name) {
        if (!editor.current || !updateTitle.current) return;

        if (!attached) {
          updateTitle.current("(not injected! press attach)", 3000);
        }

        const script = await readTextFile(await path.join("scripts", name), { baseDir: BaseDirectory.AppData })
          .catch((err: string) => {
            message(err, { title: "Synapse X", kind: "error"});
            return null;
          });
        if (!script) return;

        await execute(script);
      } else if (id === "load" && name) {
        if (!createSession.current) return;

        const directory = await path.join("scripts", name);
        const script = await readTextFile(directory, { baseDir: BaseDirectory.AppData })
          .catch((err: string) => {
            message(err, { title: "Synapse X", kind: "error"});
            return null;
          });
        if (!script) return;

        createSession.current(name, script, await path.join(await appDataDir(), directory));
      } else if (id === "open") {
        await openPath(await path.join(await appDataDir(), "scripts"));
      } else if (id === "refresh") {
        await refreshScripts();
      }
    })();
  }

  function onTabContextMenu(id: string, session: ScriptSession) {
    if (id === "execute") {
      if (session.id === sessionStore.session?.id && editor.current) {
        const script = editor.current.getValue();
        execute(script);
      } else {
        const editSession = sessionStore.editSessions[session.id];
        if (editSession) {
          const script = editSession.getValue();
          execute(script);
        }
      }
    } else if (id === "rename") {
      invoke<string>("prompt", { title: "Synapse X", message: "Enter a new name for the tab", default: session.name })
        .then((answer) => {
          if (!answer) return;

          const newSession = { ...session, name: answer };
          const newSessions = sessionStore.sessions.map(s => s.id === session.id ? newSession : s);
          sessionStore.setSessions(newSessions);
          if (sessionStore.session?.id === session.id) {
            sessionStore.setSession(newSession);
          }
        });
    }
  }

  async function refreshScripts() {
    // cannot differentiate between folder and file but who cares?
    const scriptsExists = await exists("scripts", { baseDir: BaseDirectory.AppData });
    if (!scriptsExists) {
      const scriptsCreated = await mkdir("scripts", { baseDir: BaseDirectory.AppData })
        .then(() => true)
        .catch((err: string) => {
          message(err, { title: "Synapse X", kind: "error"});
          return false;
        });
      if (!scriptsCreated) return;
    }

    const paths = await readDir("scripts", { baseDir: BaseDirectory.AppData })
      .catch((err: string) => {
        message(err, { title: "Synapse X", kind: "error"});
        return null;
      });
    if (!paths) return;

    const scriptPaths = paths.filter(path => path.name.endsWith(".lua") || path.name.endsWith(".txt"));
    setScripts(scriptPaths.map(path => path.name));
  }

  useEffect(() => {
    getCurrentWindow().show();

    // i cba to do shit in rust so ill just do everything in js
    const data: Uint8Array[] = [];
    const unlistenData = listen<number[]>("data", (event) => {
      const chunk = new Uint8Array(event.payload);
      data.push(chunk);
    });

    const unlistenFinish = listen<string>("finish", () => {
      // finalize
      const len = data.reduce((sum, arr) => sum + arr.length, 0);
      const concatenated = new Uint8Array(len);

      let offset = 0;
      for (const chunk of data) {
        concatenated.set(chunk, offset);
        offset += chunk.length;
      }

      data.length = 0; // reset array

      const type = concatenated[0];
      if (!type || ![1, 2].includes(type)) return; // unknown type

      const length = new DataView(concatenated.subarray(8, 16).buffer, 8, 8).getBigUint64(0, true); // length of output
      const message = new TextDecoder().decode(concatenated.subarray(16, 16 + Number(length)));

      if (type === 1) console.log("[Debug]", message);
      else if (type === 2) console.log("[Error]", message);
    });

    const unlistenDisconnect = listen("disconnect", () => {
      setAttached(false);
    });

    const unlistenSettings = listen("update_settings", async (event) => {
      const { key, value, type } = event.payload as { key: string; value: boolean | string; type: string; };

      if (client === "MacSploit" && attached) { // if MacSploit is connected
        if (type === "ui") {
          if (key === "client" && value !== "MacSploit") { // change client
            await onAttach(); // detach
          }
        } else if (type === "settings") {
          // apply settings (send update setting packet)
          await invoke("settings", { key, value })
            .catch((err: string) => {
              if (err === "NotInjected") setAttached(false);
              console.error(err);
            });
        }
      } else if (client === "Hydrogen" && attached) { // if Hydrogen is connected
        if (type === "ui" && key === "client" && value !== "Hydrogen") { // change client
          await onAttach(); // detach
        }
      }

      if (type === "ui") {
        if (key === "alwaysOnTop") {
          setAlwaysOnTop(value as boolean);
        } else if (key === "autoAttach") {
          setAutoAttach(value as boolean);
        } else if (key === "client") {
          setClient(value as string);
        }
      }
    });

    return () => {
      unlistenData.then((unlisten) => unlisten());
      unlistenFinish.then((unlisten) => unlisten());
      unlistenDisconnect.then((unlisten) => unlisten());
      unlistenSettings.then((unlisten) => unlisten());
    }
  }, [ client, attached ]);

  async function pollAttach() {
    if (!updateTitle.current) return;

    const status = await attach();
    if (status === AttachStatus.SUCCESS) {
      updateTitle.current("(ready!)", 3000);
    }
  }

  async function pollDetach() {
    const res = await fetch(`http://127.0.0.1:${port}/secret`)
      .catch((err) => {
        // TypeError: Could not connect to the server
        if (!(err instanceof TypeError)) {
          console.error("Error on attach:", err);
        }
        return null;
      });
    if (res && res.ok) {
      const text = await res.text();
      if (text === "0xdeadbeef") return; // success, server is alive
    }

    setAttached(false);
    setPort(-1);
  }

  useEffect(() => {
    if (attached && client === "Hydrogen") {
      const pollInterval = setInterval(pollDetach, 1000);

      return () => {
        clearInterval(pollInterval);
      };
    }

    if (!attached && autoAttach) {
      const pollInterval = setInterval(pollAttach, 1000);

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [ attached, port, client, autoAttach ]);

  useEffect(() => {
    const openRequest = indexedDB.open("ScriptsDatabase", 1);

    openRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("scripts")) db.createObjectStore("scripts");
    };
    openRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = db.transaction("scripts", "readonly");
      const store = tx.objectStore("scripts");

      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          // @ts-ignore
          const editSession = ace.createEditSession(cursor.value, "ace/mode/lua");
          sessionStore.addEditSession(cursor.key as string, editSession);
          cursor.continue();
        } else {
          if (sessionStore.session) {
            // update dom
            const newSession = { ...sessionStore.session };
            sessionStore.setSession(newSession);
          }
        }
      };
    };
  }, []);

  useEffect(() => { refreshScripts() }, []);

  useEffect(() => {
    (async () => {
      const cfg = await readTextFile("config.json", { baseDir: BaseDirectory.AppData })
        .catch((err: string) => {
          if (!err.includes("No such file or directory (os error 2)")) {
            message(err, { title: "Synapse X", kind: "error"});
          }
        });
      if (!cfg) return;

      let config: Record<string, boolean | string>;
      try {
        config = JSON.parse(cfg);
      } catch (err) {
        message("Failed to parse config", { title: "Synapse X", kind: "error"});
        console.error("Failed to parse config:", err);
        return;
      }

      if (typeof config !== "object" || Array.isArray(config)) return;

      for (const [ key, value ] of Object.entries(config)) {
        if (key === "alwaysOnTop") {
          setAlwaysOnTop(value as boolean);
        } else if (key === "autoAttach") {
          setAutoAttach(value as boolean);
        } else if (key === "client") {
          setClient(value as string);
        }
      }
    })();
  }, []);

  useEffect(() => {
    getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
  }, [ alwaysOnTop ]);

  useEffect(() => {
    if (!editor.current) return;
    if (!sessionStore.session) return;
    if (sessionStore.editSessions[sessionStore.session.id]) {
      const editSession = sessionStore.editSessions[sessionStore.session.id];
      editor.current.setSession(editSession);
    } else { // why not exist?
      // @ts-ignore
      const editSession = ace.createEditSession("", "ace/mode/lua");
      sessionStore.addEditSession(sessionStore.session.id, editSession);
      editor.current.setSession(editSession);
    }
  }, [ sessionStore.session ]);

  useEffect(() => {
    if (!editor.current) return;

    const onChange = () => {
      if (!editor.current || !sessionStore.session) return;

      if (!sessionStore.session.edited) {
        sessionStore.setEdited(sessionStore.session.id, true);
      }

      saveScript(sessionStore.session.id, editor.current.getValue());
    };

    editor.current.on("change", onChange);

    return () => {
      if (!editor.current) return;
      editor.current.off("change", onChange);
    };
  }, [ sessionStore.session ]);

  return (<>
    <Header>
      <Icon/>
      <Title ref={ updateTitle }/>
      <HeaderButtonContainer>
        <HeaderButton onClick={ () => getCurrentWindow().minimize() }>_</HeaderButton>
        <HeaderButton onClick={ () => getCurrentWindow().isFullscreen().then(fullscreen => getCurrentWindow().setFullscreen(!fullscreen)) }>M</HeaderButton>
        <HeaderButton onClick={ () => getAllWindows().then(windows => windows.forEach(window => window.close())) }>X</HeaderButton>
      </HeaderButtonContainer>
    </Header>

    <Main>
      <EditorContainer>
        <TabContainer>
          {
            sessionStore.sessions.map((s, i) => <Tab key={ i } session={ s } onContextMenu={ onTabContextMenu }/>)
          }
          <NewTab ref={ createSession }/>
        </TabContainer>
        <Editor ref={ editor }/>
      </EditorContainer>

      <ScriptContainer onContextMenu={ onContextMenu }>
        {
          scripts.map((script, i) => <Script key={ i } name={ script } onContextMenu={ onContextMenu }/>)
        }
      </ScriptContainer>
    </Main>

    <FooterContainer>
      <ButtonContainer>
        <Button onClick={ onExecute }>Execute</Button>
        <Button onClick={ onClear }>Clear</Button>
        <Button onClick={ onOpenFile }>Open File</Button>
        <Button onClick={ onExecuteFile }>Execute File</Button>
        <Button onClick={ onSaveFile }>Save File</Button>
        <Button onClick={ onOptions }>Options</Button>
      </ButtonContainer>

      <ButtonContainer>
        <Button onClick={ onAttach }>{ attached ? "Detach" : "Attach" }</Button>
        <Button onClick={ onScriptHub }>Script Hub</Button>
      </ButtonContainer>
    </FooterContainer>
  </>);
}
