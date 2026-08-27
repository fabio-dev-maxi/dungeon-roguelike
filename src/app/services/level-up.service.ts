import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { DiceService } from './dice.service';
import { CLASS_DATA, CLASS_FEATS, mod } from '../data/game.data';
import { Feat, StatKey } from '../models/game.models';

/**
 * Gestione avanzamento livello: tiro dadi vita, punti caratteristica e acquisizione talenti.
 */
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

    this.stateService.log(
      this.stateService.tf('log.levelUpStatChosen', { 
        stat: this.stateService.t('stats.' + statKey), 
        value: s.player!.stats[statKey] 
      }), 
      'heal'
    );

    // Se la Costituzione aumenta il suo modificatore, applica gli HP retroattivi per livello
    if (statKey === 'con') {
      const newConMod = mod(s.player!.stats.con);
      if (newConMod > oldConMod) {
        const retro = s.player!.level;
        s.player!.maxHp += retro;
        s.player!.hp += retro;
        this.stateService.touch();
        this.stateService.log(
          this.stateService.tf('log.conRetroBonus', { 
            oldMod: this.dice.fmtMod(oldConMod), 
            newMod: this.dice.fmtMod(newConMod), 
            hp: retro 
          }), 
          'heal'
        );
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

    // --- APPLICAZIONE EFFETTI SPECIFICI DEI TALENTI ---
    switch (featId) {
      // GUERRIERO
      case 'juggernaut':
        p.ac += 2;
        p.maxHp += 10;
        p.hp += 10;
        break;
      case 'colossus_strike':
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        p.flatAtkBonus = (p.flatAtkBonus || 0) + 1;
        break;
      case 'bloodlust_vigor':
        p.maxHp += 15;
        p.hp += 15;
        break;
      case 'titan_defense':
        p.damageReduction = (p.damageReduction || 0) + 2;
        break;
      case 'devastating_crit':
        p.critMultiplier = 2.5;
        break;

      // LADRO
      case 'shadow_step':
        p.stats.dex += 2;
        p.fleeBonus = (p.fleeBonus || 0) + 3;
        break;
      case 'lethal_precision':
        p.critThreshold = Math.max(15, p.critThreshold - 1);
        break;
      case 'assassin_blade':
        p.critMultiplier = Math.max(2.5, (p.critMultiplier || 2) + 0.5);
        break;
      case 'evasion_master':
        p.ac += 2;
        p.flatAtkBonus = (p.flatAtkBonus || 0) + 1;
        break;
      case 'venomous_strike':
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        break;

      // MAGO
      case 'arcane_mind':
        p.stats.int += 2;
        p.flatAtkBonus = (p.flatAtkBonus || 0) + 1;
        break;
      case 'spell_amplification':
        p.specialBonusDmg = (p.specialBonusDmg || 0) + 4;
        break;
      case 'mana_barrier':
        p.ac += 1;
        p.maxHp += 8;
        p.hp += 8;
        break;
      case 'overcharge_spell':
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        break;
      case 'archmage_focus':
        p.flatAtkBonus = (p.flatAtkBonus || 0) + 2;
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        break;

      // CHIERICO
      case 'divine_grace':
        p.stats.wis += 2;
        p.ac += 1;
        break;
      case 'radiant_cure':
        p.specialBonusHeal = (p.specialBonusHeal || 0) + 6;
        break;
      case 'holy_armor':
        p.ac += 2;
        p.maxHp += 8;
        p.hp += 8;
        break;
      case 'blessed_strikes':
        p.flatAtkBonus = (p.flatAtkBonus || 0) + 2;
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        break;
      case 'renewing_faith':
        p.potionHealBonus = (p.potionHealBonus || 0) + 5;
        break;
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

    this.stateService.log(
      this.stateService.tf('log.levelUpHpGained', { hp: gain, maxhp: s.player!.maxHp }), 
      'heal'
    );

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