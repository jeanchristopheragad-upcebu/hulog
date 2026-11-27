import { test } from "node:test";
import assert from "node:assert/strict";
import { configSchema, initialState, reduceDevice } from "../src/shared/model";
import { defaultConfig } from "../src/data/production";
import { ProductionSession } from "../server/sessions";
test("complete six-scene configuration validates with exact final message", () => {
  assert.equal(configSchema.parse(defaultConfig).scenes.length, 6);
  assert.ok(
    defaultConfig.scenes[5].cues.some(
      (c) =>
        c.action.value ===
        "Nak, nikaon na ka? Kumusta na man ka diha? Amping kanunay ha. Mingaw na mi nimo.",
    ),
  );
});
test("messages, calls, permissions and reset preserve deterministic continuity", () => {
  let s = initialState();
  s = reduceDevice(s, { type: "message", sender: "MAMA", value: "Hello" }, 1);
  assert.equal(s.unread, 1);
  assert.equal(s.messages[0].calm, true);
  s = reduceDevice(s, { type: "call" });
  s = reduceDevice(s, { type: "acceptCall" }, 100);
  assert.equal(s.call, "active");
  assert.equal(s.callStarted, 100);
  s = reduceDevice(s, { type: "endCall" });
  assert.equal(s.call, "ended");
  for (const p of ["CONTACTS", "PHOTOS", "LOCATION"])
    s = reduceDevice(s, { type: "permission", value: p, count: 0 });
  assert.deepEqual(Object.values(s.permissions), [false, false, false]);
  s = reduceDevice(s, { type: "reset" });
  assert.equal(s.unread, 0);
  assert.equal(s.call, "none");
  assert.deepEqual(Object.values(s.permissions), [true, true, true]);
});
test("roles are unique and protected device reconnect restores same state", () => {
  const s = new ProductionSession();
  const { device, key } = s.add("Tala", "phone");
  s.apply(device.id, { type: "missed", count: 27 });
  assert.throws(() => s.add("Tala", "phone"));
  assert.throws(() => s.add("Tala", "phone", device.id, "wrong"));
  assert.equal(s.add("Tala", "phone", device.id, key).device.state.missed, 27);
  s.stop();
});
test("device commands are isolated; broadcasts reach all roles", () => {
  const s = new ProductionSession();
  const a = s.add("Phone", "phone").device;
  const b = s.add("Laptop", "laptop").device;
  s.apply(a.id, { type: "screen", value: "settings" });
  assert.equal(a.state.screen, "settings");
  assert.equal(b.state.screen, "lock");
  s.apply("*", { type: "screen", value: "black" });
  assert.equal(a.state.screen, b.state.screen);
  s.stop();
});
test("STOP cancels overload and delayed commands", async () => {
  const s = new ProductionSession();
  const a = s.add("Phone", "phone").device;
  s.config.settings.interval = 500;
  s.apply("*", { type: "overload" });
  s.schedule(() => s.apply("*", { type: "call" }), 40);
  s.apply("*", { type: "stop" });
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(a.state.messages.length, 0);
  assert.equal(a.state.call, "none");
  assert.equal(s.timers.size, 0);
});
test("unsent message never enters sent message history", () => {
  let s = reduceDevice(initialState(), { type: "draft", value: "full" });
  assert.equal(s.draft, "Ma, dili na nako kaya…");
  s = reduceDevice(s, { type: "draft", value: "delete" });
  assert.equal(s.draft, "");
  assert.equal(s.messages.length, 0);
});
