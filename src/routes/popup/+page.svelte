<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { appWindow } from "@tauri-apps/api/window";
  import { onMount } from "svelte";
  import Icon from "../sxlogosmallwhite_OJJ_icon.ico";

  let title = "Synapse X - Popup";
  let text = "";

  onMount(() => {
    window.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
    });

    title = decodeURIComponent(new URLSearchParams(location.search).get("title")!);
    text = decodeURIComponent(location.hash.substring(1)).replace(/<br\/>/g, "\n");

    listen("update-title", event => {
      title = event.payload as string;
    });

    listen("update-text", event => {
      text = (event.payload as string).replace(/<br\/>/g, "\n");
    });

    // Small trick to show the window after loading (so you dont see the plain-white loading page)
    setTimeout(() => appWindow.show(), 50);
  });

  function onClose() {
    appWindow.close();
  }
</script>

<header id="topBox" data-tauri-drag-region>
  <div id="titleBox" data-tauri-drag-region>
    { title }
  </div>
  <img src={ Icon } id="iconBox" alt="Synapse X Icon" draggable="false" data-tauri-drag-region>
</header>

<main>
  <span>{ text }</span>

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
    line-height: 12px;
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

  span {
    margin-top: 9px;
    margin-bottom: 6px;
    text-align: center;
    color: white;
    cursor: default;
    white-space: pre-wrap;
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