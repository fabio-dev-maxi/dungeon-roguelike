import { ClassKey, Player } from '../models/game.models';

export interface WeaponItem {
  key: string;
  nameKey: string;
  dice: [number, number];
  bonus: number;
  tier: number;
  quality: 'normal' | 'superior' | 'epic';
}

export interface ArmorItem {
  key: string;
  nameKey: string;
  bonus: number;         // Bonus CA
  drBonus?: number;      // Riduzione Danno
  specialDmgBonus?: number;
  specialHealBonus?: number;
  critBonus?: number;
  tier: number;
  quality: 'normal' | 'superior' | 'epic';
}

/**
 * Catalogo delle Armi divise per Classe e Tier (1-5)
 */
export const WEAPON_POOLS: Record<ClassKey, Record<number, WeaponItem[]>> = {
  fighter: {
    1: [
      { key: 'greataxe_n', nameKey: 'greataxe_n', dice: [1, 12], bonus: 0, tier: 1, quality: 'normal' },
      { key: 'greataxe_s', nameKey: 'greataxe_s', dice: [1, 12], bonus: 1, tier: 1, quality: 'superior' },
      { key: 'greataxe_e', nameKey: 'greataxe_e', dice: [1, 12], bonus: 2, tier: 1, quality: 'epic' }
    ],
    2: [
      { key: 'warhammer_n', nameKey: 'warhammer_n', dice: [2, 6], bonus: 1, tier: 2, quality: 'normal' },
      { key: 'warhammer_s', nameKey: 'warhammer_s', dice: [2, 6], bonus: 2, tier: 2, quality: 'superior' },
      { key: 'warhammer_e', nameKey: 'warhammer_e', dice: [2, 6], bonus: 3, tier: 2, quality: 'epic' }
    ],
    3: [
      { key: 'exec_sword_n', nameKey: 'exec_sword_n', dice: [2, 8], bonus: 2, tier: 3, quality: 'normal' },
      { key: 'exec_sword_s', nameKey: 'exec_sword_s', dice: [2, 8], bonus: 3, tier: 3, quality: 'superior' },
      { key: 'exec_sword_e', nameKey: 'exec_sword_e', dice: [2, 8], bonus: 4, tier: 3, quality: 'epic' }
    ],
    4: [
      { key: 'dragonslayer_n', nameKey: 'dragonslayer_n', dice: [3, 6], bonus: 3, tier: 4, quality: 'normal' },
      { key: 'dragonslayer_s', nameKey: 'dragonslayer_s', dice: [3, 6], bonus: 4, tier: 4, quality: 'superior' },
      { key: 'dragonslayer_e', nameKey: 'dragonslayer_e', dice: [3, 6], bonus: 5, tier: 4, quality: 'epic' }
    ],
    5: [
      { key: 'godslayer_n', nameKey: 'godslayer_n', dice: [4, 6], bonus: 4, tier: 5, quality: 'normal' },
      { key: 'godslayer_s', nameKey: 'godslayer_s', dice: [4, 6], bonus: 5, tier: 5, quality: 'superior' },
      { key: 'godslayer_e', nameKey: 'godslayer_e', dice: [4, 6], bonus: 6, tier: 5, quality: 'epic' }
    ]
  },
  rogue: {
    1: [
      { key: 'curved_daggers_n', nameKey: 'curved_daggers_n', dice: [2, 4], bonus: 0, tier: 1, quality: 'normal' },
      { key: 'curved_daggers_s', nameKey: 'curved_daggers_s', dice: [2, 4], bonus: 1, tier: 1, quality: 'superior' },
      { key: 'curved_daggers_e', nameKey: 'curved_daggers_e', dice: [2, 4], bonus: 2, tier: 1, quality: 'epic' }
    ],
    2: [
      { key: 'rapier_n', nameKey: 'rapier_n', dice: [2, 6], bonus: 1, tier: 2, quality: 'normal' },
      { key: 'rapier_s', nameKey: 'rapier_s', dice: [2, 6], bonus: 2, tier: 2, quality: 'superior' },
      { key: 'rapier_e', nameKey: 'rapier_e', dice: [2, 6], bonus: 3, tier: 2, quality: 'epic' }
    ],
    3: [
      { key: 'venom_blades_n', nameKey: 'venom_blades_n', dice: [3, 4], bonus: 2, tier: 3, quality: 'normal' },
      { key: 'venom_blades_s', nameKey: 'venom_blades_s', dice: [3, 4], bonus: 3, tier: 3, quality: 'superior' },
      { key: 'venom_blades_e', nameKey: 'venom_blades_e', dice: [3, 4], bonus: 4, tier: 3, quality: 'epic' }
    ],
    4: [
      { key: 'eclipse_daggers_n', nameKey: 'eclipse_daggers_n', dice: [3, 6], bonus: 3, tier: 4, quality: 'normal' },
      { key: 'eclipse_daggers_s', nameKey: 'eclipse_daggers_s', dice: [3, 6], bonus: 4, tier: 4, quality: 'superior' },
      { key: 'eclipse_daggers_e', nameKey: 'eclipse_daggers_e', dice: [3, 6], bonus: 5, tier: 4, quality: 'epic' }
    ],
    5: [
      { key: 'void_blades_n', nameKey: 'void_blades_n', dice: [4, 6], bonus: 4, tier: 5, quality: 'normal' },
      { key: 'void_blades_s', nameKey: 'void_blades_s', dice: [4, 6], bonus: 5, tier: 5, quality: 'superior' },
      { key: 'void_blades_e', nameKey: 'void_blades_e', dice: [4, 6], bonus: 6, tier: 5, quality: 'epic' }
    ]
  },
  wizard: {
    1: [
      { key: 'elm_staff_n', nameKey: 'elm_staff_n', dice: [1, 8], bonus: 0, tier: 1, quality: 'normal' },
      { key: 'elm_staff_s', nameKey: 'elm_staff_s', dice: [1, 8], bonus: 1, tier: 1, quality: 'superior' },
      { key: 'elm_staff_e', nameKey: 'elm_staff_e', dice: [1, 8], bonus: 2, tier: 1, quality: 'epic' }
    ],
    2: [
      { key: 'rune_staff_n', nameKey: 'rune_staff_n', dice: [2, 4], bonus: 1, tier: 2, quality: 'normal' },
      { key: 'rune_staff_s', nameKey: 'rune_staff_s', dice: [2, 4], bonus: 2, tier: 2, quality: 'superior' },
      { key: 'rune_staff_e', nameKey: 'rune_staff_e', dice: [2, 4], bonus: 3, tier: 2, quality: 'epic' }
    ],
    3: [
      { key: 'orb_staff_n', nameKey: 'orb_staff_n', dice: [2, 6], bonus: 2, tier: 3, quality: 'normal' },
      { key: 'orb_staff_s', nameKey: 'orb_staff_s', dice: [2, 6], bonus: 3, tier: 3, quality: 'superior' },
      { key: 'orb_staff_e', nameKey: 'orb_staff_e', dice: [2, 6], bonus: 4, tier: 3, quality: 'epic' }
    ],
    4: [
      { key: 'archmage_staff_n', nameKey: 'archmage_staff_n', dice: [3, 4], bonus: 3, tier: 4, quality: 'normal' },
      { key: 'archmage_staff_s', nameKey: 'archmage_staff_s', dice: [3, 4], bonus: 4, tier: 4, quality: 'superior' },
      { key: 'archmage_staff_e', nameKey: 'archmage_staff_e', dice: [3, 4], bonus: 5, tier: 4, quality: 'epic' }
    ],
    5: [
      { key: 'cosmic_staff_n', nameKey: 'cosmic_staff_n', dice: [4, 4], bonus: 4, tier: 5, quality: 'normal' },
      { key: 'cosmic_staff_s', nameKey: 'cosmic_staff_s', dice: [4, 4], bonus: 5, tier: 5, quality: 'superior' },
      { key: 'cosmic_staff_e', nameKey: 'cosmic_staff_e', dice: [4, 4], bonus: 6, tier: 5, quality: 'epic' }
    ]
  },
  cleric: {
    1: [
      { key: 'heavy_mace_n', nameKey: 'heavy_mace_n', dice: [1, 8], bonus: 0, tier: 1, quality: 'normal' },
      { key: 'heavy_mace_s', nameKey: 'heavy_mace_s', dice: [1, 8], bonus: 1, tier: 1, quality: 'superior' },
      { key: 'heavy_mace_e', nameKey: 'heavy_mace_e', dice: [1, 8], bonus: 2, tier: 1, quality: 'epic' }
    ],
    2: [
      { key: 'warhammer_c_n', nameKey: 'warhammer_c_n', dice: [2, 4], bonus: 1, tier: 2, quality: 'normal' },
      { key: 'warhammer_c_s', nameKey: 'warhammer_c_s', dice: [2, 4], bonus: 2, tier: 2, quality: 'superior' },
      { key: 'warhammer_c_e', nameKey: 'warhammer_c_e', dice: [2, 4], bonus: 3, tier: 2, quality: 'epic' }
    ],
    3: [
      { key: 'holy_flail_n', nameKey: 'holy_flail_n', dice: [2, 6], bonus: 2, tier: 3, quality: 'normal' },
      { key: 'holy_flail_s', nameKey: 'holy_flail_s', dice: [2, 6], bonus: 3, tier: 3, quality: 'superior' },
      { key: 'holy_flail_e', nameKey: 'holy_flail_e', dice: [2, 6], bonus: 4, tier: 3, quality: 'epic' }
    ],
    4: [
      { key: 'god_hammer_n', nameKey: 'god_hammer_n', dice: [3, 4], bonus: 3, tier: 4, quality: 'normal' },
      { key: 'god_hammer_s', nameKey: 'god_hammer_s', dice: [3, 4], bonus: 4, tier: 4, quality: 'superior' },
      { key: 'god_hammer_e', nameKey: 'god_hammer_e', dice: [3, 4], bonus: 5, tier: 4, quality: 'epic' }
    ],
    5: [
      { key: 'deliverer_mace_n', nameKey: 'deliverer_mace_n', dice: [4, 4], bonus: 4, tier: 5, quality: 'normal' },
      { key: 'deliverer_mace_s', nameKey: 'deliverer_mace_s', dice: [4, 4], bonus: 5, tier: 5, quality: 'superior' },
      { key: 'deliverer_mace_e', nameKey: 'deliverer_mace_e', dice: [4, 4], bonus: 6, tier: 5, quality: 'epic' }
    ]
  }
};

/**
 * Catalogo delle Armature divise per Classe e Tier (1-5)
 */
export const ARMOR_POOLS: Record<ClassKey, Record<number, ArmorItem[]>> = {
  fighter: {
    1: [
      { key: 'reinf_plate_n', nameKey: 'reinf_plate_n', bonus: 4, tier: 1, quality: 'normal' },
      { key: 'reinf_plate_s', nameKey: 'reinf_plate_s', bonus: 5, tier: 1, quality: 'superior' },
      { key: 'reinf_plate_e', nameKey: 'reinf_plate_e', bonus: 5, drBonus: 1, tier: 1, quality: 'epic' }
    ],
    2: [
      { key: 'mithril_plate_n', nameKey: 'mithril_plate_n', bonus: 6, tier: 2, quality: 'normal' },
      { key: 'mithril_plate_s', nameKey: 'mithril_plate_s', bonus: 7, tier: 2, quality: 'superior' },
      { key: 'mithril_plate_e', nameKey: 'mithril_plate_e', bonus: 7, drBonus: 2, tier: 2, quality: 'epic' }
    ],
    3: [
      { key: 'adamant_plate_n', nameKey: 'adamant_plate_n', bonus: 8, tier: 3, quality: 'normal' },
      { key: 'adamant_plate_s', nameKey: 'adamant_plate_s', bonus: 9, tier: 3, quality: 'superior' },
      { key: 'adamant_plate_e', nameKey: 'adamant_plate_e', bonus: 9, drBonus: 3, tier: 3, quality: 'epic' }
    ],
    4: [
      { key: 'dragon_king_n', nameKey: 'dragon_king_n', bonus: 10, tier: 4, quality: 'normal' },
      { key: 'dragon_king_s', nameKey: 'dragon_king_s', bonus: 11, tier: 4, quality: 'superior' },
      { key: 'dragon_king_e', nameKey: 'dragon_king_e', bonus: 11, drBonus: 4, tier: 4, quality: 'epic' }
    ],
    5: [
      { key: 'immortal_plate_n', nameKey: 'immortal_plate_n', bonus: 12, tier: 5, quality: 'normal' },
      { key: 'immortal_plate_s', nameKey: 'immortal_plate_s', bonus: 13, tier: 5, quality: 'superior' },
      { key: 'immortal_plate_e', nameKey: 'immortal_plate_e', bonus: 13, drBonus: 5, tier: 5, quality: 'epic' }
    ]
  },
  rogue: {
    1: [
      { key: 'stud_leather_n', nameKey: 'stud_leather_n', bonus: 4, tier: 1, quality: 'normal' },
      { key: 'stud_leather_s', nameKey: 'stud_leather_s', bonus: 5, tier: 1, quality: 'superior' },
      { key: 'stud_leather_e', nameKey: 'stud_leather_e', bonus: 5, critBonus: 1, tier: 1, quality: 'epic' }
    ],
    2: [
      { key: 'shadow_leather_n', nameKey: 'shadow_leather_n', bonus: 6, tier: 2, quality: 'normal' },
      { key: 'shadow_leather_s', nameKey: 'shadow_leather_s', bonus: 7, tier: 2, quality: 'superior' },
      { key: 'shadow_leather_e', nameKey: 'shadow_leather_e', bonus: 7, critBonus: 1, tier: 2, quality: 'epic' }
    ],
    3: [
      { key: 'eclipse_leather_n', nameKey: 'eclipse_leather_n', bonus: 8, tier: 3, quality: 'normal' },
      { key: 'eclipse_leather_s', nameKey: 'eclipse_leather_s', bonus: 9, tier: 3, quality: 'superior' },
      { key: 'eclipse_leather_e', nameKey: 'eclipse_leather_e', bonus: 9, critBonus: 1, tier: 3, quality: 'epic' }
    ],
    4: [
      { key: 'phantom_leather_n', nameKey: 'phantom_leather_n', bonus: 10, tier: 4, quality: 'normal' },
      { key: 'phantom_leather_s', nameKey: 'phantom_leather_s', bonus: 11, tier: 4, quality: 'superior' },
      { key: 'phantom_leather_e', nameKey: 'phantom_leather_e', bonus: 11, critBonus: 2, tier: 4, quality: 'epic' }
    ],
    5: [
      { key: 'nightfall_leather_n', nameKey: 'nightfall_leather_n', bonus: 12, tier: 5, quality: 'normal' },
      { key: 'nightfall_leather_s', nameKey: 'nightfall_leather_s', bonus: 13, tier: 5, quality: 'superior' },
      { key: 'nightfall_leather_e', nameKey: 'nightfall_leather_e', bonus: 13, critBonus: 2, tier: 5, quality: 'epic' }
    ]
  },
  wizard: {
    1: [
      { key: 'ench_robes_n', nameKey: 'ench_robes_n', bonus: 3, tier: 1, quality: 'normal' },
      { key: 'ench_robes_s', nameKey: 'ench_robes_s', bonus: 4, tier: 1, quality: 'superior' },
      { key: 'ench_robes_e', nameKey: 'ench_robes_e', bonus: 4, specialDmgBonus: 2, tier: 1, quality: 'epic' }
    ],
    2: [
      { key: 'spellwoven_robes_n', nameKey: 'spellwoven_robes_n', bonus: 5, tier: 2, quality: 'normal' },
      { key: 'spellwoven_robes_s', nameKey: 'spellwoven_robes_s', bonus: 6, tier: 2, quality: 'superior' },
      { key: 'spellwoven_robes_e', nameKey: 'spellwoven_robes_e', bonus: 6, specialDmgBonus: 3, tier: 2, quality: 'epic' }
    ],
    3: [
      { key: 'astral_robes_n', nameKey: 'astral_robes_n', bonus: 7, tier: 3, quality: 'normal' },
      { key: 'astral_robes_s', nameKey: 'astral_robes_s', bonus: 8, tier: 3, quality: 'superior' },
      { key: 'astral_robes_e', nameKey: 'astral_robes_e', bonus: 8, specialDmgBonus: 4, tier: 3, quality: 'epic' }
    ],
    4: [
      { key: 'voidwoven_robes_n', nameKey: 'voidwoven_robes_n', bonus: 9, tier: 4, quality: 'normal' },
      { key: 'voidwoven_robes_s', nameKey: 'voidwoven_robes_s', bonus: 10, tier: 4, quality: 'superior' },
      { key: 'voidwoven_robes_e', nameKey: 'voidwoven_robes_e', bonus: 10, specialDmgBonus: 5, tier: 4, quality: 'epic' }
    ],
    5: [
      { key: 'eternity_robes_n', nameKey: 'eternity_robes_n', bonus: 11, tier: 5, quality: 'normal' },
      { key: 'eternity_robes_s', nameKey: 'eternity_robes_s', bonus: 12, tier: 5, quality: 'superior' },
      { key: 'eternity_robes_e', nameKey: 'eternity_robes_e', bonus: 12, specialDmgBonus: 6, tier: 5, quality: 'epic' }
    ]
  },
  cleric: {
    1: [
      { key: 'heavy_mail_n', nameKey: 'heavy_mail_n', bonus: 4, tier: 1, quality: 'normal' },
      { key: 'heavy_mail_s', nameKey: 'heavy_mail_s', bonus: 5, tier: 1, quality: 'superior' },
      { key: 'heavy_mail_e', nameKey: 'heavy_mail_e', bonus: 5, specialHealBonus: 2, tier: 1, quality: 'epic' }
    ],
    2: [
      { key: 'divine_mail_n', nameKey: 'divine_mail_n', bonus: 6, tier: 2, quality: 'normal' },
      { key: 'divine_mail_s', nameKey: 'divine_mail_s', bonus: 7, tier: 2, quality: 'superior' },
      { key: 'divine_mail_e', nameKey: 'divine_mail_e', bonus: 7, specialHealBonus: 3, tier: 2, quality: 'epic' }
    ],
    3: [
      { key: 'celestial_mail_n', nameKey: 'celestial_mail_n', bonus: 8, tier: 3, quality: 'normal' },
      { key: 'celestial_mail_s', nameKey: 'celestial_mail_s', bonus: 9, tier: 3, quality: 'superior' },
      { key: 'celestial_mail_e', nameKey: 'celestial_mail_e', bonus: 9, specialHealBonus: 4, tier: 3, quality: 'epic' }
    ],
    4: [
      { key: 'angelic_mail_n', nameKey: 'angelic_mail_n', bonus: 10, tier: 4, quality: 'normal' },
      { key: 'angelic_mail_s', nameKey: 'angelic_mail_s', bonus: 11, tier: 4, quality: 'superior' },
      { key: 'angelic_mail_e', nameKey: 'angelic_mail_e', bonus: 11, specialHealBonus: 5, tier: 4, quality: 'epic' }
    ],
    5: [
      { key: 'armageddon_mail_n', nameKey: 'armageddon_mail_n', bonus: 12, tier: 5, quality: 'normal' },
      { key: 'armageddon_mail_s', nameKey: 'armageddon_mail_s', bonus: 13, tier: 5, quality: 'superior' },
      { key: 'armageddon_mail_e', nameKey: 'armageddon_mail_e', bonus: 13, specialHealBonus: 6, tier: 5, quality: 'epic' }
    ]
  }
};

/**
 * Applica direttamente l'arma equipaggiata al personaggio.
 */
export function equipWeapon(p: Player, weapon: WeaponItem): void {
  p.weapon = {
    key: weapon.key,
    dice: weapon.dice,
    bonus: weapon.bonus
  };
}

/**
 * Applica direttamente l'armatura equipaggiata al personaggio aggiornando CA e passivi.
 */
export function equipArmor(p: Player, armor: ArmorItem): void {
  const oldArmorBonus = p.armor.bonus || 0;
  p.armor = {
    key: armor.key,
    bonus: armor.bonus
  };
  // Aggiorna la CA sottraendo il vecchio bonus ed applicando il nuovo
  p.ac = p.ac - oldArmorBonus + armor.bonus;

  if (armor.drBonus) {
    p.damageReduction = (p.damageReduction || 0) + armor.drBonus;
  }
  if (armor.specialDmgBonus) {
    p.specialBonusDmg = (p.specialBonusDmg || 0) + armor.specialDmgBonus;
  }
  if (armor.specialHealBonus) {
    p.specialBonusHeal = (p.specialBonusHeal || 0) + armor.specialHealBonus;
  }
  if (armor.critBonus) {
    p.critThreshold = Math.max(15, p.critThreshold - armor.critBonus);
  }
}