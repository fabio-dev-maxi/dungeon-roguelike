import { ClassKey, Feat, Player, StatKey } from '../models/game.models';

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
  3: ['ogre', 'wraith', 'troll', 'basilisk'],
  4: ['manticore', 'minotaur', 'gargoyle', 'vampire_spawn'],
  5: ['wyvern', 'vampire', 'demon', 'beholder'],
  6: ['archmage', 'death_knight',  'storm_giant', 'iron_golem']
};

export interface MonsterStat { hpBase: number; dmg: [number, number]; ac: number; }

export const MONSTER_STATS: Record<string, MonsterStat> = {
  // Tier 1
  rat: { hpBase: 5, dmg: [1, 4], ac: 10 }, 
  goblin: { hpBase: 7, dmg: [1, 6], ac: 12 }, 
  skeleton: { hpBase: 9, dmg: [1, 6], ac: 13 }, 
  raven: { hpBase: 6, dmg: [1, 4], ac: 12 },
  
  // Tier 2
  orc: { hpBase: 16, dmg: [1, 8], ac: 13 }, 
  wolf: { hpBase: 13, dmg: [1, 6], ac: 13 }, 
  ghoul: { hpBase: 14, dmg: [1, 6], ac: 12 }, 
  knight: { hpBase: 18, dmg: [1, 8], ac: 15 },
  
  // Tier 3
  ogre: { hpBase: 30, dmg: [2, 6], ac: 14 }, 
  wraith: { hpBase: 22, dmg: [1, 8], ac: 15 }, 
  troll: { hpBase: 36, dmg: [1, 10], ac: 13 }, 
  basilisk: { hpBase: 28, dmg: [2, 6], ac: 16 },

  // Tier 4
  manticore: { hpBase: 42, dmg: [2, 6], ac: 16 },
  minotaur: { hpBase: 48, dmg: [2, 8], ac: 15 },
  gargoyle: { hpBase: 40, dmg: [1, 10], ac: 17 },
  vampire_spawn: { hpBase: 52, dmg: [2, 6], ac: 15 },

  // Tier 5
  wyvern: { hpBase: 65, dmg: [2, 8], ac: 16 },
  vampire: { hpBase: 75, dmg: [2, 8], ac: 17 },
  demon: { hpBase: 85, dmg: [3, 6], ac: 17 },
  beholder: { hpBase: 95, dmg: [2, 10], ac: 18 },

  // Tier 6
  archmage: { hpBase: 105, dmg: [3, 8], ac: 17 },
  death_knight: { hpBase: 120, dmg: [3, 8], ac: 19 },
  storm_giant: { hpBase: 150, dmg: [4, 8], ac: 18 },
  iron_golem: { hpBase: 165, dmg: [3, 10], ac: 20 }
};

export interface BossStat extends MonsterStat { atDepth: number; }

export const BOSS_STATS: Record<string, BossStat> = {
  boss1: { hpBase: 20, dmg: [1, 6], ac: 13, atDepth: 5 },
  boss2: { hpBase: 35, dmg: [2, 8], ac: 15, atDepth: 10 },
  boss3: { hpBase: 50, dmg: [2, 10], ac: 16, atDepth: 15 },
  chimera: { hpBase: 65, dmg: [3, 6], ac: 16, atDepth: 20 },
  archdemon: { hpBase: 80, dmg: [3, 8], ac: 17, atDepth: 25 },
  lich: { hpBase: 110, dmg: [3, 8], ac: 17, atDepth: 30 },
  hydra: { hpBase: 140, dmg: [3, 10], ac: 17, atDepth: 35 },
  dragon_red: { hpBase: 190, dmg: [4, 8], ac: 18, atDepth: 40 },
  kraken: { hpBase: 230, dmg: [4, 10], ac: 19, atDepth: 45 },
  tarrasque: { hpBase: 300, dmg: [5, 10], ac: 20, atDepth: 50 }
};
export const BOSS_IDS = Object.keys(BOSS_STATS);

export const MONSTER_XP: Record<string, number> = {
  // Tier 1
  rat: 8, goblin: 10, skeleton: 12, raven: 9,
  // Tier 2
  orc: 18, wolf: 16, ghoul: 17, knight: 20,
  // Tier 3
  ogre: 30, wraith: 28, troll: 35, basilisk: 32,
  // Tier 4
  manticore: 45, minotaur: 50, gargoyle: 42, vampire_spawn: 55,
  // Tier 5
  wyvern: 70, vampire: 85, demon: 100, beholder: 120,
  // Tier 6
  archmage: 140, death_knight: 165, storm_giant: 220, iron_golem: 250
};

export const BOSS_XP: Record<string, number> = { 
  boss1: 80, 
  boss2: 150, 
  boss3: 250,
  chimera: 300,
  archdemon: 350,
  lich: 400,
  hydra: 550,
  dragon_red: 800,
  kraken: 1100,
  tarrasque: 1600
};

export function xpToNext(level: number): number { return 20 * level; }

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

export const CLASS_FEATS: Record<string, Feat[]> = {
  fighter: [
    { id: 'weapon_master', cls: 'fighter', name: '', desc: '' },
    { id: 'iron_skin', cls: 'fighter', name: '', desc: '' },
    { id: 'savage_striker', cls: 'fighter', name: '', desc: '' },
    { id: 'battle_vigors', cls: 'fighter', name: '', desc: '' },
    { id: 'devastating_crit', cls: 'fighter', name: '', desc: '' }
  ]
};