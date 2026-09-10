import { Injectable } from '@angular/core';
import { BOSS_IDS, BOSS_STATS, MONSTER_IDS_TIER, MonsterStat } from '../../data/monster.data';
import { Monster } from '../../models/game.models';
import { CustomDataService } from '../custom-data.service';
import { DiceService, WeightedItem } from '../dice/dice.service';
import { GameStateService } from '../game-state.service';

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

  /**
   * Restituisce le (massimo 2) tier candidate per il piano, con i relativi pesi.
   * Un solo elemento quando il piano ha una tier fissa (Piano 1, Piani 14-15).
   */
  private getTierOptions(depth: number): WeightedItem<number>[] {
    if (depth === 1) return [{ v: 1, w: 100 }];
    if (depth === 2) return [{ v: 1, w: 30 }, { v: 2, w: 70 }];
    if (depth === 3) return [{ v: 2, w: 40 }, { v: 3, w: 60 }];
    if (depth === 4) return [{ v: 3, w: 30 }, { v: 4, w: 70 }];
    if (depth === 5) return [{ v: 4, w: 40 }, { v: 5, w: 60 }];
    if (depth === 6) return [{ v: 5, w: 30 }, { v: 6, w: 70 }];
    if (depth === 7) return [{ v: 6, w: 40 }, { v: 7, w: 60 }];
    if (depth === 8) return [{ v: 7, w: 30 }, { v: 8, w: 70 }];
    if (depth === 9) return [{ v: 8, w: 40 }, { v: 9, w: 60 }];
    if (depth <= 11) return [{ v: 8, w: 20 }, { v: 9, w: 80 }];
    if (depth <= 13) return [{ v: 9, w: 30 }, { v: 10, w: 70 }];
    return [{ v: 10, w: 100 }]; // Piani 14 e 15
  }

  public pickMonsterTier(depth: number): number {
    return this.dice.weightedPick(this.getTierOptions(depth));
  }

  /**
   * Estrae la tier e segnala se è la PIÙ BASSA delle (massimo 2) tier possibili per il piano:
   * in quel caso l'incontro deve generare 2 mostri invece di uno solo.
   */
  private pickMonsterTierWithInfo(depth: number): { tier: number; isLowestOfPair: boolean } {
    const options = this.getTierOptions(depth);
    const tier = this.dice.weightedPick(options);
    const isLowestOfPair = options.length > 1 && tier === Math.min(...options.map((o) => o.v));
    return { tier, isLowestOfPair };
  }

  /**
   * Genera l'incontro per il nodo corrente.
   * - Nodo Boss: sempre 1 solo Custode del Piano.
   * - Nodo Combattimento: 1 mostro normalmente, 2 se viene estratta la tier più bassa
   *   fra le due disponibili per la profondità corrente.
   */
  public makeMonsters(depth: number, forceBoss = false): Monster[] {
    if (forceBoss) {
      return [this.buildBossMonster(depth)];
    }

    const { tier, isLowestOfPair } = this.pickMonsterTierWithInfo(depth);
    const count = isLowestOfPair ? 2 : 1;

    const monsters: Monster[] = [];
    for (let i = 0; i < count; i++) {
      const id = this.dice.pick(MONSTER_IDS_TIER[tier]);
      monsters.push(this.buildStandardMonster(depth, id));
    }
    return monsters;
  }

  private buildBossMonster(depth: number): Monster {
    const bossIdx = (depth - 1) % BOSS_IDS.length;
    const bossId = BOSS_IDS[bossIdx];
    const base = this.customData.bosses()[bossId] || BOSS_STATS[bossId];
    return this.buildMonsterFromBase(depth, bossId, base, true);
  }

  private buildStandardMonster(depth: number, id: string): Monster {
    const base = this.customData.monsters()[id];
    return this.buildMonsterFromBase(depth, id, base, false);
  }

  /**
   * Calcolo dello scaling statistico (invariato rispetto alla versione originale a mostro singolo):
   * ogni mostro tira indipendentemente il proprio bracket di potenza.
   */
  private buildMonsterFromBase(depth: number, id: string, base: MonsterStat, isBoss: boolean): Monster {
    let bracket: number;

    if (depth <= 2) {
      bracket = this.dice.weightedPick([
        { v: 0, w: 10 },
        { v: 1, w: 80 },
        { v: 2, w: 10 }
      ]);
    } else if (depth <= 5) {
      bracket = this.dice.weightedPick([
        { v: 0, w: 5 },
        { v: 1, w: 75 },
        { v: 2, w: 12 },
        { v: 3, w: 8 }
      ]);
    } else if (depth <= 9) {
      bracket = this.dice.weightedPick([
        { v: 1, w: 72 },
        { v: 2, w: 15 },
        { v: 3, w: 8 },
        { v: 4, w: 5 }
      ]);
    } else {
      bracket = this.dice.weightedPick([
        { v: 1, w: 70 },
        { v: 2, w: 15 },
        { v: 3, w: 10 },
        { v: 4, w: 5 }
      ]);
    }

    const bracketMultiplierMap: Record<number, number> = {
      0: 0.90,
      1: 1.00,
      2: 1.05,
      3: 1.10,
      4: 1.15
    };

    const bracketScale = bracketMultiplierMap[bracket];
    const depthScale = 1 + (depth - 1) * 0.05;

    let effectiveHpBase = base.hpBase;
    let acVariance = 0;

    if (isBoss) {
      const factor = 1 + (this.dice.random() * 0.2 - 0.1);
      effectiveHpBase = Math.round(base.hpBase * factor);
      acVariance = Math.floor(this.dice.random() * 2);
    }

    const hp = Math.round(effectiveHpBase * depthScale * bracketScale);
    const rawAc = (base.ac + acVariance + Math.floor(depth / 6)) * bracketScale;
    const ac = Math.round(rawAc);
    const depthAtkBonus = Math.floor(depth / 5);

    return {
      id,
      isBoss,
      bracket,
      hp,
      maxHp: hp,
      dmg: base.dmg,
      ac,
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