import { ClassKey, Player } from '../models/game.models';

export const RELIC_IDS = [
  // Guerriero
  'giant_belt', 'dragon_scale_shield', 'berserker_ring',
  // Ladro
  'shadow_ring', 'blood_amulet', 'cloaking_cape',
  // Mago
  'tome_of_archmage', 'pendant_of_ether', 'crystal_orb',
  // Chierico
  'sun_reliquary', 'holy_grail', 'guardian_talisman'
];

/**
  * Pool di reliquie disponibili per ciascuna classe ottenibili dai Boss.
  */
export const RELIC_CLASS_POOLS: Record<ClassKey, string[]> = {
  fighter: ['giant_belt', 'dragon_scale_shield', 'berserker_ring'],
  rogue: ['shadow_ring', 'blood_amulet', 'cloaking_cape'],
  wizard: ['tome_of_archmage', 'pendant_of_ether', 'crystal_orb'],
  cleric: ['sun_reliquary', 'holy_grail', 'guardian_talisman']
};

/**
  * Applica l'effetto permanente della reliquia acquisita al giocatore.
  */
export function applyRelicEffect(p: Player, relicId: string): void {
  switch (relicId) {
    // --- RELIQUIE GUERRIERO ---
    case 'giant_belt':
      p.stats.str += 3;
      p.maxHp += 12;
      p.hp += 12;
      break;
    case 'dragon_scale_shield':
      p.ac += 2;
      p.damageReduction = (p.damageReduction || 0) + 2;
      break;
    case 'berserker_ring':
      p.flatDmgBonus = (p.flatDmgBonus || 0) + 3;
      p.flatAtkBonus = (p.flatAtkBonus || 0) + 1;
      break;

    // --- RELIQUIE LADRO ---
    case 'shadow_ring':
      p.stats.dex += 3;
      p.ac += 1;
      p.fleeBonus = (p.fleeBonus || 0) + 3;
      break;
    case 'blood_amulet':
      p.critThreshold = Math.max(15, p.critThreshold - 1);
      break;
    case 'cloaking_cape':
      p.stats.dex += 2;
      p.critMultiplier = Math.max(2.5, (p.critMultiplier || 2) + 0.5);
      break;

    // --- RELIQUIE MAGO ---
    case 'tome_of_archmage':
      p.stats.int += 3;
      p.specialBonusDmg = (p.specialBonusDmg || 0) + 3;
      break;
    case 'pendant_of_ether':
      p.ac += 1;
      p.maxHp += 10;
      p.hp += 10;
      break;
    case 'crystal_orb':
      p.stats.int += 2;
      p.flatAtkBonus = (p.flatAtkBonus || 0) + 2;
      break;

    // --- RELIQUIE CHIERICO ---
    case 'sun_reliquary':
      p.stats.wis += 3;
      p.flatAtkBonus = (p.flatAtkBonus || 0) + 2;
      break;
    case 'holy_grail':
      p.stats.wis += 2;
      p.specialBonusHeal = (p.specialBonusHeal || 0) + 6;
      break;
    case 'guardian_talisman':
      p.ac += 2;
      p.maxHp += 10;
      p.hp += 10;
      break;
  }
}