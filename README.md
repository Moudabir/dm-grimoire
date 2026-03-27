# DM Grimoire
## Your campaign management spellbook. No more lost notes. No more chaos.

You know that moment three sessions in when a player asks about the tavern keeper's name and you draw a complete blank? Or when you're mid-combat and can't remember if you already gave them that magic sword? Yeah. This is the fix.

**DM Grimoire** is what happens when you get tired of juggling Google Docs, spreadsheets, and browser tabs. Everything your campaign needs lives here—NPCs, encounters, loot, notes, timelines—organized however you want. And because it auto-saves, your brilliant 3 AM inspiration for a plot twist won't vanish the moment your laptop dies.

---

## What You Get

**Track Everything That Matters**  
NPCs with actual personalities, encounters that actually make sense, loot you won't forget, locations your players will return to. One dashboard. No hunting through five different files.

**Auto-Save, So You Don't Have To**  
Seriously. You can stop paranoid-hitting Ctrl+S. Changes save instantly. You're covered.

**Works Everywhere**  
Open it on your laptop during the game, check it on your phone during a break, pull up your notes on a tablet. Firebase keeps everything in sync so you're never out of sync with your world.

**The DM Cockpit**  
Your personal mission control. Built specifically for running sessions, not generic spreadsheet nonsense. Real-time updates while you're actively DMing.

---

## Get Started (It's Easy)

**You need:**
- Node.js 16+
- pnpm (or npm if you're into that)

**Then:**

```bash
git clone https://github.com/Moudabir/dm-grimoire.git
cd dm-grimoire
pnpm install
pnpm dev
```

Open `http://localhost:5173` and you're in. Start building.

---

## Under The Hood

React. TypeScript. Vite. Firebase. The stack is solid because it needs to be. Your campaign is important. We're not messing around with it.

```
dm-grimoire/
├── client/        # The interface you actually use
├── server/        # The brains
├── shared/        # Stuff they both need
├── dataconnect/   # Firebase magic
└── DMCockpit.tsx  # Mission control
```

---

## How This Actually Works In Practice

1. Spin up your campaign. Give it a world.
2. Add the people, places, and dangers that live there.
3. Drop your session notes, plot hooks, random ideas—everything.
4. Load the DM Cockpit when you run a session.
5. Everything auto-saves. You focus on the story. That's it.

---

## Want To Build On This?

This is open source. If you see something that could be better, make it better. Bug fixes, features, design improvements, whatever—PRs welcome.

Interested in contributing?
1. Fork it
2. Make a branch (`git checkout -b feature/your-idea`)
3. Build it
4. Commit it (`git commit -m 'What you did'`)
5. Push it and open a PR

**Areas that could use love right now:**
- Making the UI even smoother
- More powerful encounter tools
- Better organization options
- Anything that makes a DM's life easier

---

## What's Coming

We're thinking about:
- Ready-to-go campaign templates (Forgotten Realms, Greyhawk, homebrew, whatever)
- Actually running campaigns together (co-DM mode)
- A real encounter builder that doesn't suck
- Maps and visual battle tracking
- Making your campaigns portable (PDF exports, printables)
- A mobile app that doesn't feel like an afterthought

---

## Something Break?

Open an [issue](https://github.com/Moudabir/dm-grimoire/issues) and tell us:
- What happened
- How to make it happen again
- What you expected instead
- Screenshot if you've got one

---

## License

MIT. Do what you want with it.

---

## Why This Exists

I made this because I was drowning. Spreadsheets everywhere. Notes in Discord. Quick character sheets in Google Docs. Half-finished encounter calculations in Notes. Every session felt like managing chaos instead of telling a story.

So I built something that just... works. That remembers your world without you having to. That gets out of your way and lets you do what you actually came here to do: tell an amazing story.

If you're a DM who's tired of the friction and just wants a tool that respects your time and your creativity, this is it.

---

**Run your campaign. Tell your story. Let the tools handle the rest.**

Questions? Ideas? Just want to talk about D&D? Hit me up or contribute.

Also i mean none of what's written above, the how to is the most important part, otherwise have fun we can't read anyways.
