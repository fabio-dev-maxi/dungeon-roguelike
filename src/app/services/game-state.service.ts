import { Injectable, signal } from '@angular/core';
import { LangCode } from '../data/i18n.data';
import { GameState } from '../models/game.models';
import { DiceService } from './dice.service';
import { I18nService } from './i18n.service';
import { DICE_SETTLE_MS } from '../components/dice-widget/dice-widget.component';

const SPIN_MS = 500;
const READ_RESULT_MS = 950;

/**
 * Gestione dello stato reattivo centrale (Signals), log e animazioni dadi
 */
@Injectable({ providedIn: 'root' })
export class GameStateService {
  private _state: GameState = this.freshState('it');
  private _version = signal(0);
  bestDepth = signal<number>(0);

  constructor(private i18n: I18nService, private dice: DiceService) {}

  state(): GameState {
    this._version();
    return this._state;
  }

  touch(): void {
    this._version.update(v => v + 1);
  }

  t(path: string): any { return this.i18n.t(path); }
  tf(path: string, vars: Record<string, any> = {}): string { return this.i18n.tf(path, vars); }
  equipmentName(key: string, kind: 'weapons' | 'armors'): string { return this.i18n.equipmentName(key, kind); }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  freshState(prevLang: LangCode): GameState {
    return {
      screen: 'title',
      lang: prevLang || 'it',
      player: null,
      depth: 0,
      monster: null,
      phase: null,
      combatFlags: {},
      log: [],
      pendingChoice: null,
      pendingLevelUps: 0,
      levelUp: null,
      bossRewardModal: null,
      lastTavernDepth: -99,
      statsExpanded: false,
      inventoryExpanded: false,
      rollingDie: { active: false, value: null, cls: '' },
      tempStats: null,
      tempName: ''
    };
  }

  setLang(lang: LangCode): void {
    const s = this.state();
    s.lang = lang;
    this.i18n.setLang(lang);
    this.touch();
  }

  log(html: string, cls = ''): void {
    const s = this.state();
    s.log.push({ html, cls });
    this.touch();
  }

  async animateRollAsync(finalValue: number, sides: number, tag = '', critMin?: number): Promise<number> {
    const s = this.state();
    s.rollingDie = { active: true, value: this.dice.rnd(sides), cls: 'rolling', sides, tag };
    this.touch();
    await this.wait(SPIN_MS);

    let cls = '';
    if (sides === 20) {
      if (finalValue >= (critMin || 20)) cls = 'crit';
      else if (finalValue === 1) cls = 'fail';
    }

    s.rollingDie = { active: false, value: finalValue, cls, sides, tag };
    this.touch();
    // La frenata del dado consuma la prima parte dell'attesa: va scontata,
    // altrimenti il tiro successivo parte prima che il risultato sia leggibile.
    await this.wait(DICE_SETTLE_MS + READ_RESULT_MS);

    return finalValue;
  }

  toggleStats(): void {
    const s = this.state();
    s.statsExpanded = !s.statsExpanded;
    s.inventoryExpanded = false;
    this.touch();
  }

  toggleInventory(): void {
    const s = this.state();
    s.inventoryExpanded = !s.inventoryExpanded;
    s.statsExpanded = false;
    this.touch();
  }

  restartGame(): void {
    const lang = this.state().lang as LangCode;
    this._state = this.freshState(lang);
    this.touch();
  }
}