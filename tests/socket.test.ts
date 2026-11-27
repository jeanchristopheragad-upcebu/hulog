import { test } from "node:test";
import assert from "node:assert/strict";
import { io, Socket } from "socket.io-client";
process.env.NODE_ENV = "test";
const { createProductionServer } = await import("../server/index");
const ask = (s: Socket, event: string, data: any = {}) =>
  new Promise<any>((resolve, reject) =>
    s
      .timeout(3000)
      .emit(event, data, (err: any, r: any) =>
        err ? reject(err) : resolve(r),
      ),
  );
const connect = (url: string) =>
  new Promise<Socket>((resolve) => {
    const s = io(url, { transports: ["websocket"], forceNew: true });
    s.on("connect", () => resolve(s));
  });
test("remote production flow, security and reconnect", async () => {
  const { http, io: server } = createProductionServer();
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address() as any;
  const url = `http://127.0.0.1:${address.port}`;
  const director = await connect(url);
  let actor = await connect(url);
  const outsider = await connect(url);
  try {
    const created = await ask(director, "create");
    assert.ok(created.token.length > 30);
    const joined = await ask(actor, "join", {
      code: created.view.code,
      role: "Tala phone",
      preset: "phone",
    });
    assert.equal(joined.ok, true);
    assert.equal(
      (
        await ask(actor, "command", {
          action: { type: "screen", value: "black" },
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await ask(outsider, "directorJoin", {
          code: created.view.code,
          token: "wrong",
        })
      ).ok,
      false,
    );
    let latest: any;
    actor.on("state", (s) => (latest = s));
    await ask(director, "command", {
      target: joined.device.id,
      action: {
        type: "message",
        value: "We are watching you.",
        sender: "UNKNOWN NUMBER",
      },
    });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(
      latest.devices[0].state.messages[0].text,
      "We are watching you.",
    );
    await ask(director, "command", { action: { type: "call" } });
    await ask(actor, "actor", { action: { type: "acceptCall" } });
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(latest.devices[0].state.call, "active");
    await ask(director, "command", { action: { type: "endCall" } });
    actor.disconnect();
    actor = await connect(url);
    const rejoined = await ask(actor, "join", {
      code: created.view.code,
      role: "Tala phone",
      preset: "phone",
      id: joined.device.id,
      key: joined.key,
    });
    assert.equal(rejoined.device.state.call, "ended");
    assert.equal(rejoined.device.state.messages.length, 1);
    const reset = await ask(director, "command", { action: { type: "reset" } });
    assert.equal(reset.ok, true);
  } finally {
    director.disconnect();
    actor.disconnect();
    outsider.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("ending a session revokes access, cancels timers and leaves other sessions running", async () => {
  const { http, io: server, sessions } = createProductionServer();
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(http.address() as any).port}`;
  const director = await connect(url);
  const actor = await connect(url);
  const other = await connect(url);
  try {
    const created = await ask(director, "create");
    const separate = await ask(other, "create");
    await ask(actor, "join", { code: created.view.code, role: "Phone" });
    assert.equal((await ask(actor, "endSession")).ok, false);
    const session = sessions.get(created.view.code)!;
    let fired = false;
    session.schedule(() => { fired = true; }, 100);
    const ended = new Promise<any>((resolve) => actor.once("sessionEnded", resolve));
    assert.equal((await ask(director, "endSession")).ok, true);
    assert.equal((await ended).code, created.view.code);
    assert.equal(sessions.has(created.view.code), false);
    assert.equal(session.timers.size, 0);
    assert.equal((await ask(director, "command", { action: { type: "call" } })).ok, false);
    assert.equal((await ask(actor, "actor", { action: { type: "acceptCall" } })).ok, false);
    assert.equal((await ask(actor, "join", { code: created.view.code, role: "Phone" })).ok, false);
    assert.equal((await ask(director, "directorJoin", { code: created.view.code, token: created.token })).ok, false);
    assert.equal((await ask(other, "command", { action: { type: "call" } })).ok, true);
    assert.equal(sessions.has(separate.view.code), true);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(fired, false);
    assert.equal((await ask(director, "create")).ok, true);
  } finally {
    director.disconnect(); actor.disconnect(); other.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
