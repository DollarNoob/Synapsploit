<script lang="ts">
  import { dialog, fs } from "@tauri-apps/api";
  import { listen } from "@tauri-apps/api/event";
  import { BaseDirectory } from "@tauri-apps/api/fs";
  import { invoke } from "@tauri-apps/api/tauri";
  import { appWindow } from "@tauri-apps/api/window";
  import { showMenu } from "tauri-plugin-context-menu";
  import { onMount } from "svelte";
  import * as monaco from "monaco-editor";
  import ace, { Ace } from "ace-builds";
  import "ace-builds/src-noconflict/mode-lua";
  import "ace-builds/src-noconflict/worker-lua";
  import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
  import "ace-builds/src-noconflict/ext-language_tools";
  import "ace-builds/src-noconflict/ext-searchbox";
  import Icon from "./sxlogosmallwhite_OJJ_icon.ico";

  // TODO: add cmd + w action and add items in menu
  const version = "v1.2.1";
  const baseTitle = "Synapse X - " + version;

  interface ScriptSession {
    id: string;
    name: string;
    session: monaco.editor.ICodeEditorViewState | Ace.EditSession;
    absolutePath: string | null;
    edited: boolean;
  }

  interface ScriptSessionStore {
    id: string;
    name: string;
    absolutePath: string | null;
    edited: boolean;
  }

  interface SessionStore {
    tabId: string;
  }

  let title = baseTitle;
  let tabs: ScriptSession[] = [];
  let currentTab: ScriptSession;
  let scripts: string[] = [];
  let editor: monaco.editor.IStandaloneCodeEditor | Ace.Editor;
  let config = {
    alwaysOnTop: true,
    autoAttach: true,
    scanPort: true
  };

  listen("config-update", (event) => {
    const [alwaysOnTop, autoAttach, scanPort] = (event.payload as string).split("").map(bool => bool === "1");
    config.alwaysOnTop = alwaysOnTop;
    config.autoAttach = autoAttach;
    config.scanPort = scanPort;
    appWindow.setAlwaysOnTop(alwaysOnTop);
  });

  listen("executeScript", (event) => {
    fs.readTextFile(event.payload as string)
      .then((data) => {
        invoke("execute", { script: data })
          .catch((err: string) => {
            if (err === "NotInjected")
              return updateTitle("(not injected! press attach)");
            console.error("Error on execute:", err);
          });
      })
      .catch((err) => {
        console.error("Error on executeScript:", err);
      });
  });

  listen("loadScript", (event) => {
    fs.readTextFile(event.payload as string)
      .then((data) => {
        editor.setValue(data);
      })
      .catch((err) => {
        console.error("Error on loadScript:", err);
      });
  });

  listen("refreshScript", refreshScripts);

  let updateTimeout: number | null = null;
  onMount(async () => {
    const anyWindow = window as any;
    if (!anyWindow.hookFunc) {
      anyWindow.hookFunc = async (e: Event) => {
        e.preventDefault();

        if (e.target === document.getElementById("scriptBox")) {
          await showMenu({
            items: [
              {
                label: "Execute",
                event: "executeScript",
                disabled: true
              },
              {
                label: "Load to Editor",
                event: "loadScript",
                disabled: true
              },
              {
                label: "Refresh",
                event: "refreshScript"
              }
            ]
          });
          return;
        } else if (e.target instanceof HTMLLIElement) {
          await showMenu({
            items: [
              {
                label: "Execute",
                event: "executeScript",
                payload: e.target.getAttribute("data-path")
              },
              {
                label: "Load to Editor",
                event: "loadScript",
                payload: e.target.getAttribute("data-path")
              },
              {
                label: "Refresh",
                event: "refreshScript"
              }
            ]
          });
          return;
        }
      };
      window.addEventListener("contextmenu", anyWindow.hookFunc);
    }

    if (typeof anyWindow.autoAttachInterval !== "number") {
      anyWindow.autoAttachInterval = setInterval(async () => {
        if (!config.autoAttach) return;

        const status = await attach();
        if (status === AttachStatus.SUCCESS) {
          updateTitle("(ready!)");
        }
      }, 1000);
    }

    const editorElement = document.getElementById("editor")!;

    editor = ace.edit(editorElement);
    editor.setTheme("ace/theme/tomorrow_night_eighties");
    editor.setBehavioursEnabled(true);
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true
    });

    const scripts: ScriptSessionStore[] = JSON.parse(localStorage.getItem("scripts") ?? "[]");
    if (scripts.length === 0) {
      newTab();
    } else {
      for (const script of scripts) {
        // @ts-ignore
        const editSession = ace.createEditSession(localStorage.getItem(script.id) ?? "", "ace/mode/lua");
        tabs.push({ id: script.id, name: script.name, session: editSession, absolutePath: script.absolutePath, edited: script.edited });
      }

      const session: SessionStore = JSON.parse(localStorage.getItem("session") ?? "{}");
      tabs = tabs; // update tabs
      switchTab(tabs.find(tab => tab.id === session.tabId) ?? tabs[0])();
    }

    // monaco.editor.create(document.getElementById("editor")!, {
    //   value: localStorage.getItem("script") ?? 'print("Hello World!")',
    //   language: "lua",
    //   theme: "vs-dark",
    //   automaticLayout: true
    // });

    // editor.onDidChangeModelContent((event) => {
    //   const sessionId = ++updateSession;
    //
    //   // Only update if text wasn't changed for 3s
    //   setTimeout(() => {
    //     if (updateSession === sessionId)
    //       localStorage.setItem("script", editor.getValue());
    //   }, 3000);
    // });

    editor.on("change", () => {
      if (updateTimeout)
        clearTimeout(updateTimeout);

      const currTab = tabs[tabs.indexOf(currentTab)];
      if (!currTab.edited) {
        currTab.edited = true;
        tabs = tabs; // update dom
        const scriptSessionStore: ScriptSessionStore[] = JSON.parse(localStorage.getItem("scripts") ?? "{}");
        scriptSessionStore.find(session => session.id === currTab.id)!.edited = true;
        localStorage.setItem("scripts", JSON.stringify(scriptSessionStore));
      }

      // Only update if text wasn't changed for 3s
      updateTimeout = setTimeout(() => {
        localStorage.setItem(currentTab.id, editor.getValue());
        updateTimeout = null;
      }, 3000);
    });

    invoke("read_config")
      .then((cfg) => {
        const { always_on_top, auto_attach, scan_port } = cfg as { [name: string]: boolean };
        config.alwaysOnTop = always_on_top;
        config.autoAttach = auto_attach;
        config.scanPort = scan_port;
        appWindow.setAlwaysOnTop(always_on_top);
      })
      .catch((err: string) => {
        console.error("Error on read_config:", err);
      });
  });

  let titleSession = 0;
  function updateTitle(text: string) {
    const sessionId = ++titleSession;
    title = baseTitle + " " + text;

    // Only reset title if title wasn't changed for 3s
    setTimeout(() => {
      if (titleSession === sessionId)
        title = baseTitle;
    }, 3000);
  }

  function newTab(name?: string, content?: string, path?: string) {
    // @ts-ignore
    const session = ace.createEditSession(content ?? "", "ace/mode/lua");
    const tabId = crypto.randomUUID();

    // default name (Script n)
    if (!name) {
      const scripts: ScriptSessionStore[] = JSON.parse(localStorage.getItem("scripts") ?? "[]");
      let sessionIndex = 1;
      for (const script of scripts) {
        const nameMatch = script.name.match(/Script (\d+)/);
        if (nameMatch && script.absolutePath === null) {
          const index = parseInt(nameMatch[1]);
          if (sessionIndex <= index) sessionIndex = index + 1;
        }
      }
      name = `Script ${sessionIndex}`;
    }

    const tab: ScriptSession = {
      id: tabId,
      name: name,
      session,
      absolutePath: path ?? null,
      edited: false
    };

    // set local storage
    const scripts: ScriptSessionStore[] = JSON.parse(localStorage.getItem("scripts") ?? "[]");
    scripts.push({
      id: tabId,
      name: name,
      absolutePath: path ?? null,
      edited: false
    });
    localStorage.setItem("scripts", JSON.stringify(scripts));
    localStorage.setItem(tabId, content ?? ""); // save script on tab open

    tabs = [ ...tabs, tab ];
    switchTab(tab)();
  }

  function switchTab(tab: ScriptSession) {
    if (updateTimeout) {
      clearTimeout(updateTimeout);
      updateTimeout = null;

      // save script if tab change was requested before the 3s save interval
      localStorage.setItem(currentTab.id, editor.getValue());
    }

    const sessionStore: SessionStore = JSON.parse(localStorage.getItem("session") ?? "{}");
    sessionStore.tabId = tab.id;
    localStorage.setItem("session", JSON.stringify(sessionStore));

    return () => {
      currentTab = tab;
      (<Ace.Editor>editor).setSession(<Ace.EditSession>tab.session);
    };
  }

  function closeTab(tab: ScriptSession) {
    return () => {
      if (tabs.length <= 1) return; // don't close
      const index = tabs.indexOf(tab);
      tabs = tabs.filter((_, i) => i !== index);

      if (updateTimeout) {
        clearTimeout(updateTimeout);
        updateTimeout = null;
      }

      // delete script cache
      const scripts: ScriptSessionStore[] = JSON.parse(localStorage.getItem("scripts") ?? "[]");
      const deletedScript: ScriptSessionStore = scripts.splice(index, 1)[0];
      localStorage.setItem("scripts", JSON.stringify(scripts));
      localStorage.removeItem(deletedScript.id);

      if (currentTab === tab)
        switchTab(tabs[tabs.length == index ? tabs.length - 1 : index])();
    }
  }

  let iconClicks = 0;
  function onIcon() {
    invoke("open_popup", (++iconClicks) % 5 === 0 ? {
      title: "Synapsploit Credits",
      text: [
        "MacSploit was developed by Nexus42.",
        "",
        "Additional credits:",
        "- Nexus42: Not giving us MS API docs",
        "- Byfron: Emotional damage and beaming",
      ].join("<br/>")
    } : {
      title: "Synapse X Credits",
      text: [
        "Synapse X was developed by 3dsboy08,",
        "brack4712, Louka, DefCon42, and Eternal.",
        "",
        "Additional credits:",
        "- Rain: Emotional support and testing"
      ].join("<br/>")
    })
      .catch((err: string) => {
        console.error("Error on open_popup:", err);
      });
  }

  function onClose() {
    invoke("close_window");
  }

  function onMinimize() {
    appWindow.minimize();
  }

  function onExecute() {
    invoke("execute", {script: editor.getValue()})
      .catch((err: string) => {
        if (err === "NotInjected")
          return updateTitle("(not injected! press attach)");
        console.error("Error on execute:", err);
      });
  }

  function onClear() {
    editor.setValue("");
  }

  function onOpenFile() {
    dialog.open({
      title: "Synapse X - Open File",
      filters: [
        {
          name: "Script Files",
          extensions: ["lua", "txt"]
        }
      ]
    })
      .then(async (path) => {
        if (!path) return;
        if (Array.isArray(path)) return; // path must be a string
        const data = await fs.readTextFile(path);
        newTab(path.split("/").pop(), data, path);
      })
      .catch((err) => {
        console.error("Error on onOpenFile:", err);
      });
  }

  function onExecuteFile() {
    dialog.open({
      title: "Synapse X - Execute File",
      filters: [
        {
          name: "Script Files",
          extensions: ["lua", "txt"]
        }
      ]
    })
      .then(async (path) => {
        if (!path) return;
        if (Array.isArray(path)) return; // path must be a string
        const data = await fs.readTextFile(path);
        invoke("execute", { script: data })
          .catch((err: string) => {
            if (err === "NotInjected")
              return updateTitle("(not injected! press attach)");
            console.error("Error on execute:", err);
          });
      })
      .catch((err) => {
        console.error("Error on onExecuteFile:", err);
      });
  }

  function onSaveFile() {
    dialog.save({
      filters: [
        {
          name: "Script Files",
          extensions: ["lua", "txt"]
        }
      ]
    })
      .then((path) => {
        if (!path) return;
        fs.writeTextFile(path, editor.getValue());
        refreshScripts();

        // update tab session
        const currTab = tabs[tabs.indexOf(currentTab)];
        currTab.name = path.split("/").pop()!;
        currTab.absolutePath = path;
        currTab.edited = false;
        tabs = tabs; // refresh dom

        // TODO: check if this works as intended (i think so)
        const scriptSessionStore: ScriptSessionStore[] = JSON.parse(localStorage.getItem("scripts") ?? "[]");
        const scriptSession = scriptSessionStore.find(session => session.id === currentTab.id)!;
        scriptSession.name = path.split("/").pop()!;
        scriptSession.absolutePath = path;
        scriptSession.edited = false;
        localStorage.setItem("scripts", JSON.stringify(scriptSessionStore));
      })
      .catch((err) => {
        console.error("Error on onSaveFile:", err);
      });
  }

  function onOptions() {
    invoke("open_options");
  }

  enum AttachStatus {
    SUCCESS = 0,
    ALREADY_INJECTED = 1,
    ATTACH_FAILED = 2,
    INTERRUPT = 3,
    FAILURE = 4
  }

  async function attach(): Promise<AttachStatus> {
    let status: AttachStatus = AttachStatus.FAILURE;

    // 5553 ~ 5563 for each roblox window
    for (let i = 5553; i <= (config.scanPort ? 5563 : 5553); i++) {
      const retry = await invoke("attach", {port: i})
        .then(() => {
          status = AttachStatus.SUCCESS;
          return false;
        })
        .catch((err: string) => {
          if (err === "ConnectionRefused") {
            return true;
          } else if (err === "AlreadyInjected") {
            status = AttachStatus.ALREADY_INJECTED;
            return false;
          } else if (err === "SocketNotAlive") {
            status = AttachStatus.ATTACH_FAILED;
            return false;
          } else if (err === "TimedOut" || err === "ConnectionConflict") {
            status = AttachStatus.INTERRUPT;
            return false;
          }

          console.error("Error on attach:", err);
          return false;
        });
      if (!retry) break;
    }
    return status;
  }

  async function onAttach() {
    updateTitle("(injecting...)");

    const status = await attach();

    let message = "";
    switch (status) {
      case AttachStatus.SUCCESS:
        message = "(ready!)";
        break;
      case AttachStatus.ATTACH_FAILED:
        message = "(failed to attach!)";
        break;
      case AttachStatus.INTERRUPT:
        message = "(connection conflict!)";
        break;
      case AttachStatus.FAILURE:
        message = "(failed to find roblox!)";
        break;
      case AttachStatus.ALREADY_INJECTED:
        message = "(already injected!)";
        break;
    }

    updateTitle(message);
  }

  function onScriptHub() {
    invoke("open_popup", {
      title: "Synapse X - Script Hub",
      text: [
        "i dont have scripts to put here",
        "please send me some scripts",
        "",
        "waiting for your help 24/7",
        ">> https://t.me/DollarNoob <<"
      ].join("<br/>")
    })
      .catch((err: string) => {
        console.error("Error on open_popup:", err);
      });
  }

  async function onOpenScript(e: MouseEvent) {
    const target = e.target as HTMLLIElement;
    const path = target.getAttribute("data-path")!;
    const data = await fs.readTextFile(path);
    newTab(path.split("/").pop(), data, path);
  }

  function refreshScripts() {
    fs.readDir("scripts", { dir: BaseDirectory.AppData })
      .then((paths) => {
        scripts = paths.filter(path => path.name!.endsWith(".lua") || path.name!.endsWith(".txt")).map(path => path.path);
      })
      .catch((err: string) => {
        console.error("Error on scriptboxRefresh:", err);
      });
  }

  refreshScripts();
</script>

<header id="topBox" data-tauri-drag-region>
  <div id="titleBox" data-tauri-drag-region>
    { title }
  </div>
  <button id="closeButton" class="button" on:click={ onClose }>
    X
  </button>
  <button id="miniButton" class="button" on:click={ onMinimize }>
    _
  </button>
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <img src={ Icon } id="iconBox" alt="Synapse X Icon" draggable="false" on:mousedown={ onIcon }>
</header>

<main>
  <div id="scriptContainer">
    <div id="editorContainer">
      <div id="tabContainer">
        {#each tabs as session}
          <button data-path={ session } class="tab" class:tab-sel={ currentTab === session } on:click={ switchTab(session) }>
            { (session.edited && session.absolutePath !== null) ? "*" : "" }{ session.name }
            <button class="close-tab" on:click|stopPropagation={ closeTab(session) }>×</button>
          </button>
        {/each}
        <div id="newTabContainer">
          <button id="newTab" on:click={ () => newTab() }>
            +
          </button>
        </div>
      </div>
      <div id="editor"/>
    </div>

    <div id="scriptBox">
      <ul>
        {#each scripts as script}
          <li data-path={ script } on:dblclick={ onOpenScript }>{ script.split("/").pop() }</li>
        {/each}
      </ul>
    </div>
  </div>

  <div id="buttonContainer">
    <button id="execute" class="button left-align" on:click={ onExecute }>
      Execute
    </button>
    <button id="clear" class="button left-align" on:click={ onClear }>
      Clear
    </button>
    <button id="openFile" class="button left-align" on:click={ onOpenFile }>
      Open File
    </button>
    <button id="executeFile" class="button left-align" on:click={ onExecuteFile }>
      Execute File
    </button>
    <button id="saveFile" class="button left-align" on:click={ onSaveFile }>
      Save File
    </button>
    <button id="options" class="button left-align" on:click={ onOptions }>
      Options
    </button>

    <div id="rightAlignContainer">
      <button id="attach" class="button right-align" on:click={ onAttach }>
        Attach
      </button>
      <button id="scriptHub" class="button right-align" on:click={ onScriptHub }>
        Script Hub
      </button>
    </div>
  </div>
</main>

<style>
  * {
    min-width: 0;
    min-height: 0;
  }

  @font-face {
    font-family: "Segoe UI";
    src: url("../SegoeUI.woff") format("woff");
  }

  button {
    padding: initial;
    color: unset;
    border: 0;
  }

  :root {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont;
    font-size: 12px;
    line-height: 24px;
    margin: 0;

    color: #ffffff;
    background-color: #333333;

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
    -webkit-touch-callout: none;
    user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-user-select: none;
  }

  #topBox {
    display: flex;
    height: 30px;
    background-color: #3C3C3C;
    justify-content: center;
    align-items: center;
  }

  #titleBox {
    color: white;
    cursor: default;
  }

  #closeButton {
    position: absolute;
    top: 1px;
    right: 1px;
    width: 22px;
    height: 22px;
    color: inherit;
    font-size: 12px;
    background-color: inherit;
  }

  #miniButton {
    position: absolute;
    top: 1px;
    right: 24px;
    width: 22px;
    height: 22px;
    color: inherit;
    font-size: 12px;
    background-color: inherit;
  }

  #iconBox {
    position: absolute;
    top: 0;
    left: 6px;
    width: 30px;
    height: 30px;
  }

  main {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 30px);
  }

  #scriptContainer {
    display: flex;
    flex-grow: 1;
    margin-top: 5px;
    margin-left: 10px;
    margin-right: 6px;
  }

  #editorContainer {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  #tabContainer {
    display: flex;
    height: 20px;
    overflow-x: scroll;
    white-space: nowrap;
  }

  #tabContainer::-webkit-scrollbar { 
    display: none;
  }

  .tab {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont;
    font-size: 12px;
    cursor: default;
    background-color: #858585;
    height: 20px; /* fix for low macos versions, idk why it breaks */
    line-height: 20px;
    font-style: inherit;
    padding-left: 5px;
    min-width: min-content;
  }

  .tab-sel {
    background-color: #757575;
    color: #fff;
  }

  .close-tab {
    color: white;
    background-color: inherit;
    font-size: 14px;
    padding: 0 5px 0 0;
  }

  #newTabContainer {
    min-width: 20px;
    width: 20px;
    height: 20px;
  }

  #newTab {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont;
    color: white;
    cursor: default;
    min-width: 12px;
    width: 12px;
    height: 12px;
    margin-left: 5px;
    margin-top: 4px;
    font-size: 18px;
    background-color: #757575;
    outline: 1px solid #959595;
    padding-left: 1px;
    padding-bottom: 4px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #newTab:hover {
    background-color: #555555;
    border: none;
    outline: 1px solid #656565;
  }

  #editor {
    flex-grow: 1;
  }

  #scriptBox {
    width: 122px;
    min-width: 122px;
    margin-left: 5px;
    color: white;
    background-color: #3C3C3C;
    overflow-y: scroll;
  }

  #scriptBox::-webkit-scrollbar { 
    display: none;
  }

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
  }

  li {
    cursor: default;
    padding-left: 6px;
    padding-right: 6px;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  li:hover {
    background-color: #354555;
    box-shadow: 0 0 0 1px inset gray;
  }

  li:active {
    background-color: #304565;
    box-shadow: 0 0 0 1px inset #354555;
  }

  #buttonContainer {
    display: flex;
    height: 33px;
    margin-top: 5px;
    margin-left: 5px;
    margin-bottom: 10px;
  }

  #rightAlignContainer {
    margin-left: auto;
    margin-right: 1px;
  }

  .button {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont;
    color: white;
    background-color: #3C3C3C;
    font-size: 14px;
    width: 91px;
    height: 33px;
  }

  .button:hover {
    background-color: #354555 !important;
    box-shadow: 0 0 0 1px gray;
  }

  .button:active {
    background-color: #304565;
    box-shadow: 0 0 0 1px #354555;
  }

  .left-align {
    margin-left: 5px;
  }

  .right-align {
    margin-right: 5px;
  }
</style>