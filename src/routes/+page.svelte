<script lang="ts">
  import { invoke } from "@tauri-apps/api/tauri";
  import { listen } from "@tauri-apps/api/event";
  import { appWindow } from "@tauri-apps/api/window";
  import { showMenu } from "tauri-plugin-context-menu";
  import { onMount } from "svelte";
  import * as monaco from "monaco-editor";
  import Icon from "./sxlogosmallwhite_OJJ_icon.ico";

  const version = "v1.2";
  const baseTitle = "Synapse X - " + version;

  let title = baseTitle;
  let scripts: string[] = [];
  let editor: monaco.editor.IStandaloneCodeEditor;
  let config = {
    alwaysOnTop: true,
    autoAttach: true,
    autoExecute: true,
    scanPort: true
  };

  listen("executeScript", event => {
    invoke("scriptbox_execute", { path: event.payload })
      .catch((e: string) => {
        if (e === "NotInjected")
          return updateTitle("(not injected! press attach)");
        console.error("Error on scriptbox_execute:", e);
      });
  });

  listen("loadScript", event => {
    invoke("scriptbox_load", { path: event.payload })
      .then((script) => {
        editor.setValue(script as string);
      })
      .catch((e: string) => {
        console.error("Error on scriptbox_load:", e);
      });
  });

  listen("refreshScript", event => {
    invoke("scriptbox_refresh")
      .then((_scripts) => {
        scripts = _scripts as string[];
      })
      .catch((e: string) => {
        console.error("Error on scriptbox_refresh:", e);
      });
  });

  onMount(async () => {
    window.addEventListener("contextmenu", async (e) => {
      e.preventDefault();

      if (e.target === document.getElementById("scriptBox")) {
        showMenu({
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
        showMenu({
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
      }
    });

    setInterval(() => {
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
    }, 60000);

    setInterval(async () => {
      if (!config.autoAttach) return;

      // 5553 ~ 5563 for each roblox window
      for (let i = 5553; i <= (config.scanPort ? 5563 : 5553); i++) {
        const retry = await invoke("attach", { port: i })
          .then(() => {
            updateTitle("(ready!)");
            return false;
          })
          .catch((e: string) => {
            if (e.includes("Connection refused"))
              return true;
            else if (e === "SocketNotAlive")
              return true;
            else if (e === "AlreadyInjected")
              return false;
            console.error("Error on attach:", e);
            return false;
          });
        if (!retry) break;
      }
    }, 10000);

    editor = monaco.editor.create(document.getElementById("monaco")!, {
      value: localStorage.getItem("script") ?? 'print("Hello World!")',
      language: "lua",
      theme: "vs-dark",
      automaticLayout: true
    });

    let updateSession = 0;
    editor.onDidChangeModelContent((event) => {
      const sessionId = ++updateSession;

      // Only update if text wasn't changed for 3s
      setTimeout(() => {
        if (updateSession === sessionId)
          localStorage.setItem("script", editor.getValue());
      }, 3000);
    });

    invoke("scriptbox_refresh")
      .then((_scripts) => {
        scripts = _scripts as string[];
      })
      .catch((e: string) => {
        console.error("Error on scriptbox_refresh:", e);
      });

    invoke("read_config")
      .then(async (cfg) => {
        const [alwaysOnTop, autoAttach, autoExecute, scanPort] = cfg as boolean[];
        await appWindow.setAlwaysOnTop(alwaysOnTop);
        config.alwaysOnTop = alwaysOnTop;
        config.autoAttach = autoAttach;
        config.autoExecute = autoExecute;
        config.scanPort = scanPort;
        await appWindow.show();
        console.log("Config", cfg);
      })
      .catch((e: string) => {
        console.error("Error on read_config:", e);
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
    invoke("minimize_window");
  }

  function onExecute() {
    invoke("execute", { script: editor.getValue() })
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
      .then((script) => editor.setValue(script as string))
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
    invoke("save_file", { contents: editor.getValue() })
      .catch((e: string) => {
        if (e === "FileNotSelected") return;
        console.error("Error on save_file:", e);
      });
  }

  function onOptions() {
    invoke("open_options");
  }

  async function onAttach() {
    updateTitle("(injecting...)");

    // 5553 ~ 5563 for each roblox window
    let failed = true, attachFailed = false;
    for (let i = 5553; i <= (config.scanPort ? 5563 : 5553); i++) {
      console.log(i);
      const retry = await invoke("attach", { port: i })
        .then(() => {
          updateTitle("(ready!)");
          failed = false;
          return false;
        })
        .catch((e: string) => {
          if (e.includes("Connection refused"))
            return true;
          else if (e === "SocketNotAlive") {
            attachFailed = true;
            return true;
          }
          else if (e === "AlreadyInjected") {
            updateTitle("(already injected!)");
            failed = false;
            return false;
          }
          console.error("Error on attach:", e);
          return false;
        });
      if (!retry) break;
    }

    if (failed)
      updateTitle(attachFailed ? "(failed to attach!)" : "(failed to find roblox!)");
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
    <div id="monaco" />

    <div id="scriptBox">
      <ul>
        {#each scripts as script}
          <li data-path={ script }>{ script.split("/").pop() }</li>
        {/each}
      </ul>
    </div>
  </div>

  <div id="buttonContainer" class="buttoncontainer">
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

  button {
    border: 0;
  }

  :root {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont;
    font-size: 12px;
    line-height: 24px;
    font-weight: 500;
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
    font-weight: 500;
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
    font-weight: 500;
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

  #monaco {
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
    cursor: pointer;
    padding-left: 6px;
    padding-right: 6px;
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
    width: 91px;
    height: 33px;
    font-size: 14px;
    color: white;
    background-color: #3C3C3C;
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