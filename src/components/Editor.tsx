import { useState } from "react";
import { Upload, Download } from "lucide-react";
import { Display } from "./Display";
import { Toggle } from "./Controls";
import {
  configSchema,
  initialState,
  reduceDevice,
  type Config,
  type DeviceState,
  type Cue,
  type Action,
} from "../shared/model";
import { downloadJSON } from "../services/storage";
import { audio, soundNames } from "../services/audio";
export function Editor({
  config,
  update,
  state,
  setState,
  report,
}: {
  config: Config;
  update: (c: Config) => void;
  state: DeviceState;
  setState: (s: DeviceState) => void;
  report: (e: unknown) => void;
}) {
  const [scene, setScene] = useState(0);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState("cues");
  const [json, setJson] = useState("");
  const cue =
    config.scenes[scene].cues[
      Math.min(selected, config.scenes[scene].cues.length - 1)
    ];
  const editCue = (patch: Partial<Cue>) =>
    update({
      ...config,
      scenes: config.scenes.map((s, i) =>
        i === scene
          ? {
              ...s,
              cues: s.cues.map((q) =>
                q.id === cue.id ? { ...q, ...patch } : q,
              ),
            }
          : s,
      ),
    });
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.cues && data.id) {
        update({
          ...config,
          scenes: config.scenes.map((s) => (s.id === data.id ? data : s)),
        });
      } else update(configSchema.parse(data.config || data));
    } catch (e) {
      report(e);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow red">DIGITAL PROP WORKSHOP</p>
          <h1>
            Prop editor<span className="red-period">.</span>
          </h1>
          <p>Make the story yours. Changes save automatically.</p>
        </div>
        <div className="button-row">
          <label className="button">
            <Upload size={15} />
            Import JSON
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </label>
          <button
            onClick={() => downloadJSON(config, "hulog-configuration.json")}
          >
            <Download size={15} />
            Export JSON
          </button>
        </div>
      </div>
      <div className="editor-layout">
        <section className="panel editor-fields">
          <div className="tabs">
            {["cues", "emails", "settings", "sounds", "json"].map((t) => (
              <button
                className={tab === t ? "selected" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "cues" ? (
            <>
              <label>
                Scene
                <select
                  value={scene}
                  onChange={(e) => {
                    setScene(+e.target.value);
                    setSelected(0);
                  }}
                >
                  {config.scenes.map((s, i) => (
                    <option value={i} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cue
                <select
                  value={selected}
                  onChange={(e) => setSelected(+e.target.value)}
                >
                  {config.scenes[scene].cues.map((q, i) => (
                    <option value={i} key={q.id}>
                      {i + 1}. {q.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cue label
                <input
                  value={cue.label}
                  onChange={(e) => editCue({ label: e.target.value })}
                />
              </label>
              <div className="form-grid">
                <label>
                  Action
                  <select
                    value={cue.action.type}
                    onChange={(e) =>
                      editCue({
                        action: {
                          ...cue.action,
                          type: e.target.value as Action["type"],
                        },
                      })
                    }
                  >
                    {[
                      "screen",
                      "message",
                      "email",
                      "call",
                      "endCall",
                      "missed",
                      "unread",
                      "finalCounters",
                      "permission",
                      "loan",
                      "draft",
                      "clock",
                      "typing",
                      "stop",
                      "reset",
                      "overload",
                      "sound",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Target role or *
                  <input
                    value={cue.target}
                    onChange={(e) => editCue({ target: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Message / screen / action value
                <textarea
                  rows={4}
                  value={cue.action.value || ""}
                  onChange={(e) => {
                    editCue({
                      action: { ...cue.action, value: e.target.value },
                    });
                    setState(
                      reduceDevice(initialState(), {
                        ...cue.action,
                        value: e.target.value,
                      }),
                    );
                  }}
                />
              </label>
              <label>
                Sender
                <input
                  value={cue.action.sender || ""}
                  onChange={(e) =>
                    editCue({
                      action: { ...cue.action, sender: e.target.value },
                    })
                  }
                />
              </label>
              <div className="form-grid">
                {(["delay", "duration"] as const).map((k) => (
                  <label key={k}>
                    {k} (ms)
                    <input
                      type="number"
                      min={k === "delay" ? 0 : 100}
                      max="120000"
                      value={cue[k]}
                      onChange={(e) => editCue({ [k]: +e.target.value })}
                    />
                  </label>
                ))}
                <label>
                  Count
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={cue.action.count || 0}
                    onChange={(e) =>
                      editCue({
                        action: { ...cue.action, count: +e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Animation
                  <select
                    value={cue.action.animation || "slide"}
                    onChange={(e) =>
                      editCue({
                        action: {
                          ...cue.action,
                          animation: e.target.value as Action["animation"],
                        },
                      })
                    }
                  >
                    {["slide", "fade", "shake", "none"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Sound
                  <select
                    value={cue.action.sound || ""}
                    onChange={(e) =>
                      editCue({
                        action: { ...cue.action, sound: e.target.value },
                      })
                    }
                  >
                    <option value="">None</option>
                    {Object.entries(soundNames).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Toggle
                label="Automatically fire next cue"
                checked={cue.auto}
                onChange={(auto) => editCue({ auto })}
              />
              <div className="button-row">
                <button
                  className="primary"
                  onClick={() => setState(reduceDevice(state, cue.action))}
                >
                  Preview cue
                </button>
                <button
                  onClick={() => {
                    const cues = [...config.scenes[scene].cues];
                    if (selected > 0) {
                      [cues[selected - 1], cues[selected]] = [
                        cues[selected],
                        cues[selected - 1],
                      ];
                      update({
                        ...config,
                        scenes: config.scenes.map((s, i) =>
                          i === scene ? { ...s, cues } : s,
                        ),
                      });
                      setSelected(selected - 1);
                    }
                  }}
                >
                  Move earlier
                </button>
                <button
                  onClick={() => {
                    const cues = [...config.scenes[scene].cues];
                    if (selected < cues.length - 1) {
                      [cues[selected + 1], cues[selected]] = [
                        cues[selected],
                        cues[selected + 1],
                      ];
                      update({
                        ...config,
                        scenes: config.scenes.map((s, i) =>
                          i === scene ? { ...s, cues } : s,
                        ),
                      });
                      setSelected(selected + 1);
                    }
                  }}
                >
                  Move later
                </button>
                <button
                  onClick={() => {
                    const q = {
                      ...cue,
                      id: crypto.randomUUID(),
                      label: "Custom cue",
                    };
                    update({
                      ...config,
                      scenes: config.scenes.map((s, i) =>
                        i === scene ? { ...s, cues: [...s.cues, q] } : s,
                      ),
                    });
                    setSelected(config.scenes[scene].cues.length);
                  }}
                >
                  Add cue
                </button>
              </div>
            </>
          ) : tab === "emails" ? (
            config.emails.map((email, i) => (
              <fieldset key={email.id}>
                <legend>{email.id}</legend>
                {(["sender", "subject", "body"] as const).map((k) => (
                  <label key={k}>
                    {k}
                    {k === "body" ? (
                      <textarea
                        rows={10}
                        value={email[k]}
                        onChange={(e) =>
                          update({
                            ...config,
                            emails: config.emails.map((m, j) =>
                              j === i ? { ...m, [k]: e.target.value } : m,
                            ),
                          })
                        }
                      />
                    ) : (
                      <input
                        value={email[k]}
                        onChange={(e) =>
                          update({
                            ...config,
                            emails: config.emails.map((m, j) =>
                              j === i ? { ...m, [k]: e.target.value } : m,
                            ),
                          })
                        }
                      />
                    )}
                  </label>
                ))}
                <button
                  onClick={() =>
                    setState({
                      ...reduceDevice(state, {
                        type: "email",
                        value: email.id,
                      }),
                      screen: "email",
                      emailOpen: true,
                      notices: [],
                    })
                  }
                >
                  Preview email
                </button>
              </fieldset>
            ))
          ) : tab === "settings" ? (
            <>
              {Object.entries(config.settings).map(([key, value]) =>
                typeof value === "boolean" ? (
                  <Toggle
                    key={key}
                    label={key}
                    checked={value}
                    onChange={(v) =>
                      update({
                        ...config,
                        settings: { ...config.settings, [key]: v },
                      })
                    }
                  />
                ) : (
                  <label key={key}>
                    {key}
                    {["theme", "appearance"].includes(key) ? (
                      <select
                        value={String(value)}
                        onChange={(e) =>
                          update({
                            ...config,
                            settings: {
                              ...config.settings,
                              [key]: e.target.value,
                            },
                          })
                        }
                      >
                        {(key === "theme"
                          ? ["ios", "android"]
                          : ["light", "dark"]
                        ).map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={typeof value === "number" ? "number" : "text"}
                        step="any"
                        value={value}
                        onChange={(e) =>
                          update({
                            ...config,
                            settings: {
                              ...config.settings,
                              [key]:
                                typeof value === "number"
                                  ? +e.target.value
                                  : e.target.value,
                            },
                          })
                        }
                      />
                    )}
                  </label>
                ),
              )}
            </>
          ) : tab === "sounds" ? (
            <>
              <p>
                Upload MP3 or WAV replacements (maximum 2 MB each). Audio stays
                in your configuration and is shared with joined displays.
              </p>
              {Object.entries(soundNames).map(([key, name]) => (
                <div className="sound-upload" key={key}>
                  <b>{name}</b>
                  <div className="button-row">
                    <button
                      onClick={async () => {
                        await audio.enable();
                        audio.play(key, config);
                      }}
                    >
                      Play
                    </button>
                    <label className="button">
                      {config.sounds[key] ? "Replace" : "Upload"}
                      <input
                        hidden
                        type="file"
                        accept="audio/mpeg,audio/wav,audio/x-wav"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 2e6) {
                            report(
                              new Error(
                                "Please choose a sound smaller than 2 MB.",
                              ),
                            );
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () =>
                            update({
                              ...config,
                              sounds: {
                                ...config.sounds,
                                [key]: String(reader.result),
                              },
                            });
                          reader.readAsDataURL(f);
                        }}
                      />
                    </label>
                    <button
                      onClick={() => {
                        const sounds = { ...config.sounds };
                        delete sounds[key];
                        update({ ...config, sounds });
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => audio.stop()}>Stop all sounds</button>
            </>
          ) : (
            <>
              <p>Edit or import the complete validated master configuration.</p>
              <button onClick={() => setJson(JSON.stringify(config, null, 2))}>
                Load current JSON
              </button>
              <textarea
                aria-label="Configuration JSON"
                rows={24}
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
              <button
                onClick={() => {
                  try {
                    update(configSchema.parse(JSON.parse(json)));
                  } catch (e) {
                    report(e);
                  }
                }}
              >
                Apply JSON
              </button>
            </>
          )}
        </section>
        <section className="panel editor-preview">
          <div className="panel-heading">
            <span className="eyebrow">PROP PREVIEW</span>
          </div>
          <div className="device-frame">
            <Display
              state={state}
              config={config}
              act={(a) => setState(reduceDevice(state, a))}
              interact={(data) => setState({ ...state, ...data })}
            />
          </div>
        </section>
      </div>
    </>
  );
}
