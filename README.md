# HULOG | Film Screen Simulator

A browser-based production tool for the six-minute psychological thriller **HULOG**. React + TypeScript + Vite, Tailwind CSS, Motion, Lucide, Node.js and Socket.IO. All six scenes, screenplay messages, emails, financial statements and cue lists are preloaded. No accounts, paid services, real messaging or financial integrations are required.

## Quick start

Use Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

Open **http://localhost:5173/director**. The development command starts both Vite on port 5173 and the Socket.IO server on port 3001. Vite proxies socket connections, so phones only need to reach port 5173.

For the production build, including offline support:

```sh
npm run build
npm start
```

Open **http://localhost:3001/director**. `PORT` changes the production server port. Keep the server process running throughout the shoot. Development mode does not register the service worker.

## Connect filming devices

1. Connect the control laptop and actor devices to the same Wi-Fi network. A router with no internet connection is sufficient.
2. Find the laptop's LAN address in its network settings (for example, `192.168.1.20`).
3. Open `http://192.168.1.20:5173/director` on the laptop for development, or port `3001` for the production build.
4. Click **Create production session**. Share the displayed session code or copy the actor link. Create the session using the LAN URL if you want the copied link to work on phones; `localhost` always means the device opening the link.
5. On the phone, open `http://192.168.1.20:5173/display` (or port 3001), enter the code and a unique role, then connect. Choose **Laptop** for computer interfaces.
6. Tap **Enable Audio**, then **Enter filming mode**. This user gesture unlocks mobile audio. Triple-tap the upper-right 48-pixel corner within one second to leave filming mode.
7. On the director panel, select a device or **All devices · Broadcast**. Select and fire a cue.

Example roles: `Tala’s Smartphone`, `Tala’s Laptop`, `University Student’s Smartphone`, `Street Pedestrian’s Smartphone`. Roles must be unique within a session. Reopening the same browser reconnects using its saved device credential. Use separate browser profiles/contexts for multiple simulated devices on the same computer because credentials are stored per origin.

Allow Node through the laptop firewall on your private network. Disable Wi-Fi client isolation if devices cannot reach each other. Do not use a VPN that blocks local connections.

## Director operation

- **End session** asks for confirmation, stops all effects and queued cues, and invalidates the session code for everyone. Connected actor displays leave filming mode and return to setup with their last screen retained. Save production first if you need a backup. Other sessions remain active; ending a session does not shut down the hosting service. Devices offline at the time cannot rejoin the ended code and must join a new session.

- Select any of the six scenes in the sidebar. Click a cue to select it; click **FIRE CUE** or press **Space** to execute it. Left/right arrows select the previous/next cue. Double-click a cue to fire immediately.
- **Play scene** schedules the full scene using each cue's delay and duration. A single fired cue marked automatic-next continues through subsequent automatic cues until a manual cue is reached.
- **STOP ALL EFFECTS** / **Escape** cancels server and local scheduled cues, notification overload, ringing and sounds. It preserves the displayed messages and counters. It does not erase the take.
- **Reset scene / cue** stops scheduled work and resets the selected device(s) to the initial lock screen, zero counters, unread email, allowed fictional permissions and configured clock. It selects the first cue. Fire the scene's opening cues to establish its screen.
- Quick actions support incoming/end call, black/lock screen, any prop screen, preset/custom missed-call counts and unread-message counts.
- Overload intensity controls the interval, with a minimum of 500 ms. The editor also controls event count, volume, vibration duration, animation speed and optional screen illumination. Random screenplay threat chooses only from the supplied collection messages.
- Device previews use the same state and components as the actual display. Clicking another connected-device card selects its preview and command target. Disconnected devices retain their last state. New cues sent while a device is disconnected are available after it reconnects.
- Save continuity before a take; restore it to reproduce counters, messages, permissions and screens. Continuity is matched by role. Save production downloads the configuration, current devices and take label as JSON. Load production restores that configuration and matches saved device states by role; if devices have not joined yet, restore the saved continuity preset after they connect.
- Rehearsal/live-take labels do not modify the master configuration. Cue execution changes runtime state only. Favorite stars and continuity snapshots persist in the control browser.
- Screenshot export captures only the simulated interface at 2× scale. PNG export does not include director controls or the phone frame.

## Actor interfaces

`/display` presents connection and audio controls until filming mode is activated. Filming mode hides all production UI, attempts fullscreen and wake lock, and offers a hidden triple-tap exit. Native interface buttons remain interactive.

- Tap a message notification to open its conversation; tap an email notification to open the full email. The email scrolls naturally. A fresh email cue resets it to unread.
- Accept/decline/end simulated calls. No telephone call is placed.
- Tap each fictional QuickPeso permission, then **ALLOW** or **DENY**. This never requests operating-system contacts, photos or location access.
- The loan workflow includes welcome, amount, submission, simulated permission request, loading and approval. The editable approved amount defaults to ₱12,000, independently of the ₱30,000 advertisement ceiling.
- The MAMA composer has no send operation. Type manually or fire the typing, full-message and delete cues.
- The camera is a generated visual simulation. Its shutter plays a sound and a brief dim animation but captures no photograph. This version deliberately uses no real camera or microphone API.
- Local fallback controls are available outside filming mode. They use the loaded configuration without a server. Return to filming mode to hide them before rolling.

## Edit props and cues

Open `/editor`. Changes save automatically in localStorage and synchronize to a currently joined production session.

- **Cues:** edit labels, text, senders, action types, target role (or `*`), counts, delay, duration, animation and sound. Reorder cues with Move earlier/later; duplicate a cue with Add cue to create a custom sequence. Preview before filming.
- **Emails:** edit sender, subject and complete body.
- **Settings:** clock, fictional number, university, approved amount, due date, notification timestamp, audio/motion settings, theme, font size and fade duration. Numeric limits are validated; invalid imports do not replace the current configuration.
- **Sounds:** synthesized default cues work without downloading audio. Upload MP3/WAV replacements up to 2 MB each. Custom sounds are embedded in JSON, saved locally and shared with devices. Keep complete configurations below the server's 8 MB message limit and your browser's localStorage quota (usually a few MB); prefer short/compressed audio. Keep a downloaded backup after uploading sounds.
- **JSON:** inspect and edit the full configuration. Import supports a full configuration, production backup configuration, or one exported scene. Export produces a portable JSON backup. `public/sample-production.json` contains the complete sample configuration.

`/documents` provides editable payslip, rent, utility and tuition statements with fictional issuer/reference details. Export PDF, export 2× PNG, or print on A4 with browser headers/footers disabled. The exported PDF is a high-resolution raster document to preserve peso symbols and typography consistently. It is not a fillable PDF. The actor document viewer can switch among all four documents.

## Offline and mobile setup

A **production build** pre-caches the application routes, scripts, styles, icons and sample configuration. Load it once over HTTPS or localhost and allow service-worker installation to finish before going offline. The last actor state is also saved locally. Offline reload and local cue controls work without the server after successful installation.

HTTP on a LAN IP can run the app and synchronize devices but generally cannot install a service worker or request wake lock. For cached offline installation on physical phones, serve the production build through a trusted HTTPS endpoint. Remote commands always require a reachable Socket.IO server; offline caching does not replace the network.

- **iPhone/iPad:** use Safari → Share → Add to Home Screen, then launch from the icon. Enable audio in that instance. Safari may not allow arbitrary page fullscreen. iOS does not support the Vibration API; the audio cue is the fallback.
- **Android:** Chrome → Install app/Add to Home Screen when available. Allow fullscreen from the explicit filming-mode button. Vibration requires browser support and an interaction.
- **Mac/Windows:** use browser fullscreen (macOS Control–Command–F or Windows F11 where applicable) if the in-page fullscreen request is unavailable.
- Disable system notifications/auto-lock manually for the take if needed. Set brightness manually. A website cannot guarantee removal of OS chrome, control device brightness or override all sleep/power policies.
- Keep the browser foregrounded. Operating systems throttle background tabs and suspend network/audio; synchronization is cue-oriented, not frame-accurate timecode. Test on the actual filming hardware before recording.
- Reduced motion respects the configured toggle and the system preference. Illumination is disabled by default and capped at 15% opacity. There is no strobe effect; simulated distortion remains subtle. Use STOP immediately to end all timed effects.

## Deploy online

Use a Node-compatible host that supports long-lived WebSocket connections. Build with `npm ci && npm run build`, run `npm start`, set `PORT` if required, and terminate HTTPS at your host or reverse proxy. The Express server serves `dist` and Socket.IO on the same origin. Forward `/socket.io/` including WebSocket upgrade headers. An Nginx location can use:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

Run a single server instance for this version. Sessions and timers live in memory and survive client reconnects, not process restarts. Use continuity/JSON exports before restarting. Multi-instance hosting would require shared session storage and a Socket.IO adapter. Static-only hosting, including a static Sites upload, cannot run this Node/Socket.IO backend; this project has not been published to a hosted service.

Director control uses a 256-bit random capability token kept in the director browser; it is excluded from actor links, state broadcasts and exports. Device credentials protect role recovery. Session codes grant display participation, so share them only with the crew. For a public deployment, add host-level access restrictions for your production team. There is no external authentication dependency. Sessions expire after 24 hours of inactivity when no displays are connected; server restart removes them.

## Verification

```sh
npm test
npm run test:browser
```

Core tests cover validation, exact dialogue, permissions, calls, unsent drafts, independent device commands, capability enforcement, reconnection and timer cancellation. Browser tests exercise remote SMS, calls, overload/STOP, permissions, MAMA typing/deletion, black/reset screens, scholarship email, laptop display, offline production reload, PDF/PNG downloads and the requested mobile/tablet/desktop widths.

Browser tests default to installed Google Chrome in an isolated test profile. For Playwright's Chromium, install it with `npx playwright install chromium`, then run `PLAYWRIGHT_CHANNEL=chromium npm run test:browser`. The tests start development and production servers on ports 5173 and 4173. Do not use those test sessions for filming.

## Source map

- `src/data/production.ts` — master screenplay, scenes, cues, documents and defaults.
- `src/shared/model.ts` — shared types, Zod validation and pure device reducer.
- `server/sessions.ts` — sessions, role credentials, state and scheduled actions.
- `server/index.ts` — Socket.IO authorization/events and production static hosting.
- `src/App.tsx` — director controls, shared session state and actor filming workflow.
- `src/components/Editor.tsx`, `Documents.tsx`, `ActorJoin.tsx`, `Controls.tsx` — configuration editing, document library, connection form and shared controls.
- `src/components/Display.tsx` — shared phone/laptop interfaces and animations.
- `src/components/Document.tsx` — A4 document renderer.
- `src/services/` — audio synthesis, network client, storage and image/PDF exports.
- `src/styles.css` — production UI, simulated interfaces and responsive/print styles.
- `scripts/build-offline.mjs`, `public/sw.js` — versioned offline asset cache.
- `codex.md` — maintenance guide and implementation notes.

No real SMS, calls, contact harvesting, location tracking, camera capture, microphone recording, transactions or account integrations are implemented.
