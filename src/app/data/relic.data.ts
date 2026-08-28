import { ClassKey, Player, StatKey } from '../models/game.models';

/** Modificatori applicati al giocatore quando la reliquia viene raccolta. */
interface RelicEffect {
  stats?: Partial<Record<StatKey, number>>;
  ac?: number;
  maxHp?: number;
  atk?: number;
  dmg?: number;
  damageReduction?: number;
  specialDmg?: number;
  specialHeal?: number;
  potionHeal?: number;
  flee?: number;
  critThreshold?: number;
  critMultiplier?: number;
}

/**
 * Dieci reliquie per classe, una per ciascuno dei dieci boss: la pool esclude
 * quelle già possedute, quindi con meno voci i boss finali restavano a mani vuote.
 */
export const RELICS: Record<ClassKey, Record<string, RelicEffect>> = {
  fighter: {
    giant_belt: { stats: { str: 3 }, maxHp: 12 },
    dragon_scale_shield: { ac: 2, damageReduction: 2 },
    berserker_ring: { dmg: 3, atk: 1 },
    warlord_crown: { stats: { str: 2 }, atk: 2 },
    bulwark_plate: { ac: 3, maxHp: 15 },
    bloodforged_gauntlets: { dmg: 4, damageReduction: 1 },
    titan_heart: { stats: { con: 3 }, maxHp: 20 },
    wrath_totem: { critThreshold: 1, dmg: 2 },
    unbreakable_oath: { damageReduction: 3, maxHp: 10 },
    avatar_of_war: { stats: { str: 3 }, dmg: 3, atk: 2 }
  },
  rogue: {
    shadow_ring: { stats: { dex: 3 }, ac: 1, flee: 3 },
    blood_amulet: { critThreshold: 1 },
    cloaking_cape: { stats: { dex: 2 }, critMultiplier: 0.5 },
    venom_fangs: { dmg: 4 },
    mirror_dagger: { stats: { dex: 2 }, atk: 2 },
    nightstalker_boots: { flee: 5, ac: 2 },
    thief_sigil: { critThreshold: 1, dmg: 2 },
    phantom_veil: { maxHp: 12, ac: 2 },
    silent_edge: { critMultiplier: 0.5, atk: 2 },
    kingslayer_mark: { stats: { dex: 3 }, critThreshold: 1, dmg: 3 }
  },
  wizard: {
    tome_of_archmage: { stats: { int: 3 }, specialDmg: 3 },
    pendant_of_ether: { ac: 1, maxHp: 10 },
    crystal_orb: { stats: { int: 2 }, atk: 2 },
    staff_of_ley_lines: { specialDmg: 5 },
    runic_mantle: { ac: 2, maxHp: 12 },
    eye_of_the_void: { stats: { int: 3 }, critThreshold: 1 },
    astral_focus: { specialDmg: 4, atk: 2 },
    philosopher_stone: { stats: { int: 2 }, potionHeal: 6 },
    chrono_sigil: { damageReduction: 2, specialDmg: 3 },
    archmage_ascendancy: { stats: { int: 4 }, specialDmg: 6, atk: 2 }
  },
  cleric: {
    sun_reliquary: { stats: { wis: 3 }, atk: 2 },
    holy_grail: { stats: { wis: 2 }, specialHeal: 6 },
    guardian_talisman: { ac: 2, maxHp: 10 },
    martyr_shroud: { damageReduction: 3, maxHp: 10 },
    dawn_censer: { specialHeal: 8 },
    seraph_wings: { stats: { wis: 2 }, ac: 2 },
    blessed_chalice: { potionHeal: 8, maxHp: 10 },
    aegis_of_faith: { ac: 3, damageReduction: 2 },
    radiant_scepter: { stats: { wis: 3 }, dmg: 3 },
    divine_ascension: { stats: { wis: 3 }, specialHeal: 10, ac: 2 }
  }
};

export const RELIC_CLASS_POOLS: Record<ClassKey, string[]> = {
  fighter: Object.keys(RELICS.fighter),
  rogue: Object.keys(RELICS.rogue),
  wizard: Object.keys(RELICS.wizard),
  cleric: Object.keys(RELICS.cleric)
};

export const RELIC_IDS = Object.values(RELIC_CLASS_POOLS).flat();

function findRelic(relicId: string): RelicEffect | undefined {
  for (const pool of Object.values(RELICS)) {
    if (pool[relicId]) return pool[relicId];
  }
  return undefined;
}

export function applyRelicEffect(p: Player, relicId: string): void {
  const effect = findRelic(relicId);
  if (!effect) return;

  for (const [key, value] of Object.entries(effect.stats ?? {})) {
    p.stats[key as StatKey] += value;
  }

  if (effect.ac) p.ac += effect.ac;
  if (effect.maxHp) {
    p.maxHp += effect.maxHp;
    p.hp += effect.maxHp;
  }
  if (effect.atk) p.flatAtkBonus = (p.flatAtkBonus || 0) + effect.atk;
  if (effect.dmg) p.flatDmgBonus = (p.flatDmgBonus || 0) + effect.dmg;
  if (effect.damageReduction) p.damageReduction = (p.damageReduction || 0) + effect.damageReduction;
  if (effect.specialDmg) p.specialBonusDmg = (p.specialBonusDmg || 0) + effect.specialDmg;
  if (effect.specialHeal) p.specialBonusHeal = (p.specialBonusHeal || 0) + effect.specialHeal;
  if (effect.potionHeal) p.potionHealBonus = (p.potionHealBonus || 0) + effect.potionHeal;
  if (effect.flee) p.fleeBonus = (p.fleeBonus || 0) + effect.flee;
  if (effect.critThreshold) p.critThreshold = Math.max(15, p.critThreshold - effect.critThreshold);
  if (effect.critMultiplier) p.critMultiplier = Math.max(2.5, (p.critMultiplier || 2) + effect.critMultiplier);
}
