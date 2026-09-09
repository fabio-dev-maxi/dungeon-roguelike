import { Injectable } from '@angular/core';
import { ChoiceOption, PendingChoice } from '../../models/game.models';
import { DiceService } from '../dice/dice.service';
import { GameStateService } from '../game-state.service';

/**
 * SERVIZIO DATI INCONTRI E MECCANICHE D&D 3.5
 * 
 * Gestisce il bilanciamento delle CD (Classe Difficoltà) per trappole,
 * la generazione dei prezzi dei mercanti e gli effetti dei santuari.
 */
@Injectable({ providedIn: 'root' })
export class EncounterDataService {
  constructor(
    private readonly stateService: GameStateService,
    private readonly dice: DiceService
  ) { }

  /**
   * Calcola la CD (Classe Difficoltà) D&D 3.5 scalata per il Piano corrente.
   * Baseline: CD 12 (Facile) + 1 ogni 2 Piani.
   */
  public calculateDC(depth: number): number {
    return 12 + Math.floor(depth / 2);
  }

  /**
   * Genera la struttura delle opzioni per un nodo Trappola (Riflessi, Disattivare, Forza).
   */
  public buildTrapEncounter(depth: number, onResolve: (success: boolean) => void): PendingChoice {
    const dc = this.calculateDC(depth);
    return {
      kind: 'trap',
      dc,
      options: [
        { label: `${this.stateService.t('choices.disarm')} (DES)`, stat: 'dex' },
        { label: `${this.stateService.t('choices.study')} (INT)`, stat: 'int' },
        { label: `${this.stateService.t('choices.force')} (FOR)`, stat: 'str' }
      ],
      onResolve
    };
  }

  /**
   * Genera le benedizioni per un nodo Santuario (Cura Divina, Favore Divino D&D 3.5).
   */
  public buildShrineEncounter(depth: number, onChoose: (opt: ChoiceOption) => void): PendingChoice {
    return {
      kind: 'shrine',
      dc: null,
      options: [
        { label: this.stateService.t('choices.prayHeal'), action: 'heal' },
        { label: this.stateService.t('choices.prayBuff'), action: 'buff' },
        { label: this.stateService.t('choices.ignoreAltar'), action: 'skip' }
      ],
      onChoose
    };
  }

  /**
   * Calcola il costo e la potenza delle Pozioni vendute dal Mercante.
   * Progression D&D 3.5: Cura Ferite Leggere (1d8+1) -> Moderate (2d8+3) -> Gravi (3d8+5).
   */
  public getMerchantConfig(depth: number): { potionDice: [number, number]; potionCost: number; weaponUpgradeCost: number } {
    const potionCost = 10 + depth * 3;
    const weaponUpgradeCost = 25 + depth * 5;

    let dice: [number, number] = [1, 8];
    if (depth > 20) {
      dice = [3, 8];
    } else if (depth > 10) {
      dice = [2, 8];
    }

    return {
      potionDice: dice,
      potionCost,
      weaponUpgradeCost
    };
  }
}