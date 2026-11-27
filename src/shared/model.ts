import { z } from "zod";
export const screens = [
  "lock",
  "messages",
  "email",
  "portal",
  "social",
  "loan",
  "settings",
  "camera",
  "bpo",
  "documents",
  "black",
  "title",
  "epilogue",
] as const;
export type Screen = (typeof screens)[number];
export const actionSchema = z.object({
  type: z.enum([
    "screen",
    "message",
    "email",
    "call",
    "endCall",
    "acceptCall",
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
    "restore",
  ]),
  value: z.string().max(20000).optional(),
  sender: z.string().max(200).optional(),
  count: z.number().min(0).max(9999).optional(),
  sound: z.string().max(100).optional(),
  duration: z.number().min(0).max(120000).optional(),
  animation: z.enum(["slide", "fade", "shake", "none"]).optional(),
});
export type Action = z.infer<typeof actionSchema>;
export const cueSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(200),
  action: actionSchema,
  target: z.string().default("*"),
  delay: z.number().min(0).max(120000).default(0),
  duration: z.number().min(100).max(120000).default(3000),
  auto: z.boolean().default(false),
});
export type Cue = z.infer<typeof cueSchema>;
export const configSchema = z.object({
  version: z.literal(1),
  scenes: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        time: z.string(),
        cues: z.array(cueSchema).min(1).max(200),
      }),
    )
    .length(6),
  emails: z
    .array(
      z.object({
        id: z.string(),
        sender: z.string(),
        subject: z.string(),
        body: z.string(),
      }),
    )
    .min(2),
  documents: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        issuer: z.string(),
        name: z.string(),
        reference: z.string(),
        lines: z.array(z.object({ label: z.string(), value: z.string() })),
      }),
    )
    .min(4),
  settings: z.object({
    clock: z.string(),
    phone: z.string(),
    university: z.string(),
    loanAmount: z.string(),
    dueDate: z.string(),
    notificationTime: z.string(),
    volume: z.number().min(0).max(1),
    muted: z.boolean(),
    speed: z.number().min(0.2).max(3),
    fontSize: z.number().min(12).max(24),
    reducedMotion: z.boolean(),
    distortion: z.boolean(),
    interval: z.number().min(500).max(10000),
    overloadCount: z.number().min(1).max(200),
    flash: z.number().min(0).max(0.15),
    vibration: z.number().min(0).max(1000),
    fade: z.number().min(0).max(15),
    theme: z.enum(["ios", "android"]),
    appearance: z.enum(["light", "dark"]),
  }),
  sounds: z.record(z.string(), z.string()).default({}),
});
export type Config = z.infer<typeof configSchema>;
export type Notice = {
  id: string;
  sender: string;
  text: string;
  kind: "message" | "email" | "call";
  ref?: string;
  calm?: boolean;
};
export type DeviceState = {
  screen: Screen;
  messages: Notice[];
  notices: Notice[];
  missed: number;
  unread: number;
  emergency: boolean;
  email: string;
  emailOpen: boolean;
  call: "none" | "ringing" | "active" | "ended";
  callStarted: number;
  permissions: Record<string, boolean>;
  loan: string;
  draft: string;
  typing: "none" | "write" | "delete";
  clock: string;
  lastTrigger: string;
  revision: number;
  effect?: Action;
  bpoTyping: boolean;
};
export function initialState(clock = "3:47 AM"): DeviceState {
  return {
    screen: "lock",
    messages: [],
    notices: [],
    missed: 0,
    unread: 0,
    emergency: false,
    email: "scholarship",
    emailOpen: false,
    call: "none",
    callStarted: 0,
    permissions: { CONTACTS: true, PHOTOS: true, LOCATION: true },
    loan: "welcome",
    draft: "",
    typing: "none",
    clock,
    lastTrigger: "Ready for first cue",
    revision: 0,
    bpoTyping: false,
  };
}
export function reduceDevice(
  s: DeviceState,
  a: Action,
  now = Date.now(),
): DeviceState {
  let n: DeviceState = { ...s, revision: s.revision + 1, effect: a };
  switch (a.type) {
    case "reset":
      return {
        ...initialState(a.value || "3:47 AM"),
        revision: n.revision,
        effect: a,
      };
    case "screen":
      if (screens.includes(a.value as Screen)) n.screen = a.value as Screen;
      n.call = "none";
      break;
    case "message": {
      const notice: Notice = {
        id: `${now}-${n.revision}`,
        sender: a.sender || "UNKNOWN NUMBER",
        text: a.value || "",
        kind: "message",
        calm: a.sender === "MAMA",
      };
      n.messages = [...s.messages, notice].slice(-200);
      n.notices = [notice, ...s.notices].slice(0, 8);
      n.unread = Math.min(9999, n.unread + 1);
      break;
    }
    case "email":
      n.email = a.value || "scholarship";
      n.emailOpen = false;
      n.notices = [
        {
          id: `${now}`,
          sender: a.sender || "Mail",
          text:
            a.value === "scholarship"
              ? "SCHOLARSHIP REVOCATION NOTICE"
              : "PAYMENT REMINDER",
          kind: "email" as const,
          ref: n.email,
        },
        ...s.notices,
      ].slice(0, 8);
      break;
    case "call":
      n.call = "ringing";
      break;
    case "acceptCall":
      n.call = "active";
      n.callStarted = now;
      break;
    case "endCall":
      n.call = "ended";
      break;
    case "missed":
      n.missed = a.count || 0;
      n.notices = [
        {
          id: `${now}`,
          sender: "Phone",
          text: `${n.missed} MISSED CALLS`,
          kind: "call" as const,
        },
        ...s.notices,
      ].slice(0, 8);
      break;
    case "unread":
      n.unread = a.count || 0;
      break;
    case "finalCounters":
      n.missed = 142;
      n.unread = 89;
      n.emergency = true;
      n.screen = "lock";
      break;
    case "permission":
      if (a.value && a.value in s.permissions)
        n.permissions = { ...s.permissions, [a.value]: a.count === 1 };
      break;
    case "loan":
      n.screen = "loan";
      n.loan = a.value || "welcome";
      break;
    case "draft":
      n.screen = "messages";
      n.draft =
        a.value === "full"
          ? "Ma, dili na nako kaya…"
          : a.value === "delete"
            ? ""
            : s.draft;
      n.typing =
        a.value === "type" ? "write" : a.value === "erase" ? "delete" : "none";
      break;
    case "clock":
      n.clock = a.value || s.clock;
      break;
    case "typing":
      n.screen = "bpo";
      n.bpoTyping = true;
      break;
    case "stop":
      n.call = s.call === "ringing" ? "none" : s.call;
      n.typing = "none";
      n.bpoTyping = false;
      break;
  }
  return n;
}
export const deviceStateSchema = z.object({
  screen: z.enum(screens),
  messages: z
    .array(
      z.object({
        id: z.string(),
        sender: z.string(),
        text: z.string(),
        kind: z.enum(["message", "email", "call"]),
        ref: z.string().optional(),
        calm: z.boolean().optional(),
      }),
    )
    .max(200),
  notices: z
    .array(
      z.object({
        id: z.string(),
        sender: z.string(),
        text: z.string(),
        kind: z.enum(["message", "email", "call"]),
        ref: z.string().optional(),
        calm: z.boolean().optional(),
      }),
    )
    .max(8),
  missed: z.number().min(0).max(9999),
  unread: z.number().min(0).max(9999),
  emergency: z.boolean(),
  email: z.string(),
  emailOpen: z.boolean(),
  call: z.enum(["none", "ringing", "active", "ended"]),
  callStarted: z.number(),
  permissions: z.object({
    CONTACTS: z.boolean(),
    PHOTOS: z.boolean(),
    LOCATION: z.boolean(),
  }),
  loan: z.string(),
  draft: z.string().max(2000),
  typing: z.enum(["none", "write", "delete"]),
  clock: z.string(),
  lastTrigger: z.string(),
  revision: z.number(),
  effect: actionSchema.optional(),
  bpoTyping: z.boolean(),
});
export type Device = {
  id: string;
  role: string;
  preset: "phone" | "laptop";
  connected: boolean;
  state: DeviceState;
};
export type SessionView = {
  code: string;
  devices: Device[];
  config: Config;
  take: string;
};
