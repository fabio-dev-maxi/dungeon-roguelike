import { Injectable } from '@angular/core';
import { mod } from '../data/game.data';
import { BOSS_IDS, BOSS_STATS } from '../data/monster.data';
import { ChoiceOption, PendingChoice, StatKey } from '../models/game.models';
import { DiceService, WeightedItem } from './dice.service';
import { GameStateService } from './game-state.service';
import { MonsterService } from './monster.service';

/**
 * Gestione eventi (trappole, altari, mercante, taverna, tesori)
 */
@Injectable({ providedIn: 'root' })
export class EncounterService {
  constructor(
    private stateService: GameStateService,
    private monsterService: MonsterService,
    private dice: DiceService
  ) { }

  /**
   * Restituisce i pesi per i vari tipi di incontro in base alla profondità
   * @param depth 
   * @returns 
   */
  encounterWeightsForDepth(depth: number): WeightedItem<string>[] {
    let weights: WeightedItem<string>[];
    if (depth <= 5) weights = [
      { v: 'combat', w: 76 },
      { v: 'treasure', w: 10 },
      { v: 'trap', w: 5 },
      { v: 'merchant', w: 4.5 },
      { v: 'shrine', w: 4 },
      { v: 'tavern', w: 0.5 }];
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

  /**
   * Inizia un nuovo piano, generando un incontro casuale in base alla profondità
   */
  startFloor(): void {
    const s = this.stateService.state();
    s.depth++;
    this.stateService.bestDepth.set(Math.max(this.stateService.bestDepth(), s.depth));
    const forcedBoss = BOSS_IDS.some(id => BOSS_STATS[id].atDepth === s.depth);
    let type = forcedBoss ? 'combat' : this.dice.weightedPick(this.encounterWeightsForDepth(s.depth));

    this.stateService.touch();
    this.stateService.log(`<span class="sys">${this.stateService.tf('log.floorHeader', { depth: s.depth })}</span>`);

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

  resolveTreasure(): void {
    const s = this.stateService.state();
    const gold = this.dice.rollNdM(2, 6) + s.depth;
    s.player!.gold += gold;
    this.stateService.touch();
    this.stateService.log(this.stateService.tf('log.treasureFound', { gold }), 'flavor');
    if (Math.random() < 0.4) {
      s.player!.inventory.push({ type: 'potion', heal: [2, 6] });
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
          const gold = this.dice.rollNdM(1, 6);
          s.player!.gold += gold;
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.trapSuccess', { gold }), 'heal');
        } else {
          const dmg = this.dice.rollNdM(1, 6);
          s.player!.hp = this.dice.clamp(s.player!.hp - dmg, 0, s.player!.maxHp);
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.trapFail', { dmg }), 'dmg');
        }
      }
    };
  }

  makeShrineChoice(): PendingChoice {
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
          const h = this.dice.rollNdM(2, 6) + 2;
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
    const potionCost = 8;
    const upgradeCost = 15 + this.stateService.state().depth;
    return {
      dc: null, canFail: true,
      options: [
        { label: this.stateService.tf('choices.buyPotion', { cost: potionCost }), action: 'potion', cost: potionCost },
        { label: this.stateService.tf('choices.upgradeWeapon', { cost: upgradeCost }), action: 'upgrade', cost: upgradeCost },
        { label: this.stateService.t('choices.skipMerchant'), action: 'skip', cost: 0 }
      ],
      onChoose: (opt: ChoiceOption): boolean => {
        const s = this.stateService.state();
        if ((opt.cost || 0) > 0 && s.player!.gold < (opt.cost || 0)) {
          this.stateService.log(this.stateService.t('log.merchantNoGold'), 'flavor');
          return false;
        }
        if (opt.action === 'potion') {
          s.player!.gold -= opt.cost || 0;
          s.player!.inventory.push({ type: 'potion', heal: [2, 6] });
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.merchantBuyPotion', { potion: this.stateService.t('potionName') }), 'heal');
        } else if (opt.action === 'upgrade') {
          s.player!.gold -= opt.cost || 0;
          s.player!.weapon.bonus = (s.player!.weapon.bonus || 0) + 1;
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.merchantUpgrade', { weapon: this.stateService.t('weapons.' + s.player!.weapon.key) }), 'heal');
        } else {
          this.stateService.log(this.stateService.t('log.merchantSkip'), 'flavor');
        }
        return true;
      }
    };
  }

  makeTavernChoice(): PendingChoice {
    const restCost = 18 + Math.floor(this.stateService.state().depth * 1.5);
    return {
      dc: null, canFail: true,
      options: [
        { label: this.stateService.tf('choices.tavernRest', { cost: restCost }), action: 'rest', cost: restCost },
        { label: this.stateService.t('choices.tavernDrink'), action: 'drink', cost: 0 },
        { label: this.stateService.t('choices.tavernSkip'), action: 'skip', cost: 0 }
      ],
      onChoose: (opt: ChoiceOption): boolean => {
        const s = this.stateService.state();
        if ((opt.cost || 0) > 0 && s.player!.gold < (opt.cost || 0)) {
          this.stateService.log(this.stateService.t('log.tavernNoGold'), 'flavor');
          return false;
        }
        if (opt.action === 'rest') {
          s.player!.gold -= opt.cost || 0;
          const healed = s.player!.maxHp - s.player!.hp;
          s.player!.hp = s.player!.maxHp;
          s.player!.usedSpecial = false;
          this.stateService.touch();
          this.stateService.log(this.stateService.tf('log.tavernRest', { heal: healed }), 'heal');
        } else if (opt.action === 'drink') {
          const heal = this.dice.rollNdM(1, 6) + 1;
          s.player!.hp = this.dice.clamp(s.player!.hp + heal, 0, s.player!.maxHp);
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

    const statMod = mod(s.player!.stats[opt.stat as StatKey]);
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