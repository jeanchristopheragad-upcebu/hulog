import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BatteryFull,
  Wifi,
  Signal,
  ChevronLeft,
  Phone,
  PhoneOff,
  Mail,
  MessageCircle,
  Camera,
  Settings,
  LockKeyhole,
  Search,
  MoreHorizontal,
  Home,
  Heart,
  Globe,
  ShieldCheck,
  Check,
  Monitor,
  Volume2,
  MicOff,
  Grid2X2,
  User,
  FileText,
} from "lucide-react";
import type {
  Action,
  Config,
  DeviceState,
  Notice,
  Screen,
} from "../shared/model";
import { Document } from "./Document";
import { audio } from "../services/audio";
type Props = {
  state: DeviceState;
  config: Config;
  preset?: "phone" | "laptop";
  preview?: boolean;
  act: (a: Action) => void;
  interact: (data: Record<string, unknown>) => void;
};
export function Display({
  state: s,
  config: c,
  preset = "phone",
  preview = false,
  act,
  interact,
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.3);
  useEffect(() => {
    if (!preview || preset !== "laptop" || !surfaceRef.current?.parentElement)
      return;
    const parent = surfaceRef.current.parentElement;
    const resize = () => {
      const scale = parent.clientWidth / 1100;
      setPreviewScale(scale);
      parent.style.height = `${760 * scale + 10}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [preview, preset]);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [emailOpen, setEmailOpen] = useState(s.emailOpen);
  const [conversation, setConversation] = useState("");
  const [draft, setDraft] = useState(s.draft);
  const [permission, setPermission] = useState("");
  const [cameraMode, setCameraMode] = useState("PHOTO");
  const [shot, setShot] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  useEffect(() => setEmailOpen(s.emailOpen), [s.emailOpen, s.email]);
  useEffect(() => setDraft(s.draft), [s.draft, s.typing]);
  useEffect(() => {
    if (!s.typing || s.typing === "none") return;
    const full = "Ma, dili na nako kaya…";
    let text = s.typing === "delete" ? s.draft || full : "";
    setConversation("MAMA");
    const t = setInterval(() => {
      text =
        s.typing === "write"
          ? full.slice(0, text.length + 1)
          : text.slice(0, -1);
      setDraft(text);
      if (
        (text === full && s.typing === "write") ||
        (text === "" && s.typing === "delete")
      )
        clearInterval(t);
    }, 100 / c.settings.speed);
    return () => clearInterval(t);
  }, [s.typing, s.revision, c.settings.speed]);
  useEffect(() => {
    if (!s.bpoTyping) return;
    const full =
      "Customer reports a billing concern. Reviewing account history and available resolution.";
    let i = 0;
    const t = setInterval(() => {
      setNotes(full.slice(0, ++i));
      if (i >= full.length) clearInterval(t);
    }, 65 / c.settings.speed);
    return () => clearInterval(t);
  }, [s.bpoTyping, c.settings.speed]);
  useEffect(() => {
    if (s.call !== "active") return;
    const tick = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - s.callStarted) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [s.call, s.callStarted]);
  const prevScreen = useRef(s.screen);
  useEffect(() => {
    if (prevScreen.current !== s.screen) {
      setPermission("");
      if (s.screen === "messages" && s.messages.at(-1)?.sender === "MAMA")
        setConversation("MAMA");
      prevScreen.current = s.screen;
    }
  }, [s.screen, s.messages]);
  const open = (screen: Screen) => act({ type: "screen", value: screen });
  const openNotice = (n: Notice) => {
    if (s.screen === "black") return;
    if (n.kind === "email") {
      open("email");
      setEmailOpen(true);
      interact({ emailOpen: true, dismiss: true });
    } else if (n.kind === "message") {
      setConversation(n.sender);
      open("messages");
      interact({ dismiss: true });
    } else {
      act({ type: "call" });
      interact({ dismiss: true });
    }
  };
  const email = c.emails.find((e) => e.id === s.email) || c.emails[0];
  const emptyBlack = ["black", "title", "epilogue"].includes(s.screen);
  return (
    <div
      className={`device-surface ${preset} ${c.settings.theme} ${c.settings.appearance} ${c.settings.distortion ? "distortion" : ""}`}
      ref={surfaceRef}
      style={{
        fontSize: c.settings.fontSize,
        ...(preview && preset === "laptop"
          ? {
              width: 1100,
              height: 760,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
            }
          : {}),
      }}
      data-testid="actor-surface"
    >
      <AnimatePresence>
        {emptyBlack && (
          <motion.div
            className="black-screen"
            key={s.screen}
            initial={{ opacity: s.effect?.animation === "fade" ? 0 : 1 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: c.settings.reducedMotion ? 0 : c.settings.fade,
            }}
          >
            {s.screen === "title" ? (
              <h1>HULOG</h1>
            ) : s.screen === "epilogue" ? (
              <p>
                Walay nagtan-aw. Apan nganong dili na siya mobati nga luwas?
              </p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
      {!emptyBlack && (
        <>
          <div className="status-bar">
            <b>{s.clock}</b>
            {preset === "laptop" ? (
              <span>File &nbsp; Edit &nbsp; View</span>
            ) : null}
            <span>
              <Signal size={15} />
              <Wifi size={15} />
              <BatteryFull size={22} />
            </span>
          </div>
          {preset === "laptop" && s.screen !== "lock" && (
            <div className="browser-chrome">
              <div className="window-dots">
                <i />
                <i />
                <i />
              </div>
              <span>
                {s.screen === "bpo"
                  ? "Northline · Agent workspace"
                  : s.screen === "email"
                    ? "Mail · Inbox"
                    : c.settings.university}
              </span>
              <div className="address">
                <LockKeyhole size={12} />{" "}
                {s.screen === "loan"
                  ? "apply.quickpeso.example"
                  : s.screen === "bpo"
                    ? "agent.northline.example"
                    : s.screen === "email"
                      ? "mail.campus.example"
                      : "portal.sanisidro.example"}
              </div>
            </div>
          )}
          <div className="app-content">
            {s.screen === "lock" && (
              <div className="lock-screen">
                <LockKeyhole size={22} />
                <p>Friday, November 27</p>
                <h1>{s.clock.replace(/ AM| PM/, "")}</h1>
                <div className="lock-counters">
                  {s.missed > 0 && (
                    <motion.div
                      key={s.missed}
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                    >
                      <Phone size={20} />
                      <b>{s.missed} MISSED CALLS</b>
                    </motion.div>
                  )}
                  {s.unread > 0 && (
                    <div>
                      <MessageCircle size={20} />
                      <b>{s.unread} UNREAD MESSAGES</b>
                    </div>
                  )}
                  {s.emergency && <div>EMERGENCY CONTACT ALERT SENT.</div>}
                </div>
                <div className="lock-bottom">
                  <button
                    aria-label="Open camera"
                    onClick={() => open("camera")}
                  >
                    <Camera />
                  </button>
                  <span>Swipe up to open</span>
                  <button
                    aria-label="Open messages"
                    onClick={() => open("messages")}
                  >
                    <MessageCircle />
                  </button>
                </div>
                <button
                  className="home-indicator"
                  aria-label="Unlock phone"
                  onClick={() => open("social")}
                />
              </div>
            )}
            {s.screen === "messages" && (
              <div className="messages-app">
                <header>
                  <button
                    aria-label="Conversation list"
                    onClick={() => setConversation("")}
                  >
                    <ChevronLeft />
                  </button>
                  <div className="contact-avatar">
                    <User size={25} />
                  </div>
                  <b>
                    {conversation || s.messages.at(-1)?.sender || "Messages"}
                  </b>
                  <Phone size={20} />
                </header>
                {conversation ? (
                  <div className="message-thread">
                    <small>Today · {s.clock}</small>
                    {s.messages
                      .filter((m) => m.sender === conversation)
                      .map((m) => (
                        <div className="message-bubble" key={m.id}>
                          {m.text}
                        </div>
                      ))}
                    {conversation === "MAMA" && (
                      <small className="draft-note">Text Message</small>
                    )}
                  </div>
                ) : (
                  <div className="conversation-list">
                    <h1>Messages</h1>
                    {[
                      ...new Set([...s.messages.map((m) => m.sender), "MAMA"]),
                    ].map((sender) => (
                      <button
                        key={sender}
                        onClick={() => setConversation(sender)}
                      >
                        <span className="avatar">
                          {sender === "MAMA" ? "M" : "#"}
                        </span>
                        <div>
                          <b>{sender}</b>
                          <p>
                            {s.messages
                              .filter((m) => m.sender === sender)
                              .at(-1)?.text || "No messages"}
                          </p>
                        </div>
                        <ChevronLeft className="reverse" size={16} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="compose">
                  <span>＋</span>
                  <textarea
                    aria-label="Unsent message"
                    placeholder="Text Message"
                    value={draft}
                    onFocus={() => setConversation("MAMA")}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      interact({ draft: e.target.value });
                    }}
                  />
                  <span className="unsent-dot">•••</span>
                </div>
              </div>
            )}
            {s.screen === "email" && (
              <div className="email-app">
                <aside>
                  <h2>
                    <Mail /> Mail
                  </h2>
                  <b>
                    Inbox <span>2</span>
                  </b>
                  <p>Starred</p>
                  <p>Sent</p>
                  <p>Drafts</p>
                </aside>
                <main>
                  {!emailOpen ? (
                    <>
                      <h1>Inbox</h1>
                      <div className="search-prop">
                        <Search size={16} /> Search mail
                      </div>
                      {c.emails.map((e) => (
                        <button
                          className="email-row"
                          key={e.id}
                          onClick={() => {
                            act({ type: "email", value: e.id });
                            setEmailOpen(true);
                            interact({ emailOpen: true, dismiss: true });
                          }}
                        >
                          <span className="mail-avatar">{e.sender[0]}</span>
                          <div>
                            <b>{e.sender}</b>
                            <strong>{e.subject}</strong>
                            <p>{e.body.slice(0, 75)}…</p>
                          </div>
                          <small>{s.clock}</small>
                        </button>
                      ))}
                    </>
                  ) : (
                    <motion.article
                      className="email-body"
                      initial={{
                        opacity: 0,
                        y: c.settings.reducedMotion ? 0 : 15,
                      }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <button
                        className="text-button"
                        onClick={() => {
                          setEmailOpen(false);
                          interact({ emailOpen: false });
                        }}
                      >
                        <ChevronLeft size={18} /> Inbox
                      </button>
                      <h1>{email.subject}</h1>
                      <div className="email-from">
                        <span className="mail-avatar">{email.sender[0]}</span>
                        <div>
                          <b>{email.sender}</b>
                          <small>to Tala · {s.clock}</small>
                        </div>
                      </div>
                      <p>{email.body}</p>
                    </motion.article>
                  )}
                </main>
              </div>
            )}
            {s.screen === "portal" && (
              <div className="portal-app">
                <header>
                  <span className="university-mark">SI</span>
                  <div>
                    <b>{c.settings.university}</b>
                    <small>STUDENT INFORMATION SYSTEM</small>
                  </div>
                </header>
                <nav>Dashboard &nbsp; / &nbsp; Enrollment</nav>
                <h1>Good morning, Tala.</h1>
                <p>Your enrollment overview for the current semester.</p>
                <section>
                  <small>ENROLLMENT STATUS</small>
                  <h2 className="on-hold">ON HOLD</h2>
                  <p>
                    Please settle your outstanding balance to proceed with
                    enrollment.
                  </p>
                </section>
                <section>
                  <small>Outstanding Tuition Balance</small>
                  <h1>
                    {
                      c.documents.find((d) => d.id === "tuition")?.lines[0]
                        .value
                    }
                  </h1>
                  <span className="unpaid">Payment Status: UNPAID</span>
                </section>
                <footer>Office of the University Registrar</footer>
              </div>
            )}
            {s.screen === "social" && (
              <div className="social-app">
                <header>
                  <b>circle</b>
                  <Search />
                  <MessageCircle />
                </header>
                <nav>
                  <Home />
                  <User />
                  <Heart />
                  <Globe />
                </nav>
                <article>
                  <div className="post-person">
                    <span className="avatar">A</span>
                    <b>
                      Ana Reyes<small>2 hours ago</small>
                    </b>
                    <MoreHorizontal />
                  </div>
                  <p>A little quiet before the day begins. ☀</p>
                  <div className="landscape-art" />
                  <p className="social-meta">
                    ♡ 24 &nbsp; Comment &nbsp; Share
                  </p>
                </article>
                <article>
                  <div className="post-person">
                    <span className="qp-icon">Q</span>
                    <b>
                      QuickPeso<small>Sponsored · 🌐</small>
                    </b>
                    <MoreHorizontal />
                  </div>
                  <div className="loan-ad">
                    <small>QUICKPESO</small>
                    <h2>NEED INSTANT CASH?</h2>
                    <p>BORROW UP TO</p>
                    <strong>₱30,000!</strong>
                    <b>
                      FAST APPROVAL.
                      <br />
                      NO COLLATERAL REQUIRED.
                    </b>
                    <button onClick={() => open("loan")}>APPLY NOW!</button>
                  </div>
                </article>
                <article>
                  <b>Campus community</b>
                  <p>See you at the library tomorrow. Bring your notes!</p>
                  <div className="landscape-art second" />
                </article>
              </div>
            )}
            {s.screen === "loan" && (
              <div className="loan-app">
                <div className="qp-brand">
                  <span className="qp-icon">Q</span>QuickPeso
                </div>
                {s.loan === "welcome" ? (
                  <>
                    <div className="loan-hero">₱</div>
                    <h1>
                      A little help.
                      <br />A fresh start.
                    </h1>
                    <p>Your next step starts here.</p>
                    <button
                      className="loan-primary"
                      onClick={() => act({ type: "loan", value: "apply" })}
                    >
                      Apply for a loan
                    </button>
                  </>
                ) : s.loan === "apply" ? (
                  <>
                    <h1>Your loan application</h1>
                    <label>
                      Loan amount
                      <input value={c.settings.loanAmount} readOnly />
                    </label>
                    <p>Applicant: Tala</p>
                    <p>Repayment due: {c.settings.dueDate}</p>
                    <button
                      className="loan-primary"
                      onClick={() =>
                        act({ type: "loan", value: "permissions" })
                      }
                    >
                      Submit application
                    </button>
                  </>
                ) : s.loan === "permissions" ? (
                  <>
                    <ShieldCheck size={55} />
                    <h1>ALLOW ACCESS TO:</h1>
                    {["CONTACTS", "PHOTOS", "LOCATION"].map((p) => (
                      <div className="permission-row" key={p}>
                        {p}
                        <Check size={19} />
                      </div>
                    ))}
                    <button
                      className="loan-primary"
                      onClick={() => {
                        act({ type: "loan", value: "loading" });
                      }}
                    >
                      ALLOW ALL
                    </button>
                    <button
                      className="loan-secondary"
                      onClick={() => act({ type: "loan", value: "denied" })}
                    >
                      DENY
                    </button>
                  </>
                ) : s.loan === "loading" ? (
                  <LoanLoading
                    approve={() => act({ type: "loan", value: "approved" })}
                  />
                ) : s.loan === "denied" ? (
                  <>
                    <h1>Permissions declined</h1>
                    <button
                      className="loan-primary"
                      onClick={() =>
                        act({ type: "loan", value: "permissions" })
                      }
                    >
                      Review permissions
                    </button>
                  </>
                ) : (
                  <>
                    <div className="approved-icon">
                      <Check size={48} />
                    </div>
                    <h1>LOAN APPROVED.</h1>
                    <strong className="loan-amount">
                      {c.settings.loanAmount}
                    </strong>
                    <p>REPAYMENT DUE IN 7 DAYS.</p>
                    <p>{c.settings.dueDate}</p>
                  </>
                )}
              </div>
            )}
            {s.screen === "settings" && (
              <div className="settings-app">
                <header>
                  <button
                    onClick={() =>
                      permission ? setPermission("") : open("social")
                    }
                  >
                    <ChevronLeft /> Settings
                  </button>
                </header>
                <h1>{permission || "QuickPeso"}</h1>
                {permission ? (
                  <>
                    <p>Allow QuickPeso to access {permission.toLowerCase()}?</p>
                    {[true, false].map((allow) => (
                      <button
                        className="settings-row"
                        key={String(allow)}
                        onClick={() => {
                          act({
                            type: "permission",
                            value: permission,
                            count: allow ? 1 : 0,
                          });
                          setPermission("");
                        }}
                      >
                        {allow ? "ALLOW" : "DENY"}
                        {s.permissions[permission] === allow && <Check />}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <p>APP PERMISSIONS</p>
                    {Object.entries(s.permissions).map(([p, allowed]) => (
                      <button
                        className="settings-row"
                        key={p}
                        onClick={() => setPermission(p)}
                      >
                        <span>{p}</span>
                        <span>
                          {allowed ? "ALLOWED" : "DENIED"}{" "}
                          <ChevronLeft className="reverse" size={15} />
                        </span>
                      </button>
                    ))}
                    <small>
                      You control the information this app can access.
                    </small>
                  </>
                )}
              </div>
            )}
            {s.screen === "camera" && (
              <div className="camera-app">
                <header>
                  <button onClick={() => open("social")}>
                    <ChevronLeft color="white" />
                  </button>
                  <span>ϟ &nbsp; HDR</span>
                </header>
                <div className={`camera-preview ${shot ? "shot" : ""}`}>
                  <div className="focus-box" />
                  <div className="camera-grid" />
                </div>
                <div className="camera-modes">
                  {["VIDEO", "PHOTO", "PORTRAIT"].map((m) => (
                    <button
                      className={m === cameraMode ? "selected" : ""}
                      key={m}
                      onClick={() => setCameraMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  aria-label="Simulated shutter"
                  className="shutter"
                  onClick={() => {
                    audio.play("shutter", c);
                    setShot(true);
                    setTimeout(() => setShot(false), 250);
                  }}
                />
                <p className="camera-hint">1×</p>
              </div>
            )}
            {s.screen === "bpo" && (
              <div className="bpo-app">
                <aside>
                  <div className="northline">
                    N<span>northline</span>
                  </div>
                  <b>
                    <Monitor size={18} /> Workspace
                  </b>
                  <p>
                    <Phone size={18} /> Calls
                  </p>
                  <p>
                    <User size={18} /> Customers
                  </p>
                  <p>
                    <FileText size={18} /> Knowledge base
                  </p>
                </aside>
                <main>
                  <header>
                    <h2>Customer Support Dashboard</h2>
                    <span className="agent">
                      Tala <span className="agent-dot" />
                    </span>
                  </header>
                  <div className="active-call">
                    <span>
                      <i /> ACTIVE CALL
                    </span>
                    <b>00:04:27</b>
                    <small>Voice support · Inbound</small>
                  </div>
                  <div className="bpo-columns">
                    <section>
                      <h3>Customer information</h3>
                      <small>CUSTOMER</small>
                      <h2>Alex Mendoza</h2>
                      <p>Account: DEMO-1047</p>
                      <hr />
                      <p>
                        Issue category
                        <br />
                        <b>Billing inquiry</b>
                      </p>
                      <p>
                        Customer since
                        <br />
                        <b>February 2024</b>
                      </p>
                    </section>
                    <section>
                      <h3>Call notes</h3>
                      <textarea
                        aria-label="Agent notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes for this interaction…"
                      />
                      <span>Changes saved locally</span>
                    </section>
                  </div>
                  <div className="call-tools">
                    <MicOff />
                    <Grid2X2 />
                    <Volume2 />
                    <span>Agent Name: Tala</span>
                  </div>
                </main>
              </div>
            )}
            {s.screen === "documents" && (
              <div className="document-display">
                <select
                  aria-label="Select document"
                  value={documentIndex}
                  onChange={(e) => setDocumentIndex(+e.target.value)}
                >
                  {c.documents.map((d, i) => (
                    <option key={d.id} value={i}>
                      {d.title}
                    </option>
                  ))}
                </select>
                <Document doc={c.documents[documentIndex]} />
              </div>
            )}
          </div>
          {s.screen !== "lock" && preset === "phone" && (
            <button
              className="home-indicator"
              aria-label="Home screen"
              onClick={() => open("social")}
            />
          )}
          <AnimatePresence>
            {s.call !== "none" && (
              <motion.div
                className={`call-screen ${s.call}`}
                initial={{ opacity: 0, y: c.settings.reducedMotion ? 0 : 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="caller-icon">
                  <User size={55} />
                </div>
                <h1>UNKNOWN NUMBER</h1>
                <p>{c.settings.phone}</p>
                <span>
                  {s.call === "ringing"
                    ? "INCOMING CALL"
                    : s.call === "active"
                      ? `${Math.floor(seconds / 60)
                          .toString()
                          .padStart(
                            2,
                            "0",
                          )}:${(seconds % 60).toString().padStart(2, "0")}`
                      : "CALL ENDED"}
                </span>
                {s.call === "active" && (
                  <div className="call-options">
                    <MicOff />
                    <Grid2X2 />
                    <Volume2 />
                  </div>
                )}
                <div className="call-actions">
                  {s.call === "ringing" ? (
                    <>
                      <button
                        onClick={() => act({ type: "endCall", sound: "ended" })}
                      >
                        <span className="decline">
                          <PhoneOff />
                        </span>
                        DECLINE
                      </button>
                      <button onClick={() => act({ type: "acceptCall" })}>
                        <span className="accept">
                          <Phone />
                        </span>
                        ACCEPT
                      </button>
                    </>
                  ) : s.call === "active" ? (
                    <button
                      onClick={() => act({ type: "endCall", sound: "ended" })}
                    >
                      <span className="decline">
                        <PhoneOff />
                      </span>
                      END CALL
                    </button>
                  ) : (
                    <button onClick={() => open("lock")}>Done</button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {!c.settings.reducedMotion &&
            c.settings.flash > 0 &&
            s.effect?.type === "message" && (
              <motion.div
                key={"flash-" + s.revision}
                className="screen-glow"
                initial={{ opacity: c.settings.flash }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1 }}
              />
            )}
          <div
            className={`notification-stack ${s.screen === "lock" ? "on-lock" : ""}`}
          >
            <AnimatePresence initial={false}>
              {s.notices.slice(0, s.screen === "lock" ? 5 : 3).map((n) => (
                <motion.button
                  layout={!c.settings.reducedMotion}
                  className={`notification ${n.calm ? "calm" : ""}`}
                  key={n.id}
                  initial={{
                    opacity: 0,
                    y:
                      c.settings.reducedMotion ||
                      s.effect?.animation === "none" ||
                      s.effect?.animation === "fade"
                        ? 0
                        : -80,
                  }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration:
                      c.settings.reducedMotion || s.effect?.animation === "none"
                        ? 0
                        : 0.3 / c.settings.speed,
                  }}
                  onClick={() => openNotice(n)}
                >
                  <span className={`notice-icon ${n.kind}`}>
                    {n.kind === "email" ? (
                      <Mail size={18} />
                    ) : n.kind === "call" ? (
                      <Phone size={18} />
                    ) : (
                      <MessageCircle size={18} />
                    )}
                  </span>
                  <div>
                    <div className="notice-heading">
                      <b>{n.sender}</b>
                      <small>{c.settings.notificationTime}</small>
                    </div>
                    <p>{n.text}</p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
function LoanLoading({ approve }: { approve: () => void }) {
  const saved = useRef(approve);
  saved.current = approve;
  useEffect(() => {
    const t = setTimeout(() => saved.current(), 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <div className="spinner" />
      <h2>Reviewing your application…</h2>
      <p>Please wait a moment.</p>
    </>
  );
}
