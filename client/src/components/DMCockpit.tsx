// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from "react";

interface ToastMessage {
  text: string;
  color: string;
  hiding: boolean;
}

interface Player {
  id: number;
  name: string;
  cls: string;
  hp: number;
  max: number;
  slots: number[];
  spellNames: string[];
  init: number;
  rollNote: string;
  abilities: any[];
  notes: string;
  ac: number;
  stats: {str:number,dex:number,con:number,int:number,wis:number,cha:number};
  preparedSpells: string[];
}

interface Enemy {
  id: number;
  name: string;
  type: string;
  hp: number;
  max: number;
  abilities: any[];
  [key: string]: any;
}

interface Chapter {
  id: number;
  name: string;
  summary: string;
  timestamp: string;
}

interface LogEntry {
  id: number;
  t: string;
  msg: string;
  type: string;
  chapterId?: number;
}

interface SlotMeta {
  index: number;
  empty?: boolean;
  corrupted?: boolean;
  reason?: string;
  savedAt?: string;
  players?: number;
  enemies?: number;
  log?: number;
  valid?: boolean;
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');`;

const CLASSES = ["Fighter","Wizard","Rogue","Cleric","Ranger","Paladin","Barbarian","Bard","Druid","Monk","Sorcerer","Warlock"];
const P_ICONS = {Fighter:"⚔️",Wizard:"🔮",Rogue:"🗡️",Cleric:"✝️",Ranger:"🏹",Paladin:"🛡️",Barbarian:"🪓",Bard:"🎵",Druid:"🌿",Monk:"👊",Sorcerer:"✨",Warlock:"👁️"};
const CASTERS = ["Wizard","Cleric","Druid","Sorcerer","Warlock","Bard","Paladin","Ranger"];
const SPELL_MAX = [4,3,3];
const ENEMY_TYPES = ["Goblin","Orc","Skeleton","Zombie","Bandit","Wolf","Dragon","Troll","Vampire","Lich","Ogre","Custom"];
const E_ICONS = {Goblin:"👺",Orc:"👹",Skeleton:"💀",Zombie:"🧟",Bandit:"🦹",Wolf:"🐺",Dragon:"🐉",Troll:"👾",Vampire:"🧛",Lich:"☠️",Ogre:"🗿",Custom:"❓"};

const DICE = [
  {sides:4,  color:"#f0a030",dark:"#3d2000",label:"d4",  tip1:"Daggers, handaxes, fire bolt.",tip2:"Best for low-damage weapons and cantrips. Averages 2.5.",tip3:"Daggers (1d4), Handaxe (1d4), Bardic Inspiration die at level 1–4."},
  {sides:6,  color:"#e03030",dark:"#3a0808",label:"d6",  tip1:"Shortswords, healing potions, Fireball.",tip2:"The most common die in D&D. Averages 3.5.",tip3:"Shortsword (1d6), Healing Potion (2d4+2), Fireball (8d6), Sneak Attack (1d6–12d6)."},
  {sides:8,  color:"#b030d0",dark:"#2a0840",label:"d8",  tip1:"Longswords, Cure Wounds, Cleric HP.",tip2:"Standard martial weapon die. Averages 4.5.",tip3:"Longsword versatile (1d8), Cure Wounds (1d8+mod), Cleric/Druid/Monk hit die."},
  {sides:10, color:"#2070e0",dark:"#081840",label:"d10", tip1:"Battleaxes, Bardic Inspiration, heavy weapons.",tip2:"Heavy one-handed weapons. Averages 5.5.",tip3:"Halberd/Pike (1d10), Heavy Crossbow (1d10), Bardic Inspiration d10 (levels 10–14)."},
  {sides:12, color:"#20a050",dark:"#082010",label:"d12", tip1:"Greataxes, Barbarian HD. Rare but devastating.",tip2:"The rarest die. Only greataxes and Barbarian use it. Averages 6.5.",tip3:"Greataxe (1d12), Barbarian hit die. Highest average of all weapon dice."},
  {sides:20, color:"#c9a227",dark:"#3a2800",label:"d20", tip1:"Attack rolls, ability checks, saving throws.",tip2:"THE die. Natural 20 = crit. Natural 1 = automatic fail.",tip3:"Attack rolls, Ability checks, Saving throws, Death saves (10+ = success), Wild Magic."},
  {sides:100,color:"#888888",dark:"#181818",label:"d100",tip1:"Wild Magic surges, random tables, percentile checks.",tip2:"Roll two d10s — tens + units. Used for surge and encounter tables.",tip3:"Wild Mage surge table, Random Encounter tables, PHB Trinket tables."},
  {sides:1000,color:"#a36be8",dark:"#2b134d",label:"d1000",tip1:"Massive tables, ultra-rare loot.",tip2:"For rolling on the d1000 mutation table or massive treasure hoards.",tip3:"Use it when standard percentile just isn't granular enough."}
];

function qColor(v,s){const p=v/s;if(p<=.05)return"#cc1818";if(p<=.25)return"#d43020";if(p<=.45)return"#d07020";if(p<=.60)return"#c9a227";if(p<=.79)return"#70a830";if(p<=.94)return"#28a040";return"#00cc55";}
function qLabel(v,s){const p=v/s;if(v===s)return"MAXIMUM! 🎉";if(v===1)return"Minimum 😬";if(p<=.25)return"Poor";if(p<=.45)return"Below avg";if(p<=.60)return"Average";if(p<=.79)return"Good";if(p<=.94)return"Great ✨";return"Excellent ✨";}
function rDie(s){return Math.floor(Math.random()*s)+1;}
function hpCol(p){return p>.6?"#3a9a3a":p>.3?"#c8900a":"#c02020";}
let _uid=300;const uid=()=>++_uid;

const mkPlayer=(overrides={})=>({
  id:uid(),name:"Adventurer",cls:"Fighter",hp:30,max:30,ac:14,
  stats:{str:15,dex:14,con:13,int:10,wis:12,cha:8},
  slots:[0,0,0],spellNames:["","",""],preparedSpells:[],
  init:0,roll:null,rollNote:"",abilities:[],notes:"",...overrides
});

const INIT_PLAYERS=[
  mkPlayer({id:1,name:"Kaelen the Bold",cls:"Paladin",hp:84,max:92,ac:20,stats:{str:18,dex:10,con:14,int:10,wis:12,cha:16},preparedSpells:["Divine Smite","Cure Wounds","Shield of Faith","Bless"]}),
  mkPlayer({id:2,name:"Thalric Ironfoot",cls:"Fighter",hp:35,max:35,ac:19,stats:{str:16,dex:12,con:16,int:8,wis:10,cha:12}}),
  mkPlayer({id:3,name:"Elara Windrunner",cls:"Ranger", hp:28,max:28,ac:16,stats:{str:10,dex:18,con:14,int:10,wis:14,cha:12},slots:[4,3,2],preparedSpells:["Hunter's Mark"]}),
];

/* ══════════════════════════════════════════════
   AUTO-SAVE SYSTEM
   - 5 rotating slots via localStorage
   - Checksum-based corruption detection
   - Auto-loads newest valid slot on mount
   - Saves every 60 seconds (non-blocking)
══════════════════════════════════════════════ */
const SAVE_PREFIX  = "dm_grimoire_slot_";
const NUM_SLOTS    = 5;
const SAVE_VERSION = 7; // Increment for Chapter support

/* Simple polynomial checksum */
function checksum(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/* Build a validated, stamped save object */
function buildSave(state) {
  const payload = {
    version:  SAVE_VERSION,
    savedAt:  new Date().toISOString(),
    players:  state.players,
    enemies:  state.enemies,
    log:      state.log.slice(-100), // Increased slightly for longevity
    chapters: state.chapters,
    activeChapterId: state.activeChapterId,
    diceHist: state.diceHist.slice(0, 12),
    combat:   state.combat,
    order:    state.order,
    turn:     state.turn,
  };
  const json = JSON.stringify(payload);
  return { payload, checksum: checksum(json), size: json.length };
}

/* Validate a parsed slot — returns { ok, reason }
   NOTE: version lives inside slot.payload, not slot */
function validateSave(slot) {
  if (!slot || typeof slot !== "object")           return { ok: false, reason: "Empty slot" };
  if (!slot.payload || !slot.checksum)             return { ok: false, reason: "Missing payload/checksum" };
  if (slot.payload.version !== SAVE_VERSION)       return { ok: false, reason: `Version mismatch (${slot.payload.version})` };
  const json = JSON.stringify(slot.payload);
  if (checksum(json) !== slot.checksum)            return { ok: false, reason: "Checksum failed — data corrupted" };
  if (!Array.isArray(slot.payload.players))        return { ok: false, reason: "Missing players array" };
  if (typeof slot.payload.savedAt !== "string")    return { ok: false, reason: "Missing timestamp" };
  return { ok: true, reason: "Valid" };
}

/* Write to one slot via localStorage */
function writeSlot(slotIndex, save) {
  try {
    localStorage.setItem(SAVE_PREFIX + slotIndex, JSON.stringify(save));
    return true;
  } catch { return false; }
}

/* Read and validate a single slot */
function readSlot(slotIndex) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slotIndex);
    if (!raw) return null;
    const slot = JSON.parse(raw);
    const { ok, reason } = validateSave(slot);
    return ok ? slot : { corrupted: true, reason, slotIndex };
  } catch { return null; }
}

/* Delete a slot */
function deleteSlotStorage(slotIndex) {
  try { localStorage.removeItem(SAVE_PREFIX + slotIndex); } catch {}
}

/* Find the most recent valid slot */
function findBestSave() {
  let best = null;
  for (let i = 0; i < NUM_SLOTS; i++) {
    const slot = readSlot(i);
    if (!slot || slot.corrupted) continue;
    if (!best || slot.payload.savedAt > best.payload.savedAt) best = slot;
  }
  return best;
}

/* Read all slot summaries for UI */
function readAllSlotMeta() {
  const results = [];
  for (let i = 0; i < NUM_SLOTS; i++) {
    const raw = readSlot(i);
    if (!raw) { results.push({ index: i, empty: true }); continue; }
    if (raw.corrupted) { results.push({ index: i, corrupted: true, reason: raw.reason }); continue; }
    results.push({
      index:   i,
      savedAt: raw.payload.savedAt,
      players: raw.payload.players?.length ?? 0,
      enemies: raw.payload.enemies?.length ?? 0,
      log:     raw.payload.log?.length ?? 0,
      valid:   true,
    });
  }
  return results;
}

/* ── SVG die shapes ── */
function DieShape({sides,color,size=54}){
  const f=color+"22",sw={stroke:color,strokeWidth:3,fill:f,strokeLinejoin:"round"};
  const V="0 0 100 100",S={width:size,height:size,display:"block",margin:"0 auto"};
  if(sides===4)  return <svg viewBox={V} style={S}><polygon points="50,6 94,84 6,84" {...sw}/><line x1="50" y1="6" x2="50" y2="84" stroke={color} strokeWidth="1.4" opacity=".35"/></svg>;
  if(sides===6)  return <svg viewBox={V} style={S}><rect x="10" y="10" width="80" height="80" rx="10" {...sw}/><rect x="24" y="24" width="52" height="52" rx="6" stroke={color} strokeWidth="1" fill="none" opacity=".25"/></svg>;
  if(sides===8)  return <svg viewBox={V} style={S}><polygon points="50,5 95,50 50,95 5,50" {...sw}/><line x1="5" y1="50" x2="95" y2="50" stroke={color} strokeWidth="1.4" opacity=".3"/><line x1="50" y1="5" x2="50" y2="95" stroke={color} strokeWidth="1.4" opacity=".3"/></svg>;
  if(sides===10) return <svg viewBox={V} style={S}><polygon points="50,5 88,28 88,72 50,95 12,72 12,28" {...sw}/><polygon points="50,26 72,38 72,62 50,74 28,62 28,38" stroke={color} strokeWidth="1" fill="none" opacity=".25"/></svg>;
  if(sides===12) return <svg viewBox={V} style={S}><polygon points="50,4 92,32 78,88 22,88 8,32" {...sw}/><polygon points="50,22 76,42 66,76 34,76 24,42" stroke={color} strokeWidth="1" fill="none" opacity=".25"/></svg>;
  if(sides===20) return <svg viewBox={V} style={S}><polygon points="50,3 96,27 96,73 50,97 4,73 4,27" {...sw}/><line x1="4" y1="27" x2="96" y2="73" stroke={color} strokeWidth="1.2" opacity=".28"/><line x1="96" y1="27" x2="4" y2="73" stroke={color} strokeWidth="1.2" opacity=".28"/></svg>;
  if(sides===100) return <svg viewBox={V} style={S}><circle cx="50" cy="50" r="44" {...sw}/><circle cx="50" cy="50" r="30" stroke={color} strokeWidth="1" fill="none" opacity=".25"/><text x="50" y="56" textAnchor="middle" fill={color} fontSize="18" fontFamily="serif" opacity=".55">%</text></svg>;
  if(sides===1000) return <svg viewBox={V} style={S}><circle cx="50" cy="50" r="44" {...sw}/><polygon points="50,15 85,50 50,85 15,50" stroke={color} strokeWidth="1" fill="none" opacity=".25"/><text x="50" y="56" textAnchor="middle" fill={color} fontSize="16" fontFamily="serif" opacity=".7">1K</text></svg>;
  return <svg viewBox={V} style={S}><circle cx="50" cy="50" r="44" {...sw}/><circle cx="50" cy="50" r="30" stroke={color} strokeWidth="1" fill="none" opacity=".25"/><text x="50" y="56" textAnchor="middle" fill={color} fontSize="18" fontFamily="serif" opacity=".55">?</text></svg>;
}

/* ── Collapsible section — CSS max-height, never unmounts ── */
function Section({title,badge=0,defaultOpen=true,children}){
  const[open,setOpen]=useState(defaultOpen);
  return(
    <div style={{background:"rgba(12,7,3,.95)",border:"1px solid rgba(201,162,39,.28)",borderRadius:8,overflow:"hidden",flexShrink:0}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 14px",background:"none",border:"none",cursor:"pointer",minHeight:48}}>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:".62rem",color:"var(--gold)",letterSpacing:".2em",display:"flex",alignItems:"center",gap:7,userSelect:"none"}}>
          {title}
          {badge>0&&<span style={{background:"rgba(201,162,39,.14)",border:"1px solid rgba(201,162,39,.25)",borderRadius:10,padding:"1px 7px",fontSize:".52rem",color:"rgba(201,162,39,.7)"}}>{badge}</span>}
        </span>
        <span style={{fontSize:".65rem",color:"rgba(201,162,39,.4)",transition:"transform .22s",transform:open?"rotate(0deg)":"rotate(-90deg)",display:"inline-block",lineHeight:1,userSelect:"none"}}>▼</span>
      </button>
      <div style={{maxHeight:open?"3000px":"0px",overflow:"hidden",transition:open?"max-height .35s ease,opacity .22s ease":"max-height .25s ease,opacity .18s ease",opacity:open?1:0}}>
        <div style={{padding:"0 13px 13px"}}>{children}</div>
      </div>
    </div>
  );
}

const CSS=`
${FONTS}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
:root{--bg:#080402;--gold:#c9a227;--gold2:#e8c547;--parch:#f5e6c4;--ink:#2c1810;--ink2:#5a3820;--blood:#b01818;--blood2:#e03030;--arcane:#5a2d96;--border:rgba(201,162,39,.28);--glass:rgba(12,7,3,.85);--glass-border:rgba(201,162,39,.2);--blur:blur(10px);}
html,body{height:100%;background:var(--bg);overflow:hidden;}
.glass{background:var(--glass);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border:1px solid var(--glass-border);border-radius:10px;}
.hint-text{font-family:'Crimson Text',serif;font-style:italic;font-size:.65rem;color:rgba(201,162,39,.55);margin-top:2px;animation:su .3s ease;}
.hud-bar{height:42px;background:rgba(201,162,39,.08);border-bottom:1px solid var(--gold);display:flex;align-items:center;padding:0 14px;gap:12px;z-index:15;backdrop-filter:blur(6px);animation:su .3s ease;}
.hud-turn-ico{width:22px;height:22px;background:var(--gold);color:var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;}
.hud-turn-name{font-family:'Cinzel',serif;font-size:.68rem;color:var(--gold);letter-spacing:.05em;}
.hud-next{margin-left:auto;background:none;border:1px solid var(--gold);color:var(--gold);font-family:'Cinzel',serif;font-size:.55rem;padding:3px 10px;border-radius:4px;cursor:pointer;}

.root{display:flex;flex-direction:column;height:100svh;background:radial-gradient(ellipse at 50% 0%,#1c0e06 0%,#060301 100%);font-family:'Crimson Text',serif;color:var(--parch);overflow:hidden;}
.tb{flex-shrink:0;z-index:20;background:linear-gradient(180deg,#060301,rgba(6,3,1,.97));border-bottom:1.5px solid var(--gold);padding:9px 14px 7px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 3px 16px rgba(201,162,39,.14);}
.tb-t{font-family:'Cinzel Decorative',serif;font-size:.83rem;color:var(--gold);text-shadow:0 0 14px rgba(201,162,39,.5);letter-spacing:.08em;}
.tb-s{font-family:'Crimson Text',serif;font-style:italic;font-size:.62rem;color:rgba(244,228,193,.35);}
.tb-an{font-family:'Cinzel Decorative',serif;font-size:.78rem;color:var(--gold2);}
.tb-al{font-family:'Cinzel',serif;font-size:.5rem;color:rgba(201,162,39,.55);letter-spacing:.15em;text-align:right;}
.layout-btn{font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.12em;padding:5px 11px;border-radius:5px;cursor:pointer;border:1.5px solid rgba(201,162,39,.35);background:rgba(201,162,39,.06);color:rgba(201,162,39,.7);transition:all .18s;white-space:nowrap;}
.layout-btn:hover{background:rgba(201,162,39,.16);color:var(--gold);}
.istrip{flex-shrink:0;background:rgba(4,2,1,.98);border-bottom:1px solid rgba(201,162,39,.18);padding:4px 12px;display:flex;align-items:center;gap:7px;overflow-x:auto;min-height:34px;scrollbar-width:none;}
.istrip::-webkit-scrollbar{display:none;}
.ilbl{font-family:'Cinzel',serif;font-size:.52rem;color:var(--gold);letter-spacing:.2em;white-space:nowrap;}
.ichip{display:flex;align-items:center;gap:4px;background:rgba(201,162,39,.06);border:1px solid rgba(201,162,39,.16);border-radius:20px;padding:2px 9px;font-family:'Cinzel',serif;font-size:.62rem;white-space:nowrap;flex-shrink:0;transition:all .2s;}
.ichip.on{background:rgba(201,162,39,.2);border-color:var(--gold);color:var(--gold2);}
.ichip.ec{border-color:rgba(176,24,24,.3);}
.ichip.ec.on{background:rgba(176,24,24,.2);border-color:var(--blood2);color:#f08080;}
.inum{font-weight:700;font-size:.78rem;color:var(--gold);}
.inum.e{color:#e06060;}
.iempty{font-family:'Crimson Text',serif;font-style:italic;font-size:.7rem;color:rgba(244,228,193,.18);}
/* mobile */
.mob-body{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.content{flex:1;overflow-y:auto;padding:9px 10px 6px;display:flex;flex-direction:column;gap:7px;scrollbar-width:thin;scrollbar-color:rgba(201,162,39,.15) transparent;}
.content::-webkit-scrollbar{width:3px;}
.content::-webkit-scrollbar-thumb{background:rgba(201,162,39,.18);border-radius:2px;}
.bnav{flex-shrink:0;display:flex;background:linear-gradient(0deg,#040201,rgba(4,2,1,.98));border-top:1.5px solid var(--gold);z-index:20;}
.ntab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 2px 10px;cursor:pointer;border:none;background:none;gap:2px;position:relative;min-height:52px;}
.ntab::after{content:'';position:absolute;top:0;left:16%;right:16%;height:2px;background:var(--gold);transform:scaleX(0);transition:transform .18s;border-radius:0 0 2px 2px;}
.ntab.on::after{transform:scaleX(1);}
.nico{font-size:1.2rem;}
.ntab.on .nico{transform:scale(1.12);}
.nlbl{font-family:'Cinzel',serif;font-size:.48rem;letter-spacing:.13em;color:rgba(244,228,193,.28);}
.ntab.on .nlbl{color:var(--gold);}
.nbadge{position:absolute;top:5px;right:calc(50% - 16px);background:var(--blood);color:#fff;font-size:.44rem;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
/* desktop */
.dsk-body{flex:1;display:flex;overflow:hidden;}
.dsk-side{width:190px;flex-shrink:0;background:linear-gradient(180deg,rgba(8,4,2,.99),rgba(6,3,1,.99));border-right:1.5px solid var(--gold);display:flex;flex-direction:column;padding:10px 0;gap:2px;overflow-y:auto;scrollbar-width:none;}
.dsk-side::-webkit-scrollbar{display:none;}
.dsk-ni{display:flex;align-items:center;gap:11px;padding:12px 18px;cursor:pointer;border:none;background:none;font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.12em;color:rgba(244,228,193,.35);border-left:2.5px solid transparent;text-align:left;width:100%;}
.dsk-ni:hover{background:rgba(201,162,39,.05);color:rgba(244,228,193,.65);}
.dsk-ni.on{background:rgba(201,162,39,.1);color:var(--gold);border-left-color:var(--gold);}
.dsk-main{flex:1;overflow:hidden;display:flex;flex-direction:column;}
.dsk-content{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:rgba(201,162,39,.15) transparent;}
.dsk-content::-webkit-scrollbar{width:4px;}
.dsk-content::-webkit-scrollbar-thumb{background:rgba(201,162,39,.2);border-radius:2px;}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:12px;width:100%;}
.card-grid .addbtn{grid-column:1/-1;}
/* shared cards */
@keyframes su{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
.strow{display:flex;border:1.5px solid var(--border);border-radius:6px;overflow:hidden;flex-shrink:0;}
.st{flex:1;font-family:'Cinzel',serif;font-size:.62rem;letter-spacing:.12em;padding:10px 4px;border:none;background:transparent;color:rgba(244,228,193,.32);cursor:pointer;min-height:44px;}
.st.ap{background:rgba(201,162,39,.15);color:var(--gold);}
.st.ae{background:rgba(176,24,24,.15);color:#e06060;}
.stdiv{width:1.5px;background:var(--border);flex-shrink:0;}
.pc{background:rgba(28,22,19,0.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1.5px solid var(--gold);border-radius:8px;padding:11px;box-shadow:0 8px 32px rgba(0,0,0,.5);position:relative;animation:su .28s ease both;transition:transform .2s ease, border-color .2s ease;}
.pc:hover{transform:translateY(-2px);border-color:var(--gold2);}
.pc::before{content:'';position:absolute;inset:4px;border:1px solid rgba(201,162,39,.15);border-radius:5px;pointer-events:none;}
.pc.dead{opacity:.42;filter:grayscale(.55);}
.pc.active-turn{box-shadow:0 0 20px var(--gold);border-color:var(--gold2);z-index:2;background:rgba(201,162,39,0.08);}
.ecard{background:rgba(32,10,10,0.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1.5px solid rgba(176,24,24,.45);border-radius:8px;padding:11px;box-shadow:0 8px 32px rgba(0,0,0,.6);position:relative;animation:su .28s ease both;transition:transform .2s ease;}
.ecard:hover{transform:translateY(-2px);border-color:var(--blood2);}
.ecard::before{content:'';position:absolute;inset:4px;border:1px solid rgba(176,24,24,.12);border-radius:5px;pointer-events:none;}
.ecard.dead{opacity:.38;filter:grayscale(.6);}
.ecard.active-turn{box-shadow:0 0 16px var(--blood2);border-color:#f08080;z-index:2;}
/* name row */
.nrow{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.nicon{font-size:1.85rem;line-height:1;}
.nfields{flex:1;min-width:0;}
.ndisp{display:flex;align-items:center;gap:6px;cursor:pointer;background:transparent;border-bottom:1px solid rgba(201,162,39,.2);padding:2px 4px;margin-bottom:4px;}
.ndisp:active{border-color:rgba(201,162,39,.5);}
.ntxt{font-family:'Cinzel',serif;font-size:.95rem;font-weight:700;color:var(--gold);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.05em;}
.npen{font-size:.65rem;opacity:.35;flex-shrink:0;color:var(--gold);}
.ninput{font-family:'Cinzel',serif;font-size:.95rem;font-weight:700;background:rgba(0,0,0,.5);border:1px solid var(--gold);color:var(--gold);width:100%;border-radius:5px;padding:3px 6px;outline:none;margin-bottom:4px;letter-spacing:.05em;}
.en-nd{border-bottom:1px solid rgba(176,24,24,.3);}
.en-nt{color:#e06060;}
.en-ni{background:rgba(50,10,10,.7);border-color:var(--blood2);color:#e06060;}
.clsrow{display:flex;align-items:center;gap:5px;justify-content:space-between;}
.clsd{font-family:'Crimson Text',serif;font-size:.78rem;font-style:italic;color:rgba(244,228,193,.45);cursor:pointer;padding:2px 5px;border-radius:3px;border:1px solid transparent;}
.clss{font-family:'Crimson Text',serif;font-size:.78rem;background:#111;border:1px solid var(--gold);color:var(--gold);border-radius:3px;padding:2px 4px;}
.en-cd{color:rgba(244,228,193,.42);}
.en-cs{background:rgba(50,10,10,.7);border-color:var(--blood);color:var(--parch);}
.ibadge{text-align:center;flex-shrink:0;}
.ibadge strong{display:block;font-family:'Cinzel',serif;font-size:.95rem;color:var(--gold);}
.ibadge span{font-family:'Cinzel',serif;font-size:.5rem;color:rgba(201,162,39,.6);letter-spacing:.1em;}
.en-ib strong{color:var(--parch);}
.en-ib span{color:rgba(244,228,193,.38);}
.rmbtn{background:none;border:none;color:var(--blood);font-size:.9rem;cursor:pointer;opacity:.38;min-width:32px;min-height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rmbtn:active{opacity:1;}
/* HP */
.hrow{display:flex;align-items:center;gap:7px;margin-bottom:5px;}
.hlbl{font-family:'Cinzel',serif;font-size:.58rem;letter-spacing:.12em;min-width:18px;}
.hlbl.p{color:rgba(244,228,193,.45);}
.hlbl.e{color:rgba(244,228,193,.38);}
.htrack{flex:1;height:9px;background:rgba(255,255,255,.05);border-radius:5px;overflow:hidden;border:1px solid rgba(201,162,39,.15);}
.hfill{height:100%;border-radius:5px;transition:width .32s ease,background .32s ease;}
.hval{font-family:'Cinzel',serif;font-size:.7rem;min-width:36px;text-align:right;}
.hval.p{color:var(--gold);}
.hval.e{color:rgba(244,228,193,.8);}
.max-btn{font-family:'Cinzel',serif;font-size:.58rem;background:transparent;border:1px solid rgba(201,162,39,.25);color:rgba(201,162,39,.7);border-radius:3px;cursor:pointer;padding:2px 6px;flex-shrink:0;}
.max-btn:active{background:rgba(201,162,39,.2);}
.max-input{font-family:'Cinzel',serif;font-size:.75rem;width:52px;background:rgba(255,255,255,.55);border:2px solid var(--gold);color:var(--ink);border-radius:4px;padding:3px 6px;outline:none;text-align:center;}
.hbtns{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:7px;}
.hb{font-family:'Cinzel',serif;font-size:.7rem;padding:8px 3px;border-radius:5px;cursor:pointer;border:1.5px solid;display:flex;align-items:center;justify-content:center;min-height:40px;}
.hb.pd{background:rgba(176,24,24,.1);border-color:rgba(176,24,24,.3);color:#e06060;}
.hb.pd:active{background:rgba(176,24,24,.25);}
.hb.ph{background:rgba(40,160,40,.08);border-color:rgba(40,160,40,.3);color:#5bd65b;}
.hb.ph:active{background:rgba(40,160,40,.2);}
.hb.ed{background:rgba(176,24,24,.15);border-color:rgba(176,24,24,.4);color:#f06060;}
.hb.ed:active{background:rgba(176,24,24,.3);}
.hb.eh{background:rgba(40,80,40,.2);border-color:rgba(40,120,40,.4);color:#60b060;}
.hb.eh:active{background:rgba(40,80,40,.35);}
/* spell slots */
.sps{margin-bottom:7px;}
.spt{font-family:'Cinzel',serif;font-size:.56rem;color:rgba(201,162,39,.5);letter-spacing:.15em;margin-bottom:5px;}
.spr{display:flex;align-items:center;gap:5px;margin-bottom:4px;}
.splv{font-family:'Cinzel',serif;font-size:.56rem;color:var(--gold);min-width:14px;text-align:right;flex-shrink:0;}
.dot{width:16px;height:16px;transform:rotate(45deg);border:1.5px solid rgba(201,162,39,.45);background:transparent;cursor:pointer;flex-shrink:0;}
.dot.used{background:var(--gold);border-color:var(--gold);box-shadow:0 0 5px rgba(201,162,39,.5);}
.dot:active{transform:rotate(45deg) scale(.82);}
.spell-name-input{font-family:'Crimson Text',serif;font-size:.75rem;background:transparent;border:none;border-bottom:1px dashed rgba(201,162,39,.35);color:var(--parch);outline:none;padding:1px 4px;min-width:0;flex:1;}
.spell-name-input::placeholder{color:rgba(244,228,193,.3);font-style:italic;}
/* abilities */
.abs{margin-top:6px;border-top:1px solid rgba(201,162,39,.15);padding-top:7px;}
.abs.enemy{border-color:rgba(176,24,24,.15);}
.abt{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
.abt-lbl{font-family:'Cinzel',serif;font-size:.56rem;color:rgba(201,162,39,.5);letter-spacing:.15em;}
.abt-lbl.e{color:rgba(244,228,193,.4);}
.ab-add{font-family:'Cinzel',serif;font-size:.58rem;background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.3);color:var(--gold);padding:4px 10px;border-radius:3px;cursor:pointer;min-height:28px;}
.ab-add:active{background:rgba(201,162,39,.25);}
.ab-add.enemy{background:rgba(176,24,24,.08);border-color:rgba(176,24,24,.28);color:#e06060;}
.ab-add.enemy:active{background:rgba(176,24,24,.2);}
.ablist{display:flex;flex-direction:column;gap:4px;}
.abrow{display:flex;align-items:center;gap:6px;}
.abname{font-family:'Crimson Text',serif;font-size:.82rem;flex:1;background:transparent;border:none;border-bottom:1px dashed rgba(201,162,39,.25);outline:none;padding:2px 3px;color:var(--parch);}
.abname.e{color:rgba(244,228,193,.75);border-color:rgba(176,24,24,.2);}
.abname::placeholder{color:rgba(244,228,193,.3);}
.abname.e::placeholder{color:rgba(244,228,193,.25);}
.ab-slot{width:16px;height:16px;transform:rotate(45deg);border:1.5px solid rgba(201,162,39,.5);background:transparent;cursor:pointer;flex-shrink:0;}
.ab-slot.used{background:rgba(176,24,24,.4);border-color:var(--blood);}
.ab-slot.es{border-color:rgba(176,24,24,.4);background:rgba(176,24,24,.08);}
.ab-slot.es.used{background:rgba(176,24,24,.55);border-color:var(--blood2);}
.ab-rm{background:none;border:none;color:var(--blood);cursor:pointer;opacity:.35;font-size:.8rem;min-width:24px;min-height:24px;display:flex;align-items:center;justify-content:center;}
.ab-rm:active{opacity:1;}
.ab-empty{font-family:'Crimson Text',serif;font-style:italic;font-size:.72rem;padding-left:2px;}
.ab-empty.p{color:rgba(244,228,193,.38);}
.ab-empty.e{color:rgba(244,228,193,.25);}
/* notes */
.notes-section{margin-top:6px;border-top:1px solid rgba(201,162,39,.15);padding-top:7px;}
.notes-lbl{font-family:'Cinzel',serif;font-size:.56rem;color:rgba(201,162,39,.5);letter-spacing:.15em;margin-bottom:4px;}
.notes-ta{width:100%;background:rgba(0,0,0,.2);border:1px solid rgba(201,162,39,.15);border-radius:4px;color:var(--parch);font-family:'Crimson Text',serif;font-size:.82rem;padding:6px 8px;resize:none;outline:none;line-height:1.42;min-height:52px;}
.notes-ta::placeholder{color:rgba(244,228,193,.35);font-style:italic;}
.notes-ta:focus{border-color:rgba(201,162,39,.5);}
/* roll area */
.rarea{display:flex;align-items:center;gap:8px;padding-top:6px;border-top:1px solid rgba(201,162,39,.15);margin-top:2px;}
.rarea.ediv{border-color:rgba(176,24,24,.1);}
.d20b{width:54px;height:54px;flex-shrink:0;clip-path:polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%);display:flex;align-items:center;justify-content:center;font-family:'Cinzel Decorative',serif;font-size:.95rem;font-weight:900;cursor:pointer;user-select:none;}
.d20b:active{transform:scale(.87) rotate(9deg);}
.d20b.empty{background:linear-gradient(135deg,rgba(201,162,39,.35),rgba(201,162,39,.12));color:rgba(44,24,16,.4);}
.d20b.norm{background:linear-gradient(135deg,#c9a227,#e8c547);color:var(--ink);}
.d20b.good{background:linear-gradient(135deg,#1e6b1e,#2d9a2d);color:#fff;}
.d20b.crit{background:linear-gradient(135deg,#8b0000,#ff3333);color:#fff;box-shadow:0 0 14px rgba(255,51,51,.5);}
.d20b.fail{background:linear-gradient(135deg,#181818,#2a2a2a);color:#666;}
.d20b.enorm{background:linear-gradient(135deg,#8b2020,#c03030);color:#fff;}
.d20b.egood{background:linear-gradient(135deg,#6b1e1e,#c04040);color:#ffaaaa;}
.d20b.ecrit{background:linear-gradient(135deg,#ff0000,#ff6600);color:#fff;box-shadow:0 0 16px rgba(255,80,0,.55);}
.d20b.efail{background:linear-gradient(135deg,#100808,#1e1010);color:#444;}
.roll-note-input{font-family:'Crimson Text',serif;font-size:.78rem;flex:1;background:transparent;border:none;border-bottom:1px dashed rgba(201,162,39,.3);color:var(--parch);outline:none;padding:2px 4px;min-width:0;}
.roll-note-input::placeholder{color:rgba(244,228,193,.3);font-style:italic;}
.rres{font-family:'Cinzel Decorative',serif;font-size:1.25rem;}
.rres.p{color:var(--gold);}
.rres.e{color:var(--gold);}
.rhint{font-family:'Crimson Text',serif;font-style:italic;font-size:.68rem;}
.rhint.p{color:rgba(201,162,39,.6);}
.rhint.e{color:rgba(244,228,193,.42);}
/* char sheet */
.csheet-overlay{position:fixed;inset:0;background:var(--bg);z-index:100;display:flex;flex-direction:column;animation:su .3s ease;}
.csheet-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1.5px solid var(--gold);background:linear-gradient(180deg,#0a0806,#050403);}
.csheet-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(201,162,39,.2);background:linear-gradient(180deg,#0a0806,#050403);}
.csheet-title{font-family:'Cinzel Decorative',serif;font-size:1rem;color:var(--gold);}
.csheet-close{background:none;border:none;color:var(--gold);font-size:1.2rem;cursor:pointer;}
.cs-content{flex:1;overflow-y:auto;padding:16px;}
.cs-hero{display:flex;flex-direction:column;align-items:center;margin-bottom:20px;}
.cs-name{font-family:'Cinzel Decorative',serif;font-size:1.3rem;color:var(--gold);margin-top:10px;}
.cs-subtitle{font-family:'Cinzel',serif;font-size:.65rem;color:rgba(244,228,193,.5);letter-spacing:.2em;text-transform:uppercase;}
.cs-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;}
.cs-statbox{background:rgba(255,255,255,.03);border:1px solid rgba(201,162,39,.2);border-radius:6px;display:flex;flex-direction:column;align-items:center;padding:8px 4px;}
.cs-stat-lbl{font-family:'Cinzel',serif;font-size:.5rem;color:rgba(201,162,39,.6);letter-spacing:.15em;}
.cs-stat-val{font-family:'Cinzel Decorative',serif;font-size:1.1rem;color:var(--gold);margin-top:2px;}
.cs-stat-input{background:transparent;border:none;border-bottom:1px solid rgba(201,162,39,.3);color:var(--gold);text-align:center;font-family:'Cinzel Decorative',serif;width:100%;outline:none;}
.cs-stat-input:focus{border-bottom-color:var(--gold);}
.cs-nav{display:flex;background:#050403;border-top:1px solid var(--gold);}
.cs-tab{flex:1;padding:12px;text-align:center;font-family:'Cinzel',serif;font-size:.65rem;color:rgba(244,228,193,.4);cursor:pointer;border-bottom:2px solid transparent;}
.cs-tab.active{color:var(--gold);border-bottom-color:var(--gold);}
.spellbook-card{background:rgba(25,20,18,.9);border:1.5px solid var(--gold);border-radius:8px;padding:12px;margin-bottom:12px;}
.spellbook-name{font-family:'Cinzel Decorative',serif;font-size:.9rem;color:var(--gold);}
.spellbook-desc{font-family:'Crimson Text',serif;font-size:.82rem;color:rgba(244,228,193,.7);margin:6px 0;}
.spellbook-btn{font-family:'Cinzel',serif;font-size:.65rem;color:#000;background:var(--gold);border:none;padding:8px 12px;border-radius:4px;cursor:pointer;width:100%;margin-top:8px;text-transform:uppercase;font-weight:700;}
.char-btn{font-family:'Cinzel',serif;font-size:.55rem;color:var(--gold);border:1px solid var(--gold);background:transparent;padding:3px 8px;border-radius:4px;cursor:pointer;margin-left:auto;}
/* add btns */
.addbtn{display:flex;align-items:center;justify-content:center;gap:7px;border-radius:7px;padding:13px;font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.12em;cursor:pointer;width:100%;min-height:48px;}
.addbtn.pp{background:rgba(201,162,39,.05);border:1.5px dashed rgba(201,162,39,.28);color:rgba(201,162,39,.45);}
.addbtn.pp:active{background:rgba(201,162,39,.12);color:var(--gold);}
.addbtn.ep{background:rgba(176,24,24,.05);border:1.5px dashed rgba(176,24,24,.28);color:rgba(176,24,24,.5);}
.addbtn.ep:active{background:rgba(176,24,24,.12);color:var(--blood2);}
/* combat */
.turn-card{border-radius:7px;padding:12px;text-align:center;flex-shrink:0;}
.turn-card.pt{background:rgba(201,162,39,.08);border:1.5px solid var(--gold);}
.turn-card.et{background:rgba(176,24,24,.1);border:1.5px solid var(--blood2);}
.tname{font-family:'Cinzel Decorative',serif;font-size:1.05rem;color:var(--gold2);}
.tname.e{color:#f08080;}
.tsub{font-family:'Crimson Text',serif;font-style:italic;font-size:.72rem;color:rgba(244,228,193,.42);}
.qdarea{display:flex;align-items:center;gap:14px;}
.qdie{width:72px;height:72px;flex-shrink:0;clip-path:polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%);display:flex;align-items:center;justify-content:center;font-family:'Cinzel Decorative',serif;font-size:1.5rem;font-weight:900;cursor:pointer;user-select:none;}
.qdie:active{transform:scale(.88) rotate(10deg);}
@keyframes qspin{0%{transform:scale(1) rotate(0);}20%{transform:scale(1.22) rotate(-22deg);}45%{transform:scale(.9) rotate(28deg);}70%{transform:scale(1.1) rotate(-10deg);}100%{transform:scale(1) rotate(0);}}
.qdie.spinning{animation:qspin .52s ease;}
.qr-num{font-family:'Cinzel Decorative',serif;font-size:2.8rem;line-height:1;}
.qr-lbl{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.16em;}
.qr-bar{height:5px;border-radius:3px;max-width:150px;transition:width .45s ease,background .3s;}
.qr-empty{font-family:'Crimson Text',serif;font-style:italic;font-size:.82rem;color:rgba(244,228,193,.28);}
.note-area{width:100%;background:rgba(6,3,1,.9);border:1px solid rgba(201,162,39,.22);border-radius:5px;color:rgba(244,228,193,.82);font-family:'Crimson Text',serif;font-size:.82rem;padding:8px 10px;resize:vertical;outline:none;line-height:1.42;min-height:80px;max-height:220px;}
.note-area::placeholder{color:rgba(244,228,193,.2);font-style:italic;}
.note-area:focus{border-color:rgba(201,162,39,.42);}
.logit-btn{margin-top:6px;width:100%;font-family:'Cinzel',serif;font-size:.65rem;letter-spacing:.1em;padding:11px;border-radius:5px;cursor:pointer;background:rgba(201,162,39,.08);border:1.5px solid rgba(201,162,39,.3);color:var(--gold);min-height:44px;}
.logit-btn:active{background:rgba(201,162,39,.22);}
.cbtn{font-family:'Cinzel',serif;font-size:.7rem;letter-spacing:.09em;padding:13px;border-radius:6px;cursor:pointer;border:1.5px solid;width:100%;margin-bottom:6px;min-height:50px;}
.cbtn:last-child{margin-bottom:0;}
.btn-gld{background:linear-gradient(135deg,#c9a227,#a8831a);border-color:#e8c547;color:var(--ink);}
.btn-gld:active{box-shadow:0 0 20px rgba(201,162,39,.45);}
.btn-ol{background:transparent;border-color:var(--border);color:var(--gold);}
.btn-ol:active{background:rgba(201,162,39,.1);}
.btn-bl{background:linear-gradient(135deg,#8b1a1a,#5a0e0e);border-color:#cc2222;color:#f5e6c4;}
.btn-bl:active{box-shadow:0 0 14px rgba(139,26,26,.5);}
.btn-sm{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.1em;padding:9px 12px;border-radius:5px;cursor:pointer;border:1px solid;min-height:36px;}
.btn-sm.ol{background:transparent;border-color:rgba(201,162,39,.3);color:rgba(201,162,39,.7);}
.btn-sm.ol:active{background:rgba(201,162,39,.1);}
.orow{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:6px;margin-bottom:4px;}
.orow.pr{background:rgba(201,162,39,.04);border:1px solid rgba(201,162,39,.08);}
.orow.er{background:rgba(176,24,24,.04);border:1px solid rgba(176,24,24,.08);}
.orow.apr{background:rgba(201,162,39,.14);border-color:rgba(201,162,39,.4);}
.orow.aer{background:rgba(176,24,24,.14);border-color:rgba(176,24,24,.4);}
.oinit{font-family:'Cinzel',serif;font-size:.9rem;min-width:24px;text-align:center;}
.oname{font-family:'Cinzel',serif;font-size:.76rem;flex:1;}
.otag{font-family:'Cinzel',serif;font-size:.5rem;letter-spacing:.1em;padding:2px 7px;border-radius:10px;}
.ptag{color:rgba(201,162,39,.7);border:1px solid rgba(201,162,39,.2);}
.etag{color:rgba(240,100,100,.7);border:1px solid rgba(176,24,24,.25);}
.ab-use-row{display:flex;align-items:center;padding:7px 8px;border-radius:5px;margin-bottom:4px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);}
.ab-use-who{font-family:'Cinzel',serif;font-size:.62rem;color:rgba(244,228,193,.45);margin-right:4px;}
.ab-use-name{font-family:'Crimson Text',serif;font-size:.82rem;color:rgba(244,228,193,.72);flex:1;}
.ab-use-btn{font-family:'Cinzel',serif;font-size:.58rem;padding:5px 10px;border-radius:4px;cursor:pointer;border:1px solid;min-height:30px;}
.ab-use-btn.av{background:rgba(201,162,39,.08);border-color:rgba(201,162,39,.3);color:var(--gold);}
.ab-use-btn.av:active{background:rgba(201,162,39,.22);}
.ab-use-btn.sp{background:rgba(80,40,40,.2);border-color:rgba(80,40,40,.4);color:rgba(244,228,193,.28);cursor:default;}
/* log */
.loglist{display:flex;flex-direction:column;gap:4px;max-height:340px;overflow-y:auto;padding-right:2px;}
.le{padding:6px 9px;border-left:2.5px solid;border-radius:3px;font-size:.76rem;line-height:1.32;}
.le.crit{border-color:#ff3333;color:#ff8888;background:rgba(255,51,51,.05);}
.le.fail{border-color:#3a3a3a;color:#666;}
.le.good{border-color:#2d8a2d;color:#6dbf6d;}
.le.init{border-color:var(--gold);color:var(--gold2);background:rgba(201,162,39,.05);}
.le.spell{border-color:#7b3dd0;color:#b07de8;}
.le.normal{border-color:rgba(244,228,193,.12);color:rgba(244,228,193,.58);}
.le.dice{border-color:#4488cc;color:#88bbee;}
.le.ability{border-color:#c87020;color:#e8a060;}
.lt{font-size:.54rem;opacity:.3;display:block;margin-bottom:1px;}
.lempty{text-align:center;font-style:italic;font-size:.78rem;color:rgba(244,228,193,.17);padding:18px 0;}
.log-clr{background:none;border:none;color:rgba(244,228,193,.22);font-family:'Crimson Text',serif;font-size:.7rem;cursor:pointer;font-style:italic;display:block;margin:0 0 6px auto;}
/* dice */
.dice-purpose-row{display:flex;gap:8px;align-items:stretch;}
.dice-purpose{flex:1;background:rgba(10,5,2,.92);border:1.5px solid rgba(201,162,39,.22);border-radius:6px;color:rgba(244,228,193,.8);font-family:'Crimson Text',serif;font-size:.85rem;padding:8px 10px;outline:none;min-height:44px;}
.dice-purpose::placeholder{color:rgba(244,228,193,.2);font-style:italic;}
.dice-purpose:focus{border-color:rgba(201,162,39,.5);}
.dice-clr{font-family:'Cinzel',serif;font-size:.58rem;background:transparent;border:1.5px solid rgba(201,162,39,.2);color:rgba(201,162,39,.45);border-radius:5px;padding:0 10px;cursor:pointer;min-height:44px;}
.dice-clr:active{background:rgba(201,162,39,.1);color:var(--gold);}
.result-box{background:rgba(10,5,2,.95);border:1.5px solid;border-radius:8px;padding:14px;text-align:center;}
.result-type{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.18em;margin-bottom:3px;}
.result-purpose{font-family:'Crimson Text',serif;font-style:italic;font-size:.75rem;margin-bottom:6px;color:rgba(244,228,193,.5);border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:5px;}
.result-num{font-family:'Cinzel Decorative',serif;font-size:3.2rem;line-height:1.05;}
.result-bar{height:5px;border-radius:3px;margin:6px auto 4px;max-width:120px;}
.result-qlbl{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.14em;}
.dice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.dsk-dice-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.die-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px 8px;border-radius:8px;cursor:pointer;border:1.5px solid;gap:5px;min-height:92px;position:relative;user-select:none;-webkit-user-select:none;touch-action:none;}
.die-btn.holding{transform:scale(1.06);}
.die-btn.cancelling{opacity:.28;filter:grayscale(.85);}
.cancel-x{position:absolute;top:6px;right:8px;font-size:.82rem;font-weight:700;color:#e04040;opacity:0;}
.die-btn.cancelling .cancel-x{opacity:1;}
.die-lbl{font-family:'Cinzel Decorative',serif;font-size:.82rem;font-weight:900;}
@keyframes diceRoll{0%{transform:scale(1) rotate(0);}12%{transform:scale(1.2) rotate(-20deg);}30%{transform:scale(.9) rotate(25deg);}52%{transform:scale(1.12) rotate(-14deg);}72%{transform:scale(.95) rotate(8deg);}100%{transform:scale(1) rotate(0);}}
.die-btn.rolling{animation:diceRoll .58s ease;}
.tip-card{background:rgba(10,5,2,.97);border:1px solid;border-radius:8px;padding:12px;}
.tip-lv{display:flex;gap:5px;margin-bottom:7px;align-items:center;}
.tip-pip{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.tip-title{font-family:'Cinzel',serif;font-size:.7rem;letter-spacing:.1em;margin-bottom:5px;}
.tip-body{font-family:'Crimson Text',serif;font-size:.82rem;color:rgba(244,228,193,.65);line-height:1.48;}
.dhist{margin-top:2px;}
.dhlbl{font-family:'Cinzel',serif;font-size:.56rem;color:rgba(244,228,193,.28);letter-spacing:.18em;margin-bottom:5px;}
.dhrow{display:flex;gap:5px;flex-wrap:wrap;}
.dpip{font-family:'Cinzel',serif;font-size:.68rem;padding:3px 8px;border-radius:20px;border:1px solid;}
/* map */
.map-cs{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:30px 20px;text-align:center;gap:16px;}
.map-cs-title{font-family:'Cinzel Decorative',serif;font-size:1.05rem;color:var(--gold);text-shadow:0 0 20px rgba(201,162,39,.4);}
.map-cs-sub{font-family:'Crimson Text',serif;font-style:italic;font-size:.88rem;color:rgba(244,228,193,.38);line-height:1.55;max-width:300px;}
.map-badge{font-family:'Cinzel',serif;font-size:.58rem;letter-spacing:.2em;padding:5px 14px;border:1px solid rgba(201,162,39,.25);border-radius:20px;color:rgba(201,162,39,.5);}
/* session */
.sess-card{background:rgba(12,7,3,.95);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:8px;}
.sess-card:last-child{margin-bottom:0;}
.sess-hdg{font-family:'Cinzel',serif;font-size:.65rem;color:var(--gold);letter-spacing:.2em;margin-bottom:10px;}
.sess-info{font-family:'Crimson Text',serif;font-size:.8rem;color:rgba(244,228,193,.5);margin-bottom:10px;line-height:1.5;}
.sess-info span{color:rgba(244,228,193,.85);}
.sess-btn{font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.1em;padding:12px;border-radius:6px;cursor:pointer;border:1.5px solid;width:100%;margin-bottom:6px;min-height:48px;}
.sess-btn:last-child{margin-bottom:0;}
.sess-btn.save{background:linear-gradient(135deg,#c9a227,#a8831a);border-color:#e8c547;color:var(--ink);}
.sess-btn.save:active{box-shadow:0 0 18px rgba(201,162,39,.4);}
.sess-btn.load{background:transparent;border-color:rgba(201,162,39,.35);color:var(--gold);}
.sess-btn.load:active{background:rgba(201,162,39,.1);}
.sess-btn.danger{background:rgba(100,20,20,.2);border-color:rgba(176,24,24,.4);color:#e06060;}
.sess-btn.danger:active{background:rgba(176,24,24,.3);}
.sess-msg{font-family:'Crimson Text',serif;font-style:italic;font-size:.78rem;text-align:center;padding:6px;}
/* modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;}
.modal-box{background:#0f0804;border:1.5px solid var(--gold);border-radius:10px;width:100%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(201,162,39,.2);}
.modal-hdr{padding:14px 16px;border-bottom:1px solid rgba(201,162,39,.2);display:flex;align-items:center;justify-content:space-between;}
.modal-ttl{font-family:'Cinzel',serif;font-size:.72rem;color:var(--gold);letter-spacing:.18em;}
.modal-close{background:none;border:none;color:rgba(244,228,193,.4);cursor:pointer;font-size:1.1rem;line-height:1;}
/* auto-save toast */
@keyframes toastIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
@keyframes toastOut{from{opacity:1;}to{opacity:0;}}
.save-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:200;
  background:rgba(12,7,3,.97);border:1.5px solid;border-radius:8px;
  padding:9px 16px;display:flex;align-items:center;gap:8px;
  font-family:'Cinzel',serif;font-size:.62rem;letter-spacing:.12em;
  box-shadow:0 4px 20px rgba(0,0,0,.6);white-space:nowrap;
  animation:toastIn .25s ease;}
.save-toast.hiding{animation:toastOut .3s ease forwards;}
/* save slots */
.slot-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:5px;margin-bottom:4px;border:1px solid;}
.slot-row.valid{background:rgba(201,162,39,.04);border-color:rgba(201,162,39,.15);}
.slot-row.empty{background:rgba(255,255,255,.01);border-color:rgba(255,255,255,.05);}
.slot-row.corrupt{background:rgba(176,24,24,.05);border-color:rgba(176,24,24,.2);}
.slot-row.current{background:rgba(201,162,39,.1);border-color:rgba(201,162,39,.4);}
.slot-num{font-family:'Cinzel',serif;font-size:.65rem;color:rgba(244,228,193,.4);min-width:18px;text-align:center;flex-shrink:0;}
.slot-info{flex:1;min-width:0;}
.slot-time{font-family:'Cinzel',serif;font-size:.58rem;color:rgba(244,228,193,.6);}
.slot-detail{font-family:'Crimson Text',serif;font-size:.7rem;color:rgba(244,228,193,.35);font-style:italic;}
.slot-btn{font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.08em;padding:4px 8px;border-radius:3px;cursor:pointer;border:1px solid;min-height:26px;flex-shrink:0;}
.slot-btn.load-btn{background:rgba(201,162,39,.08);border-color:rgba(201,162,39,.3);color:var(--gold);}
.slot-btn.load-btn:active{background:rgba(201,162,39,.2);}
.slot-btn.del-btn{background:rgba(176,24,24,.06);border-color:rgba(176,24,24,.25);color:#e06060;margin-left:4px;}
.slot-btn.del-btn:active{background:rgba(176,24,24,.2);}
.autosave-bar{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:rgba(201,162,39,.04);border:1px solid rgba(201,162,39,.12);border-radius:5px;margin-bottom:8px;}
.autosave-lbl{font-family:'Cinzel',serif;font-size:.58rem;color:rgba(201,162,39,.6);letter-spacing:.12em;}
.autosave-time{font-family:'Crimson Text',serif;font-style:italic;font-size:.7rem;color:rgba(244,228,193,.35);}
.autosave-toggle{font-family:'Cinzel',serif;font-size:.52rem;padding:3px 8px;border-radius:3px;cursor:pointer;border:1px solid;min-height:24px;}
.autosave-toggle.on{background:rgba(201,162,39,.1);border-color:rgba(201,162,39,.3);color:var(--gold);}
.autosave-toggle.off{background:rgba(80,40,40,.15);border-color:rgba(176,24,24,.3);color:#e06060;}
/* chronicles */
.chron-grid{display:grid;grid-template-columns:160px 1fr;gap:12px;height:100%;}
.chron-side{border-right:1px solid var(--border);padding-right:12px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;}
.ch-item{width:100%;text-align:left;background:rgba(255,255,255,.03);border:1px solid rgba(201,162,39,.1);border-radius:4px;padding:8px 10px;cursor:pointer;transition:all .2s;}
.ch-item.on{background:rgba(201,162,39,.12);border-color:var(--gold);box-shadow:inset 0 0 8px rgba(201,162,39,0.1);}
.ch-item-name{font-family:'Cinzel',serif;font-size:0.62rem;color:rgba(244,228,193,0.4);letter-spacing:0.05em;}
.ch-item.on .ch-item-name{color:var(--gold2);}
.ch-item-date{font-size:0.55rem;color:rgba(244,228,193,0.2);margin-top:2px;font-style:italic;}
.ch-add{width:100%;padding:8px;font-family:'Cinzel',serif;font-size:0.58rem;background:transparent;border:1px dashed var(--border);color:rgba(201,162,39,0.5);cursor:pointer;border-radius:4px;margin-bottom:8px;}
.ch-add:hover{background:rgba(201,162,39,0.05);color:var(--gold);}
.ch-main{display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:4px;}
.ch-title-input{background:transparent;border:none;border-bottom:1.5px solid var(--border);font-family:'Cinzel Decorative',serif;font-size:1.1rem;color:var(--gold);width:100%;padding:4px 0;outline:none;}
.ch-title-input:focus{border-bottom-color:var(--gold);}
.ch-summary-ta{width:100%;background:rgba(201,162,39,0.03);border:1px solid rgba(201,162,39,0.15);border-radius:6px;color:rgba(244,228,193,0.8);font-family:'Crimson Text',serif;font-size:0.9rem;padding:10px 12px;resize:none;outline:none;line-height:1.5;min-height:100px;}
.ch-summary-ta::placeholder{color:rgba(244,228,193,0.2);font-style:italic;}
.ch-summary-ta:focus{border-color:var(--gold);background:rgba(201,162,39,0.06);}
.ch-log-hdr{font-family:'Cinzel',serif;font-size:0.55rem;color:rgba(201,162,39,0.5);letter-spacing:0.2em;border-bottom:1px solid rgba(201,162,39,0.1);padding-bottom:4px;margin-top:8px;}
@media (max-width: 768px) {
  .chron-grid{grid-template-columns: 1fr;}
  .chron-side{border-right:none;border-bottom:1px solid var(--border);padding-right:0;padding-bottom:12px;max-height:120px;flex-direction:row;overflow-x:auto;overflow-y:hidden;}
  .ch-item{min-width:130px;height:fit-content;}
}

`;

// @ts-ignore - Legacy component with custom APIs
export default function DMCockpit() {
  const [pc,       setPc]       = useState(false); // mobile by default
  const [players,  setPlayers]  = useState<Player[]>(INIT_PLAYERS);
  const [enemies,  setEnemies]  = useState<Enemy[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [log,      setLog]      = useState<LogEntry[]>([]);
  const [order,    setOrder]    = useState<any[]>([]);
  const [turn,     setTurn]     = useState(0);
  const [combat,   setCombat]   = useState(false);
  const [tab,      setTab]      = useState("party");
  const [partySub, setPartySub] = useState("players");
  const [editName, setEditName] = useState<number | null>(null);
  const [editCls,  setEditCls]  = useState<number | null>(null);
  const [editMax,  setEditMax]  = useState<number | null>(null);
  const [editMaxE, setEditMaxE] = useState<number | null>(null);
  const [editIcon, setEditIcon] = useState<number | null>(null);
  const [editIconE,setEditIconE]= useState<number | null>(null);

  const [quickRoll, setQuickRoll] = useState<any>(null);
  const [quickSpin, setQuickSpin] = useState(false);
  const [diceResult,setDiceResult]= useState<any>(null);
  const [diceHist,  setDiceHist]  = useState<any[]>([]);
  const [rolling,   setRolling]   = useState<any>(null);
  const [cancelDie, setCancelDie] = useState(false);
  const [tipDie,    setTipDie]    = useState<any>(null);
  const [purpose,   setPurpose]   = useState("");

  const [combatNote, setCombatNote] = useState("");
  const [sessMsg,    setSessMsg]    = useState("");
  const [saveModal,  setSaveModal]  = useState<string | null>(null);
  const [loadText,   setLoadText]   = useState("");
  const [activeSheet,setActiveSheet]= useState<number | null>(null); // For Character Sheet Overlay
  const [sheetTab,   setSheetTab]   = useState("stats"); // 'stats' or 'spellbook'

  const [autoSaveOn,    setAutoSaveOn]    = useState(true);
  const [lastAutoSave,  setLastAutoSave]  = useState<string | null>(null);
  const [nextAutoSlot,  setNextAutoSlot]  = useState(3); // Start at Slot 4 (index 3)
  const [showHints,     setShowHints]     = useState(false); // Beginner Mode
  const [toastMsg,      setToastMsg]      = useState<ToastMessage | null>(null);
  const [slotMeta,      setSlotMeta]      = useState<SlotMeta[]>(Array.from({length:NUM_SLOTS},(_,i)=>({index:i,empty:true})));
  const toastTimer = useRef(null);

  const touchRef=useRef({active:false,die:null,sx:0,sy:0,cancelled:false});
  const h1=useRef(),h2=useRef(),h3=useRef(),didRoll=useRef(false);

  /* ── toast helper ── */
  const showToast = useCallback((text, color="#c9a227") => {
    clearTimeout(toastTimer.current);
    setToastMsg({ text, color, hiding: false });
    toastTimer.current = setTimeout(() => {
      setToastMsg(t => t ? { ...t, hiding: true } : null);
      setTimeout(() => setToastMsg(null), 320);
    }, 2400);
  }, []);

  /* ── performSave: async, uses stateRef so it's never stale ── */
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = { players, enemies, log, chapters, activeChapterId, diceHist: diceHist || [], combat, order, turn };
  });

  const refreshSlotMeta = useCallback(async () => {
    const meta = await readAllSlotMeta();
    setSlotMeta(meta);
  }, []);

  const performSave = useCallback(async (manual: boolean | number = false) => {
    try {
      const save = buildSave(stateRef.current);
      let slot = 0;
      
      if (typeof manual === "number") {
        slot = manual;
      } else if (manual === true) {
        slot = 0; // Default manual save to Slot 1
      } else {
        slot = nextAutoSlot;
      }

      const ok = await writeSlot(slot, save);
      if (ok) {
        if (manual === false) {
          setNextAutoSlot(prev => prev === 3 ? 4 : 3);
        }
        setLastAutoSave(save.payload.savedAt);
        await refreshSlotMeta();
        const slotLabel = manual === false ? " (Auto)" : " (Manual)";
        showToast(`💾 Saved to slot ${slot + 1}${slotLabel}`, "#c9a227");
      } else {
        showToast("⚠ Save failed", "#d43020");
      }
    } catch {
      showToast("⚠ Save error", "#d43020");
    }
  }, [nextAutoSlot, showToast, refreshSlotMeta]);



  /* ── auto-save interval (20m) ── */
  useEffect(() => {
    if (!autoSaveOn) return;
    const id = setInterval(() => { performSave(false); }, 1200000);
    return () => clearInterval(id);
  }, [autoSaveOn, performSave]);

  /* ── auto-load on mount: find best valid save, load slot meta ── */
  useEffect(() => {
    (async () => {
      // Always load slot meta first
      const meta = await readAllSlotMeta();
      setSlotMeta(meta);

      const best = await findBestSave();
      if (!best) return;
      const p = best.payload;
      try {
        if (p.players) setPlayers(p.players.map(pl => ({
          ...mkPlayer(), ...pl,
          abilities:  pl.abilities  || [],
          notes:      pl.notes      || "",
          spellNames: pl.spellNames || ["","",""],
          rollNote:   pl.rollNote   || "",
        })));
        if (p.enemies) setEnemies(p.enemies.map(e => ({ ...e, abilities: e.abilities||[] })));
        if (p.log)     setLog(p.log);
        if (p.chapters && p.chapters.length > 0) {
          setChapters(p.chapters);
          setActiveChapterId(p.activeChapterId ?? p.chapters[0].id);
        } else {
          // Migration/Initialization: Create Prologue chapter
          const prologue = { id: uid(), name: "Prologue", summary: "The story begins...", timestamp: new Date().toISOString() };
          setChapters([prologue]);
          setActiveChapterId(prologue.id);
          // If there were logs, they now belong to the prologue
          if (p.log) setLog(p.log.map(le => ({ ...le, chapterId: le.chapterId ?? prologue.id })));
        }
        if (p.order && p.order.length > 0) {
          setOrder(p.order);
          setTurn(p.turn ?? 0);
          setCombat(p.combat ?? false);
        }
        // Advance slot pointer past the one we just loaded
        if (best) { // Ensure 'best' is defined before using it
          setNextAutoSlot(best.index === 3 ? 4 : 3); // Prep for the *next* auto-save
        }
        setLastAutoSave(p.savedAt);
        showToast("✓ Session restored", "#28a040");
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addLog=(msg,type="normal")=>{
    const t=new Date().toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit"});
    setLog(prev=>[...prev,{id:uid(),t,msg,type,chapterId:activeChapterId}]);
  };

  const rt=(n,e=false)=>{
    if(!n)return"empty";
    if(e)return n===20?"ecrit":n===1?"efail":n>=15?"egood":"enorm";
    return n===20?"crit":n===1?"fail":n>=15?"good":"norm";

  };

  /* ── players ── */
  const setP = (id,fn) => setPlayers(ps=>ps.map(p=>p.id===id?{...p,...fn(p)}:p));
  const setE = (id,fn) => setEnemies(es=>es.map(e=>e.id===id?{...e,...fn(e)}:e));

  const rollP20=(id)=>{
    const n=rDie(20);
    setP(id,p=>{
      const note=p.rollNote;
      const type=n===20?"crit":n===1?"fail":n>=15?"good":"normal";
      addLog(`${p.name}${note?` [${note}]`:""} rolled ${n}${n===20?" — CRIT! 🎯":n===1?" — FUMBLE 💀":""}`,type);
      return{roll:n};
    });
  };

  const updPHp=(id,d)=>setP(id,p=>{
    const hp=Math.max(0,Math.min(p.max,p.hp+d));
    const actual=hp-p.hp;
    if(actual!==0){
      const arrow=actual>0?"❤️ healed":"💔 took damage";
      addLog(`${p.name} ${arrow}: ${actual>0?"+":""}${actual} HP (${hp}/${p.max})`,actual>0?"good":"fail");
    }
    if(hp===0&&p.hp>0)addLog(`${p.name} has fallen! ☠️`,"fail");
    return{hp};
  });

  const commitMax=(id,val)=>{
    const n=parseInt(val);
    if(!isNaN(n)&&n>0){setP(id,p=>({max:n,hp:Math.min(p.hp,n)}));}
    setEditMax(null);
  };

  const commitMaxE=(id,val)=>{
    const n=parseInt(val);
    if(!isNaN(n)&&n>0){setE(id,e=>({max:n,hp:Math.min(e.hp,n)}));}
    setEditMaxE(null);
  };

  const toggleSlot=(id,lv,si)=>setP(id,p=>{
    const slots=[...p.slots];slots[lv]=si<slots[lv]?si:si+1;
    const spellName=p.spellNames?.[lv]?.trim();
    const slotUsed=si>=slots[lv]-1; // true when consuming (not recovering)
    if(spellName)
      addLog(`${p.name} cast ${spellName} (Lv${lv+1} slot)`,"spell");
    else
      addLog(`${p.name} used a level ${lv+1} slot`,"spell");
    return{slots};
  });

  const addAbP=(pid)=>setP(pid,p=>{
    if(p.abilities.length>=5)return{};
    return{abilities:[...p.abilities,{id:uid(),name:"",used:false}]};
  });
  const updAbNameP=(pid,aid,name)=>setP(pid,p=>({abilities:p.abilities.map(a=>a.id===aid?{...a,name}:a)}));
  const toggleAbP=(pid,aid)=>setP(pid,p=>{
    const ab=p.abilities.find(a=>a.id===aid);
    if(ab&&!ab.used)addLog(`${p.name} uses ${ab.name||"ability"}!`,"ability");
    return{abilities:p.abilities.map(a=>a.id===aid?{...a,used:!a.used}:a)};
  });
  const rmAbP=(pid,aid)=>setP(pid,p=>({abilities:p.abilities.filter(a=>a.id!==aid)}));

  const addAbE=(eid)=>setE(eid,e=>{
    if(e.abilities.length>=5)return{};
    return{abilities:[...e.abilities,{id:uid(),name:"",used:false}]};
  });
  const updAbNameE=(eid,aid,name)=>setE(eid,e=>({abilities:e.abilities.map(a=>a.id===aid?{...a,name}:a)}));
  const toggleAbE=(eid,aid)=>setE(eid,e=>{
    const ab=e.abilities.find(a=>a.id===aid);
    if(ab&&!ab.used)addLog(`${e.name} uses ${ab.name||"ability"}!`,"ability");
    return{abilities:e.abilities.map(a=>a.id===aid?{...a,used:!a.used}:a)};
  });
  const rmAbE=(eid,aid)=>setE(eid,e=>({abilities:e.abilities.filter(a=>a.id!==aid)}));

  const addPlayer=()=>{
    if(players.length>=6)return;
    const np=mkPlayer();
    if(combat){
      const n=rDie(20);np.init=n;
      addLog(`${np.name} joins combat! Initiative ${n}`,"init");
      setOrder(o=>[...o,{id:np.id,name:np.name,init:n,isEnemy:false,icon:P_ICONS[np.cls]||"⚔️"}].sort((a,b)=>b.init-a.init));
    }
    setPlayers(ps=>[...ps,np]);
    addLog("A new adventurer joins!","good");
  };

  /* ── enemies ── */
  const rollE20=(id)=>{
    const n=rDie(20);
    setE(id,e=>{
      const type=n===20?"crit":n===1?"fail":n>=15?"good":"normal";
      addLog(`${e.name} attacks! Rolled ${n}${n===20?" — ENEMY CRIT! 🔥":n===1?" — FUMBLE":""}`,type);
      return{roll:n};
    });
  };
  const updEHp=(id,d)=>setE(id,e=>{
    const hp=Math.max(0,Math.min(e.max,e.hp+d));
    const actual=hp-e.hp;
    if(actual!==0){
      const arrow=actual>0?"was healed":"took damage";
      addLog(`${e.name} ${arrow}: ${actual>0?"+":""}${actual} HP (${hp}/${e.max})`,actual>0?"good":"fail");
    }
    if(hp===0&&e.hp>0)addLog(`${e.name} defeated! 💀`,"good");
    return{hp};
  });
  const addEnemy=()=>{
    if(enemies.length>=8)return;
    const ne={id:uid(),name:"Goblin",type:"Goblin",hp:14,max:14,init:0,roll:null,abilities:[],notes:"",rollNote:""};
    if(combat){
      const n=rDie(20);ne.init=n;
      addLog(`${ne.name} ambushes! Initiative ${n}`,"init");
      setOrder(o=>[...o,{id:ne.id,name:ne.name,init:n,isEnemy:true,icon:E_ICONS[ne.type]||"❓"}].sort((a,b)=>b.init-a.init));
    }
    setEnemies(es=>[...es,ne]);
    addLog("An enemy appears! 👺","fail");
  };

  /* ── combat ── */
  const rollInit=()=>{
    const rp=players.map(p=>{const n=rDie(20);addLog(`${p.name}: initiative ${n}`,"init");return{...p,init:n};});
    const re=enemies.map(e=>{const n=rDie(20);addLog(`${e.name}: initiative ${n}`,"init");return{...e,init:n};});
    setPlayers(rp);setEnemies(re);
    const combined=[
      ...rp.map(p=>({id:p.id,name:p.name,init:p.init,isEnemy:false,icon:P_ICONS[p.cls]||"⚔️"})),
      ...re.map(e=>({id:e.id,name:e.name,init:e.init,isEnemy:true, icon:E_ICONS[e.type]||"❓"})),
    ].sort((a,b)=>b.init-a.init);
    setOrder(combined);setTurn(0);setCombat(true);
    addLog("⚔️ Combat begins!","crit");setTab("combat");
  };
  const nextTurn=()=>{
    const n=(turn+1)%Math.max(order.length,1);setTurn(n);
    if(order[n])addLog(`${order[n].name}'s turn`,"init");
  };
  const endCombat=()=>{setCombat(false);setOrder([]);addLog("Combat ended.","normal");};
  const logNote=()=>{if(!combatNote.trim())return;addLog(`📝 ${combatNote.trim()}`,"normal");setCombatNote("");};
  const longRest=()=>{setPlayers(ps=>ps.map(p=>({...p,hp:p.max,slots:[0,0,0],abilities:p.abilities.map(a=>({...a,used:false}))})));addLog("⛺ Long rest — all restored","good");};
  const shortRest=()=>{setPlayers(ps=>ps.map(p=>({...p,abilities:p.abilities.map(a=>({...a,used:false}))})));addLog("🌙 Short rest — abilities restored","normal");};

  /* ── quick d20 ── */
  const doQuick=()=>{
    if(quickSpin)return;setQuickSpin(true);
    setTimeout(()=>{const n=rDie(20);setQuickRoll(n);setQuickSpin(false);addLog(`Quick d20: ${n}${n===20?" — CRIT! 🎯":n===1?" — FUMBLE 💀":""}`,n===20?"crit":n===1?"fail":n>=15?"good":"normal");},530);
  };

  /* ── dice tab ── */
  const clearH=()=>{clearTimeout(h1.current);clearTimeout(h2.current);clearTimeout(h3.current);};
  const triggerRoll=useCallback((die)=>{
    if(didRoll.current)return;didRoll.current=true;clearH();setRolling(die.sides);
    setTimeout(()=>{
      const n=rDie(die.sides);setRolling(null);
      const p=purpose.trim();
      setDiceResult({...die,val:n,purpose:p});
      setDiceHist(h=>[{...die,val:n,id:Date.now()},...h.slice(0,11)]);
      addLog(p?`Rolled ${die.label} for "${p}": ${n}${n===die.sides?" — MAX! 🎉":""}`:
              `Rolled ${die.label}: ${n}${n===die.sides?" — MAX! 🎉":""}`, "dice");
    },580);
  },[purpose]);
  const startHold=(die)=>{clearH();didRoll.current=false;
    h1.current=setTimeout(()=>setTipDie({die,level:1}),250);
    h2.current=setTimeout(()=>setTipDie({die,level:2}),800);
    h3.current=setTimeout(()=>setTipDie({die,level:3}),1800);
  };
  const onTS=(die,ev)=>{ev.preventDefault();const t=ev.touches[0];touchRef.current={active:true,die,sx:t.clientX,sy:t.clientY,cancelled:false};setCancelDie(false);startHold(die);};
  const onTM=(ev)=>{if(!touchRef.current.active)return;const t=ev.touches[0],dx=t.clientX-touchRef.current.sx,dy=t.clientY-touchRef.current.sy;if(Math.sqrt(dx*dx+dy*dy)>45&&!touchRef.current.cancelled){touchRef.current.cancelled=true;setCancelDie(true);clearH();setTipDie(null);}};
  const onTE=()=>{if(!touchRef.current.active)return;touchRef.current.active=false;if(!touchRef.current.cancelled)triggerRoll(touchRef.current.die);setTimeout(()=>setCancelDie(false),150);};

  /* ── session ── */
  const saveGame=()=>{
    performSave(true);  // async, fire and forget — toast will confirm
    const data={version:SAVE_VERSION,savedAt:new Date().toISOString(),players,enemies,log:log.slice(-30),diceHistory:diceHist.slice(0,8)};
    setSaveModal(JSON.stringify(data,null,2));
  };
  const loadGame=(jsonStr)=>{
    try{
      const d=JSON.parse(jsonStr);
      // Basic structure validation
      if(!d || !Array.isArray(d.players)) throw new Error("Missing players");
      setPlayers(d.players.map(p=>({...mkPlayer(),...p,abilities:p.abilities||[],notes:p.notes||"",spellNames:p.spellNames||["","",""],rollNote:p.rollNote||""})));
      if(d.enemies)setEnemies(d.enemies.map(e=>({...e,abilities:e.abilities||[]})));
      if(d.log)setLog(d.log);
      if(d.diceHistory)setDiceHist(d.diceHistory);
      setCombat(false);setOrder([]);setTurn(0);
      setSessMsg("Session loaded! ✓");setTimeout(()=>setSessMsg(""),2500);
      return true;
    }catch(err){setSessMsg("⚠ Invalid JSON — "+err.message);setTimeout(()=>setSessMsg(""),3500);return false;}
  };
  const loadFromSlot=async(slotIndex)=>{
    const slot=await readSlot(slotIndex);
    if(!slot||slot.corrupted){showToast("⚠ Slot "+(slotIndex+1)+" is corrupted","#d43020");return;}
    const p=slot.payload;
    try{
      if(p.players)setPlayers(p.players.map(pl=>({...mkPlayer(),...pl,abilities:pl.abilities||[],notes:pl.notes||"",spellNames:pl.spellNames||["","",""],rollNote:pl.rollNote||""})));
      if(p.enemies)setEnemies(p.enemies.map(e=>({...e,abilities:e.abilities||[]})));
      if(p.log)setLog(p.log);
      if(p.order&&p.order.length>0){setOrder(p.order);setTurn(p.turn??0);setCombat(p.combat??false);}
      else{setCombat(false);setOrder([]);setTurn(0);}
      // Loading stays independent of next auto-save slot for now
      setLastAutoSave(p.savedAt);
      showToast("✓ Loaded slot "+(slotIndex+1),"#28a040");
    }catch(err){showToast("⚠ Load failed: "+err.message,"#d43020");}
  };

  /* ── global keyboard shortcuts ── */
  useEffect(() => {
    const handleKD = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)) return;
      
      const key = e.key.toLowerCase();
      if (key === "n" && combat) { e.preventDefault(); nextTurn ? nextTurn() : null; }
      if (key === "d") { e.preventDefault(); setTab("dice"); }
      if (key === "c") { e.preventDefault(); setTab("chronicles"); }
      if (key === "p") { e.preventDefault(); setTab("party"); }
      if (key === "s") { e.preventDefault(); setTab("session"); }
      if (key === "h") { e.preventDefault(); setShowHints(h => !h); }
    };
    window.addEventListener("keydown", handleKD);
    return () => window.removeEventListener("keydown", handleKD);
  }, [combat, nextTurn]);

  const deleteSlot=async(slotIndex)=>{
    await deleteSlotStorage(slotIndex);
    await refreshSlotMeta();
    showToast("Slot "+(slotIndex+1)+" deleted","#888");
  };
  const resetAll=async()=>{
    if(!window.confirm("Reset all session data AND clear all save slots?"))return;
    setPlayers(INIT_PLAYERS);setEnemies([]);setLog([]);setOrder([]);setTurn(0);
    setCombat(false);setDiceResult(null);setDiceHist([]);setPurpose("");setQuickRoll(null);
    setNextAutoSlot(3);setLastAutoSave(null);
    for(let i=0;i<NUM_SLOTS;i++) await deleteSlotStorage(i);
    await refreshSlotMeta();
    showToast("Session reset","#888");
    setSessMsg("Reset.");setTimeout(()=>setSessMsg(""),2000);
  };

  /* ── derived ── */
  const cur=order[turn], isEnTurn=cur?.isEnemy;
  const hasAb=players.some(p=>p.abilities.length>0);
  const qc=quickRoll?qColor(quickRoll,20):"var(--gold)";

  const MapSVG=({size=140})=>(
    <svg width={size} height={size} viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(201,162,39,.14)" strokeWidth="2"/>
      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(201,162,39,.07)" strokeWidth="1"/>
      <polygon points="100,18 108,95 100,85 92,95" fill="rgba(201,162,39,.6)"/>
      <polygon points="100,182 108,105 100,115 92,105" fill="rgba(201,162,39,.28)"/>
      <polygon points="18,100 95,92 85,100 95,108" fill="rgba(201,162,39,.28)"/>
      <polygon points="182,100 105,92 115,100 105,108" fill="rgba(201,162,39,.28)"/>
      <text x="100" y="12" textAnchor="middle" fill="rgba(201,162,39,.8)" fontSize="12" fontFamily="serif">N</text>
      <text x="100" y="195" textAnchor="middle" fill="rgba(201,162,39,.45)" fontSize="10" fontFamily="serif">S</text>
      <text x="8" y="104" textAnchor="middle" fill="rgba(201,162,39,.45)" fontSize="10" fontFamily="serif">W</text>
      <text x="192" y="104" textAnchor="middle" fill="rgba(201,162,39,.45)" fontSize="10" fontFamily="serif">E</text>
      <circle cx="100" cy="100" r="8" fill="none" stroke="rgba(201,162,39,.38)" strokeWidth="1.5"/>
      <circle cx="100" cy="100" r="3" fill="rgba(201,162,39,.5)"/>
      {[45,135,225,315].map((ang,i)=>{const x=100+65*Math.cos(ang*Math.PI/180),y=100+65*Math.sin(ang*Math.PI/180);return <circle key={i} cx={x} cy={y} r="3" fill="rgba(201,162,39,.22)"/>;} )}
    </svg>
  );

  /* ─────────────────────────────────────────
     RENDER HELPERS (inline JSX, not components)
  ───────────────────────────────────────── */

  const renderPlayerCard=(p)=>{
    const pct=p.hp/p.max, isCaster=CASTERS.includes(p.cls);
    const isActive = combat && cur && cur.id === p.id && !cur.isEnemy;
    return (
      <div key={p.id} className={`pc ${p.hp===0?"dead":""} ${isActive?"active-turn":""}`}>
        {/* Name row */}
        <div className="nrow">
          {editIcon===p.id ? (
            <input className="ninput nicon-input" defaultValue={p.icon||P_ICONS[p.cls]} autoFocus
              style={{width:40,fontSize:"1.6rem",textAlign:"center"}}
              onBlur={e=>{setP(p.id,()=>({icon:e.target.value}));setEditIcon(null);}}
              onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLElement).blur();}}/>
          ):(
            <div className="nicon" onClick={()=>setEditIcon(p.id)} style={{cursor:"pointer"}} title="Edit icon">
              {p.icon||P_ICONS[p.cls]||"⚔️"}
            </div>
          )}
          <div className="nfields">
            {editName===p.id ? (
              <input className="ninput" defaultValue={p.name} autoFocus
                onBlur={e=>{setP(p.id,()=>({name:e.target.value||p.name}));setEditName(null);}}
                onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLElement).blur();}}/>
            ):(
              <div className="ndisp" onClick={()=>setEditName(p.id)}>
                <span className="ntxt">{p.name}</span><span className="npen">✏</span>
              </div>
            )}
            <div className="clsrow">
              {editCls===p.id ? (
                <select className="clss" value={p.cls} autoFocus
                  onChange={e=>{setP(p.id,()=>({cls:e.target.value}));setEditCls(null);}}
                  onBlur={()=>setEditCls(null)}>
                  {CLASSES.map(c=><option key={c}>{c}</option>)}
                </select>
              ):(
                <span className="clsd" onClick={()=>setEditCls(p.id)}>{p.cls} ▾</span>
              )}
              <button className="char-btn" onClick={()=>setActiveSheet(p.id)}>SHEET</button>
            </div>
          </div>
          {!combat && <div className="ibadge"><strong>{p.ac || 10}</strong><span>AC</span></div>}
          {combat&&<div className="ibadge"><strong>{p.init||"—"}</strong><span>INIT</span></div>}
          <button className="rmbtn" onClick={()=>setPlayers(ps=>ps.filter(x=>x.id!==p.id))}>✕</button>
        </div>
        {/* HP row */}
        <div className="hrow">
          <div className="hlbl p">HP</div>
          <div className="htrack"><div className="hfill" style={{width:`${pct*100}%`,background:hpCol(pct)}}/></div>
          <div className="hval p">{p.hp}/{p.max}</div>
          {editMax===p.id ? (
            <input className="max-input" type="number" defaultValue={p.max} autoFocus min={1}
              onBlur={e=>commitMax(p.id,e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLElement).blur();}}/>
          ):(
            <button className="max-btn" onClick={()=>setEditMax(p.id)} title="Edit max HP">✎</button>
          )}
        </div>
        {showHints && <div className="hint-text">Adjust HP: Red for damage, Green for healing. "Full" to restore.</div>}
        <div className="hbtns">
          <button className="hb pd" onClick={()=>updPHp(p.id,-10)}>−10</button>
          <button className="hb pd" onClick={()=>updPHp(p.id,-5)}>−5</button>
          <button className="hb pd" onClick={()=>updPHp(p.id,-1)}>−1</button>
          <button className="hb ph" onClick={()=>updPHp(p.id,+5)}>+5</button>
          <button className="hb ph" onClick={()=>updPHp(p.id,p.max-p.hp)}>Full</button>
        </div>
        {/* Spell slots */}
        {isCaster&&(
          <div className="sps">
            <div className="spt">✦ SPELL SLOTS</div>
            {[0,1,2].map(lv=>(
              <div key={lv} className="spr">
                <span className="splv">{lv+1}</span>
                {Array.from({length:SPELL_MAX[lv]}).map((_,si)=>(
                  <div key={si} className={`dot ${si<p.slots[lv]?"used":""}`} onClick={()=>toggleSlot(p.id,lv,si)}/>
                ))}
                <input className="spell-name-input"
                  value={p.spellNames?.[lv]||""}
                  onChange={e=>setP(p.id,()=>({spellNames:p.spellNames.map((s,i)=>i===lv?e.target.value:s)}))}
                  placeholder={`Lv${lv+1} spell…`}/>
              </div>
            ))}
            {showHints && <div className="hint-text">Tap the dots to consume spell slots. Enter spell names for your log.</div>}
          </div>
        )}
        {/* Abilities */}
        <div className="abs">
          <div className="abt">
            <span className="abt-lbl">✦ ABILITIES ({p.abilities.length}/5)</span>
            {p.abilities.length<5&&<button className="ab-add" onClick={()=>addAbP(p.id)}>+ Add</button>}
          </div>
          <div className="ablist">
            {p.abilities.map(ab=>(
              <div key={ab.id} className="abrow">
                <div className={`ab-slot ${ab.used?"used":""}`} onClick={()=>toggleAbP(p.id,ab.id)}/>
                <input className="abname" value={ab.name}
                  onChange={e=>updAbNameP(p.id,ab.id,e.target.value)}
                  placeholder="Ability name…"/>
                <button className="ab-rm" onClick={()=>rmAbP(p.id,ab.id)}>✕</button>
              </div>
            ))}
            {p.abilities.length===0&&<div className="ab-empty p">No abilities yet</div>}
          </div>
        </div>
        {/* Notes */}
        <div className="notes-section">
          <div className="notes-lbl">✦ NOTES</div>
          <textarea className="notes-ta" rows={2} placeholder="Character notes, conditions…"
            value={p.notes||""}
            onChange={e=>setP(p.id,()=>({notes:e.target.value}))}/>
        </div>
        {/* Roll area */}
        <div className="rarea">
          <div className={`d20b ${rt(p.roll)}`} onClick={()=>rollP20(p.id)}>
            {p.roll??<span style={{fontSize:".65rem"}}>d20</span>}
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:3,minWidth:0}}>
            <input className="roll-note-input"
              value={p.rollNote||""}
              onChange={e=>setP(p.id,()=>({rollNote:e.target.value}))}
              placeholder="What to roll for…"/>
            {p.roll?(
              <>
                <div className="rres p">{p.roll}</div>
                <div className="rhint p">{p.roll===20?"Natural 20! ✨":p.roll===1?"Critical fail 💀":p.roll>=15?"Strong roll":"Last roll"}</div>
              </>
            ):(
              <div className="rhint p">Tap die to roll</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEnemyCard=(e)=>{
    const pct=e.hp/e.max;
    const isActive = combat && cur && cur.id === e.id && cur.isEnemy;
    return (
      <div key={e.id} className={`ecard ${e.hp===0?"dead":""} ${isActive?"active-turn":""}`}>
        <div className="nrow">
          {editIconE===e.id ? (
            <input className="ninput nicon-input en-ni" defaultValue={e.icon||E_ICONS[e.type]} autoFocus
              style={{width:40,fontSize:"1.6rem",textAlign:"center"}}
              onBlur={ev=>{setE(e.id,()=>({icon:ev.target.value}));setEditIconE(null);}}
              onKeyDown={ev=>{if(ev.key==="Enter")(ev.target as HTMLElement).blur();}}/>
          ):(
            <div className="nicon" onClick={()=>setEditIconE(e.id)} style={{cursor:"pointer"}} title="Edit icon">
              {e.icon||E_ICONS[e.type]||"❓"}
            </div>
          )}
          <div className="nfields">
            {editName===e.id ? (
              <input className="ninput en-ni" defaultValue={e.name} autoFocus
                onBlur={ev=>{setE(e.id,()=>({name:ev.target.value||e.name}));setEditName(null);}}
                onKeyDown={ev=>{if(ev.key==="Enter")(ev.target as HTMLElement).blur();}}/>
            ):(
              <div className="ndisp en-nd" onClick={()=>setEditName(e.id)}>
                <span className="ntxt en-nt">{e.name}</span><span className="npen">✏</span>
              </div>
            )}
            <div className="clsrow">
              {editCls===e.id ? (
                <select className="clss en-cs" value={e.type} autoFocus
                  onChange={ev=>{setE(e.id,()=>({type:ev.target.value,name:ev.target.value!=="Custom"?ev.target.value:e.name}));setEditCls(null);}}
                  onBlur={()=>setEditCls(null)}>
                  {ENEMY_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              ):(
                <span className="clsd en-cd" onClick={()=>setEditCls(e.id)}>{e.type} ▾</span>
              )}
            </div>
          </div>
          {combat&&<div className="ibadge en-ib"><strong>{e.init||"—"}</strong><span>INIT</span></div>}
          <button className="rmbtn" onClick={()=>setEnemies(es=>es.filter(x=>x.id!==e.id))}>✕</button>
        </div>
        <div className="hrow">
          <div className="hlbl e">HP</div>
          <div className="htrack"><div className="hfill" style={{width:`${pct*100}%`,background:hpCol(pct)}}/></div>
          <div className="hval e">{e.hp}/{e.max}</div>
          {editMaxE===e.id ? (
            <input className="max-input" type="number" defaultValue={e.max} autoFocus min={1}
              style={{background:"rgba(50,10,10,.8)",color:"var(--parch)",borderColor:"var(--blood2)"}}
              onBlur={ev=>commitMaxE(e.id,ev.target.value)}
              onKeyDown={ev=>{if(ev.key==="Enter")(ev.target as HTMLElement).blur();}}/>
          ):(
            <button className="max-btn" onClick={()=>setEditMaxE(e.id)}>✎</button>
          )}
        </div>
        {showHints && <div className="hint-text">Track enemy health. '−10/−5/−1' for damage, 'Full' for recovery.</div>}
        <div className="hbtns">
          <button className="hb ed" onClick={()=>updEHp(e.id,-10)}>−10</button>
          <button className="hb ed" onClick={()=>updEHp(e.id,-5)}>−5</button>
          <button className="hb ed" onClick={()=>updEHp(e.id,-1)}>−1</button>
          <button className="hb eh" onClick={()=>updEHp(e.id,+5)}>+5</button>
          <button className="hb eh" onClick={()=>updEHp(e.id,e.max-e.hp)}>Full</button>
        </div>
        {/* Enemy abilities */}
        <div className="abs enemy">
          <div className="abt">
            <span className="abt-lbl e">✦ ABILITIES ({e.abilities.length}/5)</span>
            {e.abilities.length<5&&<button className="ab-add enemy" onClick={()=>addAbE(e.id)}>+ Add</button>}
          </div>
          <div className="ablist">
            {e.abilities.map(ab=>(
              <div key={ab.id} className="abrow">
                <div className={`ab-slot es ${ab.used?"used":""}`} onClick={()=>toggleAbE(e.id,ab.id)}/>
                <input className="abname e" value={ab.name}
                  onChange={ev=>updAbNameE(e.id,ab.id,ev.target.value)}
                  placeholder="Ability name…"/>
                <button className="ab-rm" onClick={()=>rmAbE(e.id,ab.id)}>✕</button>
              </div>
            ))}
            {e.abilities.length===0&&<div className="ab-empty e">No abilities yet</div>}
          </div>
        </div>
        <div className="notes-section">
          <div className="notes-lbl">✦ NOTES</div>
          <textarea className="notes-ta" rows={2} placeholder="Enemy traits, actions…"
            style={{background:"rgba(40,10,10,.3)",borderColor:"rgba(176,24,24,.2)"}}
            value={e.notes||""}
            onChange={ev=>setE(e.id,()=>({notes:ev.target.value}))}/>
        </div>
        <div className="rarea ediv">
          <div className={`d20b ${rt(e.roll,true)}`} onClick={()=>rollE20(e.id)}>
            {e.roll??<span style={{fontSize:".65rem"}}>d20</span>}
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:3,minWidth:0}}>
            <input className="roll-note-input"
              style={{background:"rgba(176,24,24,.05)",borderColor:"rgba(176,24,24,.15)",color:"#f08080"}}
              value={e.rollNote||""}
              onChange={ev=>setE(e.id,()=>({rollNote:ev.target.value}))}
              placeholder="What to roll for…"/>
            {e.roll?(
              <>
                <div className="rres e">{e.roll}</div>
                <div className="rhint e">{e.roll===20?"Deadly! 🔥":e.roll===1?"Fumbled!":"Attack roll"}</div>
              </>
            ):<div className="rhint e">Tap die to roll</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderDiceGrid=(gridClass="dice-grid")=>(
    <>
      <div className="dice-purpose-row">
        <input className="dice-purpose" value={purpose} onChange={e=>setPurpose(e.target.value)}
          placeholder="What is this roll for? (e.g. Attack on goblin…)" maxLength={60}/>
        {purpose&&<button className="dice-clr" onClick={()=>setPurpose("")}>✕</button>}
      </div>
      {diceResult ? (()=>{
        const qc2=qColor(diceResult.val,diceResult.sides),bw=Math.round((diceResult.val/diceResult.sides)*100);
        return (
          <div className="result-box" style={{borderColor:qc2+"66"}}>
            {diceResult.purpose&&<div className="result-purpose">"{diceResult.purpose}"</div>}
            <div className="result-type" style={{color:qc2}}>{diceResult.label}</div>
            <div className="result-num" style={{color:qc2,textShadow:`0 0 24px ${qc2}88`}}>
              {rolling===diceResult.sides?"…":diceResult.val}
            </div>
            <div className="result-bar" style={{width:`${bw}%`,background:qc2,boxShadow:`0 0 8px ${qc2}55`}}/>
            <div className="result-qlbl" style={{color:qc2}}>{qLabel(diceResult.val,diceResult.sides)}</div>
          </div>
        );
      })() : (
        <div style={{background:"rgba(10,5,2,.8)",border:"1.5px solid rgba(201,162,39,.1)",borderRadius:8,padding:"14px",textAlign:"center"}}>
          <div style={{fontFamily:"Crimson Text",fontStyle:"italic",fontSize:".82rem",color:"rgba(244,228,193,.22)"}}>
            Tap to roll · Hold for tips · Drag away to cancel
          </div>
        </div>
      )}
      <div className={gridClass} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE}>
        {DICE.map(die=>{
          const isR=rolling===die.sides,isC=cancelDie&&touchRef.current.die?.sides===die.sides,isH=tipDie?.die?.sides===die.sides&&!isC;
          return (
            <button key={die.sides}
              className={`die-btn ${isR?"rolling":""} ${isC?"cancelling":""} ${isH?"holding":""}`}
              style={{borderColor:die.color+(isH?"99":"44"),background:`linear-gradient(145deg,${die.dark}dd,${die.dark}99)`}}
              onTouchStart={ev=>onTS(die,ev)}
              onMouseDown={()=>{startHold(die);}}
              onMouseUp={()=>{clearH();if(!didRoll.current)triggerRoll(die);}}
              onMouseLeave={()=>{clearH();didRoll.current=true;}}>
              <span className="cancel-x">✕</span>
              <DieShape sides={die.sides} color={die.color} size={gridClass==="dsk-dice-grid"?60:52}/>
              <span className="die-lbl" style={{color:die.color}}>{die.label}</span>
            </button>
          );
        })}
      </div>
      {showHints && <div className="hint-text" style={{textAlign:"center", marginTop:8}}>PRO TIP: Hold any die to see its average damage and common uses!</div>}

      {tipDie&&(
        <div className="tip-card" style={{borderColor:tipDie.die.color+"44"}}>
          <div className="tip-lv">
            {[1,2,3].map(l=><div key={l} className="tip-pip" style={{background:tipDie.level>=l?tipDie.die.color:tipDie.die.dark,transition:"background .3s"}}/>)}
            <span style={{fontFamily:"Cinzel",fontSize:".5rem",color:"rgba(244,228,193,.28)",letterSpacing:".15em",marginLeft:4}}>
              {tipDie.level===1?"BASIC":tipDie.level===2?"DETAILED":"EXPERT"}
            </span>
          </div>
          <div className="tip-title" style={{color:tipDie.die.color}}>When to use the {tipDie.die.label}</div>
          <div className="tip-body">{tipDie.level===1&&tipDie.die.tip1}{tipDie.level===2&&tipDie.die.tip2}{tipDie.level===3&&tipDie.die.tip3}</div>
        </div>
      )}
      {diceHist.length>0&&(
        <div className="dhist">
          <div className="dhlbl">RECENT ROLLS</div>
          <div className="dhrow">
            {diceHist.map(h=>{const c=qColor(h.val,h.sides);return <div key={h.id} className="dpip" style={{color:c,borderColor:c+"55",background:h.dark+"cc"}}>{h.label}:{h.val}</div>;})}
          </div>
        </div>
      )}
    </>
  );

  const renderCombatSections=()=>{
    /* find the player or enemy whose turn it is */
    const turnPlayer = cur&&!cur.isEnemy ? players.find(p=>p.id===cur.id) : null;
    const turnEnemy  = cur&&cur.isEnemy  ? enemies.find(e=>e.id===cur.id) : null;

    return (
      <>
        <Section title="🎲 QUICK ROLL" defaultOpen={true}>
          <div className="qdarea">
            <div className={`qdie ${quickSpin?"spinning":""}`}
              style={{background:quickRoll?`linear-gradient(135deg,${qc}cc,${qc}77)`:"linear-gradient(135deg,rgba(201,162,39,.38),rgba(201,162,39,.14))",color:quickRoll?"#fff":"rgba(244,228,193,.38)",boxShadow:quickRoll?`0 0 18px ${qc}55`:"none"}}
              onClick={doQuick}>
              {quickSpin?"…":(quickRoll??"d20")}
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
              {quickRoll?(
                <>
                  <div className="qr-num" style={{color:qc}}>{quickRoll}</div>
                  <div className="qr-bar" style={{width:`${Math.round((quickRoll/20)*100)}%`,background:qc}}/>
                  <div className="qr-lbl" style={{color:qc}}>{qLabel(quickRoll,20)}</div>
                  {quickRoll===20&&<div style={{fontFamily:"Crimson Text",fontStyle:"italic",fontSize:".7rem",color:"#ff7777"}}>Natural 20! 🎯</div>}
                  {quickRoll===1 &&<div style={{fontFamily:"Crimson Text",fontStyle:"italic",fontSize:".7rem",color:"#666"}}>Critical fail 💀</div>}
                </>
              ):<div className="qr-empty">Tap the die to roll d20</div>}
            </div>
          </div>
        </Section>

        <Section title="⚔ CONTROLS" defaultOpen={true}>
          {!combat && <button className="cbtn btn-gld" onClick={rollInit}>⚔ Roll Initiative ({players.length}p + {enemies.length}e)</button>}
          {combat&&<div style={{display:"flex",gap:8}}>
            <button className="cbtn btn-ol" style={{flex:1.5}} onClick={nextTurn}>▶ Next Turn</button>
            <button className="cbtn btn-ol" style={{flex:1}} onClick={rollInit}>⚔ Reroll</button>
            <button className="cbtn btn-bl" style={{flex:1.5}} onClick={endCombat}>✕ End Combat</button>
          </div>}
        </Section>

        {/* Current turn character card */}
        {combat&&cur&&(
          <Section title={`🃏 ACTIVE — ${cur.name}`} defaultOpen={true}>
            {turnPlayer && renderPlayerCard(turnPlayer)}
            {turnEnemy  && renderEnemyCard(turnEnemy)}
          </Section>
        )}

        <Section title="📋 TURN ORDER" badge={order.length||0} defaultOpen={combat}>
          {order.length===0?(
            <div style={{fontFamily:"Crimson Text",fontStyle:"italic",color:"rgba(244,228,193,.22)",fontSize:".8rem",paddingTop:2}}>Roll initiative to populate turn order.</div>
          ):order.map((o,i)=>(
            <div key={o.id} className={`orow ${o.isEnemy?"er":"pr"} ${i===turn?(o.isEnemy?"aer":"apr"):""}`}>
              <span className="oinit" style={{color:o.isEnemy?"#e06060":"var(--gold)"}}>{o.init}</span>
              <span>{o.icon}</span>
              <span className="oname" style={{color:i===turn?(o.isEnemy?"#f08080":"var(--gold2)"):"rgba(244,228,193,.62)"}}>{o.name}</span>
              <span className={`otag ${o.isEnemy?"etag":"ptag"}`}>{o.isEnemy?"FOE":"HERO"}</span>
              {i===turn&&<span style={{color:o.isEnemy?"#f08080":"var(--gold)",fontFamily:"Cinzel",fontSize:".5rem"}}>◀</span>}
            </div>
          ))}
        </Section>

        {hasAb&&(
          <Section title="✦ ABILITY SLOTS" defaultOpen={false}>
            {players.map(p=>p.abilities.map(ab=>(
              <div key={ab.id} className="ab-use-row">
                <span className="ab-use-who">{P_ICONS[p.cls]}</span>
                <span className="ab-use-name">{ab.name||"Ability"}</span>
                <button className={`ab-use-btn ${ab.used?"sp":"av"}`}
                  onClick={()=>!ab.used&&toggleAbP(p.id,ab.id)}>
                  {ab.used?"SPENT":"USE"}
                </button>
              </div>
            )))}
            <div style={{display:"flex",gap:6,marginTop:9}}>
              <button className="btn-sm ol" style={{flex:1}} onClick={shortRest}>🌙 Short Rest</button>
              <button className="btn-sm ol" style={{flex:1}} onClick={longRest}>⛺ Long Rest</button>
            </div>
          </Section>
        )}
      </>
    );
  };

  const renderSession=()=>{
    const fmtTime=(iso)=>{
      if(!iso)return"—";
      try{
        const d=new Date(iso);
        return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
      }catch{return iso;}
    };
    return (
      <>
        {/* Auto-save status bar */}
        <div className="sess-card" style={{padding:"10px 14px"}}>
          <div className="autosave-bar">
            <div>
              <div className="autosave-lbl">⏱ AUTO-SAVE {autoSaveOn?"ON":"OFF"}</div>
              <div className="autosave-time">
                {lastAutoSave?"Last: "+fmtTime(lastAutoSave):"Not saved yet this session"}
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button className={`autosave-toggle ${autoSaveOn?"on":"off"}`} onClick={()=>setAutoSaveOn(v=>!v)}>
                {autoSaveOn?"DISABLE":"ENABLE"}
              </button>
              <button className="autosave-toggle on" onClick={()=>performSave(true)} title="Save now">SAVE NOW</button>
            </div>
          </div>
          <div className="sess-info" style={{marginBottom:0}}>
            Players: <span>{players.length}</span> · Enemies: <span>{enemies.length}</span> · Chronicle: <span>{log.length}</span> · Combat: <span>{combat?"Active":"Inactive"}</span>
            {" · "}Next Auto: <span>Slot {nextAutoSlot + 1}</span>
          </div>
        </div>

        {/* Save slots */}
        <div className="sess-card">
          <div className="sess-hdg">💾 SAVE SLOTS</div>
          {slotMeta.map(s=>{
            const isAuto = s.index >= 3;
            return (
              <div key={s.index} className={`slot-row ${s.empty?"empty":s.corrupted?"corrupt":"valid"}`}>
                <div className="slot-num" style={isAuto?{color:"rgba(201,162,39,.4)"}:{}}>{s.index+1}</div>
                <div className="slot-info">
                  <div className="slot-type" style={{fontSize:".5rem", color:isAuto?"var(--gold)":"rgba(244,228,193,.3)", letterSpacing:".1em", marginBottom:1}}>{isAuto?"AUTO-SAVE":"MANUAL"}</div>
                  {s.empty&&<div className="slot-detail">Empty slot</div>}
                  {s.corrupted&&<><div className="slot-time" style={{color:"#e06060"}}>⚠ Corrupted</div><div className="slot-detail">{s.reason}</div></>}
                  {s.valid&&<>
                    <div className="slot-time">{fmtTime(s.savedAt)}</div>
                    <div className="slot-detail">{s.players}p · {s.enemies}e · {s.log} log entries</div>
                  </>}
                </div>
                <div style={{display:"flex", gap:4}}>
                  <button className="slot-btn save-btn" style={{background:"rgba(201,162,39,.1)",borderColor:"rgba(201,162,39,.4)"}} onClick={()=>performSave(s.index)}>SAVE</button>
                  {s.valid&&<button className="slot-btn load-btn" onClick={()=>loadFromSlot(s.index)}>LOAD</button>}
                  {(s.valid||s.corrupted)&&<button className="slot-btn del-btn" onClick={()=>deleteSlot(s.index)}>✕</button>}
                </div>
              </div>
            );
          })}
          {sessMsg&&<div className="sess-msg" style={{color:sessMsg.includes("⚠")?"#e06060":"rgba(201,162,39,.8)"}}>{sessMsg}</div>}
        </div>

        {/* Export / Import */}
        <div className="sess-card">
          <div className="sess-hdg">📤 EXPORT SESSION</div>
          <button className="sess-btn save" onClick={saveGame}>💾 Export + Save to Slot 1</button>
        </div>
        <div className="sess-card">
          <div className="sess-hdg">📂 IMPORT SESSION</div>
          <div className="sess-info" style={{marginBottom:8}}>Paste previously exported JSON below.</div>
          <textarea style={{width:"100%",minHeight:80,background:"rgba(6,3,1,.9)",border:"1px solid rgba(201,162,39,.22)",borderRadius:5,color:"rgba(244,228,193,.82)",fontFamily:"monospace",fontSize:".72rem",padding:"8px 10px",resize:"vertical",outline:"none",lineHeight:1.4}}
            placeholder="Paste session JSON here…"
            value={loadText}
            onChange={e=>setLoadText(e.target.value)}/>
          <button className="sess-btn load" style={{marginTop:6}} onClick={()=>{if(loadGame(loadText))setLoadText("");}}>📂 Load from Pasted JSON</button>
        </div>

        {/* Quick actions */}
        <div className="sess-card">
          <div className="sess-hdg">⚡ QUICK ACTIONS</div>
          <button className="sess-btn load" style={{marginBottom:6}} onClick={longRest}>⛺ Long Rest — Restore All</button>
          <button className="sess-btn load" style={{marginBottom:6}} onClick={shortRest}>🌙 Short Rest — Restore Abilities</button>
          <button className="sess-btn danger" onClick={resetAll}>⚠ Reset Session &amp; Clear All Slots</button>
        </div>
      </>
    );
  };

  const NAV=[
    {id:"party", ico:"🧙",lbl:"DASHBOARD"},
    {id:"chronicles", ico:"📜",lbl:"CHRONICLES"},
    {id:"dice",  ico:"🎲",lbl:"DICE"},
    {id:"combat",ico:"⚔️", lbl:"COMBAT"},
    {id:"map",   ico:"🗺️", lbl:"MAP"},
    {id:"session",ico:"💾",lbl:"SESSION"},
  ];

  const renderDashboard=()=>(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* 1. Party Vitality Summary */}
      <div className="glass" style={{padding:12}}>
        <div className="sess-hdg" style={{marginBottom:8, display:"flex", justifyContent:"space-between"}}>
          <span>🧙 PARTY VITALITY</span>
          <span style={{fontSize:".5rem",opacity:.5}}>DASHBOARD</span>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {players.map(p => {
            const pct = p.hp / p.max;
            return (
              <div key={p.id} style={{display:"flex", alignItems:"center", gap:10}}>
                <div style={{fontSize:".9rem", width:18}}>{p.icon || P_ICONS[p.cls]}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:2}}>
                    <span style={{fontFamily:"Cinzel", fontSize:".65rem", color:pct<.3?"var(--blood2)":"var(--gold)"}}>{p.name}</span>
                    <span style={{fontSize:".6rem", opacity:.7}}>{p.hp}/{p.max}</span>
                  </div>
                  <div className="htrack" style={{height:4, border:"none", background:"rgba(255,255,255,.05)"}}>
                    <div className="hfill" style={{width:`${pct*100}%`, background:hpCol(pct)}} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {showHints && <div className="hint-text">A quick glance at your party's health. Red means danger!</div>}
      </div>

      {/* 2. Combat Context */}
      {combat && cur && (
        <div className="glass" style={{padding:12, borderLeft:"3px solid var(--gold)"}}>
          <div className="sess-hdg" style={{marginBottom:6}}>⚔️ ACTIVE TURN</div>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div className="hud-turn-ico" style={isEnTurn?{background:"var(--blood2)"}:{}}>{cur.icon}</div>
            <div>
              <div style={{fontFamily:"Cinzel", fontSize:".85rem", color:isEnTurn?"var(--blood2)":"var(--gold2)"}}>{cur.name}</div>
              <div style={{fontSize:".6rem", opacity:.5}}>{isEnTurn?"Enemy":"Player"} · Initiative {cur.init}</div>
            </div>
            <button className="hud-next" style={{marginLeft:"auto", padding:"6px 12px"}} onClick={nextTurn}>NEXT ▶</button>
          </div>
          {showHints && <div className="hint-text">Advance the story! Use the NEXT button to cycle turns.</div>}
        </div>
      )}

      {/* 3. DM Quick Toolbox */}
      <div className="glass" style={{padding:12}}>
        <div className="sess-hdg" style={{marginBottom:8}}>⚡ DM TOOLBOX</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
          <button className="btn-sm ol" onClick={shortRest}>🌙 Short Rest</button>
          <button className="btn-sm ol" onClick={longRest}>⛺ Long Rest</button>
        </div>
        {showHints && <div className="hint-text">Recover resources. Short Rest reset abilities; Long Rest resets everything.</div>}
        
        <div style={{marginTop:10, display:"flex", gap:8}}>
          <button className="btn-sm ol" style={{flex:1}} onClick={()=>setTab("dice")}>🎲 Roll Dice</button>
          <button className="btn-sm ol" style={{flex:1}} onClick={()=>setTab("chronicles")}>📜 Log Event</button>
        </div>
      </div>

      <button className="btn-sm ol" style={{marginTop:4, borderStyle:"dashed", opacity:.6}} onClick={()=>setPartySub(prev=>prev==="players"?"enemies":"players")}>
        {partySub==="players" ? "👉 View Enemy List" : "👈 View Player List"}
      </button>
    </div>
  );

  const partyContent=()=>(
    <>
      {tab==="party" && renderDashboard()}
      
      <div style={{marginTop:16}} />

      <div className="strow">
        <button className={`st ${partySub==="players"?"ap":""}`} onClick={()=>setPartySub("players")}>🧙 PLAYERS</button>
        <div className="stdiv"/>
        <button className={`st ${partySub==="enemies"?"ae":""}`} onClick={()=>setPartySub("enemies")}>💀 ENEMIES</button>
      </div>
      {partySub==="players"&&<div className="card-grid">
        {players.map(renderPlayerCard)}
        {players.length<6&&<button className="addbtn pp" onClick={addPlayer}>＋ Add Player</button>}
      </div>}
      {partySub==="enemies"&&<div className="card-grid">
        {enemies.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"28px 0",fontFamily:"Crimson Text",fontStyle:"italic",color:"rgba(244,228,193,.18)",fontSize:".84rem"}}>No enemies lurk yet…<br/>Add foes to track them in combat.</div>}
        {enemies.map(renderEnemyCard)}
        {enemies.length<8&&<button className="addbtn ep" onClick={addEnemy}>＋ Add Enemy</button>}
      </div>}
    </>
  );

  const mapContent=()=>(
    <div className="map-cs">
      <MapSVG size={140}/>
      <div className="map-cs-title">Realm Map</div>
      <div className="map-cs-sub">Place tokens, draw territories and track your party's journey.</div>
      <div className="map-badge">COMING SOON</div>
    </div>
  );

  const chroniclesContent = () => {
    const activeCh = chapters.find(c => c.id === activeChapterId) || (chapters.length > 0 ? chapters[0] : null);
    if (!activeCh) return <div className="lempty">Gathering the tales...</div>;

    const filteredLogs = log.filter(le => le.chapterId === activeCh.id);

    const addChapter = () => {
      const id = uid();
      const chCount = chapters.filter(c => c.name.toLowerCase().includes("chapter")).length;
      const newCh = {
        id,
        name: `Chapter ${chCount + 1}`,
        summary: "",
        timestamp: new Date().toISOString()
      };
      setChapters(prev => [...prev, newCh]);
      setActiveChapterId(id);
    };

    const updateCh = (fields: Partial<Chapter>) => {
      setChapters(prev => prev.map(c => c.id === activeCh.id ? { ...c, ...fields } : c));
    };

    const prologs = chapters.filter(c => c.name.toLowerCase() === "prologue");
    const others  = chapters.filter(c => c.name.toLowerCase() !== "prologue");

    return (
      <div className="chron-grid">
        <div className="chron-side">
          <button className="ch-add" onClick={addChapter}>＋ New Chapter</button>
          {prologs.map(ch => (
             <button key={ch.id} className={`ch-item ${ch.id === activeCh.id ? "on" : ""}`} onClick={() => setActiveChapterId(ch.id)}>
              <div className="ch-item-name">{ch.name}</div>
              <div className="ch-item-date">{new Date(ch.timestamp).toLocaleDateString()}</div>
            </button>
          ))}
          {prologs.length > 0 && others.length > 0 && <div className="ch-log-hdr" style={{marginBottom: 8}}>CHAPTERS</div>}
          {others.map(ch => (
            <button key={ch.id} className={`ch-item ${ch.id === activeCh.id ? "on" : ""}`} onClick={() => setActiveChapterId(ch.id)}>
              <div className="ch-item-name">{ch.name}</div>
              <div className="ch-item-date">{new Date(ch.timestamp).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
        <div className="ch-main">
          <input className="ch-title-input" value={activeCh.name} onChange={e => updateCh({ name: e.target.value })} placeholder="Chapter Title..." />
          <div className="tsub">History was written in {new Date(activeCh.timestamp).toLocaleDateString()}</div>
          
          <Section title="📜 CHAPTER SUMMARY" defaultOpen={true}>
            <textarea className="ch-summary-ta" 
              placeholder="What happened in this chapter? High-level story beats go here..."
              value={activeCh.summary}
              onChange={e => updateCh({ summary: e.target.value })} />
          </Section>

          <Section title={`🎞️ CHRONICLE FEED (${filteredLogs.length})`} defaultOpen={true}>
             <textarea className="note-area"
                placeholder="Log a specific event to this chapter..."
                value={combatNote}
                onChange={e => setCombatNote(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); logNote(); } }} />
             <div style={{display:"flex", gap:8, marginTop:6}}>
                <button className="logit-btn" style={{flex:1, marginTop:0}} onClick={logNote}>⊕ Log Event</button>
                <button className="log-clr" style={{margin:0}} onClick={() => setLog(prev => prev.filter(l => l.chapterId !== activeCh.id))}>clear chapter</button>
             </div>
             <div className="loglist" style={{marginTop:12}}>
                {filteredLogs.length === 0 && <div className="lempty">No event logs for this chapter yet.</div>}
                {[...filteredLogs].reverse().map(e => (
                  <div key={e.id} className={`le ${e.type}`}><span className="lt">{e.t}</span>{e.msg}</div>
                ))}
             </div>
          </Section>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────
     CHARACTER SHEET OVERLAY
  ───────────────────────────────────────── */
  const renderCharacterSheet = (playerId: number) => {
    const p = players.find(x => x.id === playerId);
    if (!p) return null;

    return (
      <div className="csheet-overlay">
        <div className="csheet-header">
          <div className="csheet-title">Character Sheet</div>
          <button className="csheet-close" onClick={() => setActiveSheet(null)}>✕</button>
        </div>
        <div className="cs-content">
          <div className="cs-hero">
            <div className="nicon" style={{fontSize: "3.5rem"}}>{P_ICONS[p.cls] || "⚔️"}</div>
            <div className="cs-name">{p.name}</div>
            <div className="cs-subtitle">{p.cls} · Level 10</div>
          </div>
          
          <div className="cs-nav">
            <div className={`cs-tab ${sheetTab === "stats" ? "active" : ""}`} onClick={() => setSheetTab("stats")}>STATS</div>
            <div className={`cs-tab ${sheetTab === "spellbook" ? "active" : ""}`} onClick={() => setSheetTab("spellbook")}>SPELLBOOK</div>
          </div>
          
          {sheetTab === "stats" && (
            <>
              <div className="cs-stats-grid">
                {[
                  {k:'STR', keyPath:'str', v:p.stats?.str??10}, 
                  {k:'DEX', keyPath:'dex', v:p.stats?.dex??10}, 
                  {k:'CON', keyPath:'con', v:p.stats?.con??10},
                  {k:'INT', keyPath:'int', v:p.stats?.int??10}, 
                  {k:'WIS', keyPath:'wis', v:p.stats?.wis??10}, 
                  {k:'CHA', keyPath:'cha', v:p.stats?.cha??10}
                ].map((s) => (
                  <div key={s.k} className="cs-statbox">
                    <div className="cs-stat-lbl">{s.k}</div>
                    <input className="cs-stat-val cs-stat-input" type="number" value={s.v} 
                      onChange={e=>setP(p.id,()=>({stats:{...(p.stats||{}),[s.keyPath]:Number(e.target.value)}}))}/>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:10}}>
                 <div className="cs-statbox" style={{flex:1}}>
                   <div className="cs-stat-lbl">HIT POINTS</div>
                   <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap: 5}}>
                     <input type="number" className="cs-stat-val cs-stat-input" value={p.hp} style={{width: 50}} onChange={e=>setP(p.id,()=>({hp:Number(e.target.value)}))}/>
                     <span style={{fontSize:"1.1rem",color:"var(--gold)"}}>/</span>
                     <input type="number" className="cs-stat-val cs-stat-input" value={p.max} style={{width: 50}} onChange={e=>commitMax(p.id,e.target.value)}/>
                   </div>
                 </div>
                 <div className="cs-statbox" style={{flex:1}}>
                   <div className="cs-stat-lbl">ARMOR CLASS</div>
                   <input className="cs-stat-val cs-stat-input" type="number" value={p.ac || 10} onChange={e=>setP(p.id,()=>({ac:Number(e.target.value)}))}/>
                 </div>
              </div>
            </>
          )}

          {sheetTab === "spellbook" && (
            <div style={{marginTop: 16}}>
               <div className="spt" style={{marginBottom:10}}>✦ PREPARED SPELLS ({p.preparedSpells?.length || 0})</div>
               {p.preparedSpells?.length === 0 && <div className="cs-subtitle" style={{textTransform:"none"}}>No spells prepared.</div>}
               {p.preparedSpells?.map(s => (
                 <div key={s} className="spellbook-card">
                   <div className="spellbook-name">{s}</div>
                   <div className="spellbook-desc">A powerful incantation channeling raw arcane or divine energy.</div>
                   <button className="spellbook-btn">Expend Spell Slot</button>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <>
      <style>{CSS}</style>
      <div className="root">

        {/* TOP BAR */}
        <div className="tb">
          <div>
            <div className="tb-t">⚜ DM Grimoire</div>
            <div className="tb-s">{players.length}p · {enemies.length}e · {combat?"⚔ combat":"at rest"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className={`layout-btn ${showHints?"on":""}`} 
              style={showHints?{background:"rgba(201,162,39,.2)", color:"var(--gold2)"}:{}}
              onClick={()=>setShowHints(v=>!v)} title="Toggle Help Mode">
              {showHints?"💡 HINTS ON":"💡 HINTS OFF"}
            </button>
            <button className="layout-btn" onClick={()=>setPc(v=>!v)}>{pc?"📱":"🖥"}</button>
          </div>
        </div>

        {/* PERSISTENT COMBAT HUD */}
        {combat && cur && (
          <div className="hud-bar">
            <div className="hud-turn-ico" style={isEnTurn?{background:"var(--blood2)"}:{}}>{cur.icon}</div>
            <div className="hud-turn-name">{cur.name}</div>
            <div style={{fontSize:".55rem", opacity:.5, letterSpacing:".1em"}}>ACTIVE TURN</div>
            <button className="hud-next" onClick={nextTurn}>NEXT ▶</button>
          </div>
        )}


        {/* INITIATIVE STRIP */}
        <div className="istrip">
          {combat&&order.length>0?(
            <><div className="ilbl">ORDER</div>
            {order.map((o,i)=>(
              <div key={o.id} className={`ichip ${o.isEnemy?"ec":""} ${i===turn?"on":""}`}>
                <span className={`inum ${o.isEnemy?"e":""}`}>{o.init}</span>
                {o.icon} {o.name}
                <span style={{fontSize:".55rem",opacity:0.65}}>({o.isEnemy?enemies.find(x=>x.id===o.id)?.hp:players.find(x=>x.id===o.id)?.hp} HP)</span>
                {i===turn&&<span> ◀</span>}
              </div>
            ))}</>
          ):<div className="iempty">Roll initiative to begin combat…</div>}
        </div>

        {/* ═══ MOBILE ═══ */}
        {!pc&&(
          <div className="mob-body">
            <div className="content">
              {tab==="party" && partyContent()}
              {tab==="chronicles" && chroniclesContent()}
              {tab==="dice"  && renderDiceGrid("dice-grid")}
              {tab==="combat"&&<>
                {combat&&cur&&<div className={`turn-card ${isEnTurn?"et":"pt"}`}>
                  <div className="tsub">Current Turn</div>
                  <div className={`tname ${isEnTurn?"e":""}`}>{cur.icon} {cur.name}</div>
                  <div className="tsub" style={{marginTop:3}}>Initiative {cur.init}</div>
                </div>}
                {renderCombatSections()}
              </>}
              {tab==="map"     && mapContent()}
              {tab==="session" && renderSession()}
            </div>
            <div className="bnav">
              {NAV.map(t=>(
                <button key={t.id} className={`ntab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>
                  {t.id==="party"&&enemies.length>0&&tab!=="party"&&<div className="nbadge">{enemies.length}</div>}
                  {t.id==="chronicles"&&log.length>0&&tab!=="chronicles"&&<div className="nbadge">✦</div>}
                  {t.id==="combat"&&log.length>0&&tab!=="combat"&&<div className="nbadge">{Math.min(log.length,9)}</div>}
                  <div className="nico">{t.ico}</div>
                  <div className="nlbl">{t.lbl}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ DESKTOP ═══ */}
        {pc&&(
          <div className="dsk-body">
            <div className="dsk-side">
              <div style={{padding:"10px 18px 6px",fontFamily:"'Cinzel',serif",fontSize:".5rem",color:"rgba(201,162,39,.35)",letterSpacing:".25em"}}>NAVIGATION</div>
              {NAV.map(t=>(
                <button key={t.id} className={`dsk-ni ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>
                  <span style={{fontSize:"1.15rem",flexShrink:0}}>{t.ico}</span>{t.lbl}
                  {t.id==="party"&&enemies.length>0&&<span style={{background:"var(--blood)",color:"#fff",fontSize:".44rem",minWidth:16,height:16,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",marginLeft:"auto"}}>{enemies.length}</span>}
                  {t.id==="chronicles"&&log.length>0&&<span style={{background:"var(--gold)",color:"var(--ink)",fontSize:".44rem",minWidth:16,height:16,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",marginLeft:"auto"}}>✦</span>}
                  {t.id==="combat"&&log.length>0&&<span style={{background:"var(--blood)",color:"#fff",fontSize:".44rem",minWidth:16,height:16,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",marginLeft:"auto"}}>{Math.min(log.length,9)}</span>}
                </button>
              ))}
              {combat&&cur&&(
                <div style={{margin:"auto 0 0",padding:"12px 16px",borderTop:"1px solid rgba(201,162,39,.12)"}}>
                  <div style={{background:"rgba(201,162,39,.07)",border:"1px solid rgba(201,162,39,.2)",borderRadius:6,padding:"9px 10px"}}>
                    <div style={{fontFamily:"Cinzel",fontSize:".5rem",color:"rgba(201,162,39,.5)",letterSpacing:".15em",marginBottom:3}}>{isEnTurn?"ENEMY TURN":"ACTIVE"}</div>
                    <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:".82rem",color:isEnTurn?"#f08080":"var(--gold2)"}}>{cur.icon} {cur.name}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="dsk-main">
              <div className="dsk-content">
                {tab==="party"&&(
                  <>
                    <div className="strow" style={{maxWidth:400}}>
                      <button className={`st ${partySub==="players"?"ap":""}`} onClick={()=>setPartySub("players")}>🧙 PLAYERS</button>
                      <div className="stdiv"/>
                      <button className={`st ${partySub==="enemies"?"ae":""}`} onClick={()=>setPartySub("enemies")}>💀 ENEMIES</button>
                    </div>
                    {partySub==="players"&&<div className="card-grid">{players.map(renderPlayerCard)}{players.length<6&&<button className="addbtn pp" onClick={addPlayer}>＋ Add Player</button>}</div>}
                    {partySub==="enemies"&&<div className="card-grid">{enemies.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"28px 0",fontFamily:"Crimson Text",fontStyle:"italic",color:"rgba(244,228,193,.18)",fontSize:".84rem"}}>No enemies lurk yet…</div>}{enemies.map(renderEnemyCard)}{enemies.length<8&&<button className="addbtn ep" onClick={addEnemy}>＋ Add Enemy</button>}</div>}
                  </>
                )}
                {tab==="chronicles" && chroniclesContent()}
                {tab==="dice"&&(
                  <div style={{display:"flex",gap:14}}>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>{renderDiceGrid("dsk-dice-grid")}</div>
                    <div style={{width:280,flexShrink:0,display:"flex",flexDirection:"column",gap:10}}>
                      {diceResult&&(()=>{const c=qColor(diceResult.val,diceResult.sides);return(
                        <div style={{background:"rgba(10,5,2,.95)",border:`2px solid ${c}44`,borderRadius:10,padding:"24px",textAlign:"center"}}>
                          <div style={{fontFamily:"Cinzel",fontSize:".65rem",color:c,letterSpacing:".2em",marginBottom:4}}>{diceResult.label}</div>
                          {diceResult.purpose&&<div style={{fontFamily:"Crimson Text",fontStyle:"italic",fontSize:".8rem",color:"rgba(244,228,193,.45)",marginBottom:10}}>"{diceResult.purpose}"</div>}
                          <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"5rem",color:c,lineHeight:1,textShadow:`0 0 40px ${c}66`}}>{diceResult.val}</div>
                          <div style={{height:6,borderRadius:3,margin:"12px auto 8px",maxWidth:160,background:c,width:`${Math.round((diceResult.val/diceResult.sides)*100)}%`}}/>
                          <div style={{fontFamily:"Cinzel",fontSize:".7rem",letterSpacing:".16em",color:c}}>{qLabel(diceResult.val,diceResult.sides)}</div>
                        </div>
                      );})()}
                    </div>
                  </div>
                )}
                {tab==="combat"&&(
                  <div style={{display:"flex",gap:12,overflow:"hidden",flex:1}}>
                    <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:9}}>
                      {combat&&cur&&<div className={`turn-card ${isEnTurn?"et":"pt"}`}><div className="tsub">Current Turn</div><div className={`tname ${isEnTurn?"e":""}`}>{cur.icon} {cur.name}</div><div className="tsub" style={{marginTop:3}}>Initiative {cur.init}</div></div>}
                      {renderCombatSections()}
                    </div>
                  </div>
                )}
                {tab==="map"&&mapContent()}
                {tab==="session"&&renderSession()}
              </div>
            </div>
          </div>
        )}

        {/* CHARACTER SHEET OVERLAY */}
        {activeSheet && renderCharacterSheet(activeSheet)}

        {/* TOAST */}
        {toastMsg&&(
          <div className={`save-toast ${toastMsg.hiding?"hiding":""}`} style={{borderColor:(toastMsg.color as string)+"66",color:toastMsg.color as string}}>
            {(toastMsg as any).text}
          </div>
        )}

        {/* SAVE MODAL */}
        {saveModal&&(
          <div className="modal-bg">
            <div className="modal-box">
              <div className="modal-hdr">
                <span className="modal-ttl">💾 SESSION EXPORT</span>
                <button className="modal-close" onClick={()=>setSaveModal(null)}>✕</button>
              </div>
              <div style={{padding:"10px 16px 6px",fontFamily:"Crimson Text",fontStyle:"italic",fontSize:".78rem",color:"rgba(244,228,193,.45)"}}>
                Select all and copy — paste it into the Load box to restore later.
              </div>
              <textarea readOnly value={saveModal}
                style={{flex:1,margin:"0 16px",background:"rgba(6,3,1,.9)",border:"1px solid rgba(201,162,39,.2)",borderRadius:5,color:"rgba(244,228,193,.8)",fontFamily:"monospace",fontSize:".72rem",padding:"10px",resize:"none",outline:"none",lineHeight:1.45,overflowY:"auto",minHeight:160}}
                onFocus={e=>(e.target as HTMLTextAreaElement).select()} onClick={e=>(e.target as HTMLTextAreaElement).select()}/>
              <div style={{padding:"10px 16px 14px",display:"flex",gap:8}}>
                <button style={{flex:1,fontFamily:"'Cinzel',serif",fontSize:".65rem",letterSpacing:".1em",padding:"11px",borderRadius:6,cursor:"pointer",background:"linear-gradient(135deg,#c9a227,#a8831a)",border:"1.5px solid #e8c547",color:"var(--ink)",minHeight:44}}
                  onClick={()=>navigator.clipboard?.writeText(saveModal).then(()=>{setSessMsg("Copied! ✓");setTimeout(()=>setSessMsg(""),2500);setSaveModal(null);}).catch(()=>setSessMsg("Select all above & copy manually"))}>
                  📋 Copy to Clipboard
                </button>
                <button style={{fontFamily:"'Cinzel',serif",fontSize:".65rem",letterSpacing:".1em",padding:"11px 16px",borderRadius:6,cursor:"pointer",background:"transparent",border:"1.5px solid rgba(201,162,39,.3)",color:"var(--gold)",minHeight:44}}
                  onClick={()=>setSaveModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}