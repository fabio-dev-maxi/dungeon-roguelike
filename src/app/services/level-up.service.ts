import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { DiceService } from './dice.service';
import { CLASS_DATA, CLASS_FEATS, mod } from '../data/game.data';
import { Feat, StatKey } from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class LevelUpService {
  constructor(private stateService: GameStateService, private dice: DiceService) {}

  startLevelUp(): void {
    const s = this.stateService.state();
    s.player!.level++;
    s.phase = 'levelup';
    s.rollingDie = { active: false, value: null, cls: '' };

    const newLevel = s.player!.level;
    const hasStat = newLevel % 2 === 0;
    const hasFeat = newLevel % 3 === 0;

    let initialStep: 'stat' | 'feat' | 'hp' = 'hp';
    let featsForLevel: Feat[] = [];

    if (hasStat) {
      initialStep = 'stat';
    } else if (hasFeat) {
      initialStep = 'feat';
      const allFeats = CLASS_FEATS[s.player!.cls] || [];
      const userFeats = s.player!.feats || [];
      featsForLevel = allFeats.filter(f => !userFeats.includes(f.id));
    }

    s.levelUp = {
      step: initialStep,
      chosenStat: null,
      availableFeats: featsForLevel,
      chosenFeatId: null,
      hpRollBase: null,
      hpRollTotal: null,
      rerolled: false
    };

    this.stateService.touch();
    this.stateService.log(this.stateService.tf('log.levelUpAnnounce', { level: newLevel }), 'sys');

    if (initialStep === 'hp') {
      this.rollLevelUpHp();
    }
  }

  chooseLevelUpStat(statKey: StatKey): void {
    const s = this.stateService.state();
    if (!s.levelUp || s.levelUp.step !== 'stat') return;
    const oldConMod = mod(s.player!.stats.con);
    s.player!.stats[statKey] += 1;
    s.levelUp.chosenStat = statKey;
    this.stateService.touch();
    this.stateService.log(this.stateService.tf('log.levelUpStatChosen', { stat: this.stateService.t('stats.' + statKey), value: s.player!.stats[statKey] }), 'heal');

    if (statKey === 'con') {
      const newConMod = mod(s.player!.stats.con);
      if (newConMod > oldConMod) {
        const retro = s.player!.level;
        s.player!.maxHp += retro;
        s.player!.hp += retro;
        this.stateService.touch();
        this.stateService.log(this.stateService.tf('log.conRetroBonus', { oldMod: this.dice.fmtMod(oldConMod), newMod: this.dice.fmtMod(newConMod), hp: retro }), 'heal');
      }
    }

    const newLevel = s.player!.level;
    if (newLevel % 3 === 0) {
      const allFeats = CLASS_FEATS[s.player!.cls] || [];
      const userFeats = s.player!.feats || [];
      s.levelUp.availableFeats = allFeats.filter(f => !userFeats.includes(f.id));
      s.levelUp.step = 'feat';
      this.stateService.touch();
    } else {
      s.levelUp.step = 'hp';
      this.stateService.touch();
      this.rollLevelUpHp();
    }
  }

  chooseLevelUpFeat(featId: string): void {
    const s = this.stateService.state();
    if (!s.levelUp || s.levelUp.step !== 'feat') return;

    const p = s.player!;
    if (!p.feats) p.feats = [];
    p.feats.push(featId);
    s.levelUp.chosenFeatId = featId;

    if (featId === 'weapon_master') {
      p.flatAtkBonus = (p.flatAtkBonus || 0) + 1;
      p.flatDmgBonus = (p.flatDmgBonus || 0) + 1;
    } else if (featId === 'iron_skin') {
      p.ac += 1;
    } else if (featId === 'savage_striker') {
      p.critThreshold = (p.critThreshold || 20) - 1;
    } else if (featId === 'battle_vigors') {
      p.maxHp += 6;
      p.hp += 6;
    } else if (featId === 'devastating_crit') {
      p.critMultiplier = 2.5;
    }

    const featName = this.stateService.t('feats.' + featId + '.name');
    this.stateService.log(`Talento acquisito: <strong>${featName}</strong>!`, 'heal');

    s.levelUp.step = 'hp';
    this.stateService.touch();
    this.rollLevelUpHp();
  }

  async rollLevelUpHp(): Promise<void> {
    const s = this.stateService.state();
    const hitDie = CLASS_DATA[s.player!.cls].hitDie;
    const conMod = mod(s.player!.stats.con);
    s.levelUp!.hpRollTotal = null;
    this.stateService.touch();

    const finalBase = await this.stateService.animateRollAsync(this.dice.rnd(hitDie), hitDie, 'levelhp');

    const cur = this.stateService.state();
    if (cur.levelUp) {
      cur.levelUp.hpRollBase = finalBase;
      cur.levelUp.hpRollTotal = Math.max(1, finalBase + conMod);
      this.stateService.touch();
    }
  }

  rerollLevelUpHp(): void {
    const s = this.stateService.state();
    if (!s.levelUp || s.levelUp.rerolled) return;
    s.levelUp.rerolled = true;
    this.stateService.touch();
    this.rollLevelUpHp();
  }

  confirmLevelUp(): void {
    const s = this.stateService.state();
    const levelUp = s.levelUp;
    if (!levelUp || levelUp.hpRollTotal === null || levelUp.hpRollTotal === undefined) return;

    const gain = levelUp.hpRollTotal;
    s.player!.maxHp += gain;
    s.player!.hp += gain;
    this.stateService.touch();
    this.stateService.log(this.stateService.tf('log.levelUpHpGained', { hp: gain, maxhp: s.player!.maxHp }), 'heal');

    const cur = this.stateService.state();
    cur.pendingLevelUps--;
    cur.rollingDie = { active: false, value: null, cls: '' };
    this.stateService.touch();
    if (cur.pendingLevelUps > 0) {
      this.startLevelUp();
    } else {
      cur.levelUp = null;
      cur.phase = 'explore';
      this.stateService.touch();
    }
  }
}