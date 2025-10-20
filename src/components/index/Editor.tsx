import { useImperativeHandle, useRef } from "react";
import ace from "ace-builds";
import "ace-builds/src-noconflict/mode-lua";
import "ace-builds/src-noconflict/worker-lua";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-searchbox";
import useSessionStore from "../../stores/session";

interface Props {
  ref?: React.Ref<ace.Ace.Editor>;
  children?: React.ReactNode;
}

export default function Editor({ ref, children }: Props) {
  const editorElement = useRef<HTMLDivElement>(null);
  const sessionStore = useSessionStore();

  let editor: ace.Editor;
  useImperativeHandle(ref, () => {
    editor = ace.edit(editorElement.current);
    editor.setTheme("ace/theme/tomorrow_night_eighties");
    editor.setBehavioursEnabled(true);
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true
    });

    // RLua & Custom Functions Autocomplete
    const dataTypes = [
      "Axes",
      "BrickColor",
      "CatalogSearchParams",
      "CFrame",
      "Color3",
      "ColorSequence",
      "ColorSequenceKeypoint",
      "DateTime",
      "DockWidgetPluginGuiInfo",
      "Enum",
      "Faces",
      "FloatCurveKey",
      "Font",
      "Instance",
      "NumberRange",
      "NumberSequence",
      "NumberSequenceKeypoint",
      "OverlapParams",
      "Path2DControlPoint",
      "PathWaypoint",
      "PhysicalProperties",
      "Random",
      "Ray",
      "RaycastParams",
      "Rect",
      "Region3", "Region3int16",
      "RotationCurveKey",
      "SharedTable",
      "TweenInfo",
      "UDim", "UDim2",
      "Vector2", "Vector2int16",
      "Vector3", "Vector3int16"
    ];

    const globals = [
      "rawlen",
      "elapsedTime", "ElapsedTime",
      "settings",
      "tick",
      "typeof",
      "UserSettings",
      "version", "Version"
    ];

    const tables = [
      "bit",
      "bit32",
      "buffer",
      "http",
      "task",
      "utf8",
      "syn",
      "CellId",
      "PluginDrag",
      "SecurityCapabilities",
      "protect_cache",
      "hooked_cache"
    ];

    const instances = [
      "game", "Game",
      "workspace", "Workspace",
      "script"
    ];

    const classes = [
      "Drawing", "WebSocket", "cache", "crypt", "crypto", "base64", "debug"
    ];

    const functions = {
      Drawing: [
        "Drawing.new",
        "cleardrawcache",
        "getrenderproperty",
        "isrenderobj",
        "setrenderproperty"
      ],
      WebSocket: [
        "WebSocket.connect",
        "websocketconnect_c"
      ],
      cache: [
        "cache.invalidate", "cache.iscached", "cache.replace",
        "cloneref",
        "compareinstances"
      ],
      closures: [
        "checkcaller",
        "clonefunction",
        "getcallingscript",
        "hookfunc", "hookfunction", "replaceclosure", "swapfunction", "hookfunction_c",
        "isfunctionhooked",
        "iscclosure",
        "islclosure",
        "isexecutorclosure",
        // loadstring (Vanilla Lua)
        "newcclosure", "newcclosure_s",
        "newlclosure",
        "checkclosure",
        "old_metaclosure"
      ],
      console: [
        "consoleclear", // no rconsoleclear
        "consolecreate", // no rconsolecreate
        "consoledestroy", // no rconsoledestroy
        "consoleinput", // no rconsoleinput
        "rconsoleprint", "consoleprint", "console_print",
        "rconsolename", "consolesettitle", // no rconsolesettitle
        "rconsolewarn", "warn",
        "rconsoleerr"
      ],
      crypt: [
        "crypt.base64encode", "crypt.base64.encode", "crypt.base64_encode",
        "crypto.base64encode", "crypto.base64.encode", "crypto.base64_encode",
        "base64.encode", "base64_encode", "base64encode",
        "crypt.base64decode", "crypt.base64.decode", "crypt.base64_decode",
        "crypto.base64decode", "crypto.base64.decode", "crypto.base64_decode",
        "base64.decode", "base64_decode", "base64decode",
        "crypt.encrypt", "crypt.decrypt",
        "crypto.encrypt", "crypto.decrypt",
        "crypt.generatebytes", "crypt.generatekey",
        "crypto.generatebytes", "crypto.generatekey",
        "crypt.hash",
        "crypto.hash"
      ],
      debug: [
        "debug.getconstant", "getconstant",
        "debug.getconstants", "getconstants",
        "debug.getinfo", // getinfo (Vanilla Lua)
        "debug.getproto", "getproto",
        "getprotoinfo",
        "debug.getprotos", "getprotos",
        "debug.getstack",
        "debug.getupvalue", // getupvalue (Vanilla Lua)
        "debug.getupvalues", "getupvalues",
        "debug.setconstant", "setconstant",
        "debug.setstack",
        "debug.setupvalue", // setupvalue (Vanilla Lua)
        "getscriptinfo",
        "findscriptinfo",
        "getfunctionaddress"
      ],
      filesystem: [
        "readfile",
        "listfiles",
        "writefile",
        "makefolder",
        "appendfile",
        "isfile",
        "isfolder",
        "delfile",
        "delfolder"
        // loadfile (Vanilla Lua)
        // no dofile
      ],
      input: [
        "isrbxactive", "isgameactive",
        // no mouse1click
        // no mouse1press
        // no mouse1release
        // no mouse2click
        // no mouse2press
        // no mouse2release
        // no mousemoveabs
        "mousemove", "mousemoverel",
        // no mousescroll
        "keypress"
      ],
      instances: [
        "fireclickdetector", "fireclickdetector_c",
        // no getcallbackvalue
        "getconnections", "getconnections_c",
        "getcustomasset",
        "gethiddenproperty",
        "gethui",
        "getinstances",
        "getnilinstances",
        "isscriptable",
        "sethiddenproperty",
        // no setrbxclipboard
        "setscriptable"
      ],
      metatable: [
        "getrawmetatable",
        "hookmetamethod", "unsafehookmetamethod",
        "getnamecallmethod", "setnamecallmethod",
        "isreadonly",
        "setrawmetatable",
        "setreadonly"
      ],
      misc: [
        "identifyexecutor", "getexecutorname",
        "lz4compress", "lz4decompress",
        "messagebox",
        "queue_on_teleport", "queueonteleport",
        "request",
        "setclipboard", "toclipboard",
        "getclipboard",
        "setfpscap", "set_fps_cap"
      ],
      scripts: [
        "getgc",
        "getgenv",
        "getloadedmodules",
        "getrenv", "getrobloxenv",
        "getrunningscripts",
        "getscriptbytecode", "dumpstring",
        "getscriptclosure", "getscriptfunction",
        "getscripthash",
        "getscripts",
        "getmodulescripts",
        "getuserdatascript",
        "getsenv",
        "getthreadidentity", "get_thread_identity", "getidentity", "getthreadcontext", "get_thread_context",
        "setthreadidentity", "set_thread_identity", "setidentity", "setthreadcontext", "set_thread_context"
      ],
      others: [ // These are not included in UNC documentations
        "protectgui", "protect_gui", "unprotectgui", "unprotect_gui",
        "protect_instance", "unprotect_instance",
        "checkudata", "scanudata",
        "userdatatotable",
        "clonetable",
        "decompile",
        "getmodules", "get_loaded_modules",
        "isourclosure", "isexploitclosure",
        "isgameclosure",
        "isourfunction", "isexploitfunction",
        "isexecutorfunction", "is_synapse_function",
        "getsynasset",
        "ypcall",
        "fireproximityprompt",
        "firetouchinterest", "firetouchinterest_c",
        "firesignal",
        "getsignalname",
        "getsignalfuncs",
        "signaltest", // ?
        "set_teleporting_behaviour",
        "getreg",
        "getallindexes",
        "isnetworkowner",
        "quickLoad",
        "robloxcrash", // This function just crashes roblox
        "hang__", "crash__", // This function just self-destructs roblox
        "httpget", "httpget_c",
        "http_request", "http_request_c",
        "httpget_async", "async_request",
        "httpget_async_index",
        "get_objects", "get_objects_index",
        "oldRequire", "oldGameRequire",
        "getcontext", "setcontext",
        "setindex",
        "checkidentity", "printidentity",
        "teleport_test", // ?
        "create_illegal", // ?
        "gethwid",
        "delay", "Delay",
        "wait", "Wait",
        "spawn", "Spawn",
        "stats", "Stats",
        "randomstring", "randomString",
        "lua_sleep",
        "saveinstance"
      ]
    };

    const completions: ace.Ace.Completion[] = Object.values(functions).flat().map(func => ({
      caption: func,
      value: func,
      meta: "function"
    }));

    completions.push(...dataTypes.map(type => ({
      caption: type,
      value: type,
      meta: "datatype"
    })));

    completions.push(...globals.map(type => ({
      caption: type,
      value: type,
      meta: "function"
    })));

    completions.push(...tables.map(type => ({
      caption: type,
      value: type,
      meta: "table"
    })));

    completions.push(...instances.map(type => ({
      caption: type,
      value: type,
      meta: "instance"
    })));

    completions.push(...classes.map(type => ({
      caption: type,
      value: type,
      meta: "class"
    })));

    const rluaCompleter = {
      getCompletions: (
        _editor: ace.Ace.Editor,
        _session: ace.Ace.EditSession,
        _pos: ace.Ace.Point,
        _prefix: string,
        callback: ace.Ace.CompleterCallback
      ): void => {
        callback(
          null,
          completions
        );
      }
    };
    editor.completers.push(rluaCompleter);

    return editor;
  }, [ editorElement, sessionStore.session ]);

  const style: React.CSSProperties = {
    flex: 1
  };

  return (<>
    <div style={ style } ref={ editorElement }>
      { children }
    </div>
  </>);
}
