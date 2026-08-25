import { LangCode } from '../data/i18n.data';

export type ClassKey = 'fighter' | 'rogue' | 'wizard' | 'cleric';
export type StatKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface Stats {
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
}

export interface Weapon {
  key: string;
  dice: [number, number];
  bonus: number;
}

export interface Armor {
  key: string;
  bonus: number;
}

export interface Potion {
  type: 'potion';
  heal: [number, number];
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
  inventory: Potion[];
  usedSpecial: boolean;
  level: number;
  xp: number;
  tempAtkBonus: number;
  critThreshold: number;
  relics: string[];
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

export type GamePhase = 'explore' | 'combat' | 'choice' | 'levelup' | null;
export type GameScreen = 'title' | 'create' | 'run' | 'gameover';

export interface LogEntry {
  html: string;
  cls: string;
}

export interface ChoiceOption {
  label: string;
  stat?: StatKey;
  action?: string;
  cost?: number;
}

export interface PendingChoice {
  dc: number | null;
  options: ChoiceOption[];
  canFail?: boolean;
  onResolve?: (success: boolean) => void;
  onChoose?: (opt: ChoiceOption) => boolean | void;
}

export interface LevelUpState {
  step: 'stat' | 'hp';
  chosenStat: StatKey | null;
  hpRollBase: number | null;
  hpRollTotal: number | null;
  rerolled: boolean;
}

export interface RollingDie {
  active: boolean;
  value: number | null;
  cls: string;
  sides?: number;
  tag?: string;
}

export interface DropInfo {
  type: 'relic'; // future drop kinds (weapon/armor/etc.) can extend this union later
  id: string;
  name: string;
  effect: string;
}

export interface BossReward {
  name: string;
  xp: number;
  gold: number;
  drops: DropInfo[];
}

export interface GameState {
  screen: GameScreen;
  lang: LangCode;
  player: Player | null;
  depth: number;
  monster: Monster | null;
  phase: GamePhase;
  combatFlags: { acting?: boolean; defending?: boolean };
  log: LogEntry[];
  pendingChoice: PendingChoice | null;
  pendingLevelUps: number;
  levelUp: LevelUpState | null;
  bossRewardModal: BossReward | null;
  lastTavernDepth: number;
  statsExpanded: boolean;
  inventoryExpanded: boolean;
  rollingDie: RollingDie;
  tempStats: Stats | null;
  tempName: string;
}
