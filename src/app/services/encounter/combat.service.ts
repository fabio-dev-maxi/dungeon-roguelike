import { Injectable } from '@angular/core';
import {
  ARMOR_POOLS,
  equipArmor,
  equipWeapon,
  WEAPON_POOLS,
} from '../../data/equipment.data';
import { CLASS_DATA, mod } from '../../data/game.data';
import { BOSS_XP, MONSTER_XP, xpToNext } from '../../data/monster.data';
import { applyRelicEffect, RELIC_CLASS_POOLS } from '../../data/relic.data';
import { DropInfo, Monster } from '../../models/game.models';
import { DiceService } from '../dice/dice.service';
import { GameStateService } from '.././game-state.service';
import { MonsterService } from './monster.service';
import { LevelUpService } from './level-up.service';
import { PotionService } from './potion.service';

interface MonsterReward {
  name: string;
  gold: number;
  xp: number;
}

/**
 * Gestisce la logica di combattimento, attacchi speciali, animazioni dadi 3D e ricompense dei Boss.
 * Supporta scontri contro 1 o 2 mostri simultanei (vedi MonsterService.makeMonsters):
 * il giocatore attacca sempre il mostro "bersagliato" (state.targetMonsterIndex, default 0),
 * mentre nel turno nemico TUTTI i mostri vivi attaccano in sequenza.
 */
@Injectable({ providedIn: 'root' })
export class CombatService {
  constructor(
    private stateService: GameStateService,
    private monsterService: MonsterService,
    private levelUpService: LevelUpService,
    private potionService: PotionService,
    private dice: DiceService
  ) { }

  /** In D&D 3.5 una minaccia critica deve colpire di nuovo il bersaglio. */
  private async confirmCritical(
    targetAC: number,
    attackBonus: number,
    tag = 'critConfirm'
  ): Promise<boolean> {
    const roll = this.dice.rnd(20);
    const confirmed =
      roll !== 1 && (roll === 20 || roll + attackBonus >= targetAC);
    // La classe "crit" consente alla UI di mostrare il banner solo quando la conferma riesce.
    await this.stateService.animateRollAsync(
      roll,
      20,
      tag,
      confirmed ? roll : 21
    );
    return confirmed;
  }

  // --- SELEZIONE BERSAGLIO ---

  /**
   * Restituisce il mostro attualmente bersagliato (se vivo), o il primo mostro vivo disponibile
   * (e aggiorna l'indice di conseguenza). Restituisce null se nessun mostro è in vita.
   */
  private getTargetMonster(): Monster | null {
    const s = this.stateService.state();
    if (!s.monsters || s.monsters.length === 0) return null;

    const current = s.monsters[s.targetMonsterIndex];
    if (current && current.hp > 0) return current;

    const aliveIdx = s.monsters.findIndex((m) => m.hp > 0);
    if (aliveIdx === -1) return null;

    s.targetMonsterIndex = aliveIdx;
    this.stateService.touch();
    return s.monsters[aliveIdx];
  }

  /** Chiamato dall'UI quando il giocatore clicca su un mostro per cambiare bersaglio. */
  public selectTargetMonster(index: number): void {
    const s = this.stateService.state();
    if (s.combatFlags.acting) return;
    const m = s.monsters[index];
    if (!m || m.hp <= 0) return;
    s.targetMonsterIndex = index;
    this.stateService.touch();
  }

  async playerAttack(): Promise<void> {
    const s = this.stateService.state();
    if (s.combatFlags.acting) return;
    const target = this.getTargetMonster();
    if (!target) return;

    s.combatFlags.acting = true;

    const p = s.player!;
    const c = CLASS_DATA[p.cls];
    const powerAttackOn = !!p.powerAttackActive;
    const combatExpertiseOn = !!p.combatExpertiseActive;
    const maneuverAtkPenalty = (powerAttackOn ? -2 : 0) + (combatExpertiseOn ? -2 : 0);

    const statMod =
      mod(p.stats[c.atkStat]) + (p.tempAtkBonus || 0) + (p.flatAtkBonus || 0) + maneuverAtkPenalty;

    const critThreshold = p.critThreshold || 20;

    p.tempAtkBonus = 0;
    this.stateService.touch();

    // 1. Tiro per Colpire (d20)
    const attackRoll = this.dice.rnd(20);
    const total = attackRoll + statMod;
    const hit = attackRoll === 20 || total >= target.ac;
    const criticalThreat = hit && attackRoll >= critThreshold;

    const raw = await this.stateService.animateRollAsync(
      attackRoll,
      20,
      'attack',
      criticalThreat ? critThreshold : 21
    );

    const isCrit =
      criticalThreat && (await this.confirmCritical(target.ac, statMod));

    if (raw === 1) {
      this.stateService.log(
        this.stateService.t('log.attackMissNat1'),
        'dmg hero'
      );
    } else if (hit) {
      const cur = this.stateService.state();
      const [n, d] = cur.player!.weapon.dice;
      const bonus =
        mod(cur.player!.stats[c.atkStat]) +
        (cur.player!.weapon.bonus || 0) +
        (cur.player!.flatDmgBonus || 0) +
        (cur.player!.powerAttackActive ? 4 : 0);

      const dmgMax = n * d;
      const dmgRolls = Array.from({ length: n }, () => this.dice.rollDie(d));

      // 2. Animazione Dado Danno dell'Arma (Tiro Multiplo)
      await this.stateService.animateRollAsync(dmgRolls, d, 'damage');

      const dmgRoll = dmgRolls.reduce((a, b) => a + b, 0);

      let dmg = dmgRoll + bonus;
      let critTxt = '';
      if (isCrit) {
        const mult = cur.player!.critMultiplier || 2;
        dmg = Math.floor(dmg * mult);
        critTxt = this.stateService.t('log.critText');
      }

      // Se il Colpo Poderoso del Guerriero è attivo, raddoppia il danno ed esaurisci la carica
      if (cur.player!.mightyBlowActive) {
        dmg = dmg * 2;
        cur.player!.mightyBlowActive = false;
        critTxt += ' <b>[COLPO PODEROSO!]</b>';
      }

      target.hp = this.dice.clamp(target.hp - dmg, 0, target.maxHp);

      this.stateService.touch();
      this.stateService.log(
        this.stateService.tf('log.attackHit', {
          roll: raw,
          mod: this.dice.fmtMod(statMod),
          total,
          ac: target.ac,
          dmgRoll,
          dmgMax,
          dmg,
          crit: critTxt,
        }),
        'hero'
      );
    } else {
      this.stateService.log(
        this.stateService.tf('log.attackMiss', {
          roll: raw,
          mod: this.dice.fmtMod(statMod),
          total,
          ac: target.ac,
        }),
        'hero'
      );
    }

    if (target.hp <= 0) {
      const ended = this.handleMonsterDefeat(target);
      if (ended) {
        this.stateService.state().combatFlags.acting = false;
        this.stateService.touch();
        return;
      }
    }

    await this.monsterTurn();
    this.stateService.state().combatFlags.acting = false;
    this.stateService.touch();
  }

  async playerDefend(): Promise<void> {
    const s = this.stateService.state();
    if (s.combatFlags.acting) return;

    s.combatFlags.acting = true;
    s.combatFlags.defending = true;
    this.stateService.touch();

    this.stateService.log(
      this.stateService.t('log.defendFlavor'),
      'flavor hero'
    );

    await this.monsterTurn();
    this.stateService.state().combatFlags.acting = false;
    this.stateService.touch();
  }

  async playerUseSpecial(): Promise<void> {
    const s = this.stateService.state();
    if (s.combatFlags.acting || s.player!.usedSpecial) return;

    const p = s.player!;
    const cls = p.cls;
    const specialName = this.stateService.t('classes.' + cls + '.specialName');

    s.combatFlags.acting = true;
    this.stateService.touch();

    if (cls === 'fighter') {
      const target = this.getTargetMonster();
      if (!target) {
        this.stateService.state().combatFlags.acting = false;
        this.stateService.touch();
        return;
      }

      p.mightyBlowActive = true;
      p.usedSpecial = true;
      const powerAttackOn = !!p.powerAttackActive;
      const combatExpertiseOn = !!p.combatExpertiseActive;
      const maneuverAtkPenalty = (powerAttackOn ? -2 : 0) + (combatExpertiseOn ? -2 : 0);

      const statMod = mod(p.stats.str) + (p.tempAtkBonus || 0) + (p.flatAtkBonus || 0) + maneuverAtkPenalty;

      p.tempAtkBonus = 0;
      const critThreshold = p.critThreshold || 20;

      // 1. Tiro per Colpire speciale (d20)
      const attackRoll = this.dice.rnd(20);
      const total = attackRoll + statMod;
      const hit = attackRoll === 20 || total >= target.ac;
      const criticalThreat = hit && attackRoll >= critThreshold;

      const raw = await this.stateService.animateRollAsync(
        attackRoll,
        20,
        'attack',
        criticalThreat ? critThreshold : 21
      );

      const isCrit =
        criticalThreat && (await this.confirmCritical(target.ac, statMod));

      if (raw === 1) {
        this.stateService.log(
          this.stateService.t('log.attackMissNat1'),
          'dmg hero'
        );
      } else if (hit) {
        const [n, d] = p.weapon.dice;
        const bonus =
          mod(p.stats.str) +
          (p.weapon.bonus || 0) +
          (p.flatDmgBonus || 0) +
          (p.powerAttackActive ? 4 : 0);

        const dmgMax = n * d;
        const dmgRolls = Array.from({ length: n }, () => this.dice.rollDie(d));

        // 2. Animazione Dado Danno
        await this.stateService.animateRollAsync(dmgRolls, d, 'damage');
        const dmgRoll = dmgRolls.reduce((a, b) => a + b, 0);

        let dmg = (dmgRoll + bonus) * 2;
        let critTxt = ' <b>[COLPO PODEROSO!]</b>';

        if (isCrit) {
          const mult = p.critMultiplier || 2;
          dmg = Math.floor(dmg * mult);
          critTxt += this.stateService.t('log.critText');
        }

        p.mightyBlowActive = false;

        target.hp = this.dice.clamp(target.hp - dmg, 0, target.maxHp);

        this.stateService.touch();

        this.stateService.log(
          this.stateService.tf('log.attackHit', {
            roll: raw,
            mod: this.dice.fmtMod(statMod),
            total,
            ac: target.ac,
            dmgRoll,
            dmgMax,
            dmg,
            crit: critTxt,
          }),
          'hero'
        );
      } else {
        this.stateService.log(
          this.stateService.tf('log.attackMiss', {
            roll: raw,
            mod: this.dice.fmtMod(statMod),
            total,
            ac: target.ac,
          }),
          'hero'
        );
      }

      if (target.hp <= 0) {
        const ended = this.handleMonsterDefeat(target);
        if (ended) {
          this.stateService.state().combatFlags.acting = false;
          this.stateService.touch();
          return;
        }
      }
      await this.monsterTurn();
    } else if (cls === 'rogue') {
      const target = this.getTargetMonster();
      if (!target) {
        this.stateService.state().combatFlags.acting = false;
        this.stateService.touch();
        return;
      }

      const statMod =
        mod(p.stats.dex) + (p.tempAtkBonus || 0) + (p.flatAtkBonus || 0) + 3;

      p.tempAtkBonus = 0;

      // 1. Tiro per Colpire (d20)
      const raw = await this.stateService.animateRollAsync(
        this.dice.rnd(20),
        20,
        'attack',
        p.critThreshold
      );

      const total = raw + statMod;
      const hit = raw === 20 || total >= target.ac;

      if (hit) {
        const bonus =
          mod(p.stats.dex) + (p.weapon.bonus || 0) + (p.flatDmgBonus || 0);

        const dmgRolls = [
          this.dice.rollDie(6),
          this.dice.rollDie(6),
          this.dice.rollDie(6),
        ];

        // 2. Animazione Dado Danno Attacco Furtivo (d6)
        await this.stateService.animateRollAsync(dmgRolls, 6, 'damage');
        const dmgRoll = dmgRolls.reduce((a, b) => a + b, 0);

        const mult = p.critMultiplier || 2;
        const dmg = Math.floor((dmgRoll + bonus) * mult);

        target.hp = this.dice.clamp(target.hp - dmg, 0, target.maxHp);

        this.stateService.touch();
        this.stateService.log(
          this.stateService.tf('log.specialRogueHit', {
            special: specialName,
            dmgRoll,
            dmgMax: 18,
            dmg,
          }),
          'dmg hero'
        );
      } else {
        this.stateService.log(
          this.stateService.tf('log.specialRogueMiss', {
            special: specialName,
          }),
          'flavor hero'
        );
      }
      p.usedSpecial = true;
      if (target.hp <= 0) {
        const ended = this.handleMonsterDefeat(target);
        if (ended) {
          this.stateService.state().combatFlags.acting = false;
          this.stateService.touch();
          return;
        }
      }
      await this.monsterTurn();
    } else if (cls === 'wizard') {
      const target = this.getTargetMonster();
      if (!target) {
        this.stateService.state().combatFlags.acting = false;
        this.stateService.touch();
        return;
      }

      const bonus =
        mod(p.stats.int) + (p.specialBonusDmg || 0) + (p.flatDmgBonus || 0);

      // Lancio simultaneo dei 2d4
      const dmgRolls = [this.dice.rollDie(4), this.dice.rollDie(4)];
      await this.stateService.animateRollAsync(dmgRolls, 4, 'damage');

      const dmgRoll = dmgRolls.reduce((a, b) => a + b, 0);
      const dmgMax = 8;
      const dmg = dmgRoll + bonus;

      target.hp = this.dice.clamp(target.hp - dmg, 0, target.maxHp);
      p.tempAcBonus = (p.tempAcBonus || 0) + 2;

      this.stateService.touch();

      this.stateService.log(
        this.stateService.tf('log.specialWizard', {
          special: specialName,
          dmgRoll,
          dmgMax,
          dmg,
        }),
        'dmg hero'
      );
      p.usedSpecial = true;

      if (target.hp <= 0) {
        const ended = this.handleMonsterDefeat(target);
        if (ended) {
          this.stateService.state().combatFlags.acting = false;
          this.stateService.touch();
          return;
        }
      }
      await this.monsterTurn();
    } else if (cls === 'cleric') {
      const bonus = mod(p.stats.wis) + (p.specialBonusHeal || 0);

      const dmgRolls = [
        this.dice.rollDie(6),
        this.dice.rollDie(6),
        this.dice.rollDie(6),
      ];
      const dmgMax = 18;

      // Animazione Dado Cura Preghiera Guaritrice (d6)
      await this.stateService.animateRollAsync(dmgRolls, 6, 'heal');
      const dmgRoll = dmgRolls.reduce((a, b) => a + b, 0);

      const heal = dmgRoll + bonus;

      p.hp = this.dice.clamp(p.hp + heal, 0, p.maxHp);
      p.tempAcBonus = (p.tempAcBonus || 0) + 2;

      this.stateService.touch();

      this.stateService.log(
        this.stateService.tf('log.specialCleric', {
          special: specialName,
          dmgRoll,
          dmgMax,
          heal,
        }),
        'heal hero'
      );
      p.usedSpecial = true;

      await this.monsterTurn();
    }

    this.stateService.state().combatFlags.acting = false;
    this.stateService.touch();
  }

  async playerUsePotion(inventoryIndex?: number): Promise<void> {
    const s = this.stateService.state();
    if (s.combatFlags.acting) return;

    const p = s.player!;
    let targetIndex = -1;

    // Trova l'indice della pozione
    if (
      inventoryIndex !== undefined &&
      inventoryIndex >= 0 &&
      inventoryIndex < p.inventory.length &&
      p.inventory[inventoryIndex].type === 'potion'
    ) {
      targetIndex = inventoryIndex;
    } else {
      targetIndex = p.inventory.findIndex((i) => i.type === 'potion');
    }

    if (targetIndex === -1) return;

    s.combatFlags.acting = true;

    // Tutta la logica di consumo, cura e modifica dello stato avviene qui dentro
    const result = this.potionService.consumePotion(p, targetIndex);

    // Se per qualche motivo ha fallito, usciamo
    if (result) {
      // Estraiamo i dati già calcolati da consumePotion
      const { potion, rolls, dmgRoll, dmgMax, totalHeal } = result;
      const d = potion.heal[1];

      // UI: Gestione Animazione
      await this.stateService.animateRollAsync(rolls, d, 'heal');
      this.stateService.touch();

      // UI: Gestione Log
      this.stateService.log(
        this.stateService.tf('log.drinkPotion', {
          potion: this.stateService.t('potionName'),
          dmgRoll,
          dmgMax,
          heal: totalHeal,
        }),
        'heal hero'
      );

      // Flow del combattimento
      if (s.phase === 'combat') {
        await this.monsterTurn();
      }
    }

    this.stateService.state().combatFlags.acting = false;
    this.stateService.touch();
  }

  async playerFlee(): Promise<void> {
    const s = this.stateService.state();
    if (s.combatFlags.acting) return;
    s.combatFlags.acting = true;
    this.stateService.touch();

    const p = s.player!;
    const dc = 10 + Math.floor(s.depth / 4);
    const statMod = mod(p.stats.dex) + (p.fleeBonus || 0);

    const raw = await this.stateService.animateRollAsync(
      this.dice.rnd(20),
      20,
      'flee'
    );
    const cur = this.stateService.state();
    const total = raw + statMod;
    const success = total >= dc;

    this.stateService.log(
      this.stateService.tf('log.fleeAttempt', {
        roll: raw,
        mod: this.dice.fmtMod(statMod),
        total,
        dc,
        result: success
          ? this.stateService.t('log.fleeSuccess')
          : this.stateService.t('log.fleeFail'),
      }),
      'hero'
    );

    if (success) {
      cur.monsters = [];
      cur.targetMonsterIndex = 0;
      cur.phase = 'explore';
    } else {
      await this.monsterTurn();
    }

    this.stateService.state().combatFlags.acting = false;
    this.stateService.touch();
  }

  /**
   * Turno nemico: TUTTI i mostri vivi (snapshot ad inizio turno) attaccano in sequenza.
   * Si interrompe immediatamente se il giocatore va a 0 PF (gameOver già innescato).
   */
  async monsterTurn(): Promise<void> {
    const s = this.stateService.state();
    const aliveMonsters = s.monsters.filter((m) => m.hp > 0);
    if (aliveMonsters.length === 0) return;

    const defending = !!s.combatFlags.defending;
    s.combatFlags.defending = false;
    this.stateService.touch();

    for (const monster of aliveMonsters) {
      const cur = this.stateService.state();
      if (!cur.player || cur.player.hp <= 0) break;

      await this.singleMonsterAttack(monster, defending);

      const after = this.stateService.state();
      if (!after.player || after.player.hp <= 0) break;
    }
  }

  private async singleMonsterAttack(monster: Monster, defending: boolean): Promise<void> {
    const s = this.stateService.state();
    const p = s.player!;
    const name = this.monsterService.monsterDisplayName(monster);

    const acBonus = defending ? 4 : 0;
    const monsterAtkMod = monster.atk;
    const targetAC = p.ac + acBonus + (p.tempAcBonus || 0) + (p.combatExpertiseActive ? 2 : 0);
    this.stateService.touch();

    // 1. Tiro per Colpire del Nemico (d20)
    const attackRoll = this.dice.rnd(20);
    const total = attackRoll + monsterAtkMod;
    const hit = attackRoll === 20 || total >= targetAC;
    const criticalThreat = hit && attackRoll === 20;

    const toHit = await this.stateService.animateRollAsync(
      attackRoll,
      20,
      'monsterAttack',
      criticalThreat ? 20 : 21
    );

    const cur = this.stateService.state();
    const isCrit =
      criticalThreat &&
      (await this.confirmCritical(
        targetAC,
        monsterAtkMod,
        'monsterCritConfirm'
      ));

    if (toHit === 1) {
      this.stateService.log(
        this.stateService.tf('log.monsterMiss1', { name }),
        'flavor enemy'
      );
    } else if (hit) {
      const [n, d] = monster.dmg;

      const dmgRolls = Array.from({ length: n }, () => this.dice.rollDie(d));
      const dmgMax = n * d;

      // 2. Animazione Dado Danno del Nemico (Tiro Multiplo)
      await this.stateService.animateRollAsync(dmgRolls, d, 'monsterDamage');
      const dmgRoll = dmgRolls.reduce((a, b) => a + b, 0);

      let dmg = dmgRoll;
      // Se è un 20 naturale, raddoppia il danno inflitto
      if (isCrit) {
        dmg = dmg * 2;
      }

      if (defending) dmg = Math.ceil(dmg / 2);

      if (p.damageReduction && p.damageReduction > 0) {
        dmg = Math.max(1, dmg - p.damageReduction);
      }

      cur.player!.hp = this.dice.clamp(
        cur.player!.hp - dmg,
        0,
        cur.player!.maxHp
      );
      this.stateService.touch();

      let hitLog = this.stateService.tf('log.monsterHit', {
        name,
        roll: toHit,
        mod: this.dice.fmtMod(monsterAtkMod),
        total,
        ac: targetAC,
        dmgRoll,
        dmgMax,
        dmg,
        defended: defending ? this.stateService.t('log.defendedSuffix') : '',
      });
      if (isCrit) {
        hitLog += this.stateService.t('log.critText');
      }

      this.stateService.log(hitLog, 'dmg enemy');

      if (cur.player!.hp <= 0) {
        await this.stateService.wait(400);
        this.gameOver();
      }
    } else {
      this.stateService.log(
        this.stateService.tf('log.monsterMissGuard', {
          name,
          roll: toHit,
          mod: this.dice.fmtMod(monsterAtkMod),
          total,
          ac: targetAC,
        }),
        'enemy'
      );
    }
  }

  // --- RISOLUZIONE VITTORIA ---

  private computeMonsterReward(monster: Monster): MonsterReward {
    const s = this.stateService.state();
    const name = this.monsterService.monsterDisplayName(monster);
    const gold = this.dice.rollNdM(1, 6) + Math.floor(s.depth * 1.5);

    const baseXp = monster.isBoss ? BOSS_XP[monster.id] : MONSTER_XP[monster.id];
    const bracketXpMultiplier: Record<number, number> = {
      0: 0.95,
      1: 1.00,
      2: 1.10,
      3: 1.15,
      4: 1.20
    };
    const multiplier = bracketXpMultiplier[monster.bracket] ?? 1;
    const xp = Math.round(baseXp * multiplier);

    return { name, gold, xp };
  }

  /**
   * Chiamato quando un mostro va a 0 PF. Assegna subito oro/XP per quel mostro.
   * Se restano altri mostri vivi nello scontro, logga la sconfitta e ricalcola il bersaglio,
   * lasciando proseguire il combattimento. Se era l'ultimo mostro, chiude lo scontro.
   * Restituisce true se il combattimento è terminato.
   */
  private handleMonsterDefeat(monster: Monster): boolean {
    const s = this.stateService.state();
    const reward = this.computeMonsterReward(monster);
    const p = s.player!;
    p.gold += reward.gold;
    p.xp += reward.xp;
    this.stateService.touch();

    const wasMultiFight = s.monsters.length > 1;
    const stillAlive = s.monsters.some((m) => m.hp > 0);

    if (stillAlive) {
      this.stateService.log(
        this.stateService.tf('log.monsterDefeated', reward),
        'heal'
      );
      const nextIdx = s.monsters.findIndex((m) => m.hp > 0);
      if (nextIdx >= 0) s.targetMonsterIndex = nextIdx;
      this.stateService.touch();
      return false;
    }

    this.finalizeVictory(monster, reward, wasMultiFight);
    return true;
  }

  /**
   * Chiude definitivamente lo scontro (ultimo mostro abbattuto).
   * Per scontri solitari (boss compreso) mostra la reward modal classica con eventuale bottino
   * da Custode del Piano. Per scontri multipli mundani, evita di mostrare una seconda modale
   * (i kill precedenti sono già stati loggati singolarmente) e passa direttamente alla fase
   * successiva (esplorazione o level-up).
   */
  private finalizeVictory(
    lastMonster: Monster,
    lastReward: MonsterReward,
    wasMultiFight: boolean
  ): void {
    const s = this.stateService.state();
    const p = s.player!;
    const wasBoss = lastMonster.isBoss;

    p.usedSpecial = false;
    p.tempAcBonus = 0;
    p.mightyBlowActive = false;
    s.monsters = [];
    s.targetMonsterIndex = 0;
    this.stateService.touch();

    const drops: DropInfo[] = [];

    // =========================================================================
    // BOTTINO CUSTODE DEL PIANO (LAYER 7 BOSS) - i boss sono sempre scontri solitari
    // =========================================================================
    if (wasBoss) {
      const dropChance = 0.40 + (this.dice.random() * 0.20);

      if (this.dice.random() < dropChance) {
        const firstPotion = this.potionService.createPotionItem(s.depth);
        p.inventory.push(firstPotion);

        const doubleDropChance = 0.08 + (this.dice.random() * 0.04);
        if (this.dice.random() < doubleDropChance) {
          const secondPotion = this.potionService.createPotionItem(s.depth);
          p.inventory.push(secondPotion);
        }

        drops.push({
          type: 'potion',
          id: 'boss_potions',
          name: 'Pozione di Cura x2',
          effect: `Ripristina salute (${firstPotion.heal[0]}d${firstPotion.heal[1]})`,
        });
      }

      const tier = Math.min(5, Math.max(1, Math.ceil(s.depth / 10)));
      const rollLoot = this.dice.random();

      if (rollLoot < 0.2) {
        const bonusGold = (this.dice.rollNdM(3, 6) + s.depth) * 5;
        p.gold += bonusGold;
        this.stateService.touch();
        drops.push({
          type: 'gold',
          id: 'bonus_gold',
          name: this.stateService.t('ui.goldExtraTitle'),
          effect: `+${bonusGold} Monete d'oro`,
        });
      } else if (rollLoot < 0.6) {
        const weapons = WEAPON_POOLS[p.cls]?.[tier];
        if (weapons && weapons.length > 0) {
          const selectedWeapon = weapons[Math.min(Math.floor(this.dice.random() * weapons.length), weapons.length - 1)];
          equipWeapon(p, selectedWeapon);
          this.stateService.touch();
          drops.push({
            type: 'weapon',
            id: selectedWeapon.key,
            name: this.stateService.equipmentName(selectedWeapon.key, 'weapons'),
            effect: `Danno: ${selectedWeapon.dice[0]}d${selectedWeapon.dice[1]} + ${selectedWeapon.bonus}`,
          });
        }
      } else {
        const armors = ARMOR_POOLS[p.cls]?.[tier];
        if (armors && armors.length > 0) {
          const selectedArmor = armors[Math.min(Math.floor(this.dice.random() * armors.length), armors.length - 1)];
          equipArmor(p, selectedArmor);
          this.stateService.touch();
          drops.push({
            type: 'armor',
            id: selectedArmor.key,
            name: this.stateService.equipmentName(selectedArmor.key, 'armors'),
            effect: `Classe Armatura: +${selectedArmor.bonus}`,
          });
        }
      }

      const pool = RELIC_CLASS_POOLS[p.cls];
      if (pool) {
        const available = pool.filter((id) => !p.relics.includes(id));
        if (available.length > 0) {
          const relicId = this.dice.pick(available);
          applyRelicEffect(p, relicId);
          p.relics.push(relicId);
          this.stateService.touch();
          drops.push({
            type: 'relic',
            id: relicId,
            name: this.stateService.t('relics.' + relicId + '.name'),
            effect: this.stateService.t('relics.' + relicId + '.effect'),
          });
        }
      }
    }

    if (wasMultiFight) {
      // Ultimo dei 2 mostri: i precedenti sono già stati loggati da handleMonsterDefeat.
      this.stateService.log(
        this.stateService.tf('log.monsterDefeated', lastReward),
        'heal'
      );
    }

    // CALCOLO AVANZAMENTO LIVELLI MULTIPLI
    const final = this.stateService.state();
    let lvl = final.player!.level;
    let xpLeft = final.player!.xp;
    let levelsToGain = 0;

    while (xpLeft >= xpToNext(lvl)) {
      xpLeft -= xpToNext(lvl);
      lvl++;
      levelsToGain++;
    }

    final.player!.xp = xpLeft;
    final.pendingLevelUps = levelsToGain;
    final.rollingDie = { active: false, value: null, cls: '' };

    if (wasMultiFight && !wasBoss) {
      // Niente reward modal per scontri multipli mundani: già tutto loggato in chat.
      final.phase = null;
      this.stateService.touch();
      if (final.pendingLevelUps > 0) {
        this.levelUpService.startLevelUp();
      } else {
        final.phase = 'explore';
        final.combatFlags.acting = false;
        this.stateService.touch();
      }
    } else {
      final.phase = null;
      final.bossRewardModal = {
        name: lastReward.name,
        xp: lastReward.xp,
        gold: lastReward.gold,
        drops,
        isBoss: wasBoss,
      };
      this.stateService.touch();
    }
  }

  confirmBossReward(): void {
    const s = this.stateService.state();
    s.bossRewardModal = null;
    this.stateService.touch();

    if (s.pendingLevelUps > 0) {
      this.levelUpService.startLevelUp();
    } else {
      // Dopo aver chiuso la modale del Boss, passa alla fase 'explore' 
      // permettendo al giocatore di curarsi con le pozioni prima di proseguire
      s.phase = 'explore';
      s.combatFlags.acting = false;
      this.stateService.touch();
    }
  }

  gameOver(): void {
    const s = this.stateService.state();
    s.screen = 'gameover';
    this.stateService.touch();
  }
}