# Synapsploit (Synapse X UI for MacSploit)
My first rust project. New to rust!

# Credits
Please refer to [Acrillis/Synapse X](https://github.com/Acrillis/SynapseX) for the Synapse X WPF UI source code.

## How to install
You can install the bundle from [releases](https://github.com/DollarNoob/Synapsploit/releases).<br>
If you want to make modifications, please check 'How to build'.<br>
Please open [issues](https://github.com/DollarNoob/Synapsploit/issues) if you have suggestions or found bugs.<br>
Feel free to open [pull requests](https://github.com/DollarNoob/Synapsploit/pulls) for any kind of contribution!

## How to build
First, install [Rust](https://rustup.rs/) and [node.js](https://nodejs.org/).<br>
<br>
Install the npm packages: `npm install`<br>
<br>
Now build the bundle:<br>
ARM64 (Apple Silicon): `npm run tauri build -- --target aarch64-apple-darwin`<br>
x86 (Intel): `npm run tauri build -- --target x86_64-apple-darwin`<br>
Universal (Both): `npm run tauri build -- --target universal-apple-darwin`<br>
<br>
The bundle will be located at: `Synapsploit/src-tauri/target/{target}/release/bundle/dmg/Synapse X_{version}_{target}.dmg`
## Tauri + SvelteKit + TypeScript

This template should help get you started developing with Tauri, SvelteKit and TypeScript in Vite.

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).
