import type { Action, Config, Cue } from "../shared/model";
let serial = 0;
const cue = (label: string, action: Action): Cue => ({
  id: `cue-${++serial}`,
  label,
  action,
  target: "*",
  delay: 0,
  duration: 3500,
  auto: false,
});
const screen = (label: string, value: string) =>
  cue(label, { type: "screen", value });
const sms = (text: string, sender = "UNKNOWN NUMBER") =>
  cue(text, { type: "message", value: text, sender, sound: "notification" });
export const threats = [
  "Your payment is now overdue. Please settle your balance immediately.",
  "FINAL WARNING. Pay your outstanding balance TODAY.",
  "Ngano wala pa man ka nibayad?",
  "You agreed to our terms and conditions.",
  "Ayaw mi’g tagoa. Bayad na!",
  "Kung dili ka mubayad karon, tawagan namo imong pamilya!",
  "We have access to your contacts.",
  "Kabalo mi asa ka nagpuyo.",
  "WE KNOW WHERE YOU LIVE.",
  "Dili ka makatago namo, Tala.",
];
export const defaultConfig: Config = {
  version: 1,
  scenes: [
    {
      id: 1,
      name: "THE FALL",
      time: "0:00–0:50",
      cues: [
        screen("BPO customer support dashboard", "bpo"),
        cue("Clock · 3:47 AM", { type: "clock", value: "3:47 AM" }),
        cue("Start agent typing", { type: "typing", sound: "keyboard" }),
        cue("Scholarship revocation email", {
          type: "email",
          value: "scholarship",
          sender: "University Scholarship Office",
          sound: "email",
        }),
        screen("Open university email", "email"),
        screen("Enrollment on hold", "portal"),
        screen("QuickPeso sponsored advertisement", "social"),
        screen("Open QuickPeso", "loan"),
        cue("Loan permissions request", { type: "loan", value: "permissions" }),
        cue("Approve loan", { type: "loan", value: "approved" }),
      ],
    },
    {
      id: 2,
      name: "THE COLLECTION",
      time: "0:50–2:00",
      cues: [
        cue("Payment reminder email", {
          type: "email",
          value: "payment",
          sender: "QuickPeso Collections",
          sound: "email",
        }),
        sms(threats[0], "Unknown Number"),
        ...threats.slice(1, 5).map((t) => sms(t)),
        cue("Incoming call", { type: "call", sound: "ringtone" }),
        cue("End call", { type: "endCall", sound: "ended" }),
        ...[3, 5, 12, 27, 43, 142].map((count) =>
          cue(`${count} MISSED CALLS`, {
            type: "missed",
            count,
            sound: "notification",
          }),
        ),
        ...threats.slice(5).map((t) => sms(t)),
        cue("Start notification overload", { type: "overload" }),
        cue("Stop all effects", { type: "stop" }),
      ],
    },
    {
      id: 3,
      name: "SOMEONE IS WATCHING",
      time: "2:00–2:55",
      cues: [
        sms("We are monitoring your account."),
        sms("YOUR CONTACTS WILL KNOW EVERYTHING."),
        screen("Open camera simulator", "camera"),
        screen("Ordinary social feed", "social"),
        screen("Lock phone", "lock"),
      ],
    },
    {
      id: 4,
      name: "NO PLACE TO HIDE",
      time: "2:55–4:05",
      cues: [
        sms("We know your location."),
        screen("QuickPeso application permissions", "settings"),
        sms("Too late."),
        screen("Black phone screen", "black"),
      ],
    },
    {
      id: 5,
      name: "THERE’S NOTHING HERE",
      time: "4:05–5:10",
      cues: [
        screen("Night lock screen", "lock"),
        cue("Clock · 3:30 AM", { type: "clock", value: "3:30 AM" }),
        ...["fan", "rattle", "bang", "silence", "vibration"].map((value) =>
          cue(
            {
              fan: "Electric fan humming",
              rattle: "Metallic rattling",
              bang: "Door banging",
              silence: "Sudden silence",
              vibration: "Distant phone vibration",
            }[value]!,
            { type: "sound", value, sound: value },
          ),
        ),
      ],
    },
    {
      id: 6,
      name: "HULOG",
      time: "5:10–6:00",
      cues: [
        cue("142 missed calls · 89 unread messages", { type: "finalCounters" }),
        sms("We are watching you."),
        sms("You cannot hide."),
        sms(
          "Nak, nikaon na ka? Kumusta na man ka diha? Amping kanunay ha. Mingaw na mi nimo.",
          "MAMA",
        ),
        screen("Open conversation with MAMA", "messages"),
        cue("Type unsent message", {
          type: "draft",
          value: "type",
          sound: "keyboard",
        }),
        cue("Show full unsent message", { type: "draft", value: "full" }),
        cue("Delete unsent message", { type: "draft", value: "erase" }),
        cue("Fade to black", {
          type: "screen",
          value: "black",
          animation: "fade",
        }),
        screen("Reveal HULOG", "title"),
        screen("Reveal final line", "epilogue"),
      ],
    },
  ],
  emails: [
    {
      id: "scholarship",
      sender: "University Scholarship Office",
      subject: "SCHOLARSHIP REVOCATION NOTICE",
      body: "Dear Tala,\n\nWe regret to inform you that your scholarship has been revoked due to failure to meet the required academic standards.\n\nAs a result, your scholarship benefits will be discontinued effective immediately.\n\nPlease coordinate with the Scholarship Office regarding your enrollment and outstanding financial obligations.\n\nSincerely,\n\nUniversity Scholarship Office",
    },
    {
      id: "payment",
      sender: "QuickPeso Collections",
      subject: "PAYMENT REMINDER",
      body: "Dear Borrower,\n\nYour loan repayment is due today.\n\nKindly settle your outstanding balance to avoid additional charges.\n\nThank you.\n\nQuickPeso Collections Department",
    },
  ],
  documents: [
    {
      id: "payslip",
      title: "PAYSLIP",
      issuer: "Northline Customer Services",
      name: "Tala",
      reference: "PROP-PAY-0047",
      lines: [
        { label: "Position", value: "Customer Service Representative" },
        { label: "Basic Pay", value: "₱12,000" },
        { label: "Total Deductions", value: "₱2,400" },
        { label: "NET PAY", value: "₱9,600" },
      ],
    },
    {
      id: "rent",
      title: "RENT STATEMENT",
      issuer: "Mabini Residences",
      name: "Tala",
      reference: "PROP-RENT-0021",
      lines: [
        { label: "Monthly Rent", value: "₱5,000" },
        { label: "TOTAL DUE", value: "₱5,000" },
      ],
    },
    {
      id: "utilities",
      title: "UTILITIES STATEMENT",
      issuer: "Mabini Property Services",
      name: "Tala",
      reference: "PROP-UTIL-0021",
      lines: [
        { label: "Electricity and Water", value: "₱900" },
        { label: "Internet", value: "₱600" },
        { label: "TOTAL DUE", value: "₱1,500" },
      ],
    },
    {
      id: "tuition",
      title: "TUITION STATEMENT",
      issuer: "San Isidro University",
      name: "Tala",
      reference: "PROP-STU-0021",
      lines: [
        { label: "Outstanding Balance", value: "₱26,000" },
        { label: "Status", value: "UNPAID" },
        { label: "Enrollment", value: "ON HOLD" },
      ],
    },
  ],
  settings: {
    clock: "3:47 AM",
    phone: "+63 9XX XXX 0047",
    university: "San Isidro University",
    loanAmount: "₱12,000",
    dueDate: "December 04, 2026",
    notificationTime: "now",
    volume: 0.4,
    muted: false,
    speed: 1,
    fontSize: 16,
    reducedMotion: false,
    distortion: false,
    interval: 1500,
    overloadCount: 30,
    flash: 0,
    vibration: 100,
    fade: 2,
    theme: "ios",
    appearance: "light",
  },
  sounds: {},
};
