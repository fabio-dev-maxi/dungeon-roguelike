import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { DiceService } from './dice.service';
import { BOSS_IDS, BOSS_STATS, MONSTER_IDS_TIER, MONSTER_STATS, MonsterStat } from '../data/monster.data';
import { Monster } from '../models/game.models';
import { CustomDataService } from './custom-data.service';

/**
 * SERVIZIO GENERAZIONE MOSTRI E BOSS CON SCALING D&D 3.5
 */
@Injectable({ providedIn: 'root' })
export class MonsterService {
  constructor(
    private stateService: GameStateService,
    private dice: DiceService,
    private customData: CustomDataService
  ) { }

  public pickMonsterTier(depth: number): number {
    if (depth <= 1) return 1;
    if (depth <= 3) return this.dice.weightedPick([{ v: 1, w: 50 }, { v: 2, w: 50 }]);
    if (depth <= 4) return this.dice.weightedPick([{ v: 1, w: 30 }, { v: 2, w: 50 }, { v: 3, w: 20 }]);
    if (depth <= 7) return this.dice.weightedPick([{ v: 1, w: 10 }, { v: 2, w: 60 }, { v: 3, w: 30 }]);
    if (depth <= 10) return this.dice.weightedPick([{ v: 2, w: 30 }, { v: 3, w: 50 }, { v: 4, w: 20 }]);
    if (depth <= 12) return this.dice.weightedPick([{ v: 2, w: 10 }, { v: 3, w: 60 }, { v: 4, w: 30 }]);
    if (depth <= 14) return this.dice.weightedPick([{ v: 3, w: 30 }, { v: 4, w: 50 }, { v: 5, w: 20 }]);
    if (depth <= 17) return this.dice.weightedPick([{ v: 3, w: 10 }, { v: 4, w: 60 }, { v: 5, w: 30 }]);
    if (depth <= 19) return this.dice.weightedPick([{ v: 4, w: 30 }, { v: 5, w: 50 }, { v: 6, w: 20 }]);
    if (depth <= 22) return this.dice.weightedPick([{ v: 4, w: 10 }, { v: 5, w: 60 }, { v: 6, w: 30 }]);
    return this.dice.weightedPick([{ v: 5, w: 30 }, { v: 6, w: 70 }]);
  }

  /**
   * Genera un mostro o un boss specifico per il piano corrente.
   * 
   * @param depth Numero del Piano Globale
   * @param forceBoss Se true, genera obbligatoriamente il boss del piano
   */
  public makeMonster(depth: number, forceBoss = false): Monster {
    // Seleziona un boss in base al piano o ne prende uno generico ruotato
    const bossList = BOSS_IDS;
    const bossIdx = (depth - 1) % bossList.length;
    const bossId = forceBoss ? bossList[bossIdx] : null;

    let id: string, base: MonsterStat, isBoss = false;

    if (bossId) {
      id = bossId;
      base = this.customData.bosses()[bossId] || BOSS_STATS[bossId];
      isBoss = true;
    } else {
      const tier = this.pickMonsterTier(depth);
      id = this.dice.pick(MONSTER_IDS_TIER[tier]);
      base = this.customData.monsters()[id];
    }

    // Scaling proporzionale delle statistiche (PF, CA, Atk) in base al Piano
    const bracket = Math.floor(depth / 5);
    const scale = 1 + bracket * 0.22 + (depth > 25 ? (depth - 25) * 0.03 : 0);
    let effectiveHpBase = base.hpBase;
    let acVariance = 0;

    if (isBoss) {
      const factor = 1 + (Math.random() * 0.2 - 0.1);
      effectiveHpBase = Math.round(base.hpBase * factor);
      acVariance = Math.floor(Math.random() * 2);
    }

    const hp = Math.round(effectiveHpBase * scale);
    const extraAc = Math.floor(depth / 12);
    const depthAtkBonus = Math.floor(depth / 10);

    return {
      id,
      isBoss,
      bracket,
      hp,
      maxHp: hp,
      dmg: base.dmg,
      ac: base.ac + acVariance + extraAc,
      atk: base.atk + depthAtkBonus
    };
  }

  public monsterDisplayName(m: Monster | null): string {
    if (!m) return '';
    if (m.isBoss) return this.stateService.t('bosses.' + m.id);
    const prefix = this.stateService.t('prefixes')[m.bracket] || '';
    return prefix + this.stateService.t('monsters.' + m.id);
  }
}