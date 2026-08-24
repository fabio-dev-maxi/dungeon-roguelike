import { ClassKey, Player, StatKey } from '../models/game.models';

export const CLASS_KEYS: ClassKey[] = ['fighter', 'rogue', 'wizard', 'cleric'];

export interface ClassData {
  primary: StatKey;
  atkStat: StatKey;
  hpBase: number;
  armor: number;
  armorKey: string;
  weaponKey: string;
  weaponDice: [number, number];
  hitDie: number;
}

export const CLASS_DATA: Record<ClassKey, ClassData> = {
  fighter: { primary: 'str', atkStat: 'str', hpBase: 10, armor: 3, armorKey: 'plate', weaponKey: 'greatsword', weaponDice: [1, 10], hitDie: 10 },
  rogue: { primary: 'dex', atkStat: 'dex', hpBase: 8, armor: 2, armorKey: 'leather', weaponKey: 'daggers', weaponDice: [1, 8], hitDie: 8 },
  wizard: { primary: 'int', atkStat: 'dex', hpBase: 6, armor: 0, armorKey: 'robes', weaponKey: 'bow', weaponDice: [1, 8], hitDie: 6 },
  cleric: { primary: 'wis', atkStat: 'str', hpBase: 8, armor: 2, armorKey: 'chainmail', weaponKey: 'mace', weaponDice: [1, 6], hitDie: 8 }
};

export const MONSTER_IDS_TIER: Record<number, string[]> = {
  1: ['rat', 'goblin', 'skeleton', 'raven'],
  2: ['orc', 'wolf', 'ghoul', 'knight'],
  3: ['ogre', 'wraith', 'troll', 'basilisk']
};

export interface MonsterStat { hpBase: number; dmg: [number, number]; ac: number; }

export const MONSTER_STATS: Record<string, MonsterStat> = {
  rat: { hpBase: 5, dmg: [1, 4], ac: 10 }, goblin: { hpBase: 7, dmg: [1, 6], ac: 12 }, skeleton: { hpBase: 9, dmg: [1, 6], ac: 13 }, raven: { hpBase: 6, dmg: [1, 4], ac: 12 },
  orc: { hpBase: 16, dmg: [1, 8], ac: 13 }, wolf: { hpBase: 13, dmg: [1, 6], ac: 13 }, ghoul: { hpBase: 14, dmg: [1, 6], ac: 12 }, knight: { hpBase: 18, dmg: [1, 8], ac: 15 },
  ogre: { hpBase: 30, dmg: [2, 6], ac: 14 }, wraith: { hpBase: 22, dmg: [1, 8], ac: 15 }, troll: { hpBase: 36, dmg: [1, 10], ac: 15 }, basilisk: { hpBase: 28, dmg: [2, 6], ac: 16 }
};

export interface BossStat extends MonsterStat { atDepth: number; }

export const BOSS_STATS: Record<string, BossStat> = {
  boss1: { hpBase: 20, dmg: [1, 6], ac: 13, atDepth: 5 },
  boss2: { hpBase: 42, dmg: [2, 8], ac: 16, atDepth: 10 },
  boss3: { hpBase: 60, dmg: [2, 10], ac: 17, atDepth: 15 }
};
export const BOSS_IDS = Object.keys(BOSS_STATS);

export const MONSTER_XP: Record<string, number> = {
  rat: 8, goblin: 10, skeleton: 12, raven: 9,
  orc: 18, wolf: 16, ghoul: 17, knight: 20,
  ogre: 30, wraith: 28, troll: 35, basilisk: 32
};
export const BOSS_XP: Record<string, number> = { boss1: 80, boss2: 150, boss3: 250 };

export function xpToNext(level: number): number { return 20 * level; }

// Boss relics are currently only available to the Fighter. Each boss defeated
// drops one relic drawn at equal odds from those not yet owned this run.
export const RELIC_IDS = ['shadow_ring', 'giant_belt', 'blood_amulet'];
export const RELIC_CLASS_POOLS: Partial<Record<ClassKey, string[]>> = { fighter: RELIC_IDS };

export function mod(stat: number): number { return Math.floor((stat - 10) / 2); }

export function applyRelicEffect(player: Player, relicId: string): void {
  if (relicId === 'shadow_ring') {
    const oldDexMod = mod(player.stats.dex);
    player.stats.dex += 2;
    const newDexMod = mod(player.stats.dex);
    player.ac += (newDexMod - oldDexMod) + 1;
  } else if (relicId === 'giant_belt') {
    player.stats.str += 3;
    player.maxHp += 10;
    player.hp += 10;
  } else if (relicId === 'blood_amulet') {
    player.critThreshold = Math.max(2, (player.critThreshold || 20) - 1);
  }
}
