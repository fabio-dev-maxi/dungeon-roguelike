export const MONSTER_IDS_TIER: Record<number, string[]> = {
  1: ['rat', 'goblin', 'skeleton', 'raven'],
  2: ['orc', 'wolf', 'ghoul', 'knight'],
  3: ['ogre', 'wraith', 'troll', 'basilisk'],
  4: ['manticore', 'minotaur', 'gargoyle', 'vampire_spawn'],
  5: ['wyvern', 'vampire', 'demon', 'beholder'],
  6: ['archmage', 'death_knight',  'storm_giant', 'iron_golem']
};

export interface MonsterStat {
  hpBase: number;
  dmg: [number, number];
  ac: number;
  atk: number; // Bonus attacco base
}

export const MONSTER_STATS: Record<string, MonsterStat> = {
  // Tier 1 (+0 / +1)
  rat: { hpBase: 5, dmg: [1, 4], ac: 10, atk: 0 },
  goblin: { hpBase: 7, dmg: [1, 6], ac: 12, atk: 1 },
  skeleton: { hpBase: 9, dmg: [1, 6], ac: 13, atk: 1 },
  raven: { hpBase: 6, dmg: [1, 4], ac: 12, atk: 1 },

  // Tier 2 (+2 / +3)
  orc: { hpBase: 16, dmg: [1, 8], ac: 14, atk: 3 },
  wolf: { hpBase: 13, dmg: [1, 6], ac: 14, atk: 3 },
  ghoul: { hpBase: 14, dmg: [1, 6], ac: 14, atk: 2 },
  knight: { hpBase: 18, dmg: [1, 8], ac: 15, atk: 3 },

  // Tier 3 (+4 / +5)
  ogre: { hpBase: 30, dmg: [2, 6], ac: 15, atk: 5 },
  wraith: { hpBase: 22, dmg: [1, 8], ac: 16, atk: 5 },
  troll: { hpBase: 36, dmg: [1, 10], ac: 14, atk: 6 },
  basilisk: { hpBase: 28, dmg: [2, 6], ac: 17, atk: 6 },

  // Tier 4 (+6 / +7)
  manticore: { hpBase: 42, dmg: [2, 6], ac: 17, atk: 7 },
  minotaur: { hpBase: 48, dmg: [2, 8], ac: 16, atk: 7 },
  gargoyle: { hpBase: 40, dmg: [1, 10], ac: 18, atk: 8 },
  vampire_spawn: { hpBase: 52, dmg: [2, 6], ac: 16, atk: 8 },

  // Tier 5 (+8 / +9)
  wyvern: { hpBase: 65, dmg: [2, 8], ac: 17, atk: 9 },
  vampire: { hpBase: 75, dmg: [2, 8], ac: 18, atk: 9 },
  demon: { hpBase: 85, dmg: [3, 6], ac: 18, atk: 10 },
  beholder: { hpBase: 95, dmg: [2, 10], ac: 19, atk: 9 },

  // Tier 6 (+10 / +12)
  archmage: { hpBase: 105, dmg: [3, 8], ac: 18, atk: 10 },
  death_knight: { hpBase: 120, dmg: [3, 8], ac: 20, atk: 11 },
  storm_giant: { hpBase: 150, dmg: [4, 8], ac: 19, atk: 12 },
  iron_golem: { hpBase: 165, dmg: [3, 10], ac: 20, atk: 12 }
};

export interface BossStat extends MonsterStat { atDepth: number; }

export const BOSS_STATS: Record<string, BossStat> = {
  boss1: { hpBase: 20, dmg: [1, 6], ac: 14, atk: 2, atDepth: 5 },
  boss2: { hpBase: 35, dmg: [2, 8], ac: 15, atk: 3, atDepth: 10 },
  boss3: { hpBase: 50, dmg: [2, 10], ac: 16, atk: 4, atDepth: 15 },
  chimera: { hpBase: 65, dmg: [3, 6], ac: 17, atk: 6, atDepth: 20 },
  archdemon: { hpBase: 80, dmg: [3, 8], ac: 18, atk: 7, atDepth: 25 },
  lich: { hpBase: 110, dmg: [3, 8], ac: 18, atk: 8, atDepth: 30 },
  hydra: { hpBase: 140, dmg: [3, 10], ac: 19, atk: 10, atDepth: 35 },
  dragon_red: { hpBase: 190, dmg: [4, 8], ac: 20, atk: 12, atDepth: 40 },
  kraken: { hpBase: 230, dmg: [4, 10], ac: 21, atk: 13, atDepth: 45 },
  tarrasque: { hpBase: 300, dmg: [5, 10], ac: 22, atk: 15, atDepth: 50 }
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
