import { randomBytes } from "node:crypto";
import { defaultConfig, threats } from "../src/data/production";
import {
  initialState,
  reduceDevice,
  type Action,
  type Config,
  type Device,
  type SessionView,
} from "../src/shared/model";
export class ProductionSession {
  code = randomBytes(6).toString("base64url").toUpperCase();
  token = randomBytes(32).toString("base64url");
  config: Config = structuredClone(defaultConfig);
  devices = new Map<string, Device>();
  credentials = new Map<string, string>();
  timers = new Set<ReturnType<typeof setTimeout>>();
  take = "Scene 1 · Take 1";
  updated = Date.now();
  constructor(public publish: () => void = () => {}) {}
  view(): SessionView {
    return {
      code: this.code,
      config: this.config,
      devices: [...this.devices.values()],
      take: this.take,
    };
  }
  add(role: string, preset: "phone" | "laptop", id?: string, key?: string) {
    if (id && key && this.credentials.get(id) === key) {
      const d = this.devices.get(id)!;
      d.connected = true;
      return { device: d, key };
    }
    if (
      [...this.devices.values()].some(
        (d) => d.role.toLowerCase() === role.toLowerCase(),
      )
    )
      throw new Error(
        "That role is already assigned. Choose another role or reconnect from the original device.",
      );
    const device: Device = {
      id: randomBytes(12).toString("hex"),
      role,
      preset,
      connected: true,
      state: initialState(this.config.settings.clock),
    };
    const secret = randomBytes(24).toString("hex");
    this.devices.set(device.id, device);
    this.credentials.set(device.id, secret);
    return { device, key: secret };
  }
  schedule(fn: () => void, ms: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }
  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }
  apply(target: string, a: Action, label: string = a.type) {
    this.updated = Date.now();
    if (a.type === "stop" || a.type === "reset") this.stop();
    if (a.type === "overload") {
      const settings = this.config.settings;
      for (let i = 0; i < settings.overloadCount; i++)
        this.schedule(
          () => {
            this.apply(
              target,
              {
                type: "message",
                value: threats[i % threats.length],
                sender: "UNKNOWN NUMBER",
                sound: "overload",
              },
              "Notification overload",
            );
            if (i % 3 === 0)
              this.apply(
                target,
                { type: "missed", count: i + 3 },
                "Notification overload",
              );
          },
          i * Math.max(500, settings.interval),
        );
      return;
    }
    for (const d of this.devices.values())
      if (target === "*" || d.id === target || d.role === target) {
        d.state = reduceDevice(d.state, a);
        d.state.lastTrigger = label;
      }
    this.publish();
  }
}
