<script lang="ts">
  import {invoke} from "@tauri-apps/api/tauri";
  import {listen} from "@tauri-apps/api/event";
  import {appWindow} from "@tauri-apps/api/window";
  import {showMenu} from "tauri-plugin-context-menu";
  import {onMount} from "svelte";
  import * as monaco from "monaco-editor";
  import ace from "brace";
  import "brace/mode/lua";
  import "brace/theme/tomorrow_night_eighties";
  import "brace/ext/language_tools";
  import "brace/ext/searchbox";
  import Icon from "./sxlogosmallwhite_OJJ_icon.ico";

  const version = "v1.2";
  const baseTitle = "Synapse X - " + version;

  interface SessionInfo {
    name: string;
    session: monaco.editor.ICodeEditorViewState | ace.IEditSession;
  }

  let sessionIndex = 0;
  let title = baseTitle;
  let tabs: SessionInfo[] = [];
  let currentTab: SessionInfo;
  let scripts: string[] = [];
  let editor: monaco.editor.IStandaloneCodeEditor | ace.Editor;
  let config = {
    alwaysOnTop: true,
    autoAttach: true,
    autoExecute: true,
    scanPort: true
  };

  listen("executeScript", event => {
    invoke("scriptbox_execute", {path: event.payload})
      .catch((e: string) => {
        if (e === "NotInjected")
          return updateTitle("(not injected! press attach)");
        console.error("Error on scriptbox_execute:", e);
      });
  });

  listen("loadScript", event => {
    invoke("scriptbox_load", {path: event.payload})
      .then((script) => {
        editor.setValue(script as string);
      })
      .catch((e: string) => {
        console.error("Error on scriptbox_load:", e);
      });
  });

  listen("refreshScript", () => {
    invoke("scriptbox_refresh")
      .then((_scripts) => {
        scripts = _scripts as string[];
      })
      .catch((e: string) => {
        console.error("Error on scriptbox_refresh:", e);
      });
  });

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

    if (!!anyWindow.readConfigInterval) clearInterval(anyWindow.readConfigInterval);
    if (!!anyWindow.autoAttachInterval) clearInterval(anyWindow.autoAttachInterval);

    anyWindow.readConfigInterval = setInterval(readConfigAndSet, 60000);
    anyWindow.autoAttachInterval = setInterval(async () => {
      if (!config.autoAttach) return;

      // 5553 ~ 5563 for each roblox window
      const status = await attach();
      if (status === AttachStatus.SUCCESS) {
        updateTitle('(ready!)');
      }
    }, 10000);

    editor = ace.edit("editor");
    editor.setTheme("ace/theme/tomorrow_night_eighties");
    editor.session.setMode("ace/mode/lua");
    editor.setBehavioursEnabled(true);
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true
    });

    // @ts-ignore
    const editSession = ace.createEditSession("", "ace/mode/lua");
    tabs.push({name: `Script ${++sessionIndex}`, session: editSession});
    tabs = tabs;
    switchTab(tabs[0])();

    // monaco.editor.create(document.getElementById("monaco")!, {
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

    invoke("scriptbox_refresh")
      .then((_scripts) => {
        scripts = _scripts as string[];
      })
      .catch((e: string) => {
        console.error("Error on scriptbox_refresh:", e);
      });

    readConfigAndSet();
  });

  let titleSession = 0;

  function readConfigAndSet() {
    invoke("read_config")
      .then(async (cfg) => {
        const [alwaysOnTop, autoAttach, autoExecute, scanPort] = cfg as boolean[];
        config.alwaysOnTop = alwaysOnTop;
        config.autoAttach = autoAttach;
        config.autoExecute = autoExecute;
        config.scanPort = scanPort;
      })
      .catch((e: string) => {
        console.error("Error on read_config:", e);
      });
  }

  function updateTitle(text: string) {
    const sessionId = ++titleSession;
    title = baseTitle + " " + text;

    // Only reset title if title wasn't changed for 3s
    setTimeout(() => {
      if (titleSession === sessionId)
        title = baseTitle;
    }, 3000);
  }

  function newTab(name?: string, content?: string) {
    // @ts-ignore
    const session = ace.createEditSession(content || "", "ace/mode/lua");
    const toAdded = {name: name || `Script ${++sessionIndex}`, session};
    tabs.push(toAdded);
    tabs = tabs;
    switchTab(toAdded)();
  }

  function switchTab(tab: SessionInfo) {
    return () => {
      currentTab = tab;
      (<ace.Editor>editor).setSession(<ace.IEditSession>tab.session);
    }
  }

  function closeTab(tab: SessionInfo) {
    return () => {
      if (tabs.length <= 1) return; // no close
      const index = tabs.indexOf(tab);
      tabs.splice(index, 1);
      tabs = tabs;

      if (currentTab === tab) {
        switchTab(tabs[tabs.length == index ? tabs.length - 1 : index])();
      }
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
        "- Byfron: Emotional damage and irritating",
        "- DollarNoob: Cloning Synapse UI WPF"
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
      .catch((e: string) => {
        console.error("Error on open_popup:", e);
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
      .catch((e: string) => {
        if (e === "NotInjected")
          return updateTitle("(not injected! press attach)");
        console.error("Error on execute:", e);
      });
  }

  function onClear() {
    editor.setValue("");
  }

  function onOpenFile() {
    invoke("open_file")
      .then((script) => {
        const [path, content] = script as string[];
        // console.log(path);
        newTab(path.split('/').pop(), content);
        // editor.setValue(content);
      })
      .catch((e: string) => {
        if (e === "FileNotSelected") return;
        console.error("Error on open_file:", e);
      });
  }

  function onExecuteFile() {
    invoke("execute_file")
      .catch((e: string) => {
        if (e === "FileNotSelected") return;
        else if (e === "NotInjected")
          return updateTitle("(not injected! press attach)");
        console.error("Error on execute_file:", e);
      });
  }

  function onSaveFile() {
    invoke("save_file", {contents: editor.getValue()})
      .catch((e: string) => {
        if (e === "FileNotSelected") return;
        console.error("Error on save_file:", e);
      });
  }

  function onOptions() {
    invoke("open_options");
  }

  enum AttachStatus {
    SUCCESS = 0,
    ALREADY_INJECTED = 1,
    ATTACH_FAILED = 2,
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
        .catch((e: string) => {
          if (e.includes("Connection refused"))
            return true;
          else if (e === "SocketNotAlive") {
            status = AttachStatus.ATTACH_FAILED;
            return true;
          } else if (e === "AlreadyInjected") {
            status = AttachStatus.ALREADY_INJECTED;
            return false;
          }
          console.error("Error on attach:", e);
          return false;
        });
      if (!retry) break;
    }
    return status;
  }

  async function onAttach() {
    updateTitle("(injecting...)");

    const status = await attach();

    let message = '';
    switch (status) {
      case AttachStatus.SUCCESS:
        message = '(ready!)';
        break;
      case AttachStatus.ATTACH_FAILED:
        message = '(failed to attach!)';
        break;
      case AttachStatus.FAILURE:
        message = '(failed to find roblox!)'
        break;
      case AttachStatus.ALREADY_INJECTED:
        message = '(already injected!)';
        break;
    }

    updateTitle(message);
  }

  function onScriptHub() {
    invoke("open_popup", {
      title: "Synapse X - Script Hub",
      text: [
        "i dont have scripts to put here",
        "also does anyone have script hub ss",
        "",
        "waiting for your help 24/7",
        ">> https://t.me/DollarNoob <<"
      ].join("<br/>")
    })
      .catch((e: string) => {
        console.error("Error on open_popup:", e);
      });
  }

  /*session = JSON.parse(localStorage.getItem('session'));
  editSession = createEditSession(session);
  editor = editors.my_textarea;
  editor.setSession(editSession);*/
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
        {#each tabs as session, i}
          <button data-path={ session } class="tab" class:tab-sel={currentTab === session}
               on:click={switchTab(session)}>
            { session.name }
            <button class="close-tab" on:click|stopPropagation={ closeTab(session) }>×</button>
          </button>
        {:else}
          TODO: EMPTY HANDLING
        {/each}
        <button id="newTab" on:click={ () => newTab() }>+</button>
      </div>
      <div id="editor"/>
    </div>

    <div id="scriptBox">
      <ul>
        {#each scripts as script}
          <li data-path={ script }>{ script.split("/").pop() }</li>
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
    src: url(https://github.com/shipfam/shipfam.com/raw/master/fonts/segoe-ui.woff) format("woff");
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
  }

  .tab {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont;
    font-size: 12px;
    cursor: default;
    background-color: #858585;
    line-height: 20px;
    font-style: inherit;
    padding-left: 5px;
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

  #newTab {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont;
    color: white;
    cursor: default;
    width: 12px;
    height: 12px;
    margin-left: 5px;
    margin-top: 4px;
    font-size: 18px;
    background-color: #757575;
    box-shadow: 0 0 0 1px #959595;
    padding-bottom: 4px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #newTab:hover {
    background-color: #555555;
    box-shadow: 0 0 0 1px #656565;
  }

  #editor {
    flex-grow: 1;
  }

  #scriptBox {
    width: 122px;
    margin-left: 5px;
    color: white;
    background-color: #3C3C3C;
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
    box-shadow: 0 0 0 1px gray;
  }

  li:active {
    background-color: #304565;
    box-shadow: 0 0 0 1px #354555;
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