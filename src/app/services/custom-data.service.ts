import { Injectable, signal, effect } from '@angular/core';
import { MONSTER_STATS, BOSS_STATS, MonsterStat, BossStat } from '../data/monster.data';
import { WEAPON_POOLS, ARMOR_POOLS, WeaponItem, ArmorItem } from '../data/equipment.data';
import { RELICS, RelicEffect } from '../data/relic.data';
import { PREMADE_HEROES, PremadeHero } from '../data/premade-heroes.data';
import { ClassKey } from '../models/game.models';

const STORAGE_KEY = 'guglia_cava_custom_data';
// Aggiungi una chiave per la versione dei dati
const STORAGE_VERSION_KEY = 'guglia_cava_data_version'; 

// Incrementa questo numero ogni volta che modifichi i file .data.ts
// L'app cancellerà automaticamente i vecchi salvataggi e caricherà i nuovi.
const CURRENT_DATA_VERSION = 1; 

@Injectable({ providedIn: 'root' })
export class CustomDataService {
  monsters = signal<Record<string, MonsterStat>>(this.loadInitial('monsters', MONSTER_STATS));
  bosses = signal<Record<string, BossStat>>(this.loadInitial('bosses', BOSS_STATS));
  weapons = signal<Record<ClassKey, Record<number, WeaponItem[]>>>(this.loadInitial('weapons', WEAPON_POOLS));
  armors = signal<Record<ClassKey, Record<number, ArmorItem[]>>>(this.loadInitial('armors', ARMOR_POOLS));
  relics = signal<Record<ClassKey, Record<string, RelicEffect>>>(this.loadInitial('relics', RELICS));
  heroes = signal<Record<ClassKey, PremadeHero[]>>(this.loadInitial('heroes', PREMADE_HEROES));

  constructor() {
    this.checkVersion();

    effect(() => {
      this.saveChanges();
    });
  }

  /**
   * Controlla la versione dei dati nel LocalStorage rispetto a quella hardcoded.
   * Se c'è una nuova versione nel codice, spiana il LocalStorage e forza il reload dei default.
   */
  private checkVersion(): void {
    const savedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    
    if (!savedVersion || Number(savedVersion) !== CURRENT_DATA_VERSION) {
      console.log(`Versione Dati aggiornata (V${CURRENT_DATA_VERSION}). Ricaricamento default in corso...`);
      this.resetToDefaults();
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_DATA_VERSION));
    }
  }

  saveChanges(): void {
    const dataToSave = {
      monsters: this.monsters(),
      bosses: this.bosses(),
      weapons: this.weapons(),
      armors: this.armors(),
      relics: this.relics(),
      heroes: this.heroes()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }

  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEY);
    
    // Riassegna i valori predefiniti freschi clonandoli
    this.monsters.set(JSON.parse(JSON.stringify(MONSTER_STATS)));
    this.bosses.set(JSON.parse(JSON.stringify(BOSS_STATS)));
    this.weapons.set(JSON.parse(JSON.stringify(WEAPON_POOLS)));
    this.armors.set(JSON.parse(JSON.stringify(ARMOR_POOLS)));
    this.relics.set(JSON.parse(JSON.stringify(RELICS)));
    this.heroes.set(JSON.parse(JSON.stringify(PREMADE_HEROES)));
  }

  private loadInitial<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key]) return parsed[key];
      }
    } catch (e) {
      console.error('Errore nel caricamento dei dati salvati', e);
    }
    return JSON.parse(JSON.stringify(fallback));
  }
}