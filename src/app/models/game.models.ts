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
  critThreshold: number;
  relics: string[];
  feats?: string[];
  flatAtkBonus?: number;
  flatDmgBonus?: number;
  critMultiplier?: number;
  
  // Nuovi attributi per specializzazioni, talenti e reliquie
  damageReduction?: number;    // Riduzione fissa del danno nemico subito (Guerriero/Tank)
  specialBonusDmg?: number;    // Bonus ai danni delle abilita arcaniche/speciali (Mago)
  specialBonusHeal?: number;   // Bonus all'efficacia delle cure magiche (Chierico)
  potionHealBonus?: number;    // Bonus alle cure tramite pozioni (Chierico)
  fleeBonus?: number;          // Bonus alle prove per fuggire dal combattimento (Ladro)
}

export interface Monster {
  id: string;
  isBoss: boolean;
  bracket: number;
  hp: number;
  maxHp: number;
  dmg: [number, number];
  ac: number;
}

export interface ChoiceOption {
  label: string;
  stat?: StatKey;
  action?: string;
  cost?: number;
}

export interface PendingChoice {
  dc: number | null;
  canFail?: boolean;
  options: ChoiceOption[];
  onChoose?: (opt: ChoiceOption) => boolean | void;
  onResolve?: (success: boolean) => void;
}

export interface DropInfo {
  type: 'relic';
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
  cls: string;
  sides?: number;
  tag?: string;
}

export interface CombatFlags {
  acting?: boolean;
  defending?: boolean;
}

export interface LogMessage {
  html: string;
  cls: string;
}

export interface GameState {
  screen: 'title' | 'create' | 'run' | 'gameover';
  lang: LangCode;
  player: Player | null;
  depth: number;
  monster: Monster | null;
  phase: 'explore' | 'combat' | 'choice' | 'levelup' | null;
  combatFlags: CombatFlags;
  log: LogMessage[];
  pendingChoice: PendingChoice | null;
  pendingLevelUps: number;
  levelUp: LevelUpState | null;
  bossRewardModal: BossRewardModalData | null;
  lastTavernDepth: number;
  statsExpanded: boolean;
  inventoryExpanded: boolean;
  rollingDie: RollingDieState;
  tempStats: Stats | null;
  tempName: string;
}