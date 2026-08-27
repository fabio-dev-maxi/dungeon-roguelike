import { ClassKey, Feat, StatKey } from '../models/game.models';

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

export function mod(stat: number): number { 
  return Math.floor((stat - 10) / 2); 
}

/**
  * Talenti specializzati per ogni classe.
  */
export const CLASS_FEATS: Record<ClassKey, Feat[]> = {
  // GUERRIERO: Specializzazione su Danni, CA e Punti Ferita (Tanking & Forzabruta)
  fighter: [
    { id: 'juggernaut', cls: 'fighter', name: '', desc: '' },
    { id: 'colossus_strike', cls: 'fighter', name: '', desc: '' },
    { id: 'bloodlust_vigor', cls: 'fighter', name: '', desc: '' },
    { id: 'titan_defense', cls: 'fighter', name: '', desc: '' },
    { id: 'devastating_crit', cls: 'fighter', name: '', desc: '' }
  ],
  // LADRO: Specializzazione su Destrezza, Critici elevati e Agilità/Fuga
  rogue: [
    { id: 'shadow_step', cls: 'rogue', name: '', desc: '' },
    { id: 'lethal_precision', cls: 'rogue', name: '', desc: '' },
    { id: 'assassin_blade', cls: 'rogue', name: '', desc: '' },
    { id: 'evasion_master', cls: 'rogue', name: '', desc: '' },
    { id: 'venomous_strike', cls: 'rogue', name: '', desc: '' }
  ],
  // MAGO: Specializzazione su Intelligenza, Danni Arcani e Barriere di Mana
  wizard: [
    { id: 'arcane_mind', cls: 'wizard', name: '', desc: '' },
    { id: 'spell_amplification', cls: 'wizard', name: '', desc: '' },
    { id: 'mana_barrier', cls: 'wizard', name: '', desc: '' },
    { id: 'overcharge_spell', cls: 'wizard', name: '', desc: '' },
    { id: 'archmage_focus', cls: 'wizard', name: '', desc: '' }
  ],
  // CHIERICO: Specializzazione su Saggezza, Cura potenziata, Rigenerazione e Difesa Sacra
  cleric: [
    { id: 'divine_grace', cls: 'cleric', name: '', desc: '' },
    { id: 'radiant_cure', cls: 'cleric', name: '', desc: '' },
    { id: 'holy_armor', cls: 'cleric', name: '', desc: '' },
    { id: 'blessed_strikes', cls: 'cleric', name: '', desc: '' },
    { id: 'renewing_faith', cls: 'cleric', name: '', desc: '' }
  ]
};