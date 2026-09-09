import { Injectable, signal } from '@angular/core';
import { DICE_SETTLE_MS } from '../components/dice-widget/dice-widget.component';
import { LangCode } from '../data/i18n.data';
import { GameState } from '../models/game.models';
import { DiceService } from './dice/dice.service';
import { I18nService } from './i18n.service';

const SPIN_MS = 500;
const READ_RESULT_MS = 950;

/**
 * GESTORE DELLO STATO REATTIVO CENTRALE (ANGULAR 20 SIGNALS)
 * 
 * Contiene lo stato immutabile aggiornato tramite versione reattiva,
 * gestisce il reset pulito della sessione e le animazioni dei dadi 3D.
 */
@Injectable({ providedIn: 'root' })
export class GameStateService {
  private _state: GameState = this.freshState('it');
  private _version = signal(0);
  bestDepth = signal<number>(0);

  constructor(
    private i18n: I18nService,
    private dice: DiceService
  ) { }

  state(): GameState {
    this._version();
    return this._state;
  }

  touch(): void {
    this._version.update((v) => v + 1);
  }

  t(path: string): any {
    return this.i18n.t(path);
  }

  tf(path: string, vars: Record<string, any> = {}): string {
    return this.i18n.tf(path, vars);
  }

  equipmentName(key: string, kind: 'weapons' | 'armors'): string {
    return this.i18n.equipmentName(key, kind);
  }

  /**
   * Crea uno stato di gioco completamente pulito.
   * Resetta la mappa, i nodi visitati e disattiva la vista mappa.
   */
  freshState(prevLang: LangCode): GameState {
    return {
      screen: 'title',
      lang: prevLang || 'it',
      player: null,
      depth: 0,
      monster: null,
      phase: null,
      currentMap: null,       // Mappa non ancora generata
      mapViewActive: false,   // Vista mappa inattiva di default
      combatFlags: {},
      log: [],
      pendingChoice: null,
      pendingLevelUps: 0,
      levelUp: null,
      bossRewardModal: null,
      lastTavernDepth: -99,
      lastTrapDepth: -99,
      lastMerchantDepth: -99,
      lastShrineDepth: -99,
      statsExpanded: false,
      inventoryExpanded: false,
      rollingDie: {
        active: false,
        value: null,
        cls: '',
      },
      tempStats: null,
      tempName: '',
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

  async animateRollAsync(
    finalValue: number | number[],
    sides: number,
    tag = '',
    critMin?: number
  ): Promise<number> {
    const values = Array.isArray(finalValue) ? finalValue : [finalValue];
    const totalSum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const isEnemy = tag.startsWith('monster');

    const s = this.state();
    s.rollingDie = {
      active: true,
      value: totalSum,
      values,
      sides,
      count,
      cls: 'rolling',
      tag,
      isEnemy,
    };
    this.touch();

    await this.wait(SPIN_MS + 250);

    let cls = '';
    if (sides === 20 && count === 1) {
      if (totalSum >= (critMin || 20)) cls = 'crit';
      else if (totalSum === 1) cls = 'fail';
    }

    s.rollingDie = {
      active: false,
      value: totalSum,
      values,
      sides,
      count,
      cls,
      tag,
      isEnemy,
    };
    this.touch();

    await this.wait(DICE_SETTLE_MS + READ_RESULT_MS);
    return totalSum;
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  /**
   * Resetta completamente la sessione corrente per iniziare un nuovo tentativo.
   */
  public restartGame(): void {
    const lang = this.state().lang as LangCode;
    this._state = this.freshState(lang);
    this.touch();
  }
}
