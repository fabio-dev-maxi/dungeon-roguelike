import { LangCode } from "../data/i18n.data";

export type StatKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type ClassKey = 'fighter' | 'rogue' | 'wizard' | 'cleric';

export interface Stats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Weapon {
  key: string;
  dice: [number, number];
  bonus?: number;
}

export interface Armor {
  key: string;
  bonus: number;
}

export interface InventoryItem {
  type: 'potion' | string;
  heal: [number, number];
}

export interface Feat {
  id: string;
  cls: ClassKey | 'all';
  name: string;
  desc: string;
}

export interface Player {
  name: string;
  cls: ClassKey;
  stats: Stats;
  hp: number;
  maxHp: number;
  ac: number;
  gold: number;
  weapon: Weapon;
  armor: Armor;
  inventory: InventoryItem[];
  usedSpecial: boolean;
  level: number;
  xp: number;
  tempAtkBonus?: number;
  tempAcBonus?: number;
  mightyBlowActive?: boolean;
  critThreshold: number;
  relics: string[];
  feats?: string[];
  flatAtkBonus?: number;
  flatDmgBonus?: number;
  critMultiplier?: number;
  damageReduction?: number;
  specialBonusDmg?: number;
  specialBonusHeal?: number;
  potionHealBonus?: number;
  fleeBonus?: number;
}

export interface Monster {
  id: string;
  isBoss: boolean;
  bracket: number;
  hp: number;
  maxHp: number;
  dmg: [number, number];
  ac: number;
  atk: number; // Bonus al tiro per colpire
}

export interface ChoiceOption {
  label: string;
  stat?: StatKey;
  action?: string;
  cost?: number;
}

export interface PendingChoice {
  kind: 'trap' | 'shrine' | 'merchant' | 'tavern';
  dc: number | null;
  canFail?: boolean;
  options: ChoiceOption[];
  onChoose?: (opt: ChoiceOption) => boolean | void;
  onResolve?: (success: boolean) => void;
}

/** Informazioni sul singolo oggetto droppato dal Boss di fine piano */
export interface DropInfo {
  type: 'gold' | 'weapon' | 'armor' | 'relic' | 'potion';
  id: string;
  name: string;
  effect: string;
}

export interface BossRewardModalData {
  name: string;
  xp: number;
  gold: number;
  drops: DropInfo[];
}

export interface LevelUpState {
  step: 'stat' | 'feat' | 'hp';
  chosenStat?: StatKey | null;
  availableFeats?: Feat[];
  chosenFeatId?: string | null;
  hpRollBase?: number | null;
  hpRollTotal?: number | null;
  rerolled?: boolean;
}

export interface RollingDieState {
  active: boolean;
  value: number | null;
  values?: number[];  // Valori dei singoli dadi (es. [3, 4] per 2d4)
  sides?: number;
  count?: number;   // Numero totale di dadi lanciati insieme
  cls: string;
  tag?: string;
  isEnemy?: boolean;
}

export interface CombatFlags {
  acting?: boolean;
  defending?: boolean;
}

export interface LogMessage {
  html: string;
  cls: string;
}

// --- NUOVI TIPI PER LA MAPPA A NODI ---
export type NodeType = 'combat' | 'treasure' | 'trap' | 'shrine' | 'merchant' | 'tavern' | 'boss';
export type NodeStatus = 'locked' | 'available' | 'visited' | 'current';

export interface MapNode {
  id: string;             // ID univoco del nodo (es: "node_L3_2")
  layer: number;          // Layer di profondità (1..7)
  type: NodeType;         // Reale tipo di incontro nascosto o visibile
  status: NodeStatus;     // 'locked' | 'available' | 'visited' | 'current'
  nextNodes: string[];    // ID dei nodi raggiungibili al layer successivo (DAG)
  isMystery?: boolean;    // Se true, il nodo viene mostrato come '?' fino all'esplorazione
}

export interface FloorMap {
  nodes: Record<string, MapNode>;
  layers: string[][];  // Matrice dei layer: layers[0] = Layer 1, layers[6] = Layer 7 (Boss)
  currentNodeId: string | null;
}

export interface GameState {
  screen: 'title' | 'create' | 'run' | 'gameover';
  lang: LangCode;
  player: Player | null;
  depth: number;       // Ora rappresenta il Numero del Piano Globale (Piano 1, Piano 2, ecc.)
  monster: Monster | null;
  phase: 'map' | 'explore' | 'combat' | 'choice' | 'levelup' | null; // Aggiunto 'map'
  currentMap: FloorMap | null; // Mappa attiva del piano corrente
  mapViewActive: boolean;     // Controllo di visibilità: true = mostra mappa, false = mostra incontro
  combatFlags: CombatFlags;
  log: LogMessage[];
  pendingChoice: PendingChoice | null;
  pendingLevelUps: number;
  levelUp: LevelUpState | null;
  bossRewardModal: BossRewardModalData | null;
  lastTavernDepth: number;
  lastTrapDepth: number;
  lastMerchantDepth: number;
  lastShrineDepth: number;
  statsExpanded: boolean;
  inventoryExpanded: boolean;
  rollingDie: RollingDieState;
  tempStats: Stats | null;
  tempName: string;
}
