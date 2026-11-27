import { ActorJoin } from "./components/ActorJoin";
import { Editor } from "./components/Editor";
import { Documents } from "./components/Documents";
import { Toggle } from "./components/Controls";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  MessageCircle,
  Monitor,
  Smartphone,
  SlidersHorizontal,
  FileText,
  Radio,
  Play,
  SkipForward,
  SkipBack,
  Square,
  RotateCcw,
  Volume2,
  Download,
  Plus,
  Settings,
  Wifi,
  Check,
  ChevronRight,
  Star,
  Maximize,
  Copy,
  Upload,
  Film,
  Link as LinkIcon,
} from "lucide-react";
import { Display } from "./components/Display";
import { Document } from "./components/Document";
import { defaultConfig, threats } from "./data/production";
import {
  configSchema,
  deviceStateSchema,
  initialState,
  reduceDevice,
  screens,
  type Action,
  type Config,
  type Cue,
  type DeviceState,
  type SessionView,
} from "./shared/model";
import { loadConfig, read, save, downloadJSON } from "./services/storage";
import { socket, request } from "./services/socket";
import { audio, soundNames } from "./services/audio";
import { exportPNG, exportPDF } from "./services/export";
type Credentials = { code: string; token: string };
type ActorCredentials = {
  code: string;
  id: string;
  key: string;
  role: string;
  preset: "phone" | "laptop";
};
const friendly: Record<string, string> = {
  lock: "Lock screen",
  messages: "Messages",
  email: "Mail",
  portal: "University portal",
  social: "Social feed",
  loan: "QuickPeso",
  settings: "App permissions",
  camera: "Camera",
  bpo: "BPO dashboard",
  documents: "Document viewer",
  black: "Black screen",
  title: "HULOG title",
  epilogue: "Final line",
};
export default function App() {
  const route = location.pathname;
  const isActor = route === "/display";
  const [config, setConfig] = useState<Config>(loadConfig);
  const [view, setView] = useState<SessionView | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    read("director", null),
  );
  const [actorCredentials, setActorCredentials] =
    useState<ActorCredentials | null>(() => read("actor", null));
  const [local, setLocal] = useState<DeviceState>(() =>
    read(isActor ? "actorState" : "preview", initialState()),
  );
  const [target, setTarget] = useState("*");
  const [scene, setScene] = useState(0);
  const [cueIndex, setCueIndex] = useState(0);
  const [filming, setFilming] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [localPreset, setLocalPreset] = useState<"phone" | "laptop">(() =>
    read("localPreset", "phone"),
  );
  const [rehearsal, setRehearsal] = useState(true);
  const configRef = useRef(config);
  configRef.current = config;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const report = (e: unknown) =>
    setError(e instanceof Error ? e.message : String(e));
  const inform = (s: string) => {
    setNotice(s);
    setTimeout(() => setNotice(""), 4000);
  };
  const stopLocal = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    audio.stop();
  }, []);
  useEffect(() => {
    if (!save("config", config))
      setError(
        "Browser storage is full. Export a JSON backup and remove large custom sounds before closing.",
      );
    if (config.settings.muted) audio.stop();
    else audio.setVolume(config.settings.volume);
  }, [config]);
  useEffect(() => {
    save(isActor ? "actorState" : "preview", local);
  }, [local, isActor]);
  useEffect(() => {
    const state = (v: SessionView) => {
      setView(v);
      setConfig(v.config);
      if (isActor) {
        const d = v.devices.find((d) => d.id === actorCredentials?.id);
        if (d) setLocal(d.state);
      }
    };
    socket.on("state", state);
    const connect = () => setConnected(true);
    const disconnect = () => setConnected(false);
    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    setConnected(socket.connected);
    return () => {
      socket.off("state", state);
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
    };
  }, [isActor, actorCredentials?.id]);
  useEffect(() => {
    if (!connected) return;
    if (isActor && actorCredentials) {
      request("join", actorCredentials)
        .then((r) => {
          setView(r.view);
          setConfig(r.view.config);
          setLocal(r.device.state);
        })
        .catch(report);
    } else if (!isActor && credentials) {
      request("directorJoin", credentials)
        .then((r) => {
          setView(r.view);
          setConfig(r.view.config);
        })
        .catch(report);
    }
  }, [connected, isActor, credentials, actorCredentials]);
  const monitoredState = isActor
    ? local
    : view?.devices.find((d) => d.id === target)?.state ||
      view?.devices[0]?.state ||
      local;
  const lastEffect = useRef(-1);
  useEffect(() => {
    if (lastEffect.current === monitoredState.revision) return;
    lastEffect.current = monitoredState.revision;
    const a = monitoredState.effect;
    if (!a) return;
    if (["stop", "reset", "endCall", "acceptCall", "screen"].includes(a.type))
      audio.stop();
    if (a.sound) audio.play(a.sound, configRef.current);
    if (
      ["message", "missed", "call"].includes(a.type) &&
      configRef.current.settings.vibration
    )
      navigator.vibrate?.(configRef.current.settings.vibration);
  }, [monitoredState]);
  useEffect(() => () => stopLocal(), [stopLocal]);
  const schedule = (fn: () => void, delay: number) => {
    timers.current.push(setTimeout(fn, delay));
  };
  const applyLocal = (a: Action, label?: string) => {
    if (a.type === "stop" || a.type === "reset") stopLocal();
    if (a.type === "overload") {
      for (let i = 0; i < config.settings.overloadCount; i++)
        schedule(() => {
          setLocal((s) =>
            reduceDevice(
              reduceDevice(s, {
                type: "message",
                value: threats[i % threats.length],
                sender: "UNKNOWN NUMBER",
                sound: "overload",
              }),
              { type: "missed", count: i + 3, sound: "overload" },
            ),
          );
        }, i * config.settings.interval);
      return;
    }
    setLocal((s) => ({ ...reduceDevice(s, a), lastTrigger: label || a.type }));
  };
  const command = (a: Action, label?: string, selected = target) => {
    setError("");
    if (view && connected && !isActor)
      void request("command", { target: selected, action: a, label }).catch(
        report,
      );
    applyLocal(a, label);
  };
  const actorAction = (a: Action) => {
    if (connected && actorCredentials)
      void request("actor", { action: a }).catch(report);
    else applyLocal(a);
  };
  const interaction = (data: Record<string, unknown>) => {
    setLocal((s) => ({
      ...s,
      ...(typeof data.draft === "string" ? { draft: data.draft } : {}),
      ...(typeof data.emailOpen === "boolean"
        ? { emailOpen: data.emailOpen }
        : {}),
      ...(data.dismiss ? { notices: [] } : {}),
      effect: undefined,
    }));
    if (isActor && connected && actorCredentials)
      void request("interaction", data).catch(report);
    else if (view && connected)
      void request("directorInteraction", { ...data, target }).catch(report);
  };
  const updateConfig = (next: Config) => {
    const result = configSchema.safeParse(next);
    if (!result.success) {
      report(new Error(result.error.issues[0].message));
      return;
    }
    setConfig(result.data);
    if (view && !isActor)
      void request("config", { config: result.data }).catch(report);
  };
  const createSession = async () => {
    try {
      const r = await request("create");
      const cred = { code: r.view.code, token: r.token };
      save("director", cred);
      setCredentials(cred);
      setView({ ...r.view, config });
      await request("config", { config });
      inform("Production session created. Share the actor link.");
    } catch (e) {
      report(e);
    }
  };
  const restoreProduction = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const next = configSchema.parse(data.config || data);
      const states = Array.isArray(data.states)
        ? data.states.map((d: any) => ({
            role: String(d.role),
            state: deviceStateSchema.parse(d.state),
          }))
        : [];
      updateConfig(next);
      if (states.length) {
        save("continuity", states);
        if (view) await request("restore", { states });
        else setLocal(states[0].state);
      }
      if (data.take && view) await request("take", { take: String(data.take) });
      inform(
        "Production loaded. Saved states are also available as a continuity preset.",
      );
    } catch (e) {
      report(e);
    }
  };
  const joinActor = async (
    code: string,
    role: string,
    preset: "phone" | "laptop",
  ) => {
    try {
      const r = await request("join", { code, role, preset });
      const cred = {
        code: code.toUpperCase(),
        role,
        preset,
        id: r.device.id,
        key: r.key,
      };
      save("actor", cred);
      setActorCredentials(cred);
      setView(r.view);
      setConfig(r.view.config);
      setLocal(r.device.state);
      inform("Connected. Enable audio, then enter filming mode.");
    } catch (e) {
      report(e);
    }
  };
  const currentScene = config.scenes[scene];
  const selectedCue =
    currentScene.cues[Math.min(cueIndex, currentScene.cues.length - 1)];
  const fire = (cue = selectedCue) => {
    stopLocal();
    const start = currentScene.cues.findIndex((q) => q.id === cue.id);
    const chain = [cue];
    let i = start;
    while (currentScene.cues[i]?.auto && i + 1 < currentScene.cues.length)
      chain.push(currentScene.cues[++i]);
    const cues = chain.map((q) => ({
      ...q,
      target: q.target === "*" ? target : q.target,
    }));
    if (view && connected)
      void request(
        cues.length > 1 ? "play" : "cue",
        cues.length > 1 ? { cues } : { cue: cues[0] },
      ).catch(report);
    let elapsed = 0;
    chain.forEach((q, index) => {
      elapsed += q.delay;
      schedule(() => {
        setCueIndex(start + index);
        applyLocal(q.action, q.label);
      }, elapsed);
      elapsed += q.duration;
    });
  };
  const stop = () => {
    stopLocal();
    command({ type: "stop" }, "All effects stopped", "*");
  };
  const move = (delta: number) =>
    setCueIndex((i) =>
      Math.max(0, Math.min(currentScene.cues.length - 1, i + delta)),
    );
  useEffect(() => {
    if (isActor || route === "/editor" || route === "/documents") return;
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest("input,textarea,select,button") ||
        e.repeat
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        fire();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      }
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const enableAudio = async () => {
    try {
      await audio.enable();
      setAudioEnabled(true);
      audio.play("notification", config);
    } catch (e) {
      report(e);
    }
  };
  const wakeRef = useRef<any>(null);
  const enterFilm = async () => {
    await enableAudio();
    setFilming(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {}
    try {
      wakeRef.current = await (navigator as any).wakeLock?.request("screen");
    } catch {}
  };
  const exitFilm = () => {
    setFilming(false);
    void wakeRef.current?.release();
    if (document.fullscreenElement) void document.exitFullscreen();
  };
  useEffect(() => {
    if (!filming) return;
    const visibility = () => {
      if (document.visibilityState === "visible")
        (navigator as any).wakeLock
          ?.request("screen")
          .then((w: any) => (wakeRef.current = w))
          .catch(() => {});
    };
    document.addEventListener("visibilitychange", visibility);
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", prevent);
    };
  }, [filming]);
  const taps = useRef<number[]>([]);
  const hiddenTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1100), now];
    if (taps.current.length >= 3) {
      exitFilm();
      taps.current = [];
    }
  };
  const activeDevice =
    view?.devices.find((d) => d.id === target) || view?.devices[0];
  const previewState = activeDevice?.state || local;
  const exportScreen = async () => {
    try {
      const el =
        previewRef.current?.querySelector<HTMLElement>(".device-surface");
      if (el) await exportPNG(el, "hulog-screen");
    } catch (e) {
      report(e);
    }
  };
  if (isActor)
    return (
      <div className={`actor-page ${filming ? "filming" : ""}`}>
        {!filming && (
          <div className="actor-setup">
            <a className="wordmark" href="/director">
              HULOG<span>DISPLAY SETUP</span>
            </a>
            <span className={`connection ${connected ? "online" : ""}`}>
              <i />
              {connected ? "Server reachable" : "Offline · screen retained"}
            </span>
            <ActorJoin joined={!!actorCredentials} onJoin={joinActor} />
            {!actorCredentials && (
              <label>
                Standalone display preset
                <select
                  value={localPreset}
                  onChange={(e) => {
                    setLocalPreset(e.target.value as typeof localPreset);
                    save("localPreset", e.target.value);
                  }}
                >
                  <option value="phone">Smartphone</option>
                  <option value="laptop">Laptop</option>
                </select>
              </label>
            )}
            <div className="button-row">
              <button onClick={enableAudio}>
                <Volume2 size={16} />
                {audioEnabled ? "Audio enabled" : "Enable Audio"}
              </button>
              <button className="primary" onClick={enterFilm}>
                <Maximize size={16} />
                Enter filming mode
              </button>
            </div>
            <p>
              Triple-tap the upper-right corner to leave filming mode. For
              iPhone, add to Home Screen for the cleanest view.
            </p>
            <details>
              <summary>Local fallback controls</summary>
              <select
                value={scene}
                onChange={(e) => {
                  setScene(+e.target.value);
                  setCueIndex(0);
                }}
              >
                {config.scenes.map((s, i) => (
                  <option value={i} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="local-actions">
                {currentScene.cues.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => applyLocal(q.action, q.label)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <button
                className="danger"
                onClick={() => applyLocal({ type: "stop" })}
              >
                STOP ALL LOCAL EFFECTS
              </button>
            </details>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {notice && <div className="toast">{notice}</div>}
          </div>
        )}
        <Display
          state={local}
          config={config}
          preset={actorCredentials?.preset || localPreset}
          act={actorAction}
          interact={interaction}
        />
        {filming && (
          <div
            className="exit-gesture"
            onPointerDown={hiddenTap}
            aria-hidden="true"
          />
        )}
      </div>
    );
  return (
    <div className="production-shell">
      <aside className="sidebar">
        <a href="/director" className="wordmark">
          HULOG<span>FILM SCREEN SIMULATOR</span>
        </a>
        <div className="project-tag">
          <span className="project-icon">
            <Film size={20} />
          </span>
          <div>
            <b>HULOG</b>
            <small>Short film · 6 minutes</small>
          </div>
          <span className="version">V1.0</span>
        </div>
        <p className="eyebrow">WORKSPACE</p>
        <nav>
          <a
            className={
              route !== "/editor" && route !== "/documents" ? "active" : ""
            }
            href="/director"
          >
            <SlidersHorizontal size={18} />
            Director panel
          </a>
          <a href="/display">
            <Smartphone size={18} />
            Actor display
          </a>
          <a className={route === "/editor" ? "active" : ""} href="/editor">
            <Settings size={18} />
            Prop editor
          </a>
          <a
            className={route === "/documents" ? "active" : ""}
            href="/documents"
          >
            <FileText size={18} />
            Document library
          </a>
        </nav>
        <div className="scene-nav">
          <p className="eyebrow">
            SCREENPLAY <span>06 SCENES</span>
          </p>
          {config.scenes.map((s, i) => (
            <button
              key={s.id}
              className={scene === i ? "selected" : ""}
              onClick={() => {
                setScene(i);
                setCueIndex(0);
              }}
            >
              <span className="scene-number">0{s.id}</span>
              <div>
                <b>{s.name}</b>
                <small>{s.time}</small>
              </div>
              {scene === i && <span className="scene-indicator" />}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div>
            <Clapperboard size={17} /> LOOK! There’s Nothing Here.
          </div>
          <p>Awa! Wala ra lagi.</p>
          <span>FICTIONAL FILM PROPS ONLY</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Production workspace</span>
            <ChevronRight size={15} />
            <b>
              {route === "/editor"
                ? "Prop editor"
                : route === "/documents"
                  ? "Document library"
                  : "Director panel"}
            </b>
          </div>
          <div>
            <span className={`connection ${connected ? "online" : ""}`}>
              <i />
              {connected ? "Server online" : "Offline"}
            </span>
            <span className="avatar crew">CR</span>
          </div>
        </header>
        <main className="main-workspace">
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              {notice}
            </div>
          )}
          {route === "/editor" ? (
            <Editor
              config={config}
              update={updateConfig}
              state={local}
              setState={setLocal}
              report={report}
            />
          ) : route === "/documents" ? (
            <Documents config={config} update={updateConfig} report={report} />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow red">ON SET / LIVE CONTROL</div>
                  <h1>
                    Director panel<span className="red-period">.</span>
                  </h1>
                  <p>Every screen. Every beat. Right on cue.</p>
                </div>
                <div className="button-row">
                  <label className="button">
                    <Upload size={16} />
                    Load production
                    <input
                      hidden
                      type="file"
                      accept="application/json"
                      onChange={(e) =>
                        void restoreProduction(e.target.files?.[0])
                      }
                    />
                  </label>
                  <button
                    onClick={() =>
                      downloadJSON(
                        {
                          config,
                          states: view?.devices || [],
                          take: view?.take,
                        },
                        "hulog-production-backup.json",
                      )
                    }
                  >
                    <Download size={16} />
                    Save production
                  </button>
                  <button className="primary" onClick={createSession}>
                    <Plus size={16} />
                    {view ? "New session" : "Create production session"}
                  </button>
                </div>
              </div>
              <div className="session-strip">
                <div>
                  <Radio size={18} />
                  <span>{view ? "SESSION LIVE" : "LOCAL REHEARSAL"}</span>
                  <b>{view?.code || "No session connected"}</b>
                  {view && (
                    <button
                      aria-label="Copy actor link"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(
                            `${location.origin}/display?session=${view.code}`,
                          )
                          .then(() => inform("Actor link copied."))
                          .catch(report);
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
                <div>
                  <span className="green-dot" />
                  {view?.devices.filter((d) => d.connected).length || 0}{" "}
                  connected devices <span className="separator">|</span>
                  <button onClick={() => setRehearsal(!rehearsal)}>
                    {rehearsal ? "Rehearsal" : "Live take"}
                  </button>
                  <input
                    aria-label="Take label"
                    value={view?.take || read("take", "Scene 1 · Take 1")}
                    onChange={(e) => {
                      save("take", e.target.value);
                      if (view) {
                        setView({ ...view, take: e.target.value });
                        void request("take", { take: e.target.value }).catch(
                          report,
                        );
                      } else inform("Create a session to track takes.");
                    }}
                  />
                </div>
              </div>
              <div className="director-grid">
                <section className="cue-panel panel">
                  <div className="panel-heading">
                    <span className="eyebrow">CURRENT SCENE</span>
                    <span className="time-pill">{currentScene.time}</span>
                  </div>
                  <div className="scene-title">
                    <span>0{currentScene.id}</span>
                    <div>
                      <h2>{currentScene.name}</h2>
                      <p>
                        {currentScene.cues.length} cues ready · Manual control
                      </p>
                    </div>
                    <select
                      aria-label="Select scene"
                      value={scene}
                      onChange={(e) => {
                        setScene(+e.target.value);
                        setCueIndex(0);
                      }}
                    >
                      {config.scenes.map((s, i) => (
                        <option value={i} key={s.id}>
                          Scene {s.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cue-toolbar">
                    <span>CUE LIST</span>
                    <button
                      onClick={() => {
                        if (view)
                          void request("play", {
                            cues: currentScene.cues.map((q) => ({
                              ...q,
                              target: q.target === "*" ? target : q.target,
                            })),
                          }).catch(report);
                        stopLocal();
                        let ms = 0;
                        currentScene.cues.forEach((q, i) => {
                          ms += q.delay;
                          schedule(() => {
                            setCueIndex(i);
                            applyLocal(q.action, q.label);
                          }, ms);
                          ms += q.duration;
                        });
                      }}
                    >
                      <Play size={13} />
                      Play scene
                    </button>
                  </div>
                  <div className="cue-list">
                    {currentScene.cues.map((q, i) => (
                      <button
                        key={q.id}
                        className={`cue-row ${i === cueIndex ? "selected" : ""}`}
                        onClick={() => setCueIndex(i)}
                        onDoubleClick={() => fire(q)}
                      >
                        <span className="cue-no">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="cue-symbol">
                          {q.action.type === "message" ? (
                            <MessageCircle size={17} />
                          ) : q.action.type === "call" ? (
                            <PhoneIcon />
                          ) : q.action.type === "email" ? (
                            <MailIcon />
                          ) : (
                            <Monitor size={17} />
                          )}
                        </span>
                        <span className="cue-label">
                          <b>{q.label}</b>
                          <small>
                            {q.action.type === "message"
                              ? "MESSAGE"
                              : q.action.type.toUpperCase()}{" "}
                            · {q.target === "*" ? "Selected device" : q.target}
                          </small>
                        </span>
                        {i === cueIndex ? (
                          <span className="ready-tag">READY</span>
                        ) : (
                          <span className="cue-length">
                            {(q.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                        <span
                          className="favorite"
                          role="checkbox"
                          aria-checked={read<string[]>(
                            "favorites",
                            [],
                          ).includes(q.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            const favorites = read<string[]>("favorites", []);
                            save(
                              "favorites",
                              favorites.includes(q.id)
                                ? favorites.filter((id) => id !== q.id)
                                : [...favorites, q.id],
                            );
                            inform("Cue favorite updated.");
                          }}
                        >
                          <Star
                            size={13}
                            fill={
                              read<string[]>("favorites", []).includes(q.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="cue-controls">
                    <div>
                      <span className="eyebrow">STANDING BY</span>
                      <b>
                        Cue {String(cueIndex + 1).padStart(2, "0")}{" "}
                        <span>/ {currentScene.cues.length}</span>
                      </b>
                    </div>
                    <div className="button-row">
                      <button
                        aria-label="Previous cue"
                        onClick={() => move(-1)}
                      >
                        <SkipBack size={17} />
                      </button>
                      <button aria-label="Next cue" onClick={() => move(1)}>
                        <SkipForward size={17} />
                      </button>
                    </div>
                    <button className="fire-cue" onClick={() => fire()}>
                      <Play size={20} fill="currentColor" />
                      FIRE CUE<kbd>SPACE</kbd>
                    </button>
                    <div className="cue-secondary">
                      <button onClick={() => fire()}>
                        <RotateCcw size={13} />
                        Replay cue
                      </button>
                      <button
                        onClick={() => {
                          command(
                            { type: "reset", value: config.settings.clock },
                            "Scene reset",
                          );
                          setCueIndex(0);
                        }}
                      >
                        Reset scene / cue
                      </button>
                    </div>
                  </div>
                </section>
                <section className="preview-panel panel">
                  <div className="panel-heading">
                    <span className="eyebrow">LIVE DEVICE PREVIEW</span>
                    <span className="live-pill">
                      <i />
                      LIVE STATE
                    </span>
                  </div>
                  <div className="device-picker">
                    <Smartphone size={18} />
                    {!activeDevice && (
                      <select
                        aria-label="Preview preset"
                        value={localPreset}
                        onChange={(e) =>
                          setLocalPreset(e.target.value as typeof localPreset)
                        }
                      >
                        <option value="phone">Phone</option>
                        <option value="laptop">Laptop</option>
                      </select>
                    )}
                    <select
                      aria-label="Target device"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="*">All devices · Broadcast</option>
                      {view?.devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.role}
                          {!d.connected ? " · offline" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div
                    className={`preview-stage ${(activeDevice?.preset || localPreset) === "laptop" ? "wide" : ""}`}
                  >
                    <div
                      ref={previewRef}
                      className={`device-frame ${(activeDevice?.preset || localPreset) === "laptop" ? "laptop-frame" : ""}`}
                    >
                      <Display
                        state={previewState}
                        config={config}
                        preset={activeDevice?.preset || localPreset}
                        preview
                        act={(a) => command(a)}
                        interact={interaction}
                      />
                    </div>
                  </div>
                  <div className="preview-caption">
                    <div>
                      <small>CURRENT SCREEN</small>
                      <b>{friendly[previewState.screen]}</b>
                    </div>
                    <button
                      title="Export current screen as PNG"
                      onClick={exportScreen}
                    >
                      <Download size={16} />
                    </button>
                    <button
                      title="Open actor display"
                      onClick={() =>
                        window.open(
                          `/display${view ? "?session=" + view.code : ""}`,
                          "_blank",
                        )
                      }
                    >
                      <Maximize size={16} />
                    </button>
                  </div>
                  <div className="last-trigger">
                    <span>LAST TRIGGER</span>
                    <p>{previewState.lastTrigger}</p>
                  </div>
                </section>
                <aside className="tools-column">
                  <section className="panel quick-panel">
                    <div className="panel-heading">
                      <span className="eyebrow">QUICK ACTIONS</span>
                      <SlidersHorizontal size={15} />
                    </div>
                    <button className="stop-button" onClick={stop}>
                      <Square size={16} fill="currentColor" />
                      STOP ALL EFFECTS<kbd>ESC</kbd>
                    </button>
                    <div className="quick-grid">
                      <button
                        onClick={() =>
                          command(
                            { type: "call", sound: "ringtone" },
                            "Incoming call",
                          )
                        }
                      >
                        <PhoneIcon />
                        Incoming call
                      </button>
                      <button
                        onClick={() =>
                          command(
                            { type: "endCall", sound: "ended" },
                            "Call ended",
                          )
                        }
                      >
                        <Square size={17} />
                        End call
                      </button>
                      <button
                        onClick={() =>
                          command(
                            {
                              type: "screen",
                              value: "black",
                              animation: "fade",
                            },
                            "Fade to black",
                          )
                        }
                      >
                        <Monitor size={17} />
                        Black screen
                      </button>
                      <button
                        onClick={() =>
                          command(
                            { type: "screen", value: "lock" },
                            "Screen locked",
                          )
                        }
                      >
                        <Smartphone size={17} />
                        Lock screen
                      </button>
                    </div>
                    <label className="field-label">
                      JUMP TO SCREEN
                      <select
                        aria-label="Jump to screen"
                        value={previewState.screen}
                        onChange={(e) =>
                          command(
                            { type: "screen", value: e.target.value },
                            friendly[e.target.value],
                          )
                        }
                      >
                        {screens.map((s) => (
                          <option key={s} value={s}>
                            {friendly[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      MISSED CALLS
                      <div className="missed-presets">
                        {[3, 5, 12, 27, 43, 142].map((n) => (
                          <button
                            key={n}
                            onClick={() =>
                              command(
                                {
                                  type: "missed",
                                  count: n,
                                  sound: "notification",
                                },
                                `${n} missed calls`,
                              )
                            }
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="9999"
                        placeholder="Custom count · Enter to apply"
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            command({
                              type: "missed",
                              count: Math.max(
                                0,
                                Math.min(9999, +e.currentTarget.value),
                              ),
                            });
                        }}
                      />
                    </label>
                    <label className="field-label">
                      UNREAD MESSAGES
                      <input
                        aria-label="Unread message count"
                        type="number"
                        min="0"
                        max="9999"
                        value={previewState.unread}
                        onChange={(e) =>
                          command({
                            type: "unread",
                            count: Math.max(0, Math.min(9999, +e.target.value)),
                          })
                        }
                      />
                    </label>
                  </section>
                  <section className="panel overload-panel">
                    <div className="panel-heading">
                      <span className="eyebrow">NOTIFICATION OVERLOAD</span>
                      <span className="red-dot" />
                    </div>
                    <p>Build the pressure. Control the pace.</p>
                    <div className="intensity">
                      {[
                        ["LOW", 3000],
                        ["MED", 1500],
                        ["HIGH", 900],
                        ["EXTREME", 500],
                      ].map(([name, ms]) => (
                        <button
                          className={
                            config.settings.interval === ms ? "selected" : ""
                          }
                          key={name}
                          onClick={() =>
                            updateConfig({
                              ...config,
                              settings: { ...config.settings, interval: +ms },
                            })
                          }
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                    <label className="slider-label">
                      Interval <b>{config.settings.interval} ms</b>
                      <input
                        type="range"
                        min="500"
                        max="5000"
                        step="100"
                        value={config.settings.interval}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            settings: {
                              ...config.settings,
                              interval: +e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <button
                      className="outline-red"
                      onClick={() =>
                        command({ type: "overload" }, "Notification overload")
                      }
                    >
                      <Play size={14} />
                      Start overload
                    </button>
                    <button
                      className="random-cue"
                      onClick={() =>
                        command(
                          {
                            type: "message",
                            sender: "UNKNOWN NUMBER",
                            value:
                              threats[
                                Math.floor(Math.random() * threats.length)
                              ],
                            sound: "notification",
                          },
                          "Random screenplay threat",
                        )
                      }
                    >
                      Random screenplay threat
                    </button>
                  </section>
                  <section className="panel audio-panel">
                    <div className="panel-heading">
                      <span className="eyebrow">SOUND & DISPLAY</span>
                      <Volume2 size={16} />
                    </div>
                    <label className="slider-label">
                      Master volume{" "}
                      <b>{Math.round(config.settings.volume * 100)}%</b>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step=".05"
                        value={config.settings.volume}
                        onChange={(e) =>
                          updateConfig({
                            ...config,
                            settings: {
                              ...config.settings,
                              volume: +e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <Toggle
                      label="Mute all sounds"
                      checked={config.settings.muted}
                      onChange={(muted) =>
                        updateConfig({
                          ...config,
                          settings: { ...config.settings, muted },
                        })
                      }
                    />
                    <Toggle
                      label="Reduced motion"
                      checked={config.settings.reducedMotion}
                      onChange={(reducedMotion) =>
                        updateConfig({
                          ...config,
                          settings: { ...config.settings, reducedMotion },
                        })
                      }
                    />
                    <button onClick={enableAudio}>
                      {audioEnabled
                        ? "Audio monitoring enabled"
                        : "Enable audio monitoring"}
                    </button>
                    <details>
                      <summary>Sound cue library</summary>
                      {Object.entries(soundNames).map(([key, name]) => (
                        <button
                          className="sound-button"
                          key={key}
                          onClick={() =>
                            command(
                              { type: "sound", value: key, sound: key },
                              name,
                            )
                          }
                        >
                          <Volume2 size={14} />
                          {name}
                        </button>
                      ))}
                    </details>
                  </section>
                </aside>
              </div>
              <section className="devices-panel panel">
                <div className="panel-heading">
                  <span className="eyebrow">CONNECTED DISPLAYS</span>
                  <span>{view?.devices.length || 0} registered</span>
                </div>
                {view?.devices.length ? (
                  <div className="device-cards">
                    {view.devices.map((d) => (
                      <button
                        className={`device-card ${target === d.id ? "selected" : ""}`}
                        key={d.id}
                        onClick={() => setTarget(d.id)}
                      >
                        {d.preset === "phone" ? <Smartphone /> : <Monitor />}
                        <div>
                          <b>{d.role}</b>
                          <small>
                            {friendly[d.state.screen]} ·{" "}
                            {d.connected
                              ? "Connected"
                              : "Disconnected — last state retained"}
                          </small>
                        </div>
                        <span
                          className={d.connected ? "green-dot" : "red-dot"}
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-devices">
                    <LinkIcon size={20} />
                    <span>
                      Create a production session, then open <b>/display</b> on
                      your filming devices.
                    </span>
                  </div>
                )}
                <div className="continuity">
                  <button
                    onClick={() => {
                      save(
                        "continuity",
                        view?.devices || [{ role: "Preview", state: local }],
                      );
                      inform("Continuity snapshot saved on this browser.");
                    }}
                  >
                    Save continuity preset
                  </button>
                  <button
                    onClick={() => {
                      const states = read<any[]>("continuity", []);
                      if (!states.length) {
                        report(new Error("Save a continuity preset first."));
                        return;
                      }
                      if (view)
                        void request("restore", { states }).catch(report);
                      else setLocal(states[0].state);
                      inform("Continuity preset restored.");
                    }}
                  >
                    Restore continuity preset
                  </button>
                  <button
                    onClick={() =>
                      downloadJSON(
                        currentScene,
                        "hulog-scene-" + currentScene.id + ".json",
                      )
                    }
                  >
                    Export cue list
                  </button>
                </div>
              </section>
              <footer className="workspace-footer">
                <span>
                  <Clapperboard size={14} /> HULOG · A film by your production
                  team
                </span>
                <span>
                  <kbd>←</kbd>
                  <kbd>→</kbd> Navigate cues <kbd>SPACE</kbd> Fire cue{" "}
                  <kbd>ESC</kbd> Stop all
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
const PhoneIcon = () => <Smartphone size={17} />;
const MailIcon = () => <FileText size={17} />;
