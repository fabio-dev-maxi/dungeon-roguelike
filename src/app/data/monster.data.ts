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
  boss1: { hpBase: 25, dmg: [1, 6], ac: 13, atk: 2, atDepth: 1 },       // Il Necroforgiato
  boss2: { hpBase: 40, dmg: [2, 4], ac: 14, atk: 3, atDepth: 2 },       // La Sposa dell'Abisso
  boss3: { hpBase: 60, dmg: [2, 6], ac: 14, atk: 4, atDepth: 3 },       // Il Divoratore di Corone
  boss4: { hpBase: 85, dmg: [2, 8], ac: 15, atk: 5, atDepth: 4 },       // La Chimera Infuocata
  boss5: { hpBase: 110, dmg: [3, 6], ac: 15, atk: 6, atDepth: 5 },      // L'Arcidemone
  boss6: { hpBase: 140, dmg: [3, 8], ac: 16, atk: 7, atDepth: 6 },      // Il Lich
  boss7: { hpBase: 175, dmg: [3, 10], ac: 17, atk: 8, atDepth: 7 },     // L'Idra dai Sette Capi
  boss8: { hpBase: 215, dmg: [4, 6], ac: 17, atk: 9, atDepth: 8 },      // Il Drago Verde Adulto
  boss9: { hpBase: 260, dmg: [4, 8], ac: 18, atk: 10, atDepth: 9 },     // Il Drago Rosso
  boss10: { hpBase: 310, dmg: [4, 10], ac: 19, atk: 11, atDepth: 10 },  // Il Kraken degli Abissi
  boss11: { hpBase: 365, dmg: [5, 6], ac: 19, atk: 12, atDepth: 11 },   // Il Balor delle Fiamme
  boss12: { hpBase: 425, dmg: [5, 8], ac: 20, atk: 13, atDepth: 12 },   // Il Drago Blu Antico
  boss13: { hpBase: 490, dmg: [5, 10], ac: 21, atk: 14, atDepth: 13 },  // Il Drago Supremo
  boss14: { hpBase: 560, dmg: [6, 8], ac: 22, atk: 15, atDepth: 14 },   // Il Signore dei Pit Fiend
  boss15: { hpBase: 650, dmg: [6, 10], ac: 23, atk: 16, atDepth: 15 }   // Il Tarrasque
};

export const BOSS_IDS = Object.keys(BOSS_STATS);

export const MONSTER_XP: Record<string, number> = {
  // Tier 1 (Piano 1)
  rat: 120, goblin: 150, skeleton: 180, raven: 150,
  
  // Tier 2 (Piano 2)
  orc: 280, wolf: 300, ghoul: 320, knight: 300,
  
  // Tier 3 (Piano 3)
  ogre: 420, wraith: 450, troll: 480, basilisk: 450,
  
  // Tier 4 (Piano 4)
  manticore: 580, minotaur: 600, gargoyle: 620, vampire_spawn: 600,
  
  // Tier 5 (Piano 5-6)
  wyvern: 800, mummy: 850, chimera_minor: 900, shadow: 850,
  
  // Tier 6 (Piano 6-7)
  vampire: 1100, beholder: 1200, young_dragon: 1300, medusa: 1200,
  
  // Tier 7 (Piano 8-9) — Ribilanciato (Media 1.800 XP)
  demon: 1600, archmage: 1800, death_knight: 2000, frost_giant: 1800,
  
  // Tier 8 (Piano 10-11) — Ribilanciato (Media 2.500 XP)
  storm_giant: 2300, iron_golem: 2500, lich_apprentice: 2700, marilith: 2500,
  
  // Tier 9 (Piano 12-13) — Ribilanciato (Media 3.325 XP)
  pit_fiend: 3100, solar: 3300, ancient_dragon: 3600, balor: 3300,
  
  // Tier 10 (Piano 14-15) — Ribilanciato (Media 4.050 XP)
  titan: 3900, void_dragon: 4200, empyrean: 4100, primordial: 4000
};

export const BOSS_XP: Record<string, number> = { 
  boss1: 500,      // 'Il Necroforgiato', 
  boss2: 900,      // "La Sposa dell'Abisso", 
  boss3: 1200,     // 'Il Divoratore di Corone', 
  boss4: 1600,     // 'La Chimera Infuocata', 
  boss5: 2000,     // "L'Arcidemone", 
  boss6: 3000,     // 'Il Lich', 
  boss7: 4000,     // "L'Idra dai Sette Capi", 
  boss8: 6000,     // 'Il Drago Verde Adulto', 
  boss9: 8000,     // 'Il Drago Rosso', 
  boss10: 9000,    // 'Il Kraken degli Abissi', 
  boss11: 10000,   // 'Il Balor delle Fiamme', 
  boss12: 11000,   // 'Il Drago Blu Antico', 
  boss13: 13000,   // 'Il Drago Supremo', 
  boss14: 15000,   // 'Il Signore dei Pit Fiend', 
  boss15: 20000    //'Il Tarrasque' 
};

export function xpToNext(level: number): number {
  return 1000 * level;
}
