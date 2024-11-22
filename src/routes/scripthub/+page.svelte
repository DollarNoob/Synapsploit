<script lang="ts">
  import { appWindow } from "@tauri-apps/api/window";
  import { onMount } from "svelte";
  import Icon from "../sxlogosmallwhite_OJJ_icon.ico";
  import { http, invoke } from "@tauri-apps/api";
  import { ResponseType } from "@tauri-apps/api/http";
  import { getVersion } from "@tauri-apps/api/app";

  let scripts: { id: string; title: string; description?: string; script: string; gameName: string; imageUrl: string; }[] = [];
  let currentScriptId = "iyfe";
  const defaultScripts = [
    {
      id: "iyfe",
      title: "Infinite Yield FE",
      description: "The best command line script for roblox.",
      script: "loadstring(game:HttpGet('https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source'))()",
      gameName: "Universal Script 📌",
      imageUrl: "https://infyiff.github.io/resources/Logo_Small.png"
    },
    {
      id: "dex",
      title: "New Dex",
      description: "Dex is a debugging suite designed to help the user debug games and find any potential vulnerabilities.",
      script: "loadstring(game:HttpGet('https://raw.githubusercontent.com/infyiff/backup/main/dex.lua'))()",
      gameName: "Universal Script 📌",
      imageUrl: "https://github.com/LorekeeperZinnia/Dex/raw/master/logo.png"
    }
  ];

  interface ScriptInfo {
    script: {
      _id: string;
      title: string;
      game: Game;
      features: string;
      tags: Tag[];
      script: string;
      owner: Owner;
      slug: string;
      verified: boolean;
      key: boolean;
      keyLink: string;
      views: number;
      scriptType: string;
      isUniversal: boolean;
      isPatched: boolean;
      visibility: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
      likeCount: number;
      dislikeCount: number;
      id: string;
    };
  }

  interface SearchResult {
    result: {
      scripts: Script[];
      totalPages: number;
    };
  }

  interface Script {
    createdAt: string;
    game: Game;
    isPatched: boolean;
    isUniversal: boolean;
    matched: string[];
    script: string;
    scriptType: string;
    slug: string;
    title: string;
    updatedAt: string;
    verified: boolean;
    views: number;
    visibility: string;
    __v: number;
    _id: string;
  }

  interface Game {
    gameId: number;
    imageUrl: string;
    name: string;
  }

  interface Tag {
    name: string;
    _id: string;
    id: string;
  }

  interface Owner {
    _id: string;
    username: string;
    verified: boolean;
    role: string;
    isBanned: boolean;
    profilePicture: string;
    createdAt: string;
    lastActive: string;
    status: string;
    id: string;
  }

  onMount(() => {
    window.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
    });

    // Small trick to show the window after loading (so you dont see the plain-white loading page)
    setTimeout(() => appWindow.show(), 50);
  });

  function onMinimize() {
    appWindow.minimize();
  }

  let textIndex = 0;
  function onExecute(e: MouseEvent) {
    const target = e.target as HTMLButtonElement;
    target.innerText = "Executing...";
    target.disabled = true;

    const script = [...defaultScripts, ...scripts].find(script => script.id === currentScriptId)!;

    invoke("execute", { script: script.script })
      .then(() => {
        let i = ++textIndex;
        setTimeout(() => {
          if (textIndex === i) {
            target.innerText = "Execute";
            target.disabled = false;
          }
        }, 100);
      })
      .catch((err: string) => {
        if (err === "NotInjected") {
          let i = ++textIndex;
          target.innerText = "Not attached!";

          setTimeout(() => {
            if (textIndex === i) {
              target.innerText = "Execute";
              target.disabled = false;
            }
          }, 1500);
        } else {
          target.disabled = false;
        }

        console.error("Error on execute:", err);
      });
  }

  function onClose() {
    appWindow.close();
  }

  async function loadScript(e: MouseEvent) {
    const scriptId = (e.target as HTMLElement).id.replace("script_", "");
    currentScriptId = scriptId;
    const script = [...defaultScripts, ...scripts].find(script => script.id === scriptId)!;

    const scriptPictureBox = document.getElementById("scriptPictureBox") as HTMLImageElement;
    if (script.imageUrl.startsWith("/images/script/")) {
      scriptPictureBox.src = "https://scriptblox.com" + script.imageUrl;
    } else {
      scriptPictureBox.src = script.imageUrl;
    }

    const descriptionBox = document.getElementById("descriptionBox") as HTMLDivElement;
    descriptionBox.innerText = script.title + " - " + script.gameName;

    if (!script.description) {
      const client = await http.getClient();
      const search = await client.get("https://scriptblox.com/api/script/" + scriptId, {
        headers: {
          "user-agent": "Synapsploit/" + await getVersion()
        },
        responseType: ResponseType.JSON
      });

      if (!search.ok) {
        console.error("failed to send request: " + search.status, search.data);
        return;
      }

      const result = (search.data as ScriptInfo).script;
      if (!result) {
        console.error("failed to parse request", search.data);
        return;
      }

      script.description = result.features;
    }

    // check if selection has changed before description loaded
    if (currentScriptId === scriptId) {
      descriptionBox.innerText = script.title + " - " + script.gameName + "\n\n" + script.description;
    }
  }

  async function searchScript(e: FocusEvent) {
    const target = e.target as HTMLInputElement;
    const query = target.value;

    if (query === "") return;

    const client = await http.getClient();
    const search = await client.get("https://scriptblox.com/api/script/search", {
      headers: {
        "user-agent": "Synapsploit/" + await getVersion()
      },
      query: {
        "q": query
      },
      responseType: ResponseType.JSON
    });

    if (!search.ok) {
      console.error("failed to send request: " + search.status, search.data);
      return;
    }

    const result = (search.data as SearchResult).result;
    if (!result) {
      console.error("failed to parse request", search.data);
      return;
    }

    if (result.totalPages === 0) return;

    scripts = result.scripts.map(script => ({
      id: script._id,
      title: script.title,
      script: script.script,
      gameName: script.game.name,
      imageUrl: script.game.imageUrl
    }));
  }

  function onPictureError(e: Event) {
    const target = e.target as HTMLImageElement;
    target.src = "https://scriptblox.com/images/no-script.webp";
  }
</script>

<header id="topBox" data-tauri-drag-region>
  <div id="titleBox" data-tauri-drag-region>
    Synapse X - Script Hub
  </div>
  <img src={ Icon } id="iconBox" alt="Synapse X Icon" draggable="false" data-tauri-drag-region>
  <button id="miniButton" class="button" on:click={ onMinimize }>
    _
  </button>
</header>

<main>
  <input id="search" placeholder="🔎 Search..." on:keyup={ e => e.key === "Enter" && document.activeElement instanceof HTMLElement && document.activeElement.blur() } on:focusout={ searchScript }>

  <div id="scriptContainer">
    <div id="scriptBox">
      <ul>
        {#each [...defaultScripts, ...scripts] as script}
          <li id={ "script_" + script.id } on:click={ loadScript }>{ script.title }</li>
        {/each}
      </ul>
    </div>

    <div id="infoContainer">
      <img id="scriptPictureBox" alt="Script" src={ defaultScripts[0].imageUrl } on:error={ onPictureError }>

      <div id="descriptionBox">
        { defaultScripts[0].title } - { defaultScripts[0].gameName }<br/>
        <br/>
        { defaultScripts[0].description }
      </div>

      <div id="buttonContainer">
        <button id="executeButton" class="button" on:click={ onExecute }>
          Execute
        </button>

        <button id="closeButton" class="button" on:click={ onClose }>
          Close
        </button>
      </div>
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

  #miniButton {
    position: absolute;
    top: 1px;
    right: 1px;
    width: 22px;
    height: 22px;
    color: inherit;
    font-size: 12px;
    background-color: inherit;
    font-family: "Segoe UI";
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
    height: 310px;
    margin: 10px;
    gap: 5px;
  }

  #search {
    height: 20px;
    line-height: 20px;
    background-color: #3C3C3C;
    color: white;
    padding: 0 5px 0 5px;
    border: 0;
    outline: 0;
    appearance: none;
    -webkit-appearance: none;
  }

  #scriptContainer {
    display: flex;
    height: 285px;
    gap: 5px;
  }

  #scriptBox {
    width: 115px;
    height: 285px;
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
    padding-left: 5px;
    padding-right: 5px;
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

  #infoContainer {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  #scriptPictureBox {
    cursor: default;
    width: 300px;
    height: 170px;
  }

  #descriptionBox {
    cursor: default;
    width: 294px;
    height: 78px;
    padding-left: 3px;
    padding-right: 3px;
    padding-bottom: 2px;
    line-height: 16px;
    overflow-y: scroll;
    background-color: #1E1E1E;
  }

  #descriptionBox::-webkit-scrollbar { 
    display: none;
  }

  #buttonContainer {
    display: flex;
    gap: 5px;
  }

  .button {
    height: 25px;
    font-size: 13px;
    color: white;
    background-color: #3C3C3C;
    font-family: "Segoe UI";
  }

  #executeButton {
    width: 150px;
  }

  #closeButton {
    width: 145px;
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