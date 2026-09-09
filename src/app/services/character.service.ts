import { Injectable, signal } from '@angular/core';
import { CLASS_DATA, mod } from '../data/game.data';
import { Armor, ClassKey, Player, StatKey, Stats, Weapon } from '../models/game.models';
import { DiceService } from './dice/dice.service';
import { GameStateService } from './game-state.service';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

@Injectable({ providedIn: 'root' })
export class CharacterService {
  /** Registro privato e protetto per lo stato della bozza */
  private readonly _draftStats = signal<Partial<Record<StatKey, number>>>({});
  public readonly draftStats = this._draftStats.asReadonly();

  constructor(
    private readonly stateService: GameStateService,
    private readonly dice: DiceService
  ) { }

  /**
   * Imposta lo schermo sulla fase di creazione personaggio e resetta la bozza.
   */
  public startCreateScreen(): void {
    const s = this.stateService.state();
    s.screen = 'create';
    s.tempStats = null;
    this.resetDraft();
    this.stateService.touch();
  }

  /**
   * Registra il nome temporaneo nel GameState durante la creazione.
   */
  public rollStatsForCreate(name: string): void {
    const s = this.stateService.state();
    s.tempName = name;
    this.stateService.touch();
  }

  /**
   * Resetta lo stato interno della bozza all'avvio della fase 2.
   */
  public resetDraft(): void {
    this._draftStats.set({});
  }

  /**
   * Registra una caratteristica nello stato privato.
   * Impedisce sovrascritture di chiavi già assegnate o valori non validi/out-of-bounds.
   */
  public recordDraftStat(key: StatKey, value: unknown): void {
    const curr = this._draftStats();
    if (curr[key] !== undefined) return;

    const num = Number(value);
    if (!Number.isFinite(num)) return;

    const clampedVal = Math.min(18, Math.max(3, Math.floor(num)));
    this._draftStats.update(s => ({ ...s, [key]: clampedVal }));
  }

  /**
   * Sanitizza il nome dell'avventuriero contro attacchi XSS.
   */
  private sanitizeName(name: string): string {
    return (name || '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .trim() || this.stateService.t('ui.namePlaceholder');
  }

  /**
   * Costruisce il personaggio attingendo ESCLUSIVAMENTE dal registro privato `_draftStats`.
   * Se i dati risultano incompleti o manomessi, interrompe la pagina ed esegue un hard refresh.
   */
  public buildPlayerFromDraft(name: string, classKey: ClassKey): Player {
    const draft = this._draftStats();
    const isComplete = STAT_KEYS.every(k => typeof draft[k] === 'number');

    // BLOCCO ANTI-HACK: Interruzione immediata e Hard Refresh della pagina
    if (!isComplete) {
      console.error('Violazione di sicurezza o bozza incompleta. Ricaricamento della sessione...');
      window.location.reload();
      throw new Error('Creazione personaggio interrotta per incoerenza dello stato.');
    }

    const finalStats: Stats = {
      str: draft.str!,
      dex: draft.dex!,
      con: draft.con!,
      int: draft.int!,
      wis: draft.wis!,
      cha: draft.cha!
    };

    const safeName = this.sanitizeName(name);
    const c = CLASS_DATA[classKey];
    const conMod = mod(finalStats.con);
    const maxHp = c.hpBase + conMod;

    const player: Player = {
      name: safeName,
      cls: classKey,
      stats: finalStats,
      hp: maxHp,
      maxHp,
      ac: 10 + mod(finalStats.dex) + c.armor,
      gold: this.dice.rollNdM(2, 6),
      weapon: { key: c.weaponKey, dice: c.weaponDice, bonus: 0 },
      armor: { key: c.armorKey, bonus: c.armor },
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

    this.resetDraft();
    return player;
  }

  public weaponName(w: Weapon): string {
    return this.stateService.equipmentName(w.key, 'weapons');
  }

  public armorName(a: Armor): string {
    return this.stateService.equipmentName(a.key, 'armors');
  }
}