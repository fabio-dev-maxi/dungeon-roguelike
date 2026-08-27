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

export function mod(stat: number): number { return Math.floor((stat - 10) / 2); }

export const CLASS_FEATS: Record<string, Feat[]> = {
  fighter: [
    { id: 'weapon_master', cls: 'fighter', name: '', desc: '' },
    { id: 'iron_skin', cls: 'fighter', name: '', desc: '' },
    { id: 'savage_striker', cls: 'fighter', name: '', desc: '' },
    { id: 'battle_vigors', cls: 'fighter', name: '', desc: '' },
    { id: 'devastating_crit', cls: 'fighter', name: '', desc: '' }
  ]
};