import { Injectable, signal } from '@angular/core';
import { MONSTER_STATS, BOSS_STATS, MonsterStat, BossStat } from '../data/monster.data';
import { WEAPON_POOLS, ARMOR_POOLS, WeaponItem, ArmorItem } from '../data/equipment.data';
import { RELICS, RelicEffect } from '../data/relic.data';
import { ClassKey } from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class CustomDataService {
  monsters = signal<Record<string, MonsterStat>>(JSON.parse(JSON.stringify(MONSTER_STATS)));
  bosses = signal<Record<string, BossStat>>(JSON.parse(JSON.stringify(BOSS_STATS)));
  weapons = signal<Record<ClassKey, Record<number, WeaponItem[]>>>(JSON.parse(JSON.stringify(WEAPON_POOLS)));
  armors = signal<Record<ClassKey, Record<number, ArmorItem[]>>>(JSON.parse(JSON.stringify(ARMOR_POOLS)));
  relics = signal<Record<ClassKey, Record<string, RelicEffect>>>(JSON.parse(JSON.stringify(RELICS)));

  resetToDefaults(): void {
    this.monsters.set(JSON.parse(JSON.stringify(MONSTER_STATS)));
    this.bosses.set(JSON.parse(JSON.stringify(BOSS_STATS)));
    this.weapons.set(JSON.parse(JSON.stringify(WEAPON_POOLS)));
    this.armors.set(JSON.parse(JSON.stringify(ARMOR_POOLS)));
    this.relics.set(JSON.parse(JSON.stringify(RELICS)));
  }
}