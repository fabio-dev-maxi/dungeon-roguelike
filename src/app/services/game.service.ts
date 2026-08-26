import { Injectable, signal } from '@angular/core';
import { I18nService } from './i18n.service';
import { DiceService, WeightedItem } from './dice.service';
import { LangCode } from '../data/i18n.data';
import {
  BOSS_IDS, BOSS_STATS, BOSS_XP, CLASS_DATA, MONSTER_IDS_TIER, MONSTER_STATS, MONSTER_XP,
  RELIC_CLASS_POOLS, applyRelicEffect, xpToNext, mod
} from '../data/game.data';
import {
  Armor, ChoiceOption, ClassKey, DropInfo, GameState, LevelUpState, Monster, PendingChoice, Player, StatKey, Stats, Weapon
} from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class GameService {
  private _state: GameState = this.freshState('it');
  private _version = signal(0);
  bestDepth = signal<number>(0);

  constructor(private i18n: I18nService, private dice: DiceService) {}

  // ---------------------------------------------------------------- helpers
  state(): GameState {
    this._version();
    return this._state;
  }

  private touch(): void {
    this._version.update(v => v + 1);
  }

  private t(path: string): any { return this.i18n.t(path); }
  private tf(path: string, vars: Record<string, any> = {}): string { return this.i18n.tf(path, vars); }

  private wait(ms: number): Promise<void> {
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

  // ------------------------------------------------------------ char gen
  private rollStat(): number {
    const rolls = [this.dice.rollDie(6), this.dice.rollDie(6), this.dice.rollDie(6), this.dice.rollDie(6)];
    rolls.sort((a, b) => a - b);
    rolls.shift();
    return rolls.reduce((a, b) => a + b, 0);
  }

  rollAllStats(): Stats {
    return {
      str: this.rollStat(), dex: this.rollStat(), con: this.rollStat(),
      int: this.rollStat(), wis: this.rollStat(), cha: this.rollStat()
    };
  }

  rollStatsForCreate(name: string): void {
    const s = this.state();
    s.tempName = name;
    s.tempStats = this.rollAllStats();
    this.touch();
  }

  buildPlayer(name: string, classKey: ClassKey, stats: Stats): Player {
    const c = CLASS_DATA[classKey];
    const conMod = mod(stats.con);
    const maxHp = c.hpBase + conMod;
    const weapon: Weapon = { key: c.weaponKey, dice: c.weaponDice, bonus: 0 };
    const armor: Armor = { key: c.armorKey, bonus: c.armor };
    return {
      name: name || this.t('ui.namePlaceholder'),
      cls: classKey,
      stats,
      hp: maxHp, maxHp,
      ac: 10 + mod(stats.dex) + c.armor,
      gold: this.dice.rollNdM(2, 6),
      weapon, armor,
      inventory: [{ type: 'potion', heal: [2, 6] }, { type: 'potion', heal: [2, 6] }],
      usedSpecial: false,
      level: 1,
      xp: 0,
      tempAtkBonus: 0,
      critThreshold: 20,
      relics: []
    };
  }

  weaponName(w: Weapon): string { return this.t('weapons.' + w.key); }
  armorName(a: Armor): string { return this.t('armors.' + a.key); }

  monsterDisplayName(m: Monster | null): string {
    if (!m) return '';
    if (m.isBoss) return this.t('bosses.' + m.id);
    const prefix = this.t('prefixes')[m.bracket] || '';
    return prefix + this.t('monsters.' + m.id);
  }

  startCreateScreen(): void {
    const s = this.state();
    s.screen = 'create';
    s.tempStats = null;
    this.touch();
  }

  chooseClass(classKey: ClassKey, name: string): void {
    const s = this.state();
    if (!s.tempStats) return;
    s.player = this.buildPlayer(name, classKey, s.tempStats);
    s.depth = 0;
    s.log = [];
    s.screen = 'run';
    s.phase = 'explore';
    this.touch();
    this.log(this.tf('log.gameStart', { name: s.player.name, cls: this.t('classes.' + classKey + '.name') }));
    this.startFloor();
  }

  // ------------------------------------------------------------ logging
  log(html: string, cls = ''): void {
    const s = this.state();
    s.log.push({ html, cls });
    this.touch();
  }

  // ------------------------------------------------------------ dice widget async
  private async animateRollAsync(finalValue: number, sides: number, tag = '', critMin?: number): Promise<number> {
    const s = this.state();

    // 1. Fase Spin Attivo
    s.rollingDie = { active: true, value: this.dice.rnd(sides), cls: 'rolling', sides, tag };
    this.touch();
    await this.wait(500);

    // 2. Determinazione critici/fallimenti
    let cls = '';
    if (sides === 20) {
      if (finalValue >= (critMin || 20)) cls = 'crit';
      else if (finalValue === 1) cls = 'fail';
    }

    // 3. Arresto e posizionamento 3D
    s.rollingDie = { active: false, value: finalValue, cls, sides, tag };
    this.touch();
    await this.wait(800); // Tempo per lo slerp di Three.js e la lettura a schermo

    return finalValue;
  }

  // ------------------------------------------------------------ floor gen
  private pickMonsterTier(depth: number): number {
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

  private encounterWeightsForDepth(depth: number): WeightedItem<string>[] {
    let weights: WeightedItem<string>[];
    if (depth <= 5) weights = [{ v: 'combat', w: 70 }, { v: 'trap', w: 12 }, { v: 'treasure', w: 14 }, { v: 'shrine', w: 2 }, { v: 'merchant', w: 2 }, { v: 'tavern', w: 0.5 }];
    else if (depth <= 9) weights = [{ v: 'combat', w: 52 }, { v: 'trap', w: 15 }, { v: 'treasure', w: 15 }, { v: 'shrine', w: 7 }, { v: 'merchant', w: 8 }, { v: 'tavern', w: 3 }];
    else if (depth <= 14) weights = [{ v: 'combat', w: 45 }, { v: 'trap', w: 15 }, { v: 'treasure', w: 13 }, { v: 'shrine', w: 10 }, { v: 'merchant', w: 11 }, { v: 'tavern', w: 6 }];
    else weights = [{ v: 'combat', w: 38 }, { v: 'trap', w: 14 }, { v: 'treasure', w: 13 }, { v: 'shrine', w: 14 }, { v: 'merchant', w: 14 }, { v: 'tavern', w: 7 }];

    if (depth - this.state().lastTavernDepth < 5) {
      weights = weights.filter(w => w.v !== 'tavern');
    }
    return weights;
  }

  private makeMonster(depth: number): Monster {
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

  startFloor(): void {
    const s = this.state();
    s.depth++;
    this.bestDepth.set(Math.max(this.bestDepth(), s.depth));
    const forcedBoss = BOSS_IDS.some(id => BOSS_STATS[id].atDepth === s.depth);
    let type: string;
    if (forcedBoss) { type = 'combat'; }
    else { type = this.dice.weightedPick(this.encounterWeightsForDepth(s.depth)); }

    this.touch();
    this.log(`<span class="sys">${this.tf('log.floorHeader', { depth: s.depth })}</span>`);

    if (type === 'combat') {
      const m = this.makeMonster(s.depth);
      s.monster = m;
      s.combatFlags = {};
      s.phase = 'combat';
      this.touch();
      const name = this.monsterDisplayName(m);
      this.log(m.isBoss ? this.tf('log.bossAppear', { name }) : this.tf('log.monsterAppear', { name }));
    } else if (type === 'trap') {
      s.phase = 'choice';
      s.pendingChoice = this.makeTrapChoice();
      this.touch();
      this.log(this.t('log.trapIntro'), 'flavor');
    } else if (type === 'treasure') {
      this.resolveTreasure();
    } else if (type === 'shrine') {
      s.phase = 'choice';
      s.pendingChoice = this.makeShrineChoice();
      this.touch();
      this.log(this.t('log.shrineIntro'), 'flavor');
    } else if (type === 'merchant') {
      s.phase = 'choice';
      s.pendingChoice = this.makeMerchantChoice();
      this.touch();
      this.log(this.t('log.merchantIntro'), 'flavor');
    } else if (type === 'tavern') {
      s.lastTavernDepth = s.depth;
      s.phase = 'choice';
      s.pendingChoice = this.makeTavernChoice();
      this.touch();
      this.log(this.t('log.tavernIntro'), 'flavor');
    }
  }

  // ---- Treasure ----
  private resolveTreasure(): void {
    const s = this.state();
    const gold = this.dice.rollNdM(2, 6) + s.depth;
    s.player!.gold += gold;
    this.touch();
    this.log(this.tf('log.treasureFound', { gold }), 'flavor');
    if (Math.random() < 0.4) {
      s.player!.inventory.push({ type: 'potion', heal: [2, 6] });
      this.touch();
      this.log(this.tf('log.treasurePotion', { potion: this.t('potionName') }), 'heal');
    }
    s.phase = 'explore';
    this.touch();
  }

  // ---- Trap ----
  private makeTrapChoice(): PendingChoice {
    const dc = 10 + Math.floor(this.state().depth / 3);
    return {
      dc,
      options: [
        { label: this.t('choices.disarm'), stat: 'dex' },
        { label: this.t('choices.force'), stat: 'str' },
        { label: this.t('choices.study'), stat: 'int' }
      ],
      onResolve: (success: boolean) => {
        const s = this.state();
        if (success) {
          const gold = this.dice.rollNdM(1, 6);
          s.player!.gold += gold;
          this.touch();
          this.log(this.tf('log.trapSuccess', { gold }), 'heal');
        } else {
          const dmg = this.dice.rollNdM(1, 6);
          s.player!.hp = this.dice.clamp(s.player!.hp - dmg, 0, s.player!.maxHp);
          this.touch();
          this.log(this.tf('log.trapFail', { dmg }), 'dmg');
        }
      }
    };
  }

  // ---- Shrine ----
  private makeShrineChoice(): PendingChoice {
    return {
      dc: null,
      options: [
        { label: this.t('choices.prayHeal'), action: 'heal' },
        { label: this.t('choices.prayBuff'), action: 'buff' },
        { label: this.t('choices.ignoreAltar'), action: 'skip' }
      ],
      onChoose: (opt: ChoiceOption) => {
        const s = this.state();
        if (opt.action === 'heal') {
          const h = this.dice.rollNdM(2, 6) + 2;
          s.player!.hp = this.dice.clamp(s.player!.hp + h, 0, s.player!.maxHp);
          this.touch();
          this.log(this.tf('log.shrineHeal', { heal: h }), 'heal');
        } else if (opt.action === 'buff') {
          s.player!.tempAtkBonus = (s.player!.tempAtkBonus || 0) + 2;
          this.touch();
          this.log(this.t('log.shrineBuff'), 'heal');
        } else {
          this.log(this.t('log.shrineSkip'), 'flavor');
        }
      }
    };
  }

  // ---- Merchant ----
  private makeMerchantChoice(): PendingChoice {
    const potionCost = 8;
    const upgradeCost = 15 + this.state().depth;
    return {
      dc: null, canFail: true,
      options: [
        { label: this.tf('choices.buyPotion', { cost: potionCost }), action: 'potion', cost: potionCost },
        { label: this.tf('choices.upgradeWeapon', { cost: upgradeCost }), action: 'upgrade', cost: upgradeCost },
        { label: this.t('choices.skipMerchant'), action: 'skip', cost: 0 }
      ],
      onChoose: (opt: ChoiceOption): boolean => {
        const s = this.state();
        if ((opt.cost || 0) > 0 && s.player!.gold < (opt.cost || 0)) {
          this.log(this.t('log.merchantNoGold'), 'flavor');
          return false;
        }
        if (opt.action === 'potion') {
          s.player!.gold -= opt.cost || 0;
          s.player!.inventory.push({ type: 'potion', heal: [2, 6] });
          this.touch();
          this.log(this.tf('log.merchantBuyPotion', { potion: this.t('potionName') }), 'heal');
        } else if (opt.action === 'upgrade') {
          s.player!.gold -= opt.cost || 0;
          s.player!.weapon.bonus = (s.player!.weapon.bonus || 0) + 1;
          this.touch();
          this.log(this.tf('log.merchantUpgrade', { weapon: this.weaponName(s.player!.weapon) }), 'heal');
        } else {
          this.log(this.t('log.merchantSkip'), 'flavor');
        }
        return true;
      }
    };
  }

  // ---- Tavern ----
  private makeTavernChoice(): PendingChoice {
    const restCost = 18 + Math.floor(this.state().depth * 1.5);
    return {
      dc: null, canFail: true,
      options: [
        { label: this.tf('choices.tavernRest', { cost: restCost }), action: 'rest', cost: restCost },
        { label: this.t('choices.tavernDrink'), action: 'drink', cost: 0 },
        { label: this.t('choices.tavernSkip'), action: 'skip', cost: 0 }
      ],
      onChoose: (opt: ChoiceOption): boolean => {
        const s = this.state();
        if ((opt.cost || 0) > 0 && s.player!.gold < (opt.cost || 0)) {
          this.log(this.t('log.tavernNoGold'), 'flavor');
          return false;
        }
        if (opt.action === 'rest') {
          s.player!.gold -= opt.cost || 0;
          const healed = s.player!.maxHp - s.player!.hp;
          s.player!.hp = s.player!.maxHp;
          s.player!.usedSpecial = false;
          this.touch();
          this.log(this.tf('log.tavernRest', { heal: healed }), 'heal');
        } else if (opt.action === 'drink') {
          const heal = this.dice.rollNdM(1, 6) + 1;
          s.player!.hp = this.dice.clamp(s.player!.hp + heal, 0, s.player!.maxHp);
          this.touch();
          this.log(this.tf('log.tavernDrink', { heal }), 'heal');
        } else {
          this.log(this.t('log.tavernSkip'), 'flavor');
        }
        return true;
      }
    };
  }

  async resolveChoiceOption(opt: ChoiceOption): Promise<void> {
    const s = this.state();
    const pc = s.pendingChoice;
    if (!pc) return;

    if (pc.canFail) {
      const ok = pc.onChoose!(opt);
      if (ok === false) return;
      s.phase = 'explore'; s.pendingChoice = null; this.touch(); return;
    }
    if (pc.onChoose) {
      pc.onChoose(opt);
      s.phase = 'explore'; s.pendingChoice = null; this.touch(); return;
    }

    const statMod = mod(s.player!.stats[opt.stat as StatKey]);
    const raw = await this.animateRollAsync(this.dice.rnd(20), 20, 'check');

    const cur = this.state();
    const total = raw + statMod;
    const success = total >= pc.dc!;
    this.log(this.tf('log.checkResult', {
      stat: this.t('statAbbr.' + opt.stat), roll: raw, mod: this.dice.fmtMod(statMod),
      total, dc: pc.dc, result: success ? this.t('log.checkSuccess') : this.t('log.checkFail')
    }));
    pc.onResolve!(success);
    cur.phase = 'explore'; cur.pendingChoice = null;
    this.touch();
    if (cur.player!.hp <= 0) { this.gameOver(); return; }
  }

  // ------------------------------------------------------------ combat async
  async playerAttack(): Promise<void> {
    const s = this.state();
    if (s.combatFlags.acting) return;
    s.combatFlags.acting = true;

    const c = CLASS_DATA[s.player!.cls];
    const statMod = mod(s.player!.stats[c.atkStat]) + (s.player!.tempAtkBonus || 0);
    const critThreshold = s.player!.critThreshold || 20;
    s.player!.tempAtkBonus = 0;
    this.touch();

    const raw = await this.animateRollAsync(this.dice.rnd(20), 20, 'attack', critThreshold);

    const cur = this.state();
    const isCritByClass = (cur.player!.cls === 'rogue' && raw >= 19) || raw >= critThreshold;
    const total = raw + statMod;
    const hit = raw === 20 || isCritByClass || total >= cur.monster!.ac;

    if (raw === 1) {
      this.log(this.t('log.attackMissNat1'), 'dmg');
    } else if (hit) {
      const [n, d] = cur.player!.weapon.dice;
      const bonus = mod(cur.player!.stats[c.atkStat]) + (cur.player!.weapon.bonus || 0);
      const dmgRoll = this.dice.rollNdM(n, d);
      const dmgMax = n * d;
      let dmg = dmgRoll + bonus;
      let critTxt = '';
      if (raw === 20 || isCritByClass) { dmg *= 2; critTxt = this.t('log.critText'); }
      cur.monster!.hp = this.dice.clamp(cur.monster!.hp - dmg, 0, cur.monster!.maxHp);
      this.touch();
      this.log(this.tf('log.attackHit', { roll: raw, mod: this.dice.fmtMod(statMod), total, ac: cur.monster!.ac, dmgRoll, dmgMax, dmg, crit: critTxt }));
    } else {
      this.log(this.tf('log.attackMiss', { roll: raw, mod: this.dice.fmtMod(statMod), total, ac: cur.monster!.ac }));
    }

    if (cur.monster && cur.monster.hp <= 0) {
      cur.combatFlags.acting = false;
      this.monsterDefeated();
      return;
    }

    await this.monsterTurn();
    this.state().combatFlags.acting = false;
    this.touch();
  }

  async playerDefend(): Promise<void> {
    const s = this.state();
    if (s.combatFlags.acting) return;
    s.combatFlags.acting = true;
    s.combatFlags.defending = true;
    this.touch();
    this.log(this.t('log.defendFlavor'), 'flavor');

    await this.monsterTurn();
    this.state().combatFlags.acting = false;
    this.touch();
  }

  async playerUseSpecial(): Promise<void> {
    const s = this.state();
    if (s.combatFlags.acting || s.player!.usedSpecial) return;
    const cls = s.player!.cls;
    const specialName = this.t('classes.' + cls + '.specialName');
    s.combatFlags.acting = true;
    this.touch();

    if (cls === 'wizard') {
      const bonus = mod(s.player!.stats.int);
      const dmgRoll = this.dice.rollNdM(2, 4);
      const dmgMax = 8;
      const dmg = dmgRoll + bonus;
      s.monster!.hp = this.dice.clamp(s.monster!.hp - dmg, 0, s.monster!.maxHp);
      this.touch();
      this.log(this.tf('log.specialWizard', { special: specialName, dmgRoll, dmgMax, dmg }), 'dmg');
      s.player!.usedSpecial = true;
      if (s.monster!.hp <= 0) {
        s.combatFlags.acting = false;
        this.monsterDefeated();
        return;
      }
      await this.monsterTurn();
    } else if (cls === 'cleric') {
      const bonus = mod(s.player!.stats.wis);
      const dmgRoll = this.dice.rollNdM(2, 6);
      const dmgMax = 12;
      const heal = dmgRoll + bonus;
      s.player!.hp = this.dice.clamp(s.player!.hp + heal, 0, s.player!.maxHp);
      this.touch();
      this.log(this.tf('log.specialCleric', { special: specialName, dmgRoll, dmgMax, heal }), 'heal');
      s.player!.usedSpecial = true;
      await this.monsterTurn();
    } else if (cls === 'fighter') {
      const [n, d] = CLASS_DATA.fighter.weaponDice;
      const bonus = mod(s.player!.stats[CLASS_DATA.fighter.atkStat]) + (s.player!.weapon.bonus || 0);
      const dmgRoll = this.dice.rollNdM(n, d);
      const dmgMax = n * d;
      const dmg = (dmgRoll + bonus) * 2;
      s.monster!.hp = this.dice.clamp(s.monster!.hp - dmg, 0, s.monster!.maxHp);
      this.touch();
      this.log(this.tf('log.specialFighter', { special: specialName, dmgRoll, dmgMax, dmg }), 'dmg');
      s.player!.usedSpecial = true;
      if (s.monster!.hp <= 0) {
        s.combatFlags.acting = false;
        this.monsterDefeated();
        return;
      }
      await this.monsterTurn();
    } else {
      s.combatFlags.acting = false;
      this.touch();
    }

    this.state().combatFlags.acting = false;
    this.touch();
  }

  async playerUsePotion(): Promise<void> {
    const s = this.state();
    if (s.combatFlags.acting) return;
    const idx = s.player!.inventory.findIndex(i => i.type === 'potion');
    if (idx === -1) return;
    s.combatFlags.acting = true;
    const potion = s.player!.inventory.splice(idx, 1)[0];
    const [n, d] = potion.heal;
    const dmgRoll = this.dice.rollNdM(n, d);
    const dmgMax = n * d;
    const heal = dmgRoll;
    s.player!.hp = this.dice.clamp(s.player!.hp + heal, 0, s.player!.maxHp);
    this.touch();
    this.log(this.tf('log.drinkPotion', { potion: this.t('potionName'), dmgRoll, dmgMax, heal }), 'heal');

    if (s.phase === 'combat') {
      await this.monsterTurn();
    }

    this.state().combatFlags.acting = false;
    this.touch();
  }

  async playerFlee(): Promise<void> {
    const s = this.state();
    if (s.combatFlags.acting) return;
    s.combatFlags.acting = true;
    this.touch();

    const dc = 10 + Math.floor(s.depth / 4);
    const statMod = mod(s.player!.stats.dex);
    const raw = await this.animateRollAsync(this.dice.rnd(20), 20, 'flee');

    const cur = this.state();
    const total = raw + statMod;
    const success = total >= dc;
    this.log(this.tf('log.fleeAttempt', {
      roll: raw, mod: this.dice.fmtMod(statMod), total, dc,
      result: success ? this.t('log.fleeSuccess') : this.t('log.fleeFail')
    }));

    if (success) {
      cur.monster = null;
      cur.phase = 'explore';
    } else {
      await this.monsterTurn();
    }

    this.state().combatFlags.acting = false;
    this.touch();
  }

  private async monsterTurn(): Promise<void> {
    const s = this.state();
    if (!s.monster || s.monster.hp <= 0) return;
    const name = this.monsterDisplayName(s.monster);
    const defending = !!s.combatFlags.defending;
    s.combatFlags.defending = false;
    const acBonus = defending ? 4 : 0;
    const monsterAtkMod = 2 + Math.floor(s.depth / 5);
    const targetAC = s.player!.ac + acBonus;
    this.touch();

    const toHit = await this.animateRollAsync(this.dice.rnd(20), 20, 'monsterAttack');

    const cur = this.state();
    const total = toHit + monsterAtkMod;
    if (toHit === 1) {
      this.log(this.tf('log.monsterMiss1', { name }), 'flavor');
    } else if (total >= targetAC || toHit === 20) {
      const [n, d] = cur.monster!.dmg;
      const dmgRoll = this.dice.rollNdM(n, d);
      const dmgMax = n * d;
      let dmg = dmgRoll;
      if (defending) dmg = Math.ceil(dmg / 2);
      cur.player!.hp = this.dice.clamp(cur.player!.hp - dmg, 0, cur.player!.maxHp);
      this.touch();
      this.log(this.tf('log.monsterHit', {
        name, roll: toHit, mod: this.dice.fmtMod(monsterAtkMod), total, ac: targetAC, dmgRoll, dmgMax, dmg,
        defended: defending ? this.t('log.defendedSuffix') : ''
      }), 'dmg');
      if (cur.player!.hp <= 0) {
        await this.wait(400);
        this.gameOver();
      }
    } else {
      this.log(this.tf('log.monsterMissGuard', { name, roll: toHit, mod: this.dice.fmtMod(monsterAtkMod), total, ac: targetAC }));
    }
  }

  private monsterDefeated(): void {
    const s = this.state();
    const name = this.monsterDisplayName(s.monster);
    const gold = this.dice.rollNdM(1, 6) + Math.floor(s.depth / 2);
    const xp = s.monster!.isBoss ? BOSS_XP[s.monster!.id] + s.depth : MONSTER_XP[s.monster!.id] + Math.floor(s.depth / 2);
    const wasBoss = s.monster!.isBoss;
    s.player!.gold += gold;
    s.player!.xp += xp;
    s.player!.usedSpecial = false;
    this.touch();
    this.log(this.tf('log.monsterDefeated', { name, gold, xp }), 'heal');
    const cur = this.state();
    cur.monster = null;
    this.touch();

    const drops: DropInfo[] = [];
    if (wasBoss) {
      const pool = RELIC_CLASS_POOLS[cur.player!.cls];
      if (pool) {
        const available = pool.filter(id => !cur.player!.relics.includes(id));
        if (available.length > 0) {
          const relicId = this.dice.pick(available);
          applyRelicEffect(cur.player!, relicId);
          cur.player!.relics.push(relicId);
          this.touch();
          const relicName = this.t('relics.' + relicId + '.name');
          const relicEffect = this.t('relics.' + relicId + '.effect');
          this.log(this.tf('log.relicFound', { relic: relicName, effect: relicEffect }), 'heal');
          drops.push({ type: 'relic', id: relicId, name: relicName, effect: relicEffect });
        }
      }
    }

    const final = this.state();
    let lvl = final.player!.level;
    let xpLeft = final.player!.xp;
    let levelsToGain = 0;
    while (xpLeft >= xpToNext(lvl)) { xpLeft -= xpToNext(lvl); lvl++; levelsToGain++; }
    final.player!.xp = xpLeft;
    final.pendingLevelUps = levelsToGain;

    if (wasBoss) {
      final.phase = null;
      final.rollingDie = { active: false, value: null, cls: '' };
      final.bossRewardModal = { name, xp, gold, drops };
      this.touch();
    } else {
      this.touch();
      if (levelsToGain > 0) { this.startLevelUp(); }
      else { final.phase = 'explore'; this.touch(); }
    }
  }

  confirmBossReward(): void {
    const s = this.state();
    s.bossRewardModal = null;
    this.touch();
    if (s.pendingLevelUps > 0) { this.startLevelUp(); }
    else { s.phase = 'explore'; this.touch(); }
  }

  // ------------------------------------------------------------ level up
  private startLevelUp(): void {
    const s = this.state();
    s.player!.level++;
    s.phase = 'levelup';
    s.levelUp = { step: 'stat', chosenStat: null, hpRollBase: null, hpRollTotal: null, rerolled: false };
    s.rollingDie = { active: false, value: null, cls: '' };
    this.touch();
    this.log(this.tf('log.levelUpAnnounce', { level: s.player!.level }), 'sys');
  }

  chooseLevelUpStat(statKey: StatKey): void {
    const s = this.state();
    if (!s.levelUp || s.levelUp.step !== 'stat') return;
    const oldConMod = mod(s.player!.stats.con);
    s.player!.stats[statKey] += 1;
    s.levelUp.chosenStat = statKey;
    s.levelUp.step = 'hp';
    this.touch();
    this.log(this.tf('log.levelUpStatChosen', { stat: this.t('stats.' + statKey), value: s.player!.stats[statKey] }), 'heal');

    if (statKey === 'con') {
      const newConMod = mod(s.player!.stats.con);
      if (newConMod > oldConMod) {
        const retro = s.player!.level;
        s.player!.maxHp += retro;
        s.player!.hp += retro;
        this.touch();
        this.log(this.tf('log.conRetroBonus', { oldMod: this.dice.fmtMod(oldConMod), newMod: this.dice.fmtMod(newConMod), hp: retro }), 'heal');
      }
    }

    this.rollLevelUpHp();
  }

  private async rollLevelUpHp(): Promise<void> {
    const s = this.state();
    const hitDie = CLASS_DATA[s.player!.cls].hitDie;
    const conMod = mod(s.player!.stats.con);
    s.levelUp!.hpRollTotal = null;
    this.touch();

    const finalBase = await this.animateRollAsync(this.dice.rnd(hitDie), hitDie, 'levelhp');

    const cur = this.state();
    if (cur.levelUp) {
      cur.levelUp.hpRollBase = finalBase;
      cur.levelUp.hpRollTotal = Math.max(1, finalBase + conMod);
      this.touch();
    }
  }

  rerollLevelUpHp(): void {
    const s = this.state();
    if (!s.levelUp || s.levelUp.rerolled) return;
    s.levelUp.rerolled = true;
    this.touch();
    this.rollLevelUpHp();
  }

  confirmLevelUp(): void {
    const s = this.state();
    if (!s.levelUp || s.levelUp.hpRollTotal === null) return;
    const gain = s.levelUp.hpRollTotal;
    s.player!.maxHp += gain;
    s.player!.hp += gain;
    this.touch();
    this.log(this.tf('log.levelUpHpGained', { hp: gain, maxhp: s.player!.maxHp }), 'heal');
    const cur = this.state();
    cur.pendingLevelUps--;
    cur.rollingDie = { active: false, value: null, cls: '' };
    this.touch();
    if (cur.pendingLevelUps > 0) { this.startLevelUp(); }
    else { cur.levelUp = null; cur.phase = 'explore'; this.touch(); }
  }

  // ------------------------------------------------------------ misc
  gameOver(): void {
    const s = this.state();
    s.screen = 'gameover';
    this.touch();
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
    const lang = this.state().lang;
    this._state = this.freshState(lang);
    this.touch();
  }

  descendFloor(): void {
    const s = this.state();
    s.rollingDie = { active: false, value: null, cls: '' };
    this.touch();
    this.startFloor();
  }
}