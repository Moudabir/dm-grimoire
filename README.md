<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DM Grimoire</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #0d0a07;
    --parchment: #f5eddc;
    --parchment-dark: #e8d9c0;
    --parchment-deep: #d4c4a5;
    --gold: #b8860b;
    --gold-bright: #d4a017;
    --gold-light: #f0c040;
    --crimson: #8b1a1a;
    --crimson-bright: #c0392b;
    --ember: #cd5c1a;
    --shadow: rgba(13,10,7,0.6);
    --rune: #5a3e2b;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background-color: #1a1208;
    background-image:
      radial-gradient(ellipse at 20% 10%, rgba(139,26,26,0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 90%, rgba(90,62,43,0.2) 0%, transparent 50%),
      repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(184,134,11,0.03) 60px, rgba(184,134,11,0.03) 61px),
      repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(184,134,11,0.03) 60px, rgba(184,134,11,0.03) 61px);
    color: var(--ink);
    font-family: 'Crimson Pro', Georgia, serif;
    min-height: 100vh;
    padding: 3rem 1.5rem;
  }

  /* Floating particles */
  .sparks {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }
  .spark {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: var(--gold-light);
    opacity: 0;
    animation: float-spark linear infinite;
  }
  @keyframes float-spark {
    0% { transform: translateY(100vh) translateX(0) scale(0); opacity: 0; }
    10% { opacity: 0.8; }
    90% { opacity: 0.4; }
    100% { transform: translateY(-10vh) translateX(var(--drift)) scale(1.5); opacity: 0; }
  }

  /* Page */
  .grimoire {
    position: relative;
    z-index: 1;
    max-width: 860px;
    margin: 0 auto;
  }

  /* Book cover effect */
  .cover {
    background: var(--parchment);
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E"),
      linear-gradient(160deg, #f9f2e3 0%, #ecdcc0 40%, #e2cfb0 100%);
    border: 3px solid var(--gold);
    border-radius: 4px 12px 12px 4px;
    box-shadow:
      -6px 0 0 #2a1a08,
      -10px 4px 20px rgba(0,0,0,0.7),
      0 8px 40px rgba(0,0,0,0.5),
      inset 6px 0 20px rgba(0,0,0,0.12),
      inset -2px 0 8px rgba(184,134,11,0.1);
    overflow: hidden;
    position: relative;
  }

  /* Gold corner ornaments */
  .cover::before, .cover::after {
    content: '';
    position: absolute;
    width: 60px;
    height: 60px;
    background-image:
      linear-gradient(45deg, var(--gold) 1px, transparent 1px),
      linear-gradient(-45deg, var(--gold) 1px, transparent 1px);
    background-size: 8px 8px;
    opacity: 0.4;
  }
  .cover::before { top: 0; left: 0; }
  .cover::after { bottom: 0; right: 0; transform: rotate(180deg); }

  /* Spine line */
  .spine-line {
    position: absolute;
    left: 28px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, transparent, var(--gold-bright) 15%, var(--gold-bright) 85%, transparent);
    opacity: 0.5;
  }

  /* Hero */
  .hero {
    padding: 5rem 4rem 4rem;
    text-align: center;
    position: relative;
    border-bottom: 1px solid var(--parchment-deep);
  }

  .hero-ornament {
    font-size: 2.5rem;
    color: var(--gold);
    letter-spacing: 0.5rem;
    margin-bottom: 1rem;
    display: block;
    animation: glow-pulse 3s ease-in-out infinite;
  }

  @keyframes glow-pulse {
    0%, 100% { text-shadow: 0 0 10px rgba(184,134,11,0.3); }
    50% { text-shadow: 0 0 25px rgba(184,134,11,0.6), 0 0 50px rgba(184,134,11,0.2); }
  }

  h1.title {
    font-family: 'Cinzel Decorative', serif;
    font-size: clamp(2.8rem, 7vw, 5rem);
    font-weight: 900;
    color: var(--ink);
    letter-spacing: 0.05em;
    line-height: 1;
    margin-bottom: 0.5rem;
    text-shadow: 2px 2px 0 rgba(139,26,26,0.15);
  }

  .subtitle {
    font-family: 'Cinzel', serif;
    font-size: 0.95rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--rune);
    margin-bottom: 2.5rem;
  }

  .tagline {
    font-size: 1.3rem;
    font-style: italic;
    color: #3a2a1a;
    line-height: 1.6;
    max-width: 540px;
    margin: 0 auto 1.5rem;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--gold);
    font-size: 1.2rem;
    margin: 2rem 0;
  }
  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--gold-bright), transparent);
  }

  /* Sections */
  .section {
    padding: 3rem 4rem;
    border-bottom: 1px solid var(--parchment-deep);
    position: relative;
  }
  .section:last-child { border-bottom: none; }

  .section-label {
    font-family: 'Cinzel', serif;
    font-size: 0.7rem;
    letter-spacing: 0.4em;
    text-transform: uppercase;
    color: var(--gold);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, var(--gold), transparent);
  }

  h2 {
    font-family: 'Cinzel', serif;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--crimson);
    margin-bottom: 1.25rem;
  }

  h3 {
    font-family: 'Cinzel', serif;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  h3::before {
    content: '◆';
    color: var(--gold);
    font-size: 0.6rem;
    flex-shrink: 0;
  }

  p {
    font-size: 1.15rem;
    line-height: 1.75;
    color: #2a1e12;
    margin-bottom: 1rem;
  }

  strong { color: var(--crimson); font-weight: 600; }

  /* Feature grid */
  .features {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  @media (max-width: 600px) { .features { grid-template-columns: 1fr; } }

  .feature-card {
    background: linear-gradient(135deg, rgba(184,134,11,0.06), rgba(139,26,26,0.04));
    border: 1px solid rgba(184,134,11,0.25);
    border-radius: 3px;
    padding: 1.5rem;
    position: relative;
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .feature-card:hover {
    border-color: rgba(184,134,11,0.5);
    box-shadow: 0 4px 20px rgba(184,134,11,0.1);
  }
  .feature-icon {
    font-size: 1.6rem;
    margin-bottom: 0.6rem;
    display: block;
  }
  .feature-card p { font-size: 1rem; margin: 0; }

  /* Code blocks */
  .code-wrap {
    background: #0d0a07;
    border: 1px solid rgba(184,134,11,0.3);
    border-radius: 4px;
    margin: 1.5rem 0;
    overflow: hidden;
  }
  .code-label {
    background: rgba(184,134,11,0.1);
    border-bottom: 1px solid rgba(184,134,11,0.2);
    padding: 0.4rem 1rem;
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--gold);
  }
  pre {
    padding: 1.25rem 1.5rem;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.92rem;
    line-height: 1.7;
    color: #d4b896;
  }
  .cmd { color: #f0c040; }
  .comment { color: #6a5a4a; font-style: italic; }

  /* File tree */
  .tree {
    background: #0d0a07;
    border: 1px solid rgba(184,134,11,0.2);
    border-radius: 4px;
    padding: 1.25rem 1.5rem;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.8;
    color: #c8a87a;
    margin: 1.5rem 0;
  }
  .tree-dir { color: #f0c040; }
  .tree-comment { color: #5a4a3a; font-style: italic; }

  /* Steps */
  .steps { counter-reset: step; }
  .step {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1.25rem;
    align-items: flex-start;
  }
  .step-num {
    font-family: 'Cinzel', serif;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--parchment);
    background: var(--crimson);
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.2rem;
    counter-increment: step;
  }
  .step p { margin: 0; }

  /* Badges */
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin: 1.5rem 0;
    justify-content: center;
  }
  .badge {
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--gold);
    color: var(--gold);
    border-radius: 2px;
    background: rgba(184,134,11,0.08);
  }

  /* Roadmap */
  .roadmap-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-top: 1rem;
  }
  @media (max-width: 600px) { .roadmap-grid { grid-template-columns: 1fr; } }
  .roadmap-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    font-size: 1.05rem;
    line-height: 1.5;
    color: #2a1e12;
    padding: 0.6rem 0.75rem;
    border-left: 2px solid rgba(184,134,11,0.3);
  }
  .roadmap-item::before {
    content: '✦';
    color: var(--gold);
    font-size: 0.6rem;
    flex-shrink: 0;
    margin-top: 0.35rem;
  }

  /* Contribute */
  .contribute-steps {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
    margin-top: 1.5rem;
  }
  @media (max-width: 600px) { .contribute-steps { grid-template-columns: repeat(3, 1fr); } }
  .contrib-step {
    text-align: center;
    padding: 1rem 0.5rem;
    border: 1px solid rgba(184,134,11,0.2);
    border-radius: 3px;
    background: rgba(184,134,11,0.04);
    transition: background 0.3s, border-color 0.3s;
  }
  .contrib-step:hover {
    background: rgba(184,134,11,0.1);
    border-color: rgba(184,134,11,0.4);
  }
  .contrib-icon { font-size: 1.4rem; display: block; margin-bottom: 0.4rem; }
  .contrib-label {
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--rune);
  }

  /* Stack chips */
  .stack {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin: 1rem 0;
  }
  .stack-chip {
    font-family: 'Cinzel', serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0.4rem 1rem;
    background: linear-gradient(135deg, var(--crimson), #5a1010);
    color: #f5e8d0;
    border-radius: 2px;
    box-shadow: 0 2px 8px rgba(139,26,26,0.3);
  }

  /* CTA */
  .cta-block {
    background: linear-gradient(135deg, #1a0e06, #120a04);
    border: 1px solid rgba(184,134,11,0.4);
    border-radius: 4px;
    padding: 3rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .cta-block::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, rgba(184,134,11,0.08) 0%, transparent 70%);
  }
  .cta-block h2 {
    font-family: 'Cinzel Decorative', serif;
    color: var(--gold-light);
    font-size: 1.6rem;
    margin-bottom: 1rem;
    text-shadow: 0 0 30px rgba(240,192,64,0.3);
  }
  .cta-block p {
    color: #c8a878;
    max-width: 480px;
    margin: 0 auto 1.5rem;
  }
  .cta-btn {
    display: inline-block;
    font-family: 'Cinzel', serif;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    padding: 0.9rem 2.5rem;
    background: linear-gradient(135deg, var(--gold-bright), var(--gold));
    color: var(--ink);
    border-radius: 2px;
    text-decoration: none;
    transition: box-shadow 0.3s, transform 0.2s;
    box-shadow: 0 4px 20px rgba(184,134,11,0.3);
  }
  .cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(184,134,11,0.5);
  }

  /* Footer */
  .footer {
    padding: 2rem 4rem;
    text-align: center;
    border-top: 1px solid var(--parchment-deep);
    background: rgba(0,0,0,0.03);
  }
  .footer p {
    font-size: 0.95rem;
    color: var(--rune);
    font-style: italic;
  }
  .mit {
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(90,62,43,0.6);
    margin-top: 0.5rem;
  }

  /* Blockquote */
  .lore {
    border-left: 3px solid var(--gold);
    padding: 1rem 1.5rem;
    margin: 1.5rem 0;
    background: rgba(184,134,11,0.05);
    font-style: italic;
    font-size: 1.1rem;
    color: #3a2a1a;
  }

  a { color: var(--crimson); text-decoration: underline; text-underline-offset: 3px; }
  a:hover { color: var(--crimson-bright); }
</style>
</head>
<body>

<!-- Floating ember sparks -->
<div class="sparks" id="sparks"></div>

<div class="grimoire">
<div class="cover">
  <div class="spine-line"></div>

  <!-- Hero -->
  <div class="hero">
    <span class="hero-ornament">⚔ ✦ ⚔</span>
    <h1 class="title">DM Grimoire</h1>
    <p class="subtitle">Campaign Management Spellbook</p>

    <div class="badges">
      <span class="badge">Open Source</span>
      <span class="badge">MIT License</span>
      <span class="badge">Node.js 16+</span>
      <span class="badge">Firebase</span>
    </div>

    <p class="tagline">No more lost notes. No more chaos. Just your story, perfectly remembered.</p>

    <div class="divider">✦</div>

    <p style="font-size:1.1rem; color:#3a2a1a; max-width:560px; margin:0 auto;">
      You know that moment three sessions in when a player asks about the tavern keeper's name and you draw a complete blank?
      Or when you're mid-combat and can't remember if you already gave them that magic sword?
      <strong>This is the fix.</strong>
    </p>
  </div>

  <!-- What You Get -->
  <div class="section">
    <div class="section-label">✦ Chapter I</div>
    <h2>What You Get</h2>
    <div class="features">
      <div class="feature-card">
        <span class="feature-icon">📜</span>
        <h3>Track Everything</h3>
        <p>NPCs with actual personalities, encounters that make sense, loot you won't forget, locations your players return to. One dashboard, zero hunting through five files.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">⚡</span>
        <h3>Auto-Save</h3>
        <p>Stop paranoid-hitting Ctrl+S. Changes save instantly. Your 3 AM plot twists survive laptop deaths.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">🌐</span>
        <h3>Works Everywhere</h3>
        <p>Laptop during the game, phone on a break, tablet at the table. Firebase keeps everything in sync so your world never falls behind.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">🎛️</span>
        <h3>The DM Cockpit</h3>
        <p>Your personal mission control. Built for running sessions, not generic spreadsheet nonsense. Real-time updates while you're actively DMing.</p>
      </div>
    </div>
  </div>

  <!-- Get Started -->
  <div class="section">
    <div class="section-label">✦ Chapter II</div>
    <h2>Get Started</h2>
    <p>You need <strong>Node.js 16+</strong> and <strong>pnpm</strong> (or npm). That's it.</p>

    <div class="code-wrap">
      <div class="code-label">⚗ Incantation</div>
      <pre><span class="cmd">git clone</span> https://github.com/Moudabir/dm-grimoire.git
<span class="cmd">cd</span> dm-grimoire
<span class="cmd">pnpm install</span>
<span class="cmd">pnpm dev</span>   <span class="comment"># Open localhost:5173 — your campaign awaits</span></pre>
    </div>
  </div>

  <!-- Under the Hood -->
  <div class="section">
    <div class="section-label">✦ Chapter III</div>
    <h2>Under the Hood</h2>
    <p>The stack is solid because it needs to be. Your campaign is important.</p>

    <div class="stack">
      <span class="stack-chip">React</span>
      <span class="stack-chip">TypeScript</span>
      <span class="stack-chip">Vite</span>
      <span class="stack-chip">Firebase</span>
    </div>

    <div class="tree">
<span class="tree-dir">dm-grimoire/</span>
├── <span class="tree-dir">client/</span>        <span class="tree-comment"># The interface you actually use</span>
├── <span class="tree-dir">server/</span>        <span class="tree-comment"># The brains</span>
├── <span class="tree-dir">shared/</span>        <span class="tree-comment"># Shared utilities</span>
├── <span class="tree-dir">dataconnect/</span>   <span class="tree-comment"># Firebase magic</span>
└── DMCockpit.tsx  <span class="tree-comment"># Mission control</span></div>
  </div>

  <!-- How It Works -->
  <div class="section">
    <div class="section-label">✦ Chapter IV</div>
    <h2>How It Works in Practice</h2>

    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <p>Spin up your campaign. Give it a world.</p>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <p>Add the people, places, and dangers that live there.</p>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <p>Drop in session notes, plot hooks, random ideas — everything.</p>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <p>Load the DM Cockpit when you run a session.</p>
      </div>
      <div class="step">
        <div class="step-num">5</div>
        <p>Everything auto-saves. <strong>You focus on the story.</strong> That's it.</p>
      </div>
    </div>
  </div>

  <!-- Contributing -->
  <div class="section">
    <div class="section-label">✦ Chapter V</div>
    <h2>Contribute</h2>
    <p>This is open source. If you see something that could be better, make it better. Bug fixes, features, design improvements — PRs welcome.</p>

    <div class="contribute-steps">
      <div class="contrib-step">
        <span class="contrib-icon">🍴</span>
        <span class="contrib-label">Fork It</span>
      </div>
      <div class="contrib-step">
        <span class="contrib-icon">🌿</span>
        <span class="contrib-label">Branch It</span>
      </div>
      <div class="contrib-step">
        <span class="contrib-icon">🔨</span>
        <span class="contrib-label">Build It</span>
      </div>
      <div class="contrib-step">
        <span class="contrib-icon">💾</span>
        <span class="contrib-label">Commit It</span>
      </div>
      <div class="contrib-step">
        <span class="contrib-icon">🚀</span>
        <span class="contrib-label">PR It</span>
      </div>
    </div>

    <div class="lore" style="margin-top:1.5rem;">
      Areas that could use love: smoother UI, more powerful encounter tools, better organization options, anything that makes a DM's life easier.
    </div>
  </div>

  <!-- Roadmap -->
  <div class="section">
    <div class="section-label">✦ Chapter VI</div>
    <h2>What's Coming</h2>

    <div class="roadmap-grid">
      <div class="roadmap-item">Ready-to-go campaign templates (Forgotten Realms, Greyhawk, homebrew)</div>
      <div class="roadmap-item">Co-DM mode for actually running campaigns together</div>
      <div class="roadmap-item">A real encounter builder that doesn't suck</div>
      <div class="roadmap-item">Maps and visual battle tracking</div>
      <div class="roadmap-item">PDF exports and printables</div>
      <div class="roadmap-item">A mobile app that doesn't feel like an afterthought</div>
    </div>
  </div>

  <!-- CTA / Why This Exists -->
  <div class="section">
    <div class="cta-block">
      <h2>Why This Exists</h2>
      <p>
        Spreadsheets everywhere. Notes in Discord. Quick character sheets in Google Docs. Half-finished encounter calculations in Notes.
        Every session felt like managing chaos instead of telling a story. So I built something that just <em>works</em> —
        that remembers your world without you having to.
      </p>
      <a class="cta-btn" href="https://github.com/Moudabir/dm-grimoire">⚔ Open the Grimoire</a>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Questions? Ideas? Just want to talk about D&D? Open an issue or contribute.</p>
    <p class="mit">⚖ MIT License — Do what you want with it.</p>
  </div>

</div><!-- /cover -->
</div><!-- /grimoire -->

<script>
  // Ember sparks
  const container = document.getElementById('sparks');
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const size = Math.random() * 3 + 1;
    s.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      --drift: ${(Math.random() - 0.5) * 120}px;
      animation-duration: ${Math.random() * 8 + 6}s;
      animation-delay: ${Math.random() * 8}s;
      background: ${Math.random() > 0.5 ? '#f0c040' : '#cd5c1a'};
    `;
    container.appendChild(s);
  }
</script>
</body>
</html>
