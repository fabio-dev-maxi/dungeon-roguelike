import { Injectable, signal } from '@angular/core';
import { LangCode } from '../data/i18n.data';
import { GameState } from '../models/game.models';
import { DiceService } from './dice.service';
import { I18nService } from './i18n.service';

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
    await this.wait(500);

    let cls = '';
    if (sides === 20) {
      if (finalValue >= (critMin || 20)) cls = 'crit';
      else if (finalValue === 1) cls = 'fail';
    }

    s.rollingDie = { active: false, value: finalValue, cls, sides, tag };
    this.touch();
    await this.wait(800);

    return finalValue;
  }

  toggleStats(): void {
    const s = this.state();
    s.statsExpanded = !s.statsExpanded;
    this.touch();
  }

  toggleInventory(): void {
    const s = this.state();
    s.inventoryExpanded = !s.inventoryExpanded;
    this.touch();
  }

  restartGame(): void {
    const lang = this.state().lang as LangCode;
    this._state = this.freshState(lang);
    this.touch();
  }
}