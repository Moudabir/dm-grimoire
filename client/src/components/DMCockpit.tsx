// @ts-nocheck
import {
  useEffect,
  useState,
  useRef,
  useCallback
} from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import AuthModal from './AuthModal';

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
  roll: number | null;
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
  isCloud?: boolean;
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');`;

const CLASSES = ["Fighter", "Wizard", "Rogue", "Cleric", "Ranger", "Paladin", "Barbarian", "Bard", "Druid", "Monk", "Sorcerer", "Warlock"];
const P_ICONS = { Fighter: "⚔️", Wizard: "🔮", Rogue: "🗡️", Cleric: "✝️", Ranger: "🏹", Paladin: "🛡️", Barbarian: "🪓", Bard: "🎵", Druid: "🌿", Monk: "👊", Sorcerer: "✨", Warlock: "👁️" };
const CASTERS = ["Wizard", "Cleric", "Druid", "Sorcerer", "Warlock", "Bard", "Paladin", "Ranger"];
const SPELL_MAX = [4, 3, 3];
const ENEMY_TYPES = ["Goblin", "Orc", "Skeleton", "Zombie", "Bandit", "Wolf", "Dragon", "Troll", "Vampire", "Lich", "Ogre", "Custom"];
const E_ICONS = { Goblin: "👺", Orc: "👹", Skeleton: "💀", Zombie: "🧟", Bandit: "🦹", Wolf: "🐺", Dragon: "🐉", Troll: "👾", Vampire: "🧛", Lich: "☠️", Ogre: "🗿", Custom: "❓" };

const DICE = [
  { sides: 4, color: "#f0a030", dark: "#3d2000", label: "d4", tip1: "Daggers, handaxes, fire bolt.", tip2: "Best for low-damage weapons and cantrips. Averages 2.5.", tip3: "Daggers (1d4), Handaxe (1d4), Bardic Inspiration die at level 1–4." },
  { sides: 6, color: "#e03030", dark: "#3a0808", label: "d6", tip1: "Shortswords, healing potions, Fireball.", tip2: "The most common die in D&D. Averages 3.5.", tip3: "Shortsword (1d6), Healing Potion (2d4+2), Fireball (8d6), Sneak Attack (1d6–12d6)." },
  { sides: 8, color: "#b030d0", dark: "#2a0840", label: "d8", tip1: "Longswords, Cure Wounds, Cleric HP.", tip2: "Standard martial weapon die. Averages 4.5.", tip3: "Longsword versatile (1d8), Cure Wounds (1d8+mod), Cleric/Druid/Monk hit die." },
  { sides: 10, color: "#2070e0", dark: "#081840", label: "d10", tip1: "Battleaxes, Bardic Inspiration, heavy weapons.", tip2: "Heavy one-handed weapons. Averages 5.5.", tip3: "Halberd/Pike (1d10), Heavy Crossbow (1d10), Bardic Inspiration d10 (levels 10–14)." },
  { sides: 12, color: "#20a050", dark: "#082010", label: "d12", tip1: "Greataxes, Barbarian HD. Rare but devastating.", tip2: "The rarest die. Only greataxes and Barbarian use it. Averages 6.5.", tip3: "Greataxe (1d12), Barbarian hit die. Highest average of all weapon dice." },
  { sides: 20, color: "#c9a227", dark: "#3a2800", label: "d20", tip1: "Attack rolls, ability checks, saving throws.", tip2: "THE die. Natural 20 = crit. Natural 1 = automatic fail.", tip3: "Attack rolls, Ability checks, Saving throws, Death saves (10+ = success), Wild Magic." },
  { sides: 100, color: "#888888", dark: "#181818", label: "d100", tip1: "Wild Magic surges, random tables, percentile checks.", tip2: "Roll two d10s — tens + units. Used for surge and encounter tables.", tip3: "Wild Mage surge table, Random Encounter tables, PHB Trinket tables." },
];

function qColor(v, s) { const p = v / s; if (p <= .05) return "#cc1818"; if (p <= .25) return "#d43020"; if (p <= .45) return "#d07020"; if (p <= .60) return "#c9a227"; if (p <= .79) return "#70a830"; if (p <= .94) return "#28a040"; return "#00cc55"; }
function qLabel(v, s) { const p = v / s; if (v === s) return "MAXIMUM! 🎉"; if (v === 1) return "Minimum 😬"; if (p <= .25) return "Poor"; if (p <= .45) return "Below avg"; if (p <= .60) return "Average"; if (p <= .79) return "Good"; if (p <= .94) return "Great ✨"; return "Excellent ✨"; }
function rDie(s) { return Math.floor(Math.random() * s) + 1; }
function hpCol(p) { return p > .6 ? "#3a9a3a" : p > .3 ? "#c8900a" : "#c02020"; }
let _uid = 300; const uid = () => ++_uid;

const mkPlayer = (overrides = {}) => ({
  id: uid(), name: "Adventurer", cls: "Fighter", hp: 30, max: 30,
  slots: [0, 0, 0], spellNames: ["", "", ""],
  init: 0, roll: null, rollNote: "", abilities: [], notes: "", ...overrides
});

const INIT_PLAYERS = [
  mkPlayer({ id: 1, name: "Aldric", cls: "Fighter", hp: 45, max: 45 }),
  mkPlayer({ id: 2, name: "Lyra", cls: "Wizard", hp: 28, max: 28, slots: [4, 3, 2] }),
  mkPlayer({ id: 3, name: "Shade", cls: "Rogue", hp: 34, max: 34 }),
];

/* ══════════════════════════════════════════════
   AUTO-SAVE SYSTEM
   - 5 rotating slots via window.storage (artifact API)
   - Checksum-based corruption detection
   - Auto-loads newest valid slot on mount
   - Saves every 60 seconds (non-blocking)
══════════════════════════════════════════════ */
const SAVE_PREFIX = "dm_grimoire_slot_";
const NUM_SLOTS = 5;
const SAVE_VERSION = 6; // Version mise à jour pour démonstration

/* Simple polynomial checksum */
function checksum(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/* Build a validated, stamped save object */
function buildSave(state) {
  const payload = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    players: state.players,
    enemies: state.enemies,
    log: state.log.slice(-60),
    diceHist: state.diceHist.slice(0, 12),
    combat: state.combat,
    order: state.order,
    turn: state.turn,
  };
  const json = JSON.stringify(payload);
  return { payload, checksum: checksum(json), size: json.length };
}

/* Validate a parsed slot — returns { ok, reason }
   NOTE: version lives inside slot.payload, not slot */
function validateSave(slot) {
  if (!slot || typeof slot !== "object") return { ok: false, reason: "Empty slot" };
  if (!slot.payload || !slot.checksum) return { ok: false, reason: "Missing payload/checksum" };
  if (slot.payload.version !== SAVE_VERSION) return { ok: false, reason: `Version mismatch (${slot.payload.version})` };
  const json = JSON.stringify(slot.payload);
  if (checksum(json) !== slot.checksum) return { ok: false, reason: "Checksum failed — data corrupted" };
  if (!Array.isArray(slot.payload.players)) return { ok: false, reason: "Missing players array" };
  if (typeof slot.payload.savedAt !== "string") return { ok: false, reason: "Missing timestamp" };
  return { ok: true, reason: "Valid" };
}

/* Write to one slot via window.storage */
async function writeSlot(slotIndex, save) {
  try {
    await window.storage.set(SAVE_PREFIX + slotIndex, JSON.stringify(save));
    return true;
  } catch { return false; }
}

/* Read and validate a single slot */
async function readSlot(slotIndex) {
  try {
    const result = await window.storage.get(SAVE_PREFIX + slotIndex);
    if (!result) return null;
    const slot = JSON.parse(result.value);
    const { ok, reason } = validateSave(slot);
    return ok ? slot : { corrupted: true, reason, slotIndex };
  } catch { return null; }
}

/* Delete a slot */
async function deleteSlotStorage(slotIndex) {
  try { await window.storage.delete(SAVE_PREFIX + slotIndex); } catch { }
}

/* Find the most recent valid slot */
async function findBestSave() {
  let best = null;
  for (let i = 0; i < NUM_SLOTS; i++) {
    const slot = await readSlot(i);
    if (!slot || slot.corrupted) continue;
    if (!best || slot.payload.savedAt > best.payload.savedAt) best = slot;
  }
  return best;
}

/* Read all slot summaries for UI */
async function readAllSlotMeta() {
  const results = [];
  for (let i = 0; i < NUM_SLOTS; i++) {
    const raw = await readSlot(i);
    if (!raw) { results.push({ index: i, empty: true }); continue; }
    if (raw.corrupted) { results.push({ index: i, corrupted: true, reason: raw.reason }); continue; }
    results.push({
      index: i,
      savedAt: raw.payload.savedAt,
      players: raw.payload.players?.length ?? 0,
      enemies: raw.payload.enemies?.length ?? 0,
      log: raw.payload.log?.length ?? 0,
      valid: true,
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
  return <svg viewBox={V} style={S}><circle cx="50" cy="50" r="44" {...sw}/><circle cx="50" cy="50" r="30" stroke={color} strokeWidth="1" fill="none" opacity=".25"/><text x="50" y="56" textAnchor="middle" fill={color} fontSize="18" fontFamily="serif" opacity=".55">?</text></svg>;
}

/* ── Section Component with Glassmorphism ── */
function Section({title,badge=0,defaultOpen=true,children}){
  const[open,setOpen]=useState(defaultOpen);
  return(
    <div className="glass" style={{overflow:"hidden",flexShrink:0, marginBottom:8}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 14px",background:"rgba(201,162,39,.03)",border:"none",cursor:"pointer",minHeight:48, borderBottom:open?"1px solid rgba(201,162,39,.1)":"none"}}>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:".62rem",color:"var(--gold)",letterSpacing:".2em",display:"flex",alignItems:"center",gap:7,userSelect:"none"}}>
          {title}
          {badge>0&&<span style={{background:"rgba(201,162,39,.12)",border:"1px solid rgba(201,162,39,.2)",borderRadius:10,padding:"1px 7px",fontSize:".52rem",color:"var(--gold2)"}}>{badge}</span>}
        </span>
        <span style={{fontSize:".65rem",color:"rgba(201,162,39,.4)",transition:"transform .22s",transform:open?"rotate(0deg)":"rotate(-90deg)",display:"inline-block",lineHeight:1,userSelect:"none"}}>▼</span>
      </button>
      <div className={`section-content-wrapper ${open ? 'open' : ''}`}>
        <div style={{padding:"12px 13px 14px"}}>{children}</div>
      </div>
    </div>
  );
}

const CSS = `
${FONTS}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
:root {
  --bg: #050505;
  --gold: #c9a227;
  --gold2: #e8c547;
  --parch: #f4e4c1;
  --ink: #1a1a1a;
  --ink2: #333;
  --blood: #8b0000;
  --blood2: #bb0000;
  --arcane: #5a2d96;
  --border: rgba(201, 162, 39, 0.2);
}

.glass {
  background: rgba(15, 12, 10, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(201, 162, 39, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.root {
  display: flex;
  flex-direction: column;
  height: 100svh;
  background: radial-gradient(circle at 50% 0%, #1a1510 0%, #050505 100%);
  font-family: 'Crimson Text', serif;
  color: var(--parch);
  overflow: hidden;
}

.tb {
  flex-shrink: 0;
  z-index: 30;
  background: rgba(5, 5, 5, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--gold);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tb-t {
  font-family: 'Cinzel Decorative', serif;
  font-size: 1rem;
  color: var(--gold);
  text-shadow: 0 0 15px rgba(201, 162, 39, 0.4);
}

.tb-s { font-family: 'Cinzel', serif; font-size: 0.6rem; color: rgba(201, 162, 39, 0.5); }

.istrip {
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border-bottom: 1px solid rgba(201, 162, 39, 0.1);
  padding: 6px 16px;
  display: flex;
  gap: 10px;
  overflow-x: auto;
}

.ichip {
  background: rgba(201, 162, 39, 0.05);
  border: 1px solid rgba(201, 162, 39, 0.12);
  border-radius: 20px;
  padding: 4px 12px;
  font-family: 'Cinzel', serif;
  font-size: 0.65rem;
  transition: all 0.3s ease;
}

.ichip.on {
  background: rgba(201, 162, 39, 0.15);
  border-color: var(--gold);
  box-shadow: 0 0 10px rgba(201, 162, 39, 0.1);
}

.pc, .ecard {
  /* @extend .glass; */ /* Removed @extend as it's not standard CSS */
  padding: 16px;
  border: 1px solid rgba(201, 162, 39, 0.12);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
}

.pc:hover, .ecard:hover {
  transform: translateY(-2px);
  border-color: rgba(201, 162, 39, 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
}

.hbtns {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.hb {
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  padding: 10px 4px;
  border-radius: 6px;
  border: 1px solid rgba(201, 162, 39, 0.2);
  background: rgba(255, 255, 255, 0.03);
  color: var(--parch);
  transition: all 0.2s ease;
}

.hb:hover { background: rgba(201, 162, 39, 0.08); border-color: var(--gold); }

/* charts and grids */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr 1fr; }
}

.section-content-wrapper {
  max-height: 0;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
}

.section-content-wrapper.open {
  max-height: 2000px;
  opacity: 1;
}

.pulse { animation: pulse-glow 2s infinite ease-in-out; }
@keyframes pulse-glow {
  0% { box-shadow: 0 0 5px rgba(201, 162, 39, 0.1); }
  50% { box-shadow: 0 0 15px rgba(201, 162, 39, 0.3); }
  100% { box-shadow: 0 0 5px rgba(201, 162, 39, 0.1); }
}

/* scrollbars */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(201, 162, 39, 0.2); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(201, 162, 39, 0.4); }

/* chronicles */
.chron-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  height: 100%;
}

.chron-side {
  border-right: 1px solid rgba(201,162,39,.1);
  padding-right: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.ch-item {
  width: 100%;
  text-align: left;
  background: rgba(201,162,39,.03);
  border: 1px solid rgba(201,162,39,.1);
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.ch-item:hover {
  background: rgba(201,162,39,.08);
  border-color: rgba(201,162,39,.3);
}

.ch-item.on {
  background: rgba(201,162,39,.15);
  border-color: var(--gold);
  box-shadow: 0 0 15px rgba(201,162,39,0.1);
}

.ch-item.on::before {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  bottom: 15%;
  width: 3px;
  background: var(--gold);
  border-radius: 0 2px 2px 0;
}

.ch-item-name {
  font-family: 'Cinzel', serif;
  font-size: 0.68rem;
  color: rgba(244,228,193,0.5);
  letter-spacing: 0.05em;
  font-weight: 700;
}

/* dice */
.die-btn {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(201, 162, 39, 0.15);
  border-radius: 12px;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 100px;
}

.die-btn:hover {
  background: rgba(201, 162, 39, 0.08);
  border-color: var(--gold);
  transform: scale(1.02);
}

/* session cards */
.sess-card {
  background: rgba(15, 12, 10, 0.6);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(201, 162, 39, 0.12);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;
}

.slot-row:hover { background: rgba(201, 162, 39, 0.04); border-color: rgba(201, 162, 39, 0.1); }
.slot-row.valid { border-color: rgba(201, 162, 39, 0.15); }

.autosave-toggle.on { background: rgba(201,162,39,.1); border-color: rgba(201,162,39,.3); color: var(--gold); }
.autosave-toggle.off { background: rgba(80,40,40,.15); border-color: rgba(176,24,24,.3); color: #e06060; }
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
  const [activeSheet,setActiveSheet]= useState<number | null>(null);
  const [sheetTab,   setSheetTab]   = useState("stats");

  const [autoSaveOn,    setAutoSaveOn]    = useState(true);
  const [lastAutoSave,  setLastAutoSave]  = useState<string | null>(null);
  const [nextAutoSlot,  setNextAutoSlot]  = useState(3); // Start at Slot 4 (index 3)
  const [showHints,     setShowHints]     = useState(false); 
  const [toastMsg,      setToastMsg]      = useState<ToastMessage | null>(null);
  const [slotMeta,      setSlotMeta]      = useState<SlotMeta[]>(Array.from({length:NUM_SLOTS},(_,i)=>({index:i,empty:true})));
  const [user, loadingAuth] = useAuthState(auth);
  const [showAuth, setShowAuth] = useState(false);
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
    let meta = await readAllSlotMeta();

    // If logged in, overlay cloud status
    if (user) {
      try {
        const q = query(collection(db, `users/${user.uid}/saves`));
        const snap = await getDocs(q);
        const cloudSlots: Record<number, any> = {};
        snap.forEach(doc => { cloudSlots[parseInt(doc.id)] = doc.data(); });

        meta = meta.map(m => {
          if (cloudSlots[m.index]) {
            return { ...m,
              empty: false,
              valid: true,
              savedAt: cloudSlots[m.index].savedAt,
              players: cloudSlots[m.index].players?.length || 0,
              enemies: cloudSlots[m.index].enemies?.length || 0,
              log: cloudSlots[m.index].log?.length || 0,
              isCloud: true
            };
          }
          return m;
        });
      } catch (e) { console.error("Cloud meta error", e); }
    }
    setSlotMeta(meta);
  }, [user]);

  const syncToCloud = useCallback(async (slotIndex: number, payload: any) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/saves`, slotIndex.toString());
      await setDoc(docRef, {
        ...payload,
        syncedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Sync error", e);
      showToast("⚠ Cloud sync failed", "#ff6b6b");
    }
  }, [user, showToast]);
        setLastAutoSave(p.savedAt);
        showToast("✓ Session restored from " + new Date(p.savedAt).toLocaleTimeString(), "#28a040");
      } catch { }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ts = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const addLog = (msg, type = "normal") => setLog(p => [...p.slice(-60), { msg, type, t: ts(), id: Date.now() + Math.random() }]);

  const rt = (n, e = false) => {
    if (!n) return "empty";
    if (e) return n === 20 ? "ecrit" : n === 1 ? "efail" : n >= 15 ? "egood" : "enorm";
    return n === 20 ? "crit" : n === 1 ? "fail" : n >= 15 ? "good" : "norm";
  };

  /* ── players ── */
  const setP = (id, fn) => setPlayers(ps => ps.map(p => p.id === id ? { ...p, ...fn(p) } : p));
  const setE = (id, fn) => setEnemies(es => es.map(e => e.id === id ? { ...e, ...fn(e) } : e));

  const rollP20 = (id) => {
    const n = rDie(20);
    setP(id, p => {
      const note = p.rollNote;
      const type = n === 20 ? "crit" : n === 1 ? "fail" : n >= 15 ? "good" : "normal";
      addLog(`${p.name}${note ? ` [${note}]` : ""} rolled ${n}${n === 20 ? " — CRIT! 🎯" : n === 1 ? " — FUMBLE 💀" : ""}`, type);
      return { roll: n };
    });
  };

  const updPHp = (id, d) => setP(id, p => {
    const hp = Math.max(0, Math.min(p.max, p.hp + d));
    if (hp === 0 && p.hp > 0) addLog(`${p.name} has fallen! ☠️`, "fail");
    return { hp };
  });

  const commitMax = (id, val) => {
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) { setP(id, p => ({ max: n, hp: Math.min(p.hp, n) })); }
    setEditMax(null);
  };

  const commitMaxE = (id, val) => {
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) { setE(id, e => ({ max: n, hp: Math.min(e.hp, n) })); }
    setEditMaxE(null);
  };

  const toggleSlot = (id, lv, si) => setP(id, p => {
    const slots = [...p.slots]; slots[lv] = si < slots[lv] ? si : si + 1;
    addLog(`${p.name} used a level ${lv + 1} slot`, "spell");
    return { slots };
  });

  const addAbP = (pid) => setP(pid, p => {
    if (p.abilities.length >= 5) return {};
    return { abilities: [...p.abilities, { id: uid(), name: "", used: false }] };
  });
  const updAbNameP = (pid, aid, name) => setP(pid, p => ({ abilities: p.abilities.map(a => a.id === aid ? { ...a, name } : a) }));
  const toggleAbP = (pid, aid) => setP(pid, p => {
    const ab = p.abilities.find(a => a.id === aid);
    if (ab && !ab.used) addLog(`${p.name} uses ${ab.name || "ability"}!`, "ability");
    return { abilities: p.abilities.map(a => a.id === aid ? { ...a, used: !a.used } : a) };
  });
  const rmAbP = (pid, aid) => setP(pid, p => ({ abilities: p.abilities.filter(a => a.id !== aid) }));

  const addAbE = (eid) => setE(eid, e => {
    if (e.abilities.length >= 5) return {};
    return { abilities: [...e.abilities, { id: uid(), name: "", used: false }] };
  });
  const updAbNameE = (eid, aid, name) => setE(eid, e => ({ abilities: e.abilities.map(a => a.id === aid ? { ...a, name } : a) }));
  const toggleAbE = (eid, aid) => setE(eid, e => {
    const ab = e.abilities.find(a => a.id === aid);
    if (ab && !ab.used) addLog(`${e.name} uses ${ab.name || "ability"}!`, "ability");
    return { abilities: e.abilities.map(a => a.id === aid ? { ...a, used: !a.used } : a) };
  });
  const rmAbE = (eid, aid) => setE(eid, e => ({ abilities: e.abilities.filter(a => a.id !== aid) }));

  const addPlayer = () => {
    if (players.length >= 6) return;
    setPlayers(ps => [...ps, mkPlayer()]);
    addLog("A new adventurer joins!", "good");
  };

  /* ── enemies ── */
  const rollE20 = (id) => {
    const n = rDie(20);
    setE(id, e => {
      const type = n === 20 ? "crit" : n === 1 ? "fail" : n >= 15 ? "good" : "normal";
      addLog(`${e.name} attacks! Rolled ${n}${n === 20 ? " — ENEMY CRIT! 🔥" : n === 1 ? " — FUMBLE" : ""}`, type);
      return { roll: n };
    });
  };
  const updEHp = (id, d) => setE(id, e => {
    const hp = Math.max(0, Math.min(e.max, e.hp + d));
    if (hp === 0 && e.hp > 0) addLog(`${e.name} defeated! 💀`, "good");
    return { hp };
  });
  const addEnemy = () => {
    if (enemies.length >= 8) return;
    setEnemies(es => [...es, { id: uid(), name: "Goblin", type: "Goblin", hp: 14, max: 14, init: 0, roll: null, abilities: [] }]);
    addLog("An enemy appears! 👺", "fail");
  };

  /* ── combat ── */
  const rollInit = () => {
    const rp = players.map(p => { const n = rDie(20); addLog(`${p.name}: initiative ${n}`, "init"); return { ...p, init: n }; });
    const re = enemies.map(e => { const n = rDie(20); addLog(`${e.name}: initiative ${n}`, "init"); return { ...e, init: n }; });
    setPlayers(rp); setEnemies(re);
    const combined = [
      ...rp.map(p => ({ id: p.id, name: p.name, init: p.init, isEnemy: false, icon: P_ICONS[p.cls] || "⚔️" })),
      ...re.map(e => ({ id: e.id, name: e.name, init: e.init, isEnemy: true, icon: E_ICONS[e.type] || "❓" })),
    ].sort((a, b) => b.init - a.init);
    setOrder(combined); setTurn(0); setCombat(true);
    addLog("⚔️ Combat begins!", "crit"); setTab("combat");
  };
  const nextTurn = () => {
    const n = (turn + 1) % Math.max(order.length, 1); setTurn(n);
    if (order[n]) addLog(`${order[n].name}'s turn`, "init");
  };
  const endCombat = () => { setCombat(false); setOrder([]); addLog("Combat ended.", "normal"); };
  const logNote = () => { if (!combatNote.trim()) return; addLog(`📝 ${combatNote.trim()}`, "normal"); setCombatNote(""); };
  const longRest = () => { setPlayers(ps => ps.map(p => ({ ...p, hp: p.max, slots: [0, 0, 0], abilities: p.abilities.map(a => ({ ...a, used: false })) }))); addLog("⛺ Long rest — all restored", "good"); };
  const shortRest = () => { setPlayers(ps => ps.map(p => ({ ...p, abilities: p.abilities.map(a => ({ ...a, used: false })) }))); addLog("🌙 Short rest — abilities restored", "normal"); };

  /* ── quick d20 ── */
  const doQuick = () => {
    if (quickSpin) return; setQuickSpin(true);
    setTimeout(() => { const n = rDie(20); setQuickRoll(n); setQuickSpin(false); addLog(`Quick d20: ${n}${n === 20 ? " — CRIT! 🎯" : n === 1 ? " — FUMBLE 💀" : ""}`, n === 20 ? "crit" : n === 1 ? "fail" : n >= 15 ? "good" : "normal"); }, 530);
  };

  /* ── dice tab ── */
  const clearH = () => { clearTimeout(h1.current); clearTimeout(h2.current); clearTimeout(h3.current); };
  const triggerRoll = useCallback((die) => {
    if (didRoll.current) return; didRoll.current = true; clearH(); setRolling(die.sides);
    setTimeout(() => {
      const n = rDie(die.sides); setRolling(null);
      const p = purpose.trim();
      setDiceResult({ ...die, val: n, purpose: p });
      setDiceHist(h => [{ ...die, val: n, id: Date.now() }, ...h.slice(0, 11)]);
      addLog(p ? `Rolled ${die.label} for "${p}": ${n}${n === die.sides ? " — MAX! 🎉" : ""}` :
        `Rolled ${die.label}: ${n}${n === die.sides ? " — MAX! 🎉" : ""}`, "dice");
    }, 580);
  }, [purpose]);
  const startHold = (die) => {
    clearH(); didRoll.current = false;
    h1.current = setTimeout(() => setTipDie({ die, level: 1 }), 250);
    h2.current = setTimeout(() => setTipDie({ die, level: 2 }), 800);
    h3.current = setTimeout(() => setTipDie({ die, level: 3 }), 1800);
  };
  const onTS = (die, ev) => { ev.preventDefault(); const t = ev.touches[0]; touchRef.current = { active: true, die, sx: t.clientX, sy: t.clientY, cancelled: false }; setCancelDie(false); startHold(die); };
  const onTM = (ev) => { if (!touchRef.current.active) return; const t = ev.touches[0], dx = t.clientX - touchRef.current.sx, dy = t.clientY - touchRef.current.sy; if (Math.sqrt(dx * dx + dy * dy) > 45 && !touchRef.current.cancelled) { touchRef.current.cancelled = true; setCancelDie(true); clearH(); setTipDie(null); } };
  const onTE = () => { if (!touchRef.current.active) return; touchRef.current.active = false; if (!touchRef.current.cancelled) triggerRoll(touchRef.current.die); setTimeout(() => setCancelDie(false), 150); };

  /* ── session ── */
  const saveGame = () => {
    performSave(true);  // async, fire and forget — toast will confirm
    const data = { version: SAVE_VERSION, savedAt: new Date().toISOString(), players, enemies, log: log.slice(-30), diceHistory: diceHist.slice(0, 8) };
    setSaveModal(JSON.stringify(data, null, 2));
  };
  const loadGame = (jsonStr) => {
    try {
      const d = JSON.parse(jsonStr);
      // Basic structure validation
      if (!d || !Array.isArray(d.players)) throw new Error("Missing players");
      setPlayers(d.players.map(p => ({ ...mkPlayer(), ...p, abilities: p.abilities || [], notes: p.notes || "", spellNames: p.spellNames || ["", "", ""], rollNote: p.rollNote || "" })));
      if (d.enemies) setEnemies(d.enemies.map(e => ({ ...e, abilities: e.abilities || [] })));
      if (d.log) setLog(d.log);
      if (d.diceHistory) setDiceHist(d.diceHistory);
      setCombat(false); setOrder([]); setTurn(0);
      setSessMsg("Session loaded! ✓"); setTimeout(() => setSessMsg(""), 2500);
      return true;
    } catch (err) { setSessMsg("⚠ Invalid JSON — " + err.message); setTimeout(() => setSessMsg(""), 3500); return false; }
  };
  const loadFromSlot = async (slotIndex) => {
    const slot = await readSlot(slotIndex);
    if (!slot || slot.corrupted) { showToast("⚠ Slot " + (slotIndex + 1) + " is corrupted", "#d43020"); return; }
    const p = slot.payload;
    try {
      if (p.players) setPlayers(p.players.map(pl => ({ ...mkPlayer(), ...pl, abilities: pl.abilities || [], notes: pl.notes || "", spellNames: pl.spellNames || ["", "", ""], rollNote: pl.rollNote || "" })));
      if (p.enemies) setEnemies(p.enemies.map(e => ({ ...e, abilities: e.abilities || [] })));
      if (p.log) setLog(p.log);
      if (p.order && p.order.length > 0) { setOrder(p.order); setTurn(p.turn ?? 0); setCombat(p.combat ?? false); }
      else { setCombat(false); setOrder([]); setTurn(0); }
      setCurrentSlot((slotIndex + 1) % NUM_SLOTS);
      setLastAutoSave(p.savedAt);
      showToast("✓ Loaded slot " + (slotIndex + 1), "#28a040");
    } catch (err) { showToast("⚠ Load failed: " + err.message, "#d43020"); }
  };
  const deleteSlot = async (slotIndex) => {
    await deleteSlotStorage(slotIndex);
    await refreshSlotMeta();
    showToast("Slot " + (slotIndex + 1) + " deleted", "#888");
  };
  const resetAll = async () => {
    if (!window.confirm("Reset all session data AND clear all save slots?")) return;
    setPlayers(INIT_PLAYERS); setEnemies([]); setLog([]); setOrder([]); setTurn(0);
    setCombat(false); setDiceResult(null); setDiceHist([]); setPurpose(""); setQuickRoll(null);
    setCurrentSlot(0); setLastAutoSave(null);
    for (let i = 0; i < NUM_SLOTS; i++) await deleteSlotStorage(i);
    await refreshSlotMeta();
    showToast("Session reset", "#888");
    setSessMsg("Reset."); setTimeout(() => setSessMsg(""), 2000);
  };

  /* ── derived ── */
  const cur = order[turn], isEnTurn = cur?.isEnemy;
  const hasAb = players.some(p => p.abilities.length > 0);
  const qc = quickRoll ? qColor(quickRoll, 20) : "var(--gold)";

  const MapSVG = ({ size = 140 }) => (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(201,162,39,.14)" strokeWidth="2" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(201,162,39,.07)" strokeWidth="1" />
      <polygon points="100,18 108,95 100,85 92,95" fill="rgba(201,162,39,.6)" />
      <polygon points="100,182 108,105 100,115 92,105" fill="rgba(201,162,39,.28)" />
      <polygon points="18,100 95,92 85,100 95,108" fill="rgba(201,162,39,.28)" />
      <polygon points="182,100 105,92 115,100 105,108" fill="rgba(201,162,39,.28)" />
      <text x="100" y="12" textAnchor="middle" fill="rgba(201,162,39,.8)" fontSize="12" fontFamily="serif">N</text>
      <text x="100" y="195" textAnchor="middle" fill="rgba(201,162,39,.45)" fontSize="10" fontFamily="serif">S</text>
      <text x="8" y="104" textAnchor="middle" fill="rgba(201,162,39,.45)" fontSize="10" fontFamily="serif">W</text>
      <text x="192" y="104" textAnchor="middle" fill="rgba(201,162,39,.45)" fontSize="10" fontFamily="serif">E</text>
      <circle cx="100" cy="100" r="8" fill="none" stroke="rgba(201,162,39,.38)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="3" fill="rgba(201,162,39,.5)" />
      {[45, 135, 225, 315].map((ang, i) => { const x = 100 + 65 * Math.cos(ang * Math.PI / 180), y = 100 + 65 * Math.sin(ang * Math.PI / 180); return <circle key={i} cx={x} cy={y} r="3" fill="rgba(201,162,39,.22)" />; })}
    </svg>
  );

  /* ─────────────────────────────────────────
     RENDER HELPERS (inline JSX, not components)
  ───────────────────────────────────────── */

  const renderPlayerCard = (p) => {
    const pct = p.hp / p.max, isCaster = CASTERS.includes(p.cls);
    return (
      <div key={p.id} className={`pc ${p.hp === 0 ? "dead" : ""}`}>
        {/* Name row */}
        <div className="nrow">
          <div className="nicon">{P_ICONS[p.cls] || "⚔️"}</div>
          <div className="nfields">
            {editName === p.id ? (
              <input className="ninput" defaultValue={p.name} autoFocus
                onBlur={e => { setP(p.id, () => ({ name: e.target.value || p.name })); setEditName(null); }}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLElement).blur(); }} />
            ) : (
              <div className="ndisp" onClick={() => setEditName(p.id)}>
                <span className="ntxt">{p.name}</span><span className="npen">✏</span>
              </div>
            )}
            <div className="clsrow">
              {editCls === p.id ? (
                <select className="clss" value={p.cls} autoFocus
                  onChange={e => { setP(p.id, () => ({ cls: e.target.value })); setEditCls(null); }}
                  onBlur={() => setEditCls(null)}>
                  {CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              ) : (
                <span className="clsd" onClick={() => setEditCls(p.id)}>{p.cls} ▾</span>
              )}
            </div>
          </div>
          {combat && <div className="ibadge"><strong>{p.init || "—"}</strong><span>INIT</span></div>}
          <button className="rmbtn" onClick={() => setPlayers(ps => ps.filter(x => x.id !== p.id))}>✕</button>
        </div>
        {/* HP row */}
        <div className="hrow">
          <div className="hlbl p">HP</div>
          <div className="htrack"><div className="hfill" style={{ width: `${pct * 100}%`, background: hpCol(pct) }} /></div>
          <div className="hval p">{p.hp}/{p.max}</div>
          {editMax === p.id ? (
            <input className="max-input" type="number" defaultValue={p.max} autoFocus min={1}
              onBlur={e => commitMax(p.id, e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLElement).blur(); }} />
          ) : (
            <button className="max-btn" onClick={() => setEditMax(p.id)} title="Edit max HP">✎</button>
          )}
        </div>
        <div className="hbtns">
          <button className="hb pd" onClick={() => updPHp(p.id, -10)}>−10</button>
          <button className="hb pd" onClick={() => updPHp(p.id, -5)}>−5</button>
          <button className="hb pd" onClick={() => updPHp(p.id, -1)}>−1</button>
          <button className="hb ph" onClick={() => updPHp(p.id, +5)}>+5</button>
          <button className="hb ph" onClick={() => updPHp(p.id, p.max - p.hp)}>Full</button>
        </div>
        {/* Spell slots */}
        {isCaster && (
          <div className="sps">
            <div className="spt">✦ SPELL SLOTS</div>
            {[0, 1, 2].map(lv => (
              <div key={lv} className="spr">
                <span className="splv">{lv + 1}</span>
                {Array.from({ length: SPELL_MAX[lv] }).map((_, si) => (
                  <div key={si} className={`dot ${si < p.slots[lv] ? "used" : ""}`} onClick={() => toggleSlot(p.id, lv, si)} />
                ))}
                <input className="spell-name-input"
                  value={p.spellNames?.[lv] || ""}
                  onChange={e => setP(p.id, () => ({ spellNames: p.spellNames.map((s, i) => i === lv ? e.target.value : s) }))}
                  placeholder={`Lv${lv + 1} spell…`} />
              </div>
            ))}
          </div>
        )}
        {/* Abilities */}
        <div className="abs">
          <div className="abt">
            <span className="abt-lbl">✦ ABILITIES ({p.abilities.length}/5)</span>
            {p.abilities.length < 5 && <button className="ab-add" onClick={() => addAbP(p.id)}>+ Add</button>}
          </div>
          <div className="ablist">
            {p.abilities.map(ab => (
              <div key={ab.id} className="abrow">
                <div className={`ab-slot ${ab.used ? "used" : ""}`} onClick={() => toggleAbP(p.id, ab.id)} />
                <input className="abname" value={ab.name}
                  onChange={e => updAbNameP(p.id, ab.id, e.target.value)}
                  placeholder="Ability name…" />
                <button className="ab-rm" onClick={() => rmAbP(p.id, ab.id)}>✕</button>
              </div>
            ))}
            {p.abilities.length === 0 && <div className="ab-empty p">No abilities yet</div>}
          </div>
        </div>
        {/* Notes */}
        <div className="notes-section">
          <div className="notes-lbl">✦ NOTES</div>
          <textarea className="notes-ta" rows={2} placeholder="Character notes, conditions…"
            value={p.notes || ""}
            onChange={e => setP(p.id, () => ({ notes: e.target.value }))} />
        </div>
        {/* Roll area */}
        <div className="rarea">
          <div className={`d20b ${rt(p.roll)}`} onClick={() => rollP20(p.id)}>
            {p.roll ?? <span style={{ fontSize: ".65rem" }}>d20</span>}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <input className="roll-note-input"
              value={p.rollNote || ""}
              onChange={e => setP(p.id, () => ({ rollNote: e.target.value }))}
              placeholder="What to roll for…" />
            {p.roll ? (
              <>
                <div className="rres p">{p.roll}</div>
                <div className="rhint p">{p.roll === 20 ? "Natural 20! ✨" : p.roll === 1 ? "Critical fail 💀" : p.roll >= 15 ? "Strong roll" : "Last roll"}</div>
              </>
            ) : (
              <div className="rhint p">Tap die to roll</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEnemyCard = (e) => {
    const pct = e.hp / e.max;
    return (
      <div key={e.id} className={`ecard ${e.hp === 0 ? "dead" : ""}`}>
        <div className="nrow">
          <div className="nicon">{E_ICONS[e.type] || "❓"}</div>
          <div className="nfields">
            {editName === e.id ? (
              <input className="ninput en-ni" defaultValue={e.name} autoFocus
                onBlur={ev => { setE(e.id, () => ({ name: ev.target.value || e.name })); setEditName(null); }}
                onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLElement).blur(); }} />
            ) : (
              <div className="ndisp en-nd" onClick={() => setEditName(e.id)}>
                <span className="ntxt en-nt">{e.name}</span><span className="npen">✏</span>
              </div>
            )}
            <div className="clsrow">
              {editCls === e.id ? (
                <select className="clss en-cs" value={e.type} autoFocus
                  onChange={ev => { setE(e.id, () => ({ type: ev.target.value, name: ev.target.value !== "Custom" ? ev.target.value : e.name })); setEditCls(null); }}
                  onBlur={() => setEditCls(null)}>
                  {ENEMY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              ) : (
                <span className="clsd en-cd" onClick={() => setEditCls(e.id)}>{e.type} ▾</span>
              )}
            </div>
          </div>
          {combat && <div className="ibadge en-ib"><strong>{e.init || "—"}</strong><span>INIT</span></div>}
          <button className="rmbtn" onClick={() => setEnemies(es => es.filter(x => x.id !== e.id))}>✕</button>
        </div>
        <div className="hrow">
          <div className="hlbl e">HP</div>
          <div className="htrack"><div className="hfill" style={{ width: `${pct * 100}%`, background: hpCol(pct) }} /></div>
          <div className="hval e">{e.hp}/{e.max}</div>
          {editMaxE === e.id ? (
            <input className="max-input" type="number" defaultValue={e.max} autoFocus min={1}
              style={{ background: "rgba(50,10,10,.8)", color: "var(--parch)", borderColor: "var(--blood2)" }}
              onBlur={ev => commitMaxE(e.id, ev.target.value)}
              onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLElement).blur(); }} />
          ) : (
            <button className="max-btn" onClick={() => setEditMaxE(e.id)}>✎</button>
          )}
        </div>
        <div className="hbtns">
          <button className="hb ed" onClick={() => updEHp(e.id, -10)}>−10</button>
          <button className="hb ed" onClick={() => updEHp(e.id, -5)}>−5</button>
          <button className="hb ed" onClick={() => updEHp(e.id, -1)}>−1</button>
          <button className="hb eh" onClick={() => updEHp(e.id, +5)}>+5</button>
          <button className="hb eh" onClick={() => updEHp(e.id, e.max - e.hp)}>Full</button>
        </div>
        {/* Enemy abilities */}
        <div className="abs enemy">
          <div className="abt">
            <span className="abt-lbl e">✦ ABILITIES ({e.abilities.length}/5)</span>
            {e.abilities.length < 5 && <button className="ab-add enemy" onClick={() => addAbE(e.id)}>+ Add</button>}
          </div>
          <div className="ablist">
            {e.abilities.map(ab => (
              <div key={ab.id} className="abrow">
                <div className={`ab-slot es ${ab.used ? "used" : ""}`} onClick={() => toggleAbE(e.id, ab.id)} />
                <input className="abname e" value={ab.name}
                  onChange={ev => updAbNameE(e.id, ab.id, ev.target.value)}
                  placeholder="Ability name…" />
                <button className="ab-rm" onClick={() => rmAbE(e.id, ab.id)}>✕</button>
              </div>
            ))}
            {e.abilities.length === 0 && <div className="ab-empty e">No abilities yet</div>}
          </div>
        </div>
        <div className="rarea ediv">
          <div className={`d20b ${rt(e.roll, true)}`} onClick={() => rollE20(e.id)}>
            {e.roll ?? <span style={{ fontSize: ".65rem" }}>d20</span>}
          </div>
          <div style={{ flex: 1 }}>
            {e.roll ? (
              <><div className="rres e">{e.roll}</div>
                <div className="rhint e">{e.roll === 20 ? "Deadly! 🔥" : e.roll === 1 ? "Fumbled!" : "Attack roll"}</div></>
            ) : <div className="rhint e">Tap die to roll</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderDiceGrid = (gridClass = "dice-grid") => (
    <>
      <div className="dice-purpose-row">
        <input className="dice-purpose" value={purpose} onChange={e => setPurpose(e.target.value)}
          placeholder="What is this roll for? (e.g. Attack on goblin…)" maxLength={60} />
        {purpose && <button className="dice-clr" onClick={() => setPurpose("")}>✕</button>}
      </div>
      {diceResult ? (() => {
        const qc2 = qColor(diceResult.val, diceResult.sides), bw = Math.round((diceResult.val / diceResult.sides) * 100);
        return (
          <div className="result-box" style={{ borderColor: qc2 + "66" }}>
            {diceResult.purpose && <div className="result-purpose">"{diceResult.purpose}"</div>}
            <div className="result-type" style={{ color: qc2 }}>{diceResult.label}</div>
            <div className="result-num" style={{ color: qc2, textShadow: `0 0 24px ${qc2}88` }}>
              {rolling === diceResult.sides ? "…" : diceResult.val}
            </div>
            <div className="result-bar" style={{ width: `${bw}%`, background: qc2, boxShadow: `0 0 8px ${qc2}55` }} />
            <div className="result-qlbl" style={{ color: qc2 }}>{qLabel(diceResult.val, diceResult.sides)}</div>
          </div>
        );
      })() : (
        <div style={{ background: "rgba(10,5,2,.8)", border: "1.5px solid rgba(201,162,39,.1)", borderRadius: 8, padding: "14px", textAlign: "center" }}>
          <div style={{ fontFamily: "Crimson Text", fontStyle: "italic", fontSize: ".82rem", color: "rgba(244,228,193,.22)" }}>
            Tap to roll · Hold for tips · Drag away to cancel
          </div>
        </div>
      )}
      <div className={gridClass} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE}>
        {DICE.map(die => {
          const isR = rolling === die.sides, isC = cancelDie && touchRef.current.die?.sides === die.sides, isH = tipDie?.die?.sides === die.sides && !isC;
          return (
            <button key={die.sides}
              className={`die-btn ${isR ? "rolling" : ""} ${isC ? "cancelling" : ""} ${isH ? "holding" : ""}`}
              style={{ borderColor: die.color + (isH ? "99" : "44"), background: `linear-gradient(145deg,${die.dark}dd,${die.dark}99)` }}
              onTouchStart={ev => onTS(die, ev)}
              onMouseDown={() => { startHold(die); }}
              onMouseUp={() => { clearH(); if (!didRoll.current) triggerRoll(die); }}
              onMouseLeave={() => { clearH(); didRoll.current = true; }}>
              <span className="cancel-x">✕</span>
              <DieShape sides={die.sides} color={die.color} size={gridClass === "dsk-dice-grid" ? 60 : 52} />
              <span className="die-lbl" style={{ color: die.color }}>{die.label}</span>
            </button>
          );
        })}
      </div>
      {tipDie && (
        <div className="tip-card" style={{ borderColor: tipDie.die.color + "44" }}>
          <div className="tip-lv">
            {[1, 2, 3].map(l => <div key={l} className="tip-pip" style={{ background: tipDie.level >= l ? tipDie.die.color : tipDie.die.dark, transition: "background .3s" }} />)}
            <span style={{ fontFamily: "Cinzel", fontSize: ".5rem", color: "rgba(244,228,193,.28)", letterSpacing: ".15em", marginLeft: 4 }}>
              {tipDie.level === 1 ? "BASIC" : tipDie.level === 2 ? "DETAILED" : "EXPERT"}
            </span>
          </div>
          <div className="tip-title" style={{ color: tipDie.die.color }}>When to use the {tipDie.die.label}</div>
          <div className="tip-body">{tipDie.level === 1 && tipDie.die.tip1}{tipDie.level === 2 && tipDie.die.tip2}{tipDie.level === 3 && tipDie.die.tip3}</div>
        </div>
      )}
      {diceHist.length > 0 && (
        <div className="dhist">
          <div className="dhlbl">RECENT ROLLS</div>
          <div className="dhrow">
            {diceHist.map(h => { const c = qColor(h.val, h.sides); return <div key={h.id} className="dpip" style={{ color: c, borderColor: c + "55", background: h.dark + "cc" }}>{h.label}:{h.val}</div>; })}
          </div>
        </div>
      )}
    </>
  );

  const renderCombatSections = () => {
    /* find the player or enemy whose turn it is */
    const turnPlayer = cur && !cur.isEnemy ? players.find(p => p.id === cur.id) : null;
    const turnEnemy = cur && cur.isEnemy ? enemies.find(e => e.id === cur.id) : null;

    return (
      <>
        <Section title="🎲 QUICK ROLL" defaultOpen={true}>
          <div className="qdarea">
            <div className={`qdie ${quickSpin ? "spinning" : ""}`}
              style={{ background: quickRoll ? `linear-gradient(135deg,${qc}cc,${qc}77)` : "linear-gradient(135deg,rgba(201,162,39,.38),rgba(201,162,39,.14))", color: quickRoll ? "#fff" : "rgba(244,228,193,.38)", boxShadow: quickRoll ? `0 0 18px ${qc}55` : "none" }}
              onClick={doQuick}>
              {quickSpin ? "…" : (quickRoll ?? "d20")}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {quickRoll ? (
                <>
                  <div className="qr-num" style={{ color: qc }}>{quickRoll}</div>
                  <div className="qr-bar" style={{ width: `${Math.round((quickRoll / 20) * 100)}%`, background: qc }} />
                  <div className="qr-lbl" style={{ color: qc }}>{qLabel(quickRoll, 20)}</div>
                  {quickRoll === 20 && <div style={{ fontFamily: "Crimson Text", fontStyle: "italic", fontSize: ".7rem", color: "#ff7777" }}>Natural 20! 🎯</div>}
                  {quickRoll === 1 && <div style={{ fontFamily: "Crimson Text", fontStyle: "italic", fontSize: ".7rem", color: "#666" }}>Critical fail 💀</div>}
                </>
              ) : <div className="qr-empty">Tap the die to roll d20</div>}
            </div>
          </div>
        </Section>

        <Section title="📝 EVENT LOG" defaultOpen={true}>
          <textarea className="note-area" rows={2}
            placeholder="Describe what's happening — Enter to log…"
            value={combatNote}
            onChange={e => setCombatNote(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); logNote(); } }} />
          <button className="logit-btn" onClick={logNote}>⊕ Add to Chronicle</button>
        </Section>

        <Section title="⚔ CONTROLS" defaultOpen={true}>
          <button className="cbtn btn-gld" onClick={rollInit}>⚔ Roll Initiative ({players.length}p + {enemies.length}e)</button>
          {combat && <>
            <button className="cbtn btn-ol" onClick={nextTurn}>▶ Next — {order[(turn + 1) % Math.max(order.length, 1)]?.name || "…"}</button>
            <button className="cbtn btn-bl" onClick={endCombat}>✕ End Combat</button>
          </>}
        </Section>

        {/* Current turn character card */}
        {combat && cur && (
          <Section title={`🃏 ACTIVE — ${cur.name}`} defaultOpen={true}>
            {turnPlayer && renderPlayerCard(turnPlayer)}
            {turnEnemy && renderEnemyCard(turnEnemy)}
          </Section>
        )}

        <Section title="📋 TURN ORDER" badge={order.length || 0} defaultOpen={combat}>
          {order.length === 0 ? (
            <div style={{ fontFamily: "Crimson Text", fontStyle: "italic", color: "rgba(244,228,193,.22)", fontSize: ".8rem", paddingTop: 2 }}>Roll initiative to populate turn order.</div>
          ) : order.map((o, i) => (
            <div key={o.id} className={`orow ${o.isEnemy ? "er" : "pr"} ${i === turn ? (o.isEnemy ? "aer" : "apr") : ""}`}>
              <span className="oinit" style={{ color: o.isEnemy ? "#e06060" : "var(--gold)" }}>{o.init}</span>
              <span>{o.icon}</span>
              <span className="oname" style={{ color: i === turn ? (o.isEnemy ? "#f08080" : "var(--gold2)") : "rgba(244,228,193,.62)" }}>{o.name}</span>
              <span className={`otag ${o.isEnemy ? "etag" : "ptag"}`}>{o.isEnemy ? "FOE" : "HERO"}</span>
              {i === turn && <span style={{ color: o.isEnemy ? "#f08080" : "var(--gold)", fontFamily: "Cinzel", fontSize: ".5rem" }}>◀</span>}
            </div>
          ))}
        </Section>

        {hasAb && (
          <Section title="✦ ABILITY SLOTS" defaultOpen={false}>
            {players.map(p => p.abilities.map(ab => (
              <div key={ab.id} className="ab-use-row">
                <span className="ab-use-who">{P_ICONS[p.cls]}</span>
                <span className="ab-use-name">{ab.name || "Ability"}</span>
                <button className={`ab-use-btn ${ab.used ? "sp" : "av"}`}
                  onClick={() => !ab.used && toggleAbP(p.id, ab.id)}>
                  {ab.used ? "SPENT" : "USE"}
                </button>
              </div>
            )))}
            <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
              <button className="btn-sm ol" style={{ flex: 1 }} onClick={shortRest}>🌙 Short Rest</button>
              <button className="btn-sm ol" style={{ flex: 1 }} onClick={longRest}>⛺ Long Rest</button>
            </div>
          </Section>
        )}

        <Section title="📜 CHRONICLE" badge={log.length || 0} defaultOpen={false}>
          <button className="log-clr" onClick={() => setLog([])}>clear all</button>
          <div className="loglist">
            {log.length === 0 && <div className="lempty">No entries yet…</div>}
            {[...log].reverse().map(e => (
              <div key={e.id} className={`le ${e.type}`}><span className="lt">{e.t}</span>{e.msg}</div>
            ))}
          </div>
        </Section>
      </>
    );
  };

  const renderSession = () => {
    const fmtTime = (iso) => {
      if (!iso) return "—";
      try {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      } catch { return iso; }
    };
    return (
      <>
        {/* Auto-save status bar */}
        <div className="sess-card" style={{ padding: "10px 14px" }}>
          <div className="autosave-bar">
            <div>
              <div className="autosave-lbl">⏱ AUTO-SAVE {autoSaveOn ? "ON" : "OFF"}</div>
              <div className="autosave-time">
                {lastAutoSave ? "Last: " + fmtTime(lastAutoSave) : "Not saved yet this session"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className={`autosave-toggle ${autoSaveOn ? "on" : "off"}`} onClick={() => setAutoSaveOn(v => !v)}>
                {autoSaveOn ? "DISABLE" : "ENABLE"}
              </button>
              <button className="autosave-toggle on" onClick={() => performSave(true)} title="Save now">SAVE NOW</button>
            </div>
          </div>
          <div className="sess-info" style={{ marginBottom: 0 }}>
            Players: <span>{players.length}</span> · Enemies: <span>{enemies.length}</span> · Chronicle: <span>{log.length}</span> · Combat: <span>{combat ? "Active" : "Inactive"}</span>
            {" · "}Next slot: <span>{currentSlot + 1}/{NUM_SLOTS}</span>
          </div>
        </div>

        {/* Save slots */}
        <div className="sess-card">
          <div className="sess-hdg">💾 SAVE SLOTS</div>
          {slotMeta.map(s => {
            const isCurrent = s.index === ((currentSlot - 1 + NUM_SLOTS) % NUM_SLOTS) && s.valid;
            return (
              <div key={s.index} className={`slot-row ${s.empty ? "empty" : s.corrupted ? "corrupt" : isCurrent ? "current" : "valid"}`}>
                <div className="slot-num">{s.index + 1}</div>
                <div className="slot-info">
                  {s.empty && <div className="slot-detail">Empty slot</div>}
                  {s.corrupted && <><div className="slot-time" style={{ color: "#e06060" }}>⚠ Corrupted</div><div className="slot-detail">{s.reason}</div></>}
                  {s.valid && <>
                    <div className="slot-time">{fmtTime(s.savedAt)}{isCurrent ? " ✓ (latest)" : ""}</div>
                    <div className="slot-detail">{s.players}p · {s.enemies}e · {s.log} log entries</div>
                  </>}
                </div>
                {s.valid && <button className="slot-btn load-btn" onClick={() => loadFromSlot(s.index)}>LOAD</button>}
                {(s.valid || s.corrupted) && <button className="slot-btn del-btn" onClick={() => deleteSlot(s.index)}>✕</button>}
              </div>
            );
          })}
          {sessMsg && <div className="sess-msg" style={{ color: sessMsg.includes("⚠") ? "#e06060" : "rgba(201,162,39,.8)" }}>{sessMsg}</div>}
        </div>

        {/* Export / Import */}
        <div className="sess-card">
          <div className="sess-hdg">📤 EXPORT SESSION</div>
          <button className="sess-btn save" onClick={saveGame}>💾 Export + Save to Slot {currentSlot + 1}</button>
        </div>
        <div className="sess-card">
          <div className="sess-hdg">📂 IMPORT SESSION</div>
          <div className="sess-info" style={{ marginBottom: 8 }}>Paste previously exported JSON below.</div>
          <textarea style={{ width: "100%", minHeight: 80, background: "rgba(6,3,1,.9)", border: "1px solid rgba(201,162,39,.22)", borderRadius: 5, color: "rgba(244,228,193,.82)", fontFamily: "monospace", fontSize: ".72rem", padding: "8px 10px", resize: "vertical", outline: "none", lineHeight: 1.4 }}
            placeholder="Paste session JSON here…"
            value={loadText}
            onChange={e => setLoadText(e.target.value)} />
          <button className="sess-btn load" style={{ marginTop: 6 }} onClick={() => { if (loadGame(loadText)) setLoadText(""); }}>📂 Load from Pasted JSON</button>
        </div>

        {/* Quick actions */}
        <div className="sess-card">
          <div className="sess-hdg">⚡ QUICK ACTIONS</div>
          <button className="sess-btn load" style={{ marginBottom: 6 }} onClick={longRest}>⛺ Long Rest — Restore All</button>
          <button className="sess-btn load" style={{ marginBottom: 6 }} onClick={shortRest}>🌙 Short Rest — Restore Abilities</button>
          <button className="sess-btn danger" onClick={resetAll}>⚠ Reset Session &amp; Clear All Slots</button>
        </div>
      </>
    );
  };

  const NAV = [
    { id: "party", ico: "🧙", lbl: "PARTY" },
    { id: "dice", ico: "🎲", lbl: "DICE" },
    { id: "combat", ico: "⚔️", lbl: "COMBAT" },
    { id: "map", ico: "🗺️", lbl: "MAP" },
    { id: "session", ico: "💾", lbl: "SESSION" },
  ];

  const partyContent = () => (
    <>
      <div className="strow">
        <button className={`st ${partySub === "players" ? "ap" : ""}`} onClick={() => setPartySub("players")}>🧙 PLAYERS</button>
        <div className="stdiv" />
        <button className={`st ${partySub === "enemies" ? "ae" : ""}`} onClick={() => setPartySub("enemies")}>💀 ENEMIES</button>
      </div>
      {partySub === "players" && <>
        {players.map(renderPlayerCard)}
        {players.length < 6 && <button className="addbtn pp" onClick={addPlayer}>＋ Add Player</button>}
      </>}
      {partySub === "enemies" && <>
        {enemies.length === 0 && <div style={{ textAlign: "center", padding: "28px 0", fontFamily: "Crimson Text", fontStyle: "italic", color: "rgba(244,228,193,.18)", fontSize: ".84rem" }}>No enemies lurk yet…<br />Add foes to track them in combat.</div>}
        {enemies.map(renderEnemyCard)}
        {enemies.length < 8 && <button className="addbtn ep" onClick={addEnemy}>＋ Add Enemy</button>}
      </>}
    </>
  );

  const mapContent = () => (
    <div className="map-cs">
      <MapSVG size={140} />
      <div className="map-cs-title">Realm Map</div>
      <div className="map-cs-sub">Place tokens, draw territories and track your party's journey.</div>
      <div className="map-badge">COMING SOON</div>
    </div>
  );

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
            <div className="tb-s">{players.length}p · {enemies.length}e · {combat ? "⚔ combat" : "at rest"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {combat && cur && (
              <div>
                <div className="tb-al">{isEnTurn ? "ENEMY" : "ACTIVE"}</div>
                <div className="tb-an" style={isEnTurn ? { color: "#f08080" } : {}}>{cur.icon} {cur.name}</div>
              </div>
            )}
            <button className="layout-btn" onClick={() => setPc(v => !v)}>{pc ? "📱" : "🖥"}</button>
          </div>
        </div>

        {/* INITIATIVE STRIP */}
        <div className="istrip">
          {combat && order.length > 0 ? (
            <><div className="ilbl">ORDER</div>
              {order.map((o, i) => (
                <div key={o.id} className={`ichip ${o.isEnemy ? "ec" : ""} ${i === turn ? "on" : ""}`}>
                  <span className={`inum ${o.isEnemy ? "e" : ""}`}>{o.init}</span>
                  {o.icon} {o.name}{i === turn && <span> ◀</span>}
                </div>
              ))}</>
          ) : <div className="iempty">Roll initiative to begin combat…</div>}
        </div>

        {/* ═══ MOBILE ═══ */}
        {!pc && (
          <div className="mob-body">
            <div className="content">
              {tab === "party" && partyContent()}
              {tab === "dice" && renderDiceGrid("dice-grid")}
              {tab === "combat" && <>
                {combat && cur && <div className={`turn-card ${isEnTurn ? "et" : "pt"}`}>
                  <div className="tsub">Current Turn</div>
                  <div className={`tname ${isEnTurn ? "e" : ""}`}>{cur.icon} {cur.name}</div>
                  <div className="tsub" style={{ marginTop: 3 }}>Initiative {cur.init}</div>
                </div>}
                {renderCombatSections()}
              </>}
              {tab === "map" && mapContent()}
              {tab === "session" && renderSession()}
            </div>
            <div className="bnav">
              {NAV.map(t => (
                <button key={t.id} className={`ntab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
                  {t.id === "party" && enemies.length > 0 && tab !== "party" && <div className="nbadge">{enemies.length}</div>}
                  {t.id === "combat" && log.length > 0 && tab !== "combat" && <div className="nbadge">{Math.min(log.length, 9)}</div>}
                  <div className="nico">{t.ico}</div>
                  <div className="nlbl">{t.lbl}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ DESKTOP ═══ */}
        {pc && (
          <div className="dsk-body">
            <div className="dsk-side">
              <div style={{ padding: "10px 18px 6px", fontFamily: "'Cinzel',serif", fontSize: ".5rem", color: "rgba(201,162,39,.35)", letterSpacing: ".25em" }}>NAVIGATION</div>
              {NAV.map(t => (
                <button key={t.id} className={`dsk-ni ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
                  <span style={{ fontSize: "1.15rem", flexShrink: 0 }}>{t.ico}</span>{t.lbl}
                  {t.id === "party" && enemies.length > 0 && <span style={{ background: "var(--blood)", color: "#fff", fontSize: ".44rem", minWidth: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", marginLeft: "auto" }}>{enemies.length}</span>}
                  {t.id === "combat" && log.length > 0 && <span style={{ background: "var(--blood)", color: "#fff", fontSize: ".44rem", minWidth: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", marginLeft: "auto" }}>{Math.min(log.length, 9)}</span>}
                </button>
              ))}
              {combat && cur && (
                <div style={{ margin: "auto 0 0", padding: "12px 16px", borderTop: "1px solid rgba(201,162,39,.12)" }}>
                  <div style={{ background: "rgba(201,162,39,.07)", border: "1px solid rgba(201,162,39,.2)", borderRadius: 6, padding: "9px 10px" }}>
                    <div style={{ fontFamily: "Cinzel", fontSize: ".5rem", color: "rgba(201,162,39,.5)", letterSpacing: ".15em", marginBottom: 3 }}>{isEnTurn ? "ENEMY TURN" : "ACTIVE"}</div>
                    <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: ".82rem", color: isEnTurn ? "#f08080" : "var(--gold2)" }}>{cur.icon} {cur.name}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="dsk-main">
              <div className="dsk-content">
                {tab === "party" && (
                  <>
                    <div className="strow" style={{ maxWidth: 400 }}>
                      <button className={`st ${partySub === "players" ? "ap" : ""}`} onClick={() => setPartySub("players")}>🧙 PLAYERS</button>
                      <div className="stdiv" />
                      <button className={`st ${partySub === "enemies" ? "ae" : ""}`} onClick={() => setPartySub("enemies")}>💀 ENEMIES</button>
                    </div>
                    {partySub === "players" && <div className="g2">{players.map(renderPlayerCard)}{players.length < 6 && <button className="addbtn pp" onClick={addPlayer}>＋ Add Player</button>}</div>}
                    {partySub === "enemies" && <div className="g2">{enemies.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "28px 0", fontFamily: "Crimson Text", fontStyle: "italic", color: "rgba(244,228,193,.18)", fontSize: ".84rem" }}>No enemies lurk yet…</div>}{enemies.map(renderEnemyCard)}{enemies.length < 8 && <button className="addbtn ep" onClick={addEnemy}>＋ Add Enemy</button>}</div>}
                  </>
                )}
                {tab === "dice" && (
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>{renderDiceGrid("dsk-dice-grid")}</div>
                    <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {diceResult && (() => {
                        const c = qColor(diceResult.val, diceResult.sides); return (
                          <div style={{ background: "rgba(10,5,2,.95)", border: `2px solid ${c}44`, borderRadius: 10, padding: "24px", textAlign: "center" }}>
                            <div style={{ fontFamily: "Cinzel", fontSize: ".65rem", color: c, letterSpacing: ".2em", marginBottom: 4 }}>{diceResult.label}</div>
                            {diceResult.purpose && <div style={{ fontFamily: "Crimson Text", fontStyle: "italic", fontSize: ".8rem", color: "rgba(244,228,193,.45)", marginBottom: 10 }}>"{diceResult.purpose}"</div>}
                            <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "5rem", color: c, lineHeight: 1, textShadow: `0 0 40px ${c}66` }}>{diceResult.val}</div>
                            <div style={{ height: 6, borderRadius: 3, margin: "12px auto 8px", maxWidth: 160, background: c, width: `${Math.round((diceResult.val / diceResult.sides) * 100)}%` }} />
                            <div style={{ fontFamily: "Cinzel", fontSize: ".7rem", letterSpacing: ".16em", color: c }}>{qLabel(diceResult.val, diceResult.sides)}</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {tab === "combat" && (
                  <div style={{ display: "flex", gap: 12, overflow: "hidden", flex: 1 }}>
                    <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
                      {combat && cur && <div className={`turn-card ${isEnTurn ? "et" : "pt"}`}><div className="tsub">Current Turn</div><div className={`tname ${isEnTurn ? "e" : ""}`}>{cur.icon} {cur.name}</div><div className="tsub" style={{ marginTop: 3 }}>Initiative {cur.init}</div></div>}
                      {renderCombatSections()}
                    </div>
                  </div>
                )}
                {tab === "map" && mapContent()}
                {tab === "session" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{renderSession()}</div>}
              </div>
            </div>
          </div>
        )}

        {/* TOAST */}
        {toastMsg && (
          <div className={`save-toast ${toastMsg.hiding ? "hiding" : ""}`} style={{ borderColor: (toastMsg.color as string) + "66", color: toastMsg.color as string }}>
            {(toastMsg as any).text}
          </div>
        )}

        {/* SAVE MODAL */}
        {saveModal && (
          <div className="modal-bg">
            <div className="modal-box">
              <div className="modal-hdr">
                <span className="modal-ttl">💾 SESSION EXPORT</span>
                <button className="modal-close" onClick={() => setSaveModal(null)}>✕</button>
              </div>
              <div style={{ padding: "10px 16px 6px", fontFamily: "Crimson Text", fontStyle: "italic", fontSize: ".78rem", color: "rgba(244,228,193,.45)" }}>
                Select all and copy — paste it into the Load box to restore later.
              </div>
              <textarea readOnly value={saveModal}
                style={{ flex: 1, margin: "0 16px", background: "rgba(6,3,1,.9)", border: "1px solid rgba(201,162,39,.2)", borderRadius: 5, color: "rgba(244,228,193,.8)", fontFamily: "monospace", fontSize: ".72rem", padding: "10px", resize: "none", outline: "none", lineHeight: 1.45, overflowY: "auto", minHeight: 160 }}
                onFocus={e => (e.target as HTMLTextAreaElement).select()} onClick={e => (e.target as HTMLTextAreaElement).select()} />
              <div style={{ padding: "10px 16px 14px", display: "flex", gap: 8 }}>
                <button style={{ flex: 1, fontFamily: "'Cinzel',serif", fontSize: ".65rem", letterSpacing: ".1em", padding: "11px", borderRadius: 6, cursor: "pointer", background: "linear-gradient(135deg,#c9a227,#a8831a)", border: "1.5px solid #e8c547", color: "var(--ink)", minHeight: 44 }}
                  onClick={() => navigator.clipboard?.writeText(saveModal).then(() => { setSessMsg("Copied! ✓"); setTimeout(() => setSessMsg(""), 2500); setSaveModal(null); }).catch(() => setSessMsg("Select all above & copy manually"))}>
                  📋 Copy to Clipboard
                </button>
                <button style={{ fontFamily: "'Cinzel',serif", fontSize: ".65rem", letterSpacing: ".1em", padding: "11px 16px", borderRadius: 6, cursor: "pointer", background: "transparent", border: "1.5px solid rgba(201,162,39,.3)", color: "var(--gold)", minHeight: 44 }}
                  onClick={() => setSaveModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}