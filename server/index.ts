import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { resolve } from "node:path";
import {
  actionSchema,
  configSchema,
  cueSchema,
  deviceStateSchema,
} from "../src/shared/model";
import { ProductionSession } from "./sessions";
export function createProductionServer() {
  const app = express();
  const http = createServer(app);
  const io = new Server(http, { maxHttpBufferSize: 8e6 });
  const sessions = new Map<string, ProductionSession>();
  app.use(express.static(resolve("dist")));
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("*", (_req, res) => res.sendFile(resolve("dist/index.html")));
  io.on("connection", (socket) => {
    let session: ProductionSession | undefined;
    let director = false;
    let deviceId: string | undefined;
    let hits = 0;
    const rate = setInterval(() => (hits = 0), 1000);
    const handle = (name: string, fn: (data: any) => unknown) =>
      socket.on(name, (data, ack) => {
        try {
          if (++hits > 100) throw new Error("Too many requests");
          const result = fn(data);
          if (typeof ack === "function")
            ack({ ok: true, ...(result as object) });
        } catch (e) {
          if (typeof ack === "function")
            ack({
              ok: false,
              error: e instanceof Error ? e.message : "Invalid request",
            });
        }
      });
    const control = () => {
      if (!session || !director)
        throw new Error("Director authorization required");
      return session;
    };
    const attach = (s: ProductionSession) => {
      if (session) socket.leave(session.code);
      session = s;
      socket.join(s.code);
    };
    handle("create", () => {
      if (sessions.size >= 200) throw new Error("Server session limit reached");
      const s = new ProductionSession();
      s.publish = () => io.to(s.code).emit("state", s.view());
      sessions.set(s.code, s);
      attach(s);
      director = true;
      return { token: s.token, view: s.view() };
    });
    handle("directorJoin", (data) => {
      const s = sessions.get(data.code);
      if (!s || data.token !== s.token)
        throw new Error("Session expired or control key invalid");
      attach(s);
      director = true;
      return { view: s.view() };
    });
    handle("join", (data) => {
      const s = sessions.get(String(data.code).toUpperCase());
      if (!s) throw new Error("Session not found. Check the code and server.");
      if (
        typeof data.role !== "string" ||
        !data.role.trim() ||
        data.role.length > 60
      )
        throw new Error("Enter a role (maximum 60 characters)");
      if (s.devices.size >= 50 && !data.id)
        throw new Error("Maximum 50 devices per session");
      const result = s.add(
        data.role.trim(),
        data.preset === "laptop" ? "laptop" : "phone",
        data.id,
        data.key,
      );
      attach(s);
      director = false;
      deviceId = result.device.id;
      socket.data.deviceId = deviceId;
      s.publish();
      return { ...result, view: s.view() };
    });
    handle("command", (data) => {
      const s = control();
      s.apply(
        String(data.target || "*"),
        actionSchema.parse(data.action),
        String(data.label || data.action.type),
      );
    });
    handle("cue", (data) => {
      const s = control();
      const cue = cueSchema.parse(data.cue);
      s.schedule(() => s.apply(cue.target, cue.action, cue.label), cue.delay);
    });
    handle("play", (data) => {
      const s = control();
      const cues = cueSchema.array().max(200).parse(data.cues);
      s.stop();
      let elapsed = 0;
      for (const cue of cues) {
        elapsed += cue.delay;
        s.schedule(() => s.apply(cue.target, cue.action, cue.label), elapsed);
        elapsed += cue.duration;
      }
    });
    handle("config", (data) => {
      const s = control();
      s.config = configSchema.parse(data.config);
      s.publish();
    });
    handle("take", (data) => {
      const s = control();
      s.take = String(data.take).slice(0, 100);
      s.publish();
    });
    handle("actor", (data) => {
      if (!session || !deviceId) throw new Error("Join a display first");
      const a = actionSchema.parse(data.action);
      if (
        ![
          "acceptCall",
          "endCall",
          "permission",
          "loan",
          "screen",
          "draft",
        ].includes(a.type)
      )
        throw new Error("Actor action not allowed");
      session.apply(deviceId, a);
    });
    handle("interaction", (data) => {
      if (!session || !deviceId) throw new Error("Join first");
      const d = session.devices.get(deviceId)!;
      if (typeof data.draft === "string")
        d.state.draft = data.draft.slice(0, 2000);
      if (typeof data.emailOpen === "boolean")
        d.state.emailOpen = data.emailOpen;
      if (data.dismiss === true) d.state.notices = [];
      d.state.revision++;
      d.state.effect = undefined;
      session.publish();
    });
    handle("directorInteraction", (data) => {
      const s = control();
      for (const d of s.devices.values())
        if (data.target === "*" || d.id === data.target) {
          if (typeof data.draft === "string")
            d.state.draft = data.draft.slice(0, 2000);
          if (typeof data.emailOpen === "boolean")
            d.state.emailOpen = data.emailOpen;
          if (data.dismiss === true) d.state.notices = [];
          d.state.revision++;
          d.state.effect = undefined;
        }
      s.publish();
    });
    handle("restore", (data) => {
      const s = control();
      const snapshot = data.states;
      if (!Array.isArray(snapshot) || snapshot.length > 50)
        throw new Error("Invalid snapshot");
      const validated = snapshot.map((item) => ({
        role: String(item.role),
        state: deviceStateSchema.parse(item.state),
      }));
      s.stop();
      for (const item of validated) {
        const d = [...s.devices.values()].find((d) => d.role === item.role);
        if (d)
          d.state = {
            ...item.state,
            effect: { type: "stop" },
            revision: d.state.revision + 1,
          };
      }
      s.publish();
    });
    socket.on("disconnect", () => {
      clearInterval(rate);
      if (session && deviceId) {
        const others = [...io.sockets.sockets.values()].some(
          (s) => s.data.deviceId === deviceId,
        );
        if (!others) {
          session.devices.get(deviceId)!.connected = false;
          session.publish();
        }
      }
    });
  });
  const cleanup = setInterval(() => {
    for (const [code, s] of sessions)
      if (
        Date.now() - s.updated > 24 * 3600000 &&
        !s.view().devices.some((d) => d.connected)
      ) {
        s.stop();
        sessions.delete(code);
      }
  }, 60000);
  cleanup.unref();
  http.on("close", () => {
    clearInterval(cleanup);
    for (const s of sessions.values()) s.stop();
  });
  return { http, io, sessions };
}
if (process.env.NODE_ENV !== "test") {
  const { http } = createProductionServer();
  http.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
    console.log(
      `HULOG production server listening on port ${process.env.PORT || 3001}`,
    ),
  );
}
