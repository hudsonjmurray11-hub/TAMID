# Rehearsal checklist

## The night before
- [ ] `npm run play` works on the presenting laptop (Node 20+). The terminal prints a "Phones on same Wi-Fi" address.
- [ ] Open `http://localhost:3000/demo` in Chrome and wait for **Offline ready ✓**.
- [ ] Stop the server (Ctrl+C), reload `/demo`, and confirm it still loads and plays. Restart the server afterwards.
- [ ] Do one full run with at least **two real phones** (one iPhone, one Android if possible): join by QR, retry a wrong answer, use "Need an idea?", refresh mid-round and confirm you're back in your seat.
- [ ] Practise the host script once with a timer (target 4:00–4:30).
- [ ] Each teammate knows their lines and their role (see `docs/host-script.md`).
- [ ] *(Optional)* Deploy to Render and test the public URL from a phone on cellular data.

## 15 minutes before class
- [ ] Laptop is charging; notifications and sleep are off.
- [ ] Connect to the room's Wi-Fi. If phones can't reach the laptop, switch to a hotspot or the Render URL.
- [ ] If using Render's free plan, open the URL now to wake it.
- [ ] `npm run play`, then open `/host` → fullscreen. Check the QR code from a phone.
- [ ] Open `/demo` in a second tab (offline fallback ready).
- [ ] Projector: text is readable from the back row, and the van and skyline are visible.
- [ ] Sound off unless you've tested the room speakers.

## Live
- [ ] Space starts the game once most names are in. New players can't join after the first prompt.
- [ ] Remove any inappropriate nickname with the passengers icon → Remove.
- [ ] Don't restart the server during the game (it ends the room).

## Known limits
- Rooms live in server memory: a restart or redeploy ends them.
- Phones must reach the laptop (same network) unless you use a public URL.
- Offline mode covers Demo and Solo only. Live multiplayer needs the server.
- Not yet verified on physical phones or a live Render deploy. Do both in rehearsal.
