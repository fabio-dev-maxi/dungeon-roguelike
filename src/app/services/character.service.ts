import { Injectable } from '@angular/core';
import { CLASS_DATA, mod } from '../data/game.data';
import { Armor, ClassKey, Player, Stats, Weapon } from '../models/game.models';
import { DiceService } from './dice.service';
import { GameStateService } from './game-state.service';

/**
 * Creazione personaggio, tiro caratteristiche ed equipaggiamento iniziale.
 */
@Injectable({ providedIn: 'root' })
export class CharacterService {
  constructor(private stateService: GameStateService, private dice: DiceService) {}

  private rollStat(): number {
    const rolls = [this.dice.rollDie(6), this.dice.rollDie(6), this.dice.rollDie(6), this.dice.rollDie(6)];
    rolls.sort((a, b) => a - b);
    rolls.shift();
    return rolls.reduce((a, b) => a + b, 0);
  }

  rollAllStats(): Stats {
    return {
      str: this.rollStat(), dex: this.rollStat(), con: this.rollStat(),
      int: this.rollStat(), wis: this.rollStat(), cha: this.rollStat()
    };
  }

  rollStatsForCreate(name: string): void {
    const s = this.stateService.state();
    s.tempName = name;
    s.tempStats = this.rollAllStats();
    this.stateService.touch();
  }

  buildPlayer(name: string, classKey: ClassKey, stats: Stats): Player {
    const c = CLASS_DATA[classKey];
    const conMod = mod(stats.con);
    const maxHp = c.hpBase + conMod;
    const weapon: Weapon = { key: c.weaponKey, dice: c.weaponDice, bonus: 0 };
    const armor: Armor = { key: c.armorKey, bonus: c.armor };
    return {
      name: name || this.stateService.t('ui.namePlaceholder'),
      cls: classKey,
      stats,
      hp: maxHp, maxHp,
      ac: 10 + mod(stats.dex) + c.armor,
      gold: this.dice.rollNdM(2, 6),
      weapon, armor,
      inventory: [{ type: 'potion', heal: [2, 6] }, { type: 'potion', heal: [2, 6] }],
      usedSpecial: false,
      level: 1,
      xp: 0,
      tempAtkBonus: 0,
      critThreshold: classKey === 'rogue' ? 19 : 20,
      relics: [],
      feats: [],
      flatAtkBonus: 0,
      flatDmgBonus: 0,
      critMultiplier: 2
    };
  }

  startCreateScreen(): void {
    const s = this.stateService.state();
    s.screen = 'create';
    s.tempStats = null;
    this.stateService.touch();
  }

  chooseClass(classKey: ClassKey, name: string, onFloorStart: () => void): void {
    const s = this.stateService.state();
    if (!s.tempStats) return;
    s.player = this.buildPlayer(name, classKey, s.tempStats);
    s.depth = 0;
    s.log = [];
    s.screen = 'run';
    s.phase = 'explore';
    this.stateService.touch();
    this.stateService.log(
      this.stateService.tf('log.gameStart', { name: s.player.name, cls: this.stateService.t('classes.' + classKey + '.name') })
    );
    onFloorStart();
  }

  weaponName(w: Weapon): string { return this.stateService.t('weapons.' + w.key); }
  armorName(a: Armor): string { return this.stateService.t('armors.' + a.key); }
}