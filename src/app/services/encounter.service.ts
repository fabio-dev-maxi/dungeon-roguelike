import { Injectable } from '@angular/core';
import { BOSS_IDS, BOSS_STATS } from '../data/monster.data';
import { ChoiceOption, PendingChoice, StatKey } from '../models/game.models';
import { DiceService, WeightedItem } from './dice.service';
import { GameStateService } from './game-state.service';
import { MonsterService } from './monster.service';

@Injectable({ providedIn: 'root' })
export class EncounterService {
  constructor(
    private stateService: GameStateService,
    private monsterService: MonsterService,
    private dice: DiceService
  ) {}

  encounterWeightsForDepth(depth: number): WeightedItem<string>[] {
    let weights: WeightedItem<string>[];
    if (depth <= 5) weights = [
      { v: 'combat', w: 80 },
      { v: 'treasure', w: 10 },
      { v: 'trap', w: 5 },
      { v: 'merchant', w: 2 },
      { v: 'shrine', w: 2 },
      { v: 'tavern', w: 1 }];
    else if (depth <= 9) weights = [
      { v: 'combat', w: 60 },
      { v: 'trap', w: 10 },
      { v: 'treasure', w: 10 },
      { v: 'merchant', w: 10 },
      { v: 'shrine', w: 7 },
      { v: 'tavern', w: 3 }];
    else if (depth <= 14) weights = [
      { v: 'combat', w: 50 },
      { v: 'treasure', w: 13 },
      { v: 'merchant', w: 11 },
      { v: 'shrine', w: 10 },
      { v: 'trap', w: 10 },
      { v: 'tavern', w: 6 }];
    else weights = [
      { v: 'combat', w: 45 },
      { v: 'merchant', w: 15 },
      { v: 'treasure', w: 10 },
      { v: 'trap', w: 10 },
      { v: 'shrine', w: 10 },
      { v: 'tavern', w: 10 }];

    if (depth - this.stateService.state().lastTavernDepth < 5) {
      weights = weights.filter(w => w.v !== 'tavern');
    }
    return weights;
  }

  startFloor(): void {
    const s = this.stateService.state();
    s.depth++;
    
    const completedFloors = Math.max(0, s.depth - 1);
    this.stateService.bestDepth.set(Math.max(this.stateService.bestDepth(), completedFloors));
    
    const forcedBoss = BOSS_IDS.some(id => BOSS_STATS[id].atDepth === s.depth);
    let type = forcedBoss ? 'combat' : this.dice.weightedPick(this.encounterWeightsForDepth(s.depth));
    
    this.stateService.touch();
    this.stateService.log(this.stateService.tf('log.floorHeader', { depth: s.depth }), 'sys floor');

    if (type === 'combat') {
      const m = this.monsterService.makeMonster(s.depth);
      s.monster = m;
      s.combatFlags = {};
      s.phase = 'combat';
      this.stateService.touch();
      const name = this.monsterService.monsterDisplayName(m);
      this.stateService.log(m.isBoss ? this.stateService.tf('log.bossAppear', { name }) : this.stateService.tf('log.monsterAppear', { name }));
    } else if (type === 'trap') {
      s.phase = 'choice';
      s.pendingChoice = this.makeTrapChoice();
      this.stateService.touch();
      this.stateService.log(this.stateService.t('log.trapIntro'), 'flavor');
    } else if (type === 'treasure') {
      this.resolveTreasure();
    } else if (type === 'shrine') {
      s.phase = 'choice';
      s.pendingChoice = this.makeShrineChoice();
      this.stateService.touch();
      this.stateService.log(this.stateService.t('log.shrineIntro'), 'flavor');
    } else if (type === 'merchant') {
      s.phase = 'choice';
      s.pendingChoice = this.makeMerchantChoice();
      this.stateService.touch();
      this.stateService.log(this.stateService.t('log.merchantIntro'), 'flavor');
    } else if (type === 'tavern') {
      s.lastTavernDepth = s.depth;
      s.phase = 'choice';
      s.pendingChoice = this.makeTavernChoice();
      this.stateService.touch();
      this.stateService.log(this.stateService.t('log.tavernIntro'), 'flavor');
    }
  }

  // Calcola la forza e il costo della pozione in base al piano corrente
  private getPotionConfigForDepth(depth: number): { dice: [number, number], cost: number } {
    let n = 2;
    let d = 6;
    let cost = 8 + Math.floor(depth / 5) * 5; // Il costo sale progressivamente
    
    if (depth > 10) {
      d = 8; // Dal piano 11 passano a d8
      n = 2 + Math.floor((depth - 11) / 10); // 11-20: 2d8, 21-30: 3d8, 31-40: 4d8, 41-50: 5d8
    }
    
    return { dice: [n, d], cost };
  }

  resolveTreasure(): void {
    const s = this.stateService.state();
    const gold = this.dice.rollNdM(2, 6) + s.depth * 2;
    s.player!.gold += gold;
    this.stateService.touch();
    this.stateService.log(this.stateService.tf('log.treasureFound', { gold }), 'flavor');
    
    // Possibilità di trovare una pozione scalata
    if (Math.random() < 0.4) {
      const potionConfig = this.getPotionConfigForDepth(s.depth);
      s.player!.inventory.push({ type: 'potion', heal: potionConfig.dice });
      this.stateService.touch();
      this.stateService.log(this.stateService.tf('log.treasurePotion', { potion: this.stateService.t('potionName') }), 'heal');
    }
    
    s.phase = 'explore';
    this.stateService.touch();
  }

  makeTrapChoice(): PendingChoice {
    const dc = 10 + Math.floor(this.stateService.state().depth / 3);
    return {
      dc,
      options: [
        { label: this.stateService.t('choices.disarm'), stat: 'dex' },
        { label: this.stateService.t('choices.force'), stat: 'str' },
        { label: this.stateService.t('choices.study'), stat: 'int' }
      ],
      onResolve: (success: boolean) => {
        const s = this.stateService.state();
        if (success) {
          const gold = this.dice.rollNdM(1, 6) + Math.floor(s.depth / 2);
          s.player!.gold += gold;
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.trapSuccess', { gold }), 'heal');
        } else {
          const diceN = 1 + Math.floor(s.depth / 15);
          const dmg = this.dice.rollNdM(diceN, 6);
          s.player!.hp = this.dice.clamp(s.player!.hp - dmg, 0, s.player!.maxHp);
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.trapFail', { dmg }), 'dmg');
        }
      }
    };
  }

  makeShrineChoice(): PendingChoice {
    const depth = this.stateService.state().depth;
    return {
      dc: null,
      options: [
        { label: this.stateService.t('choices.prayHeal'), action: 'heal' },
        { label: this.stateService.t('choices.prayBuff'), action: 'buff' },
        { label: this.stateService.t('choices.ignoreAltar'), action: 'skip' }
      ],
      onChoose: (opt: ChoiceOption) => {
        const s = this.stateService.state();
        if (opt.action === 'heal') {
          // La cura dell'altare scala con i piani
          const diceN = 2 + Math.floor(depth / 10);
          const h = this.dice.rollNdM(diceN, 6) + Math.floor(depth / 4);
          s.player!.hp = this.dice.clamp(s.player!.hp + h, 0, s.player!.maxHp);
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.shrineHeal', { heal: h }), 'heal');
        } else if (opt.action === 'buff') {
          s.player!.tempAtkBonus = (s.player!.tempAtkBonus || 0) + 2;
          this.stateService.touch();
          this.stateService.log(this.stateService.t('log.shrineBuff'), 'heal');
        } else {
          this.stateService.log(this.stateService.t('log.shrineSkip'), 'flavor');
        }
      }
    };
  }

  makeMerchantChoice(): PendingChoice {
    const s = this.stateService.state();
    
    // Determina statistiche e costo della pozione
    const potionConfig = this.getPotionConfigForDepth(s.depth);
    const potionLabel = `${this.stateService.tf('choices.buyPotion', { cost: potionConfig.cost })} [${potionConfig.dice[0]}d${potionConfig.dice[1]}]`;
    
    const upgradeCost = 15 + (s.depth * 2);

    return {
      dc: null, canFail: true,
      options: [
        { label: potionLabel, action: 'potion', cost: potionConfig.cost },
        { label: this.stateService.tf('choices.upgradeWeapon', { cost: upgradeCost }), action: 'upgrade', cost: upgradeCost },
        { label: this.stateService.t('choices.skipMerchant'), action: 'skip', cost: 0 }
      ],
      onChoose: (opt: ChoiceOption): boolean => {
        const state = this.stateService.state();
        if ((opt.cost || 0) > 0 && state.player!.gold < (opt.cost || 0)) {
          this.stateService.log(this.stateService.t('log.merchantNoGold'), 'flavor');
          return false;
        }
        if (opt.action === 'potion') {
          state.player!.gold -= opt.cost || 0;
          state.player!.inventory.push({ type: 'potion', heal: potionConfig.dice });
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.merchantBuyPotion', { potion: this.stateService.t('potionName') }), 'heal');
        } else if (opt.action === 'upgrade') {
          state.player!.gold -= opt.cost || 0;
          state.player!.weapon.bonus = (state.player!.weapon.bonus || 0) + 1;
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.merchantUpgrade', { weapon: this.stateService.t('weapons.' + state.player!.weapon.key) }), 'heal');
        } else {
          this.stateService.log(this.stateService.t('log.merchantSkip'), 'flavor');
        }
        return true;
      }
    };
  }

  makeTavernChoice(): PendingChoice {
    const s = this.stateService.state();
    const restCost = 18 + Math.floor(s.depth * 1.8);
    
    return {
      dc: null, canFail: true,
      options: [
        { label: this.stateService.tf('choices.tavernRest', { cost: restCost }), action: 'rest', cost: restCost },
        { label: this.stateService.t('choices.tavernDrink'), action: 'drink', cost: 0 },
        { label: this.stateService.t('choices.tavernSkip'), action: 'skip', cost: 0 }
      ],
      onChoose: (opt: ChoiceOption): boolean => {
        const state = this.stateService.state();
        if ((opt.cost || 0) > 0 && state.player!.gold < (opt.cost || 0)) {
          this.stateService.log(this.stateService.t('log.tavernNoGold'), 'flavor');
          return false;
        }
        if (opt.action === 'rest') {
          state.player!.gold -= opt.cost || 0;
          const healed = state.player!.maxHp - state.player!.hp;
          state.player!.hp = state.player!.maxHp;
          state.player!.usedSpecial = false;
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.tavernRest', { heal: healed }), 'heal');
        } else if (opt.action === 'drink') {
          // La bevanda gratuita al banco scala leggermente
          const diceN = 1 + Math.floor(state.depth / 15);
          const heal = this.dice.rollNdM(diceN, 6) + Math.floor(state.depth / 5);
          state.player!.hp = this.dice.clamp(state.player!.hp + heal, 0, state.player!.maxHp);
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.tavernDrink', { heal }), 'heal');
        } else {
          this.stateService.log(this.stateService.t('log.tavernSkip'), 'flavor');
        }
        return true;
      }
    };
  }

  async resolveChoiceOption(opt: ChoiceOption, onGameOver: () => void): Promise<void> {
    const s = this.stateService.state();
    const pc = s.pendingChoice;
    if (!pc) return;
    if (pc.canFail) {
      const ok = pc.onChoose!(opt);
      if (ok === false) return;
      s.phase = 'explore'; s.pendingChoice = null; this.stateService.touch(); return;
    }
    if (pc.onChoose) {
      pc.onChoose(opt);
      s.phase = 'explore'; s.pendingChoice = null; this.stateService.touch(); return;
    }
    
    // Per Scelte con Tiro Caratteristica (es: Trappole)
    const statMod = this.dice.mod(s.player!.stats[opt.stat as StatKey]);
    const raw = await this.stateService.animateRollAsync(this.dice.rnd(20), 20, 'check');
    const cur = this.stateService.state();
    const total = raw + statMod;
    const success = total >= pc.dc!;
    
    this.stateService.log(this.stateService.tf('log.checkResult', {
      stat: this.stateService.t('statAbbr.' + opt.stat), roll: raw, mod: this.dice.fmtMod(statMod),
      total, dc: pc.dc, result: success ? this.stateService.t('log.checkSuccess') : this.stateService.t('log.checkFail')
    }));
    
    pc.onResolve!(success);
    cur.phase = 'explore'; cur.pendingChoice = null;
    this.stateService.touch();
    
    if (cur.player!.hp <= 0) { onGameOver(); }
  }
}