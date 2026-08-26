import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { DiceService } from './dice.service';
import { BOSS_IDS, BOSS_STATS, MONSTER_IDS_TIER, MONSTER_STATS } from '../data/game.data';
import { Monster } from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class MonsterService {
  constructor(private stateService: GameStateService, private dice: DiceService) {}

  pickMonsterTier(depth: number): number {
    if (depth <= 4) return 1;
    if (depth <= 9) return this.dice.weightedPick([{ v: 1, w: 60 }, { v: 2, w: 40 }]);
    if (depth <= 14) return this.dice.weightedPick([{ v: 1, w: 30 }, { v: 2, w: 50 }, { v: 3, w: 20 }]);
    if (depth <= 19) return this.dice.weightedPick([{ v: 1, w: 10 }, { v: 2, w: 60 }, { v: 3, w: 30 }]);
    if (depth <= 24) return this.dice.weightedPick([{ v: 2, w: 30 }, { v: 3, w: 50 }, { v: 4, w: 20 }]);
    if (depth <= 29) return this.dice.weightedPick([{ v: 2, w: 10 }, { v: 3, w: 60 }, { v: 4, w: 30 }]);
    if (depth <= 34) return this.dice.weightedPick([{ v: 3, w: 30 }, { v: 4, w: 50 }, { v: 5, w: 20 }]);
    if (depth <= 39) return this.dice.weightedPick([{ v: 3, w: 10 }, { v: 4, w: 60 }, { v: 5, w: 30 }]);
    if (depth <= 44) return this.dice.weightedPick([{ v: 4, w: 30 }, { v: 5, w: 50 }, { v: 6, w: 20 }]);
    if (depth <= 49) return this.dice.weightedPick([{ v: 4, w: 10 }, { v: 5, w: 60 }, { v: 6, w: 30 }]);
    return this.dice.weightedPick([{ v: 5, w: 30 }, { v: 6, w: 70 }]);
  }

  makeMonster(depth: number): Monster {
    const bossId = BOSS_IDS.find(id => BOSS_STATS[id].atDepth === depth);
    let id: string, base: { hpBase: number; dmg: [number, number]; ac: number }, isBoss = false;

    if (bossId) { id = bossId; base = BOSS_STATS[bossId]; isBoss = true; }
    else {
      const tier = this.pickMonsterTier(depth);
      id = this.dice.pick(MONSTER_IDS_TIER[tier]);
      base = MONSTER_STATS[id];
    }

    const bracket = this.dice.clamp(Math.floor(depth / 5), 0, 4);
    const scale = 1 + bracket * 0.35;

    let effectiveHpBase = base.hpBase;
    let acVariance = 0;
    if (isBoss) {
      const factor = 1 + (Math.random() * 2 - 1) * 0.15;
      effectiveHpBase = Math.round(base.hpBase * factor);
      acVariance = Math.floor(Math.random() * 3) - 1;
    }
    const hp = Math.round(effectiveHpBase * scale) + Math.floor(depth / 2);
    return { id, isBoss, bracket, hp, maxHp: hp, dmg: base.dmg, ac: base.ac + acVariance };
  }

  monsterDisplayName(m: Monster | null): string {
    if (!m) return '';
    if (m.isBoss) return this.stateService.t('bosses.' + m.id);
    const prefix = this.stateService.t('prefixes')[m.bracket] || '';
    return prefix + this.stateService.t('monsters.' + m.id);
  }
}