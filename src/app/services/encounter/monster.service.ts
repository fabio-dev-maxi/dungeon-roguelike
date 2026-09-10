import { Injectable } from '@angular/core';
import { BOSS_IDS, BOSS_STATS, MONSTER_IDS_TIER, MonsterStat } from '../../data/monster.data';
import { Monster } from '../../models/game.models';
import { CustomDataService } from '../custom-data.service';
import { DiceService } from '../dice/dice.service';
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

  public pickMonsterTier(depth: number): number {
    if (depth === 1) return 1;
    if (depth === 2) return this.dice.weightedPick([{ v: 1, w: 30 }, { v: 2, w: 70 }]);
    if (depth === 3) return this.dice.weightedPick([{ v: 2, w: 40 }, { v: 3, w: 60 }]);
    if (depth === 4) return this.dice.weightedPick([{ v: 3, w: 30 }, { v: 4, w: 70 }]);
    if (depth === 5) return this.dice.weightedPick([{ v: 4, w: 40 }, { v: 5, w: 60 }]);
    if (depth === 6) return this.dice.weightedPick([{ v: 5, w: 30 }, { v: 6, w: 70 }]);
    if (depth === 7) return this.dice.weightedPick([{ v: 6, w: 40 }, { v: 7, w: 60 }]);
    if (depth === 8) return this.dice.weightedPick([{ v: 7, w: 30 }, { v: 8, w: 70 }]);
    if (depth === 9) return this.dice.weightedPick([{ v: 8, w: 40 }, { v: 9, w: 60 }]);
    if (depth <= 11) return this.dice.weightedPick([{ v: 8, w: 20 }, { v: 9, w: 80 }]);
    if (depth <= 13) return this.dice.weightedPick([{ v: 9, w: 30 }, { v: 10, w: 70 }]);
    return 10; // Piani 14 e 15
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

    // 1. Determina la probabilità dei bracket (0..4) in base alla profondità (1..15)
    let bracket: number;

    if (depth <= 2) {
      // Piani 1-2: Prevalenza assoluta di bracket 1, piccola chance di 0 e 2
      bracket = this.dice.weightedPick([
        { v: 0, w: 10 },
        { v: 1, w: 80 },
        { v: 2, w: 10 }
      ]);
    } else if (depth <= 5) {
      // Piani 3-5: Lo 0 diminuisce, iniziano ad apparire i mostri più forti
      bracket = this.dice.weightedPick([
        { v: 0, w: 5 },
        { v: 1, w: 75 },
        { v: 2, w: 12 },
        { v: 3, w: 8 }
      ]);
    } else if (depth <= 9) {
      // Piani 6-9: Lo 0 sparisce completamente, entrano i bracket 3 e 4
      bracket = this.dice.weightedPick([
        { v: 1, w: 72 },
        { v: 2, w: 15 },
        { v: 3, w: 8 },
        { v: 4, w: 5 }
      ]);
    } else {
      // Piani 10-15: Distribuzione finale target (70% standard, 30% potenziati)
      bracket = this.dice.weightedPick([
        { v: 1, w: 70 },
        { v: 2, w: 15 },
        { v: 3, w: 10 },
        { v: 4, w: 5 }
      ]);
    }

    // 2. Definizione del moltiplicatore in base al bracket estratto:
    // Bracket 0: -10% | Bracket 1: Base | Bracket 2: +5% | Bracket 3: +10% | Bracket 4: +15%
    const bracketMultiplierMap: Record<number, number> = {
      0: 0.90,
      1: 1.00,
      2: 1.05,
      3: 1.10,
      4: 1.15
    };

    const bracketScale = bracketMultiplierMap[bracket];

    // Scaling di profondità base per accompagnare i 15 piani
    const depthScale = 1 + (depth - 1) * 0.05; 

    let effectiveHpBase = base.hpBase;
    let acVariance = 0;

    if (isBoss) { 
      const factor = 1 + (this.dice.random() * 0.2 - 0.1);
      effectiveHpBase = Math.round(base.hpBase * factor);
      acVariance = Math.floor(this.dice.random() * 2);
    }

    // Applicazione dello scaling del bracket su HP e AC
    const hp = Math.round(effectiveHpBase * depthScale * bracketScale);

    // La AC base subisce un leggero bonus/malus basato sul bracket + progressione di profondità
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