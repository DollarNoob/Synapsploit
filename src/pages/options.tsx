import { useEffect, useState } from "react";
import { emitTo } from "@tauri-apps/api/event";
import { BaseDirectory, exists, readTextFile, readTextFileLines, writeTextFile } from "@tauri-apps/plugin-fs";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { message } from "@tauri-apps/plugin-dialog";
import Button from "../components/options/Button";
import Footer from "../components/options/Footer";
import Header from "../components/options/Header";
import Icon from "../components/options/Icon";
import Main from "../components/options/Main";
import Tab from "../components/options/Tab";
import TabContainer from "../components/options/TabContainer";
import Title from "../components/options/Title";
import OptionContainer from "../components/options/OptionContainer";
import SettingContainer from "../components/options/SettingContainer";
import Option from "../components/options/Option";
import SelectOption from "../components/options/SelectOption";

interface Settings {
	ui: UISettings;
	main: MainSettings;
	environment: EnvironmentSettings;
	sandbox: SandboxSettings;
	misc: MiscSettings;
}

interface UISettings {
	alwaysOnTop: boolean;
	autoAttach: boolean;
	client: string; // "MacSploit" | "Hydrogen"
}

interface MainSettings {
	autoExecute: boolean; // Auto Execute
	autoInject: boolean; // Uncap Fps
	multiInstance: boolean; // Error Redirection
	executeInstances: boolean; // Output Logging
}

interface EnvironmentSettings {
	serverTeleports: boolean; // Allow Server Teleports
	placeRestrictions: boolean; // Bypass Place Restrictions
	dumpScripts: boolean; // Dump All Scripts on Join
	logHttp: boolean; // Inject MacSploit (Auto)
	compatibilityMode: boolean; // Error Protection
}

interface SandboxSettings {
	fileSystem: boolean; // Allow File System
	debugLibrary: boolean; // Allow WebSocket Library
	httpTraffic: boolean; // Allow HTTP Traffic
	settingsControl: boolean; // Allow Queue On Teleport
}

interface MiscSettings {
	norbUnc: boolean; // Custom MacSploit Locale
	resumeHandle: boolean; // Script HWID Spoofer
	robloxRpc: boolean; // Macsploit Presence
	discordRpc: boolean; // Discord Presence
	sandbox: boolean; // Decreased Sandbox
}

const defaultSettings: Settings = {
	ui: {
		alwaysOnTop: false,
		autoAttach: true,
		client: "MacSploit"
	},
	main: {
		autoExecute: true,
		autoInject: false,
		multiInstance: false,
		executeInstances: false
	},
	environment: {
		serverTeleports: true,
		placeRestrictions: true,
		dumpScripts: false,
		logHttp: true,
		compatibilityMode: false
	},
	sandbox: {
		fileSystem: true,
		debugLibrary: true,
		httpTraffic: true,
		settingsControl: true
	},
	misc: {
		norbUnc: true,
		resumeHandle: false,
		robloxRpc: true,
		discordRpc: true,
		sandbox: false
	}
};

export default function Options() {
	const [ tab, setTab ] = useState<keyof Settings>("ui");
	const [ settings, setSettings ] = useState(defaultSettings);

	useEffect(() => {
		getCurrentWebviewWindow().show();

		(async () => {
			const newSettings = { ...settings };

			const cfg = await readTextFile("config.json", { baseDir: BaseDirectory.AppData })
				.catch((err: string) => {
					if (err.includes("No such file or directory (os error 2)")) {
						writeTextFile("config.json", JSON.stringify(settings.ui), { baseDir: BaseDirectory.AppData })
							.catch((err: string) => {
								message(err, { title: "Synapse X - Options", kind: "error"});
							});
					} else {
						message(err, { title: "Synapse X - Options", kind: "error"});
					}
				});
			if (cfg) {
				let config: Record<string, boolean | string>;
				try {
					config = JSON.parse(cfg);
				} catch (err) {
					message("Failed to parse config", { title: "Synapse X - Options", kind: "error"});
					console.error("Failed to parse config:", err);
					return;
				}

				if (typeof config !== "object" || Array.isArray(config)) return;

				for (const [ key, value ] of Object.entries(config)) {
					if (key in newSettings.ui && ["boolean", "string"].includes(typeof value)) {
						(newSettings.ui[key as keyof UISettings] as UISettings[keyof UISettings]) = value;
					}
				}

				setSettings(newSettings);
			}

			const settingsExists = await exists("ms-settings", { baseDir: BaseDirectory.Download })
				.then((exist) => {
					if (!exist) {
						// write the default settings
						updateSettings(null);
					}
					return exist;
				})
				.catch((err: string) => {
					message(err, { title: "Synapse X - Options", kind: "error"});
					return false;
				});
			if (!settingsExists) return;

			const lines = await readTextFileLines("ms-settings", { baseDir: BaseDirectory.Download })
				.catch((err: string) => {
					message(err, { title: "Synapse X - Options", kind: "error"});
					return null;
				});
			if (!lines) return;

			for await (const line of lines) {
				const [ key, value ] = line.replace("\u0000", "").split(" "); // remove null at the end of lines
				if (!key || !value) return;

				if (key in settings.main) {
					newSettings.main[key as keyof MainSettings] = value === "true";
				} else if (key in settings.environment) {
					newSettings.environment[key as keyof EnvironmentSettings] = value === "true";
				} else if (key in settings.sandbox) {
					newSettings.sandbox[key as keyof SandboxSettings] = value === "true";
				} else if (key in settings.misc) {
					newSettings.misc[key as keyof MiscSettings] = value === "true";
				}
			}

			setSettings(newSettings);
		})();
	}, []);

	function updateSettings(key: string | null, value: boolean | string = true) {
		const newSettings = { ...settings };

		if (!key) {
			// pass
		} else if (key in settings.ui) {
			(newSettings.ui[key as keyof UISettings] as UISettings[keyof UISettings]) = value;
		} else if (key in settings.main && typeof value === "boolean") {
			newSettings.main[key as keyof MainSettings] = value;
		} else if (key in settings.environment && typeof value === "boolean") {
			newSettings.environment[key as keyof EnvironmentSettings] = value;
		} else if (key in settings.sandbox && typeof value === "boolean") {
			newSettings.sandbox[key as keyof SandboxSettings] = value;
		} else if (key in settings.misc && typeof value === "boolean") {
			newSettings.misc[key as keyof MiscSettings] = value;
		}

		setSettings(newSettings);

		if (key && key in settings.ui) {
			writeTextFile("config.json", JSON.stringify(settings.ui), { baseDir: BaseDirectory.AppData })
				.catch((err: string) => {
					message(err, { title: "Synapse X - Options", kind: "error"});
				});
		} else {
			const set: Omit<Settings, "ui"> & Partial<Pick<Settings, "ui">> = { ...newSettings };
			delete set.ui;

			const payload = Object.values(set)
				.map(sets => Object.entries(sets)
					.map(([ key, value ]) => `${key} ${value}`).join("\n")
				).join("\n");
			writeTextFile("ms-settings", payload, { baseDir: BaseDirectory.Download })
				.catch((err: string) => {
					message(err, { title: "Synapse X - Options", kind: "error"});
				});
		}

		if (key) {
			emitTo("main", "update_settings", { key, value, type: key in settings.ui ? "ui" : "settings" });
		}
	}

	return (<>
		<Header>
      <Icon/>
      <Title>Synapse X - Options</Title>
    </Header>

		<Main>
			<TabContainer>
				<Tab active={ tab === "ui" } onClick={ () => setTab("ui") }>UI</Tab>
				<Tab active={ tab === "main" } onClick={ () => setTab("main") }>Main</Tab>
				<Tab active={ tab === "environment" } onClick={ () => setTab("environment") }>Environment</Tab>
				<Tab active={ tab === "sandbox" } onClick={ () => setTab("sandbox") }>Sandbox</Tab>
				<Tab active={ tab === "misc" } onClick={ () => setTab("misc") }>Misc</Tab>
			</TabContainer>

			<SettingContainer>
				<OptionContainer active={ tab === "ui" }>
					<Option active={ settings.ui.alwaysOnTop } name="alwaysOnTop" onChange={ updateSettings }>Always on Top</Option>
					<Option active={ settings.ui.autoAttach } name="autoAttach" onChange={ updateSettings }>Auto Attach</Option>
					<SelectOption selected={ settings.ui.client } name="client" items={ ["MacSploit", "Hydrogen"] } onChange={ updateSettings }>Client</SelectOption>
				</OptionContainer>

				<OptionContainer active={ tab === "main" }>
					<Option active={ settings.main.autoExecute } name="autoExecute" onChange={ updateSettings }>Auto Execute</Option>
					<Option active={ settings.main.autoInject } name="autoInject" onChange={ updateSettings }>Uncap Fps</Option>
					<Option active={ settings.main.multiInstance } name="multiInstance" onChange={ updateSettings }>Error Redirection</Option>
					<Option active={ settings.main.executeInstances } name="executeInstances" onChange={ updateSettings }>Output Logging</Option>
				</OptionContainer>

				<OptionContainer active={ tab === "environment" }>
					<Option active={ settings.environment.serverTeleports } name="serverTeleports" onChange={ updateSettings }>Allow Server Teleports</Option>
					<Option active={ settings.environment.placeRestrictions } name="placeRestrictions" onChange={ updateSettings }>Bypass Place Restrictions</Option>
					<Option active={ settings.environment.dumpScripts } name="dumpScripts" onChange={ updateSettings }>Dump All Scripts on Join</Option>
					<Option active={ settings.environment.logHttp } name="logHttp" onChange={ updateSettings }>Inject MacSploit (Auto)</Option>
					<Option active={ settings.environment.compatibilityMode } name="compatibilityMode" onChange={ updateSettings }>Error Protection</Option>
				</OptionContainer>

				<OptionContainer active={ tab === "sandbox" }>
					<Option active={ settings.sandbox.fileSystem } name="fileSystem" onChange={ updateSettings }>Allow File System</Option>
					<Option active={ settings.sandbox.debugLibrary } name="debugLibrary" onChange={ updateSettings }>Allow WebSocket Library</Option>
					<Option active={ settings.sandbox.httpTraffic } name="httpTraffic" onChange={ updateSettings }>Allow HTTP Traffic</Option>
					<Option active={ settings.sandbox.settingsControl } name="settingsControl" onChange={ updateSettings }>Allow Queue On Teleport</Option>
				</OptionContainer>

				<OptionContainer active={ tab === "misc" }>
					<Option active={ settings.misc.norbUnc } name="norbUnc" onChange={ updateSettings }>Custom MacSploit Locale</Option>
					<Option active={ settings.misc.resumeHandle } name="resumeHandle" onChange={ updateSettings }>Script HWID Spoofer</Option>
					<Option active={ settings.misc.robloxRpc } name="robloxRpc" onChange={ updateSettings }>Macsploit Presence</Option>
					<Option active={ settings.misc.discordRpc } name="discordRpc" onChange={ updateSettings }>Discord Presence</Option>
					<Option active={ settings.misc.sandbox } name="sandbox" onChange={ updateSettings }>Decreased Sandbox</Option>
				</OptionContainer>
			</SettingContainer>
		</Main>

		<Footer>
			<Button onClick={ () => getCurrentWebviewWindow().close() }>Close</Button>
		</Footer>
	</>);
}
