import { Injectable } from '@angular/core';
import { CLASS_DATA, mod } from '../data/game.data';
import { Armor, ClassKey, Player, Stats, Weapon } from '../models/game.models';
import { DiceService } from './dice/dice.service';
import { GameStateService } from './game-state.service';

/**
 * SERVIZIO CREAZIONE E INIZIALIZZAZIONE DEL GIOCATORE
 * 
 * Gestisce il calcolo delle caratteristiche iniziali (4d6 drop lowest)
 * e la costruzione dell'entità Player secondo le regole di D&D 3.5.
 */
@Injectable({ providedIn: 'root' })
export class CharacterService {
  constructor(
    private readonly stateService: GameStateService,
    private readonly dice: DiceService
  ) { }

  /**
   * Esegue il tiro di 4d6 scartando il valore più basso (Regola Standard D&D 3.5).
   */
  private rollStat(): number {
    const rolls = [
      this.dice.rollDie(6),
      this.dice.rollDie(6),
      this.dice.rollDie(6),
      this.dice.rollDie(6)
    ];
    rolls.sort((a, b) => a - b);
    rolls.shift(); // Scarta il valore minimo
    return rolls.reduce((a, b) => a + b, 0);
  }

  /**
   * Genera una scheda di 6 caratteristiche casuali.
   */
  public rollAllStats(): Stats {
    return {
      str: this.rollStat(),
      dex: this.rollStat(),
      con: this.rollStat(),
      int: this.rollStat(),
      wis: this.rollStat(),
      cha: this.rollStat()
    };
  }

  /**
   * Calcola le caratteristiche temporanee e le salva nello stato per la creazione personaggio.
   * @param name Nome dell'avventuriero
   */
  public rollStatsForCreate(name: string): void {
    const s = this.stateService.state();
    s.tempName = name;
    s.tempStats = this.rollAllStats();
    this.stateService.touch();
  }

  /**
    * Costruisce l'oggetto Player applicando il casting numerico esplicito
    * per evitare la concatenazione delle stringhe ("18" + 1 = "181").
    */
  public buildPlayer(name: string, classKey: ClassKey, stats: Stats): Player {
    const cleanStats: Stats = {
      str: Number(stats.str) || 10,
      dex: Number(stats.dex) || 10,
      con: Number(stats.con) || 10,
      int: Number(stats.int) || 10,
      wis: Number(stats.wis) || 10,
      cha: Number(stats.cha) || 10,
    };

    const c = CLASS_DATA[classKey];
    const conMod = mod(cleanStats.con);
    const maxHp = c.hpBase + conMod;
    const weapon: Weapon = { key: c.weaponKey, dice: c.weaponDice, bonus: 0 };
    const armor: Armor = { key: c.armorKey, bonus: c.armor };

    return {
      name: name || this.stateService.t('ui.namePlaceholder'),
      cls: classKey,
      stats: cleanStats,
      hp: maxHp,
      maxHp,
      ac: 10 + mod(cleanStats.dex) + c.armor,
      gold: this.dice.rollNdM(2, 6),
      weapon,
      armor,
      inventory: [
        { type: 'potion', heal: [2, 6] },
        { type: 'potion', heal: [2, 6] }
      ],
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

  /**
   * Imposta lo schermo di creazione personaggio.
   */
  public startCreateScreen(): void {
    const s = this.stateService.state();
    s.screen = 'create';
    s.tempStats = null;
    this.stateService.touch();
  }

  /**
   * Completa la creazione, imposta il giocatore e avvia il Piano 1 della Guglia.
   */
  public chooseClass(classKey: ClassKey, name: string, onFloorStart: () => void): void {
    const s = this.stateService.state();
    if (!s.tempStats) return;

    s.player = this.buildPlayer(name, classKey, s.tempStats);
    s.depth = 0; // Verrà incrementato a 1 da startFloor()
    s.log = [];
    s.screen = 'run';

    this.stateService.touch();
    this.stateService.log(
      this.stateService.tf('log.gameStart', {
        name: s.player.name,
        cls: this.stateService.t('classes.' + classKey + '.name')
      })
    );

    // Inizializza la Mappa del Piano 1
    onFloorStart();
  }

  public weaponName(w: Weapon): string {
    return this.stateService.equipmentName(w.key, 'weapons');
  }

  public armorName(a: Armor): string {
    return this.stateService.equipmentName(a.key, 'armors');
  }
}