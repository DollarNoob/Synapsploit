<script lang="ts">
  import { invoke } from "@tauri-apps/api/tauri";
  import { appWindow } from "@tauri-apps/api/window";
  import { onMount } from "svelte";
  import Icon from "../sxlogosmallwhite_OJJ_icon.ico";

  let config = {
    alwaysOnTop: true,
    autoAttach: true,
    autoExecute: true,
    scanPort: true
  };

  onMount(() => {
    window.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
    });

    invoke("read_config")
      .then((cfg) => {
        const { always_on_top, auto_attach, auto_execute, scan_port } = cfg as { [name: string]: boolean };
        config.alwaysOnTop = always_on_top;
        config.autoAttach = auto_attach;
        config.autoExecute = auto_execute;
        config.scanPort = scan_port;

        // Small trick to show the window after loading (so you dont see the plain-white loading page)
        setTimeout(() => appWindow.show(), 50);
      })
      .catch((e: string) => {
        console.error("Error on read_config:", e);
      });
  });

  function onChange(event: Event) {
    const target = event.target as HTMLInputElement;
    config[target.id as keyof typeof config] = target.checked;

    invoke("write_config", config)
      .catch((e: string) => {
        console.error("Error on write_config:", e);
      });
  }

  function onAutoExec() {
    invoke("open_folder", { folderName: "autoexec" })
      .catch((e: string) => {
        console.error("Error on open_folder:", e);
      });
  }

  function onScripts() {
    invoke("open_folder", { folderName: "scripts" })
      .catch((e: string) => {
        console.error("Error on open_folder:", e);
      });
  }

  function onClose() {
    appWindow.close();
  }
</script>

<header id="topBox" data-tauri-drag-region>
  <div id="titleBox" data-tauri-drag-region>
    Synapse X - Options
  </div>
  <img src={ Icon } id="iconBox" alt="Synapse X Icon" draggable="false" data-tauri-drag-region>
</header>

<main>
  <div id="checkBoxContainer">
    <div class="checkbox">
      <input type="checkbox" id="alwaysOnTop" checked={ config.alwaysOnTop } on:change={ onChange }>
      <label for="alwaysOnTop">Always On Top</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="autoAttach" checked={ config.autoAttach } on:change={ onChange }>
      <label for="autoAttach">Auto-Attach</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="autoExecute" checked={ config.autoExecute } on:change={ onChange }>
      <label for="autoExecute">Auto-Execute</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="scanPort" checked={ config.scanPort } on:change={ onChange }>
      <label for="scanPort">Scan Port</label>
    </div>
  </div>

  <div id="buttonContainer">
    <button class="button" on:click={ onAutoExec }>
      Open Auto Execute Folder
    </button>
    <button class="button" on:click={ onScripts }>
      Open Scripts Folder
    </button>
    <button class="button" on:click={ onClose }>
      Close
    </button>
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

  #iconBox {
    position: absolute;
    top: 0;
    left: 2px;
    width: 30px;
    height: 30px;
  }

  main {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 30px);
  }

  #checkBoxContainer {
    display: flex;
    flex-direction: column;
    margin-top: 10px;
  }

  .checkbox {
    display: flex;
    height: 23px;
    font-size: 14px;
    line-height: 18px;
    margin-left: 76px;
  }

  label {
    margin-left: 4px;
  }

  #buttonContainer {
    display: flex;
    flex-direction: column;
    margin-top: 5px;
    margin-left: 10px;
    margin-right: 10px;
  }

  .button {
    width: 251px;
    height: 29px;
    margin-bottom: 6px;
    font-size: 13px;
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
</style>