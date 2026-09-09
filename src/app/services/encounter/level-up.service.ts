import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { DiceService } from '../dice/dice.service';
import { CLASS_DATA, CLASS_FEATS, mod } from '../../data/game.data';
import { Feat, StatKey } from '../../models/game.models';
import { EncounterService } from './encounter.service';

/**
 * SERVIZIO GESTIONE AVANZAMENTO LIVELLO (LEVEL-UP SYSTEM D&D 3.5)
 * 
 * Regola il tiro del Dado Vita, la selezione dei talenti di classe
 * e la distribuzione dei punti caratteristica con sanificazione numerica.
 */
@Injectable({ providedIn: 'root' })
export class LevelUpService {
  constructor(
    private readonly stateService: GameStateService,
    private readonly encounterService: EncounterService,
    private readonly dice: DiceService
  ) { }

  public startLevelUp(): void {
    const s = this.stateService.state();
    s.player!.level++;
    this.grantFighterManeuvers(s.player!.level);
    s.phase = 'levelup';
    s.mapViewActive = false;
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
      featsForLevel = allFeats.filter((f) => !userFeats.includes(f.id));
    }

    s.levelUp = {
      step: initialStep,
      chosenStat: null,
      availableFeats: featsForLevel,
      chosenFeatId: null,
      hpRollBase: null,
      hpRollTotal: null,
      rerolled: false,
    };

    this.stateService.touch();
    this.stateService.log(
      this.stateService.tf('log.levelUpAnnounce', { level: newLevel }),
      'sys'
    );

    if (initialStep === 'hp') {
      this.rollLevelUpHp();
    }
  }

  /**
 * Assegna automaticamente le Abilità di Combattimento del Guerriero ai livelli 2/4/6/8.
 * Sono maneuvers on/off (Power Attack, Combat Expertise) o passive (Weapon Specialization,
 * Improved Critical): non richiedono uno step di scelta, a differenza dei talenti generici.
 */
  private grantFighterManeuvers(level: number): void {
    const s = this.stateService.state();
    const p = s.player!;
    if (p.cls !== 'fighter') return;

    switch (level) {
      case 2:
        p.hasPowerAttack = true;
        this.stateService.log('<b>Nuova abilità: Attacco Poderoso</b> (attivabile a scelta in combattimento).', 'heal');
        break;
      case 4:
        p.hasWeaponSpecialization = true;
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        this.stateService.log('<b>Specializzazione nelle Armi</b>: +2 ai danni base (permanente).', 'heal');
        break;
      case 6:
        p.hasCombatExpertise = true;
        this.stateService.log('<b>Nuova abilità: Maestria in Combattimento</b> (attivabile a scelta in combattimento).', 'heal');
        break;
      case 8:
        p.hasImprovedCritical = true;
        // Raddoppia il range di minaccia: range = 21 - soglia -> nuovoRange = range*2 -> nuovaSoglia = 2*soglia - 21
        p.critThreshold = Math.max(2, 2 * p.critThreshold - 21);
        this.stateService.log('<b>Critico Migliorato</b>: raddoppiato l\'intervallo di minaccia critico (permanente).', 'heal');
        break;
    }
  }

  public chooseLevelUpStat(statKey: StatKey): void {
    const s = this.stateService.state();
    if (!s.levelUp || s.levelUp.step !== 'stat') return;

    const oldConMod = mod(Number(s.player!.stats.con) || 10);
    const currentVal = Number(s.player!.stats[statKey]) || 10;

    // Incremento con cast numerico per prevenire la concatenazione stringa ("18" + 1 = "181")
    s.player!.stats[statKey] = currentVal + 1;
    s.levelUp.chosenStat = statKey;
    this.stateService.touch();

    this.stateService.log(
      this.stateService.tf('log.levelUpStatChosen', {
        stat: this.stateService.t('stats.' + statKey),
        value: s.player!.stats[statKey],
      }),
      'heal'
    );

    // Gestione HP retroattivi da incremento Costituzione
    if (statKey === 'con') {
      const newConMod = mod(Number(s.player!.stats.con) || 10);
      if (newConMod > oldConMod) {
        const retro = s.player!.level;
        s.player!.maxHp += retro;
        s.player!.hp += retro;
        this.stateService.touch();
        this.stateService.log(
          this.stateService.tf('log.conRetroBonus', {
            oldMod: this.dice.fmtMod(oldConMod),
            newMod: this.dice.fmtMod(newConMod),
            hp: retro,
          }),
          'heal'
        );
      }
    }

    const newLevel = s.player!.level;
    if (newLevel % 3 === 0) {
      const allFeats = CLASS_FEATS[s.player!.cls] || [];
      const userFeats = s.player!.feats || [];
      s.levelUp.availableFeats = allFeats.filter((f) => !userFeats.includes(f.id));
      s.levelUp.step = 'feat';
      this.stateService.touch();
    } else {
      s.levelUp.step = 'hp';
      this.stateService.touch();
      this.rollLevelUpHp();
    }
  }

  public chooseLevelUpFeat(featId: string): void {
    const s = this.stateService.state();
    if (!s.levelUp || s.levelUp.step !== 'feat') return;

    const p = s.player!;
    if (!p.feats) p.feats = [];
    p.feats.push(featId);
    s.levelUp.chosenFeatId = featId;

    // --- EFFETTI PASSIVI DEI TALENTI DI CLASSE D&D 3.5 ---
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
      case 'relentless_strike':
        p.flatAtkBonus = (p.flatAtkBonus || 0) + 2;
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        break;
      case 'battle_rage':
        p.maxHp += 12;
        p.hp += 12;
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        break;

      // LADRO
      case 'shadow_step':
        p.stats.dex = Number(p.stats.dex) + 2;
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
      case 'shadow_strike':
        p.flatAtkBonus = (p.flatAtkBonus || 0) + 2;
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 3;
        break;
      case 'opportunist':
        p.critThreshold = Math.max(15, p.critThreshold - 1);
        p.fleeBonus = (p.fleeBonus || 0) + 2;
        break;

      // MAGO
      case 'arcane_mind':
        p.stats.int = Number(p.stats.int) + 2;
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
      case 'pyroclasm':
        p.specialBonusDmg = (p.specialBonusDmg || 0) + 3;
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 2;
        break;
      case 'vital_transmutation':
        p.stats.int = Number(p.stats.int) + 2;
        p.maxHp += 12;
        p.hp += 12;
        break;

      // CHIERICO
      case 'divine_grace':
        p.stats.wis = Number(p.stats.wis) + 2;
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
      case 'smite_evil':
        p.flatAtkBonus = (p.flatAtkBonus || 0) + 2;
        p.flatDmgBonus = (p.flatDmgBonus || 0) + 3;
        break;
      case 'sacred_vigor':
        p.maxHp += 12;
        p.hp += 12;
        p.specialBonusHeal = (p.specialBonusHeal || 0) + 4;
        break;
    }

    const featName = this.stateService.t('feats.' + featId + '.name');
    this.stateService.log(`Talento acquisito: <strong>${featName}</strong>!`, 'heal');
    s.levelUp.step = 'hp';
    this.stateService.touch();
    this.rollLevelUpHp();
  }

  public async rollLevelUpHp(): Promise<void> {
    const s = this.stateService.state();
    const hitDie = CLASS_DATA[s.player!.cls].hitDie;
    const conMod = mod(Number(s.player!.stats.con) || 10);

    s.levelUp!.hpRollTotal = null;
    this.stateService.touch();

    const finalBase = await this.stateService.animateRollAsync(
      this.dice.rnd(hitDie),
      hitDie,
      'levelhp'
    );
    const cur = this.stateService.state();

    if (cur.levelUp) {
      cur.levelUp.hpRollBase = finalBase;
      cur.levelUp.hpRollTotal = Math.max(1, finalBase + conMod);
      this.stateService.touch();
    }
  }

  public rerollLevelUpHp(): void {
    const s = this.stateService.state();
    if (!s.levelUp || s.levelUp.rerolled) return;
    s.levelUp.rerolled = true;
    this.stateService.touch();
    this.rollLevelUpHp();
  }

  public confirmLevelUp(): void {
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
      if (cur.bossRewardModal) {
        // Se la modale del boss è ancora attiva, lascia la fase a null
        s.phase = null;
      } else {
        // LIVELLI COMPLETATI: passa alla fase 'explore' invece di caricare subito il piano
        s.levelUp = null;
        s.phase = 'explore';
        s.combatFlags.acting = false;
        this.stateService.touch();
      }
      this.stateService.touch();
    }
  }
}