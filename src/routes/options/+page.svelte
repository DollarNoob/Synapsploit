<script lang="ts">
  import { invoke } from "@tauri-apps/api/tauri";
  import { appWindow } from "@tauri-apps/api/window";
  import { onMount } from "svelte";
  import Icon from "../sxlogosmallwhite_OJJ_icon.ico";

  let config = {
    alwaysOnTop: true,
    autoAttach: true,
    scanPort: true
  };

  let setting = {
    autoInject: true,
    executeInstances: true,
    debugLibrary: true,
    discordRpc: true,
    compatibilityMode: true,
    resumeHandle: true,
    robloxRpc: true,
    norbUnc: true,
    serverTeleports: true,
    placeRestrictions: true,
    logHttp: true,
    autoExecute: true,
    fileSystem: true,
    httpTraffic: true,
    settingsControl: true,
    sandbox: true,
    dumpScripts: true,
    multiInstance: true
  };

  onMount(() => {
    window.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
    });

    invoke("read_config")
      .then((cfg) => {
        const { always_on_top, auto_attach, scan_port } = cfg as { [name: string]: boolean };
        config.alwaysOnTop = always_on_top;
        config.autoAttach = auto_attach;
        config.scanPort = scan_port;

        invoke("read_setting")
          .then((settings: any) => {
            setting = settings; // i trust you, please dont touch settings file manually

            // Small trick to show the window after loading (so you dont see the plain-white loading page)
            setTimeout(() => appWindow.show(), 50);
          })
          .catch((e: string) => {
            console.error("Error on read_setting:", e);
          });
      })
      .catch((e: string) => {
        console.error("Error on read_config:", e);
      });
  });

  function onTabClick(event: Event) {
    const target = event.target as HTMLButtonElement;
    const tabs = document.getElementsByClassName("tab");
    for (const tab of tabs) {
      if (tab.classList.contains("selected")) tab.classList.remove("selected");
    }
    target.classList.add("selected");

    for (const container of document.getElementsByClassName("checkbox-container")) {
      if (!container.classList.contains("hidden")) container.classList.add("hidden");
    }

    document.getElementById(target.id.replace("tab-", ""))!.classList.remove("hidden");
  }

  function onConfigChange(event: Event) {
    const target = event.target as HTMLInputElement;
    config[target.id as keyof typeof config] = target.checked;

    invoke("write_config", config)
      .catch((e: string) => {
        console.error("Error on write_config:", e);
      });
  }

  function onSettingChange(event: Event) {
    const target = event.target as HTMLInputElement;

    invoke("write_setting", { key: target.id, value: target.checked })
      .then(() => {
        invoke("update_setting", { key: target.id, value: target.checked })
          .catch((e: string) => {
            console.error("Error on update_setting:", e);
          });
      })
      .catch((e: string) => {
        console.error("Error on write_setting:", e);
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
  <div id="tabContainer">
    <button id="tab-ui" class="tab selected" on:click={ onTabClick }>
      UI
    </button>
    <button id="tab-main" class="tab" on:click={ onTabClick }>
      Main
    </button>
    <button id="tab-environment" class="tab" on:click={ onTabClick }>
      Environment
    </button>
    <button id="tab-sandbox" class="tab" on:click={ onTabClick }>
      Sandbox
    </button>
    <button id="tab-misc" class="tab" on:click={ onTabClick }>
      Misc
    </button>
  </div>

  <div id="ui" class="checkbox-container">
    <div class="checkbox">
      <input type="checkbox" id="alwaysOnTop" checked={ config.alwaysOnTop } on:change={ onConfigChange }>
      <label for="alwaysOnTop">Always On Top</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="autoAttach" checked={ config.autoAttach } on:change={ onConfigChange }>
      <label for="autoAttach">Auto-Attach</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="scanPort" checked={ config.scanPort } on:change={ onConfigChange }>
      <label for="scanPort">Scan Port</label>
    </div>
  </div>

  <div id="main" class="checkbox-container hidden">
    <div class="checkbox">
      <input type="checkbox" id="autoExecute" checked={ setting.autoExecute } on:change={ onSettingChange }>
      <label for="autoExecute">Auto Execute</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="autoInject" checked={ setting.autoInject } on:change={ onSettingChange }>
      <label for="autoInject">Uncap Fps</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="multiInstance" checked={ setting.multiInstance } on:change={ onSettingChange }>
      <label for="multiInstance">Protect Errors</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="executeInstances" checked={ setting.executeInstances } on:change={ onSettingChange }>
      <label for="executeInstances">HWID Spoofer</label>
    </div>
  </div>

  <div id="environment" class="checkbox-container hidden">
    <div class="checkbox">
      <input type="checkbox" id="serverTeleports" checked={ setting.serverTeleports } on:change={ onSettingChange }>
      <label for="serverTeleports">Allow Server Teleports</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="placeRestrictions" checked={ setting.placeRestrictions } on:change={ onSettingChange }>
      <label for="placeRestrictions">Bypass Place Restrictions</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="dumpScripts" checked={ setting.dumpScripts } on:change={ onSettingChange }>
      <label for="dumpScripts">Dump All Scripts on Join</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="logHttp" checked={ setting.logHttp } on:change={ onSettingChange }>
      <label for="logHttp">Inject MacSploit (Auto)</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="compatibilityMode" checked={ setting.compatibilityMode } on:change={ onSettingChange }>
      <label for="compatibilityMode">Script Compatibility Mode</label>
    </div>
  </div>

  <div id="sandbox" class="checkbox-container hidden">
    <div class="checkbox">
      <input type="checkbox" id="fileSystem" checked={ setting.fileSystem } on:change={ onSettingChange }>
      <label for="fileSystem">Allow File System</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="debugLibrary" checked={ setting.debugLibrary } on:change={ onSettingChange }>
      <label for="debugLibrary">Allow WebSocket Library</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="httpTraffic" checked={ setting.httpTraffic } on:change={ onSettingChange }>
      <label for="httpTraffic">Allow HTTP Traffic</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="settingsControl" checked={ setting.settingsControl } on:change={ onSettingChange }>
      <label for="settingsControl">Allow Queue On Teleport</label>
    </div>
  </div>

  <div id="misc" class="checkbox-container hidden">
    <div class="checkbox">
      <input type="checkbox" id="norbUnc" checked={ setting.norbUnc } on:change={ onSettingChange }>
      <label for="norbUnc">Norb UNC Improvements</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="resumeHandle" checked={ setting.resumeHandle } on:change={ onSettingChange }>
      <label for="resumeHandle">HTTP Improvements</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="robloxRpc" checked={ setting.robloxRpc } on:change={ onSettingChange }>
      <label for="robloxRpc">MacSploit Presence</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="discordRpc" checked={ setting.discordRpc } on:change={ onSettingChange }>
      <label for="discordRpc">Discord Presence</label>
    </div>
    <div class="checkbox">
      <input type="checkbox" id="sandbox" checked={ setting.sandbox } on:change={ onSettingChange }>
      <label for="sandbox">Decreased Sandbox</label>
    </div>
  </div>

  <div id="buttonContainer">
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

  @font-face {
    font-family: "Segoe UI";
    src: url("../../SegoeUI.woff") format("woff");
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

  #tabContainer {
    display: flex;
    height: 20px;
    margin-top: 10px;
    margin-left: 10px;
    margin-right: 10px;
  }

  .tab {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont;
    cursor: default;
    background-color: #858585;
    color: white;
    font-size: 12px;
    height: 20px; /* fix for low macos versions, idk why it breaks */
    line-height: 12px;
    flex-grow: 1;
    font-style: inherit;
    text-align: center;
  }

  .selected {
    background-color: #757575;
  }

  .checkbox-container {
    position: absolute;
    display: flex;
    flex-direction: column;
    margin-top: 40px;
    margin-left: 10px;
    margin-right: 10px;
  }

  .hidden {
    visibility: hidden;
  }

  .checkbox {
    display: flex;
    height: 23px;
    font-size: 13px;
    line-height: 17px;
    margin-left: 50px;
  }

  label {
    margin-left: 4px;
  }

  #buttonContainer {
    display: flex;
    flex-direction: column;
    margin-top: auto;
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