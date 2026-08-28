import { Injectable } from '@angular/core';
import { CLASS_DATA, mod } from '../data/game.data';
import { BOSS_XP, MONSTER_XP, xpToNext } from '../data/monster.data';
import { applyRelicEffect, RELIC_CLASS_POOLS } from '../data/relic.data';
import { ARMOR_POOLS, equipArmor, equipWeapon, WEAPON_POOLS } from '../data/equipment.data';
import { DropInfo } from '../models/game.models';
import { DiceService } from './dice.service';
import { GameStateService } from './game-state.service';
import { LevelUpService } from './level-up.service';
import { MonsterService } from './monster.service';

/**
 * Gestisce la logica di combattimento, attacchi speciali, animazioni dadi 3D e ricompense dei Boss.
 */
@Injectable({ providedIn: 'root' })
export class CombatService {
  constructor(
    private stateService: GameStateService,
    private monsterService: MonsterService,
    private levelUpService: LevelUpService,
    private dice: DiceService
  ) {}

  async playerAttack(): Promise<void> {
    const s = this.stateService.state();
    if (s.combatFlags.acting) return;
    s.combatFlags.acting = true;

    const p = s.player!;
    const c = CLASS_DATA[p.cls];
    const statMod = mod(p.stats[c.atkStat]) + (p.tempAtkBonus || 0) + (p.flatAtkBonus || 0);
    const critThreshold = p.critThreshold || 20;
    p.tempAtkBonus = 0;
    this.stateService.touch();

    // 1. Tiro per Colpire (d20)
    const raw = await this.stateService.animateRollAsync(this.dice.rnd(20), 20, 'attack', critThreshold);
    const cur = this.stateService.state();
    const isCrit = raw >= critThreshold;
    const total = raw + statMod;
    const hit = raw === 20 || isCrit || total >= cur.monster!.ac;

    if (raw === 1) {
      this.stateService.log(this.stateService.t('log.attackMissNat1'), 'dmg hero');
    } else if (hit) {
      const [n, d] = cur.player!.weapon.dice;
      const bonus = mod(cur.player!.stats[c.atkStat]) + (cur.player!.weapon.bonus || 0) + (cur.player!.flatDmgBonus || 0);
      const dmgRoll = this.dice.rollNdM(n, d);
      const dmgMax = n * d;

      // 2. Animazione Dado Danno dell'Arma
      await this.stateService.animateRollAsync(dmgRoll, d, 'damage');

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

      cur.monster!.hp = this.dice.clamp(cur.monster!.hp - dmg, 0, cur.monster!.maxHp);
      this.stateService.touch();
      this.stateService.log(
        this.stateService.tf('log.attackHit', { 
          roll: raw, mod: this.dice.fmtMod(statMod), total, ac: cur.monster!.ac, dmgRoll, dmgMax, dmg, crit: critTxt 
        }),
        'hero'
      );
    } else {
      this.stateService.log(
        this.stateService.tf('log.attackMiss', { roll: raw, mod: this.dice.fmtMod(statMod), total, ac: cur.monster!.ac }),
        'hero'
      );
    }

    if (cur.monster && cur.monster.hp <= 0) {
      cur.combatFlags.acting = false;
      this.monsterDefeated();
      return;
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
    this.stateService.log(this.stateService.t('log.defendFlavor'), 'flavor hero');
    
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
      p.mightyBlowActive = true;
      p.usedSpecial = true;

      const statMod = mod(p.stats.str) + (p.tempAtkBonus || 0) + (p.flatAtkBonus || 0);
      p.tempAtkBonus = 0;
      const critThreshold = p.critThreshold || 20;

      // 1. Tiro per Colpire speciale (d20)
      const raw = await this.stateService.animateRollAsync(this.dice.rnd(20), 20, 'attack', critThreshold);
      const total = raw + statMod;
      const isCrit = raw >= critThreshold;
      const hit = raw === 20 || isCrit || total >= s.monster!.ac;

      if (raw === 1) {
        this.stateService.log(this.stateService.t('log.attackMissNat1'), 'dmg hero');
      } else if (hit) {
        const [n, d] = CLASS_DATA.fighter.weaponDice;
        const bonus = mod(p.stats.str) + (p.weapon.bonus || 0) + (p.flatDmgBonus || 0);
        const dmgRoll = this.dice.rollNdM(n, d);
        const dmgMax = n * d;

        // 2. Animazione Dado Danno
        await this.stateService.animateRollAsync(dmgRoll, d, 'damage');

        let dmg = (dmgRoll + bonus) * 2;
        let critTxt = ' <b>[COLPO PODEROSO!]</b>';

        if (isCrit) {
          const mult = p.critMultiplier || 2;
          dmg = Math.floor(dmg * mult);
          critTxt += this.stateService.t('log.critText');
        }

        p.mightyBlowActive = false;

        s.monster!.hp = this.dice.clamp(s.monster!.hp - dmg, 0, s.monster!.maxHp);
        this.stateService.touch();
        this.stateService.log(
          this.stateService.tf('log.attackHit', { 
            roll: raw, mod: this.dice.fmtMod(statMod), total, ac: s.monster!.ac, dmgRoll, dmgMax, dmg, crit: critTxt 
          }),
          'hero'
        );
      } else {
        this.stateService.log(
          this.stateService.tf('log.attackMiss', { roll: raw, mod: this.dice.fmtMod(statMod), total, ac: s.monster!.ac }),
          'hero'
        );
      }

      if (s.monster!.hp <= 0) {
        s.combatFlags.acting = false;
        this.monsterDefeated();
        return;
      }
      await this.monsterTurn();

    } else if (cls === 'rogue') {
      const statMod = mod(p.stats.dex) + (p.tempAtkBonus || 0) + (p.flatAtkBonus || 0) + 3;
      p.tempAtkBonus = 0;

      // 1. Tiro per Colpire (d20)
      const raw = await this.stateService.animateRollAsync(this.dice.rnd(20), 20, 'attack', p.critThreshold);
      const total = raw + statMod;
      const hit = raw === 20 || total >= s.monster!.ac;

      if (hit) {
        const bonus = mod(p.stats.dex) + (p.weapon.bonus || 0) + (p.flatDmgBonus || 0);
        const dmgRoll = this.dice.rollNdM(3, 6);

        // 2. Animazione Dado Danno Attacco Furtivo (d6)
        await this.stateService.animateRollAsync(dmgRoll, 6, 'damage');

        const mult = p.critMultiplier || 2;
        const dmg = Math.floor((dmgRoll + bonus) * mult);

        s.monster!.hp = this.dice.clamp(s.monster!.hp - dmg, 0, s.monster!.maxHp);
        this.stateService.touch();
        this.stateService.log(this.stateService.tf('log.specialRogueHit', { special: specialName, dmgRoll, dmgMax: 18, dmg }), 'dmg hero');
      } else {
        this.stateService.log(this.stateService.tf('log.specialRogueMiss', { special: specialName }), 'flavor hero');
      }

      p.usedSpecial = true;
      if (s.monster!.hp <= 0) {
        s.combatFlags.acting = false;
        this.monsterDefeated();
        return;
      }
      await this.monsterTurn();

    } else if (cls === 'wizard') {
      const bonus = mod(p.stats.int) + (p.specialBonusDmg || 0) + (p.flatDmgBonus || 0);

      // 1. Primo lancio e animazione del 1° d4
      const roll1 = this.dice.rollDie(4);
      await this.stateService.animateRollAsync(roll1, 4, 'damage');

      // 2. Secondo lancio e animazione del 2° d4
      const roll2 = this.dice.rollDie(4);
      await this.stateService.animateRollAsync(roll2, 4, 'damage');

      const dmgRoll = roll1 + roll2;
      const dmgMax = 8;
      const dmg = dmgRoll + bonus;

      s.monster!.hp = this.dice.clamp(s.monster!.hp - dmg, 0, s.monster!.maxHp);
      p.tempAcBonus = (p.tempAcBonus || 0) + 2;
      this.stateService.touch();

      this.stateService.log(
        this.stateService.tf('log.specialWizard', { special: specialName, dmgRoll, dmgMax, dmg }), 
        'dmg hero'
      );
      p.usedSpecial = true;

      if (s.monster!.hp <= 0) {
        s.combatFlags.acting = false;
        this.monsterDefeated();
        return;
      }
      await this.monsterTurn();

    } else if (cls === 'cleric') {
      const bonus = mod(p.stats.wis) + (p.specialBonusHeal || 0);
      const dmgRoll = this.dice.rollNdM(3, 6);
      const dmgMax = 18;

      // Animazione Dado Cura Preghiera Guaritrice (d6)
      await this.stateService.animateRollAsync(dmgRoll, 6, 'heal');

      const heal = dmgRoll + bonus;

      p.hp = this.dice.clamp(p.hp + heal, 0, p.maxHp);
      p.tempAcBonus = (p.tempAcBonus || 0) + 2;
      this.stateService.touch();
      this.stateService.log(this.stateService.tf('log.specialCleric', { special: specialName, dmgRoll, dmgMax, heal }), 'heal hero');
      p.usedSpecial = true;
      
      await this.monsterTurn();
    }

    this.stateService.state().combatFlags.acting = false;
    this.stateService.touch();
  }

  async playerUsePotion(): Promise<void> {
    const s = this.stateService.state();
    if (s.combatFlags.acting) return;
    const p = s.player!;
    const idx = p.inventory.findIndex(i => i.type === 'potion');
    if (idx === -1) return;

    s.combatFlags.acting = true;
    const potion = p.inventory.splice(idx, 1)[0];
    const [n, d] = potion.heal;
    const dmgRoll = this.dice.rollNdM(n, d);
    const dmgMax = n * d;

    // Animazione Dado Cura Pozione (d6)
    await this.stateService.animateRollAsync(dmgRoll, d, 'heal');

    const heal = dmgRoll + (p.potionHealBonus || 0);

    p.hp = this.dice.clamp(p.hp + heal, 0, p.maxHp);
    this.stateService.touch();
    this.stateService.log(
      this.stateService.tf('log.drinkPotion', { potion: this.stateService.t('potionName'), dmgRoll, dmgMax, heal }), 
      'heal hero'
    );

    if (s.phase === 'combat') {
      await this.monsterTurn();
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
    const raw = await this.stateService.animateRollAsync(this.dice.rnd(20), 20, 'flee');
    
    const cur = this.stateService.state();
    const total = raw + statMod;
    const success = total >= dc;

    this.stateService.log(this.stateService.tf('log.fleeAttempt', {
      roll: raw, mod: this.dice.fmtMod(statMod), total, dc,
      result: success ? this.stateService.t('log.fleeSuccess') : this.stateService.t('log.fleeFail')
    }), 'hero');

    if (success) {
      cur.monster = null;
      cur.phase = 'explore';
    } else {
      await this.monsterTurn();
    }
    this.stateService.state().combatFlags.acting = false;
    this.stateService.touch();
  }

  async monsterTurn(): Promise<void> {
    const s = this.stateService.state();
    if (!s.monster || s.monster.hp <= 0) return;

    const p = s.player!;
    const name = this.monsterService.monsterDisplayName(s.monster);
    const defending = !!s.combatFlags.defending;
    s.combatFlags.defending = false;

    const acBonus = defending ? 4 : 0;
    const monsterAtkMod = 2 + Math.floor(s.depth / 5);
    const targetAC = p.ac + acBonus + (p.tempAcBonus || 0);
    this.stateService.touch();

    // 1. Tiro per Colpire del Nemico (d20)
    const toHit = await this.stateService.animateRollAsync(this.dice.rnd(20), 20, 'monsterAttack');
    const cur = this.stateService.state();
    const total = toHit + monsterAtkMod;

    if (toHit === 1) {
      this.stateService.log(this.stateService.tf('log.monsterMiss1', { name }), 'flavor enemy');
    } else if (total >= targetAC || toHit === 20) {
      const [n, d] = cur.monster!.dmg;
      const dmgRoll = this.dice.rollNdM(n, d);
      const dmgMax = n * d;

      // 2. Animazione Dado Danno del Nemico (d4, d6, d8, d10)
      await this.stateService.animateRollAsync(dmgRoll, d, 'monsterDamage');

      let dmg = dmgRoll;
      
      if (defending) dmg = Math.ceil(dmg / 2);

      if (p.damageReduction && p.damageReduction > 0) {
        dmg = Math.max(1, dmg - p.damageReduction);
      }

      cur.player!.hp = this.dice.clamp(cur.player!.hp - dmg, 0, cur.player!.maxHp);
      this.stateService.touch();

      this.stateService.log(this.stateService.tf('log.monsterHit', {
        name, roll: toHit, mod: this.dice.fmtMod(monsterAtkMod), total, ac: targetAC, dmgRoll, dmgMax, dmg,
        defended: defending ? this.stateService.t('log.defendedSuffix') : ''
      }), 'dmg enemy');

      if (cur.player!.hp <= 0) {
        await this.stateService.wait(400);
        this.gameOver();
      }
    } else {
      this.stateService.log(this.stateService.tf('log.monsterMissGuard', { name, roll: toHit, mod: this.dice.fmtMod(monsterAtkMod), total, ac: targetAC }), 'enemy');
    }
  }

  monsterDefeated(): void {
    const s = this.stateService.state();
    const name = this.monsterService.monsterDisplayName(s.monster);
    const gold = this.dice.rollNdM(1, 6) + Math.floor(s.depth / 2);
    const xp = s.monster!.isBoss ? BOSS_XP[s.monster!.id] + s.depth : MONSTER_XP[s.monster!.id] + Math.floor(s.depth / 2);
    const wasBoss = s.monster!.isBoss;

    s.player!.gold += gold;
    s.player!.xp += xp;
    s.player!.usedSpecial = false;
    s.player!.tempAcBonus = 0;
    s.player!.mightyBlowActive = false;
    this.stateService.touch();

    this.stateService.log(this.stateService.tf('log.monsterDefeated', { name, gold, xp }), 'heal');

    const cur = this.stateService.state();
    cur.monster = null;
    this.stateService.touch();

    const drops: DropInfo[] = [];

    if (wasBoss) {
      const p = cur.player!;
      const tier = Math.min(5, Math.max(1, Math.ceil(s.depth / 10)));
      const rollLoot = Math.random();

      if (rollLoot < 0.20) {
        // 20% ORO EXTRA
        const bonusGold = (this.dice.rollNdM(3, 6) + s.depth) * 5;
        p.gold += bonusGold;
        this.stateService.touch();
        drops.push({
          type: 'gold',
          id: 'bonus_gold',
          name: this.stateService.t('ui.goldExtraTitle'),
          effect: `+${bonusGold} Monete d'oro`
        });
      } else if (rollLoot < 0.60) {
        // 40% ARMA DI CLASSE
        const weapons = WEAPON_POOLS[p.cls]?.[tier];
        if (weapons && weapons.length > 0) {
          const qRoll = Math.random();
          const weaponIdx = qRoll < 0.50 ? 0 : qRoll < 0.85 ? 1 : 2;
          const selectedWeapon = weapons[Math.min(weaponIdx, weapons.length - 1)];

          equipWeapon(p, selectedWeapon);
          this.stateService.touch();

          const wName = this.stateService.equipmentName(selectedWeapon.key, 'weapons');
          const wEffect = `Danno: ${selectedWeapon.dice[0]}d${selectedWeapon.dice[1]} + ${selectedWeapon.bonus}`;
          drops.push({
            type: 'weapon',
            id: selectedWeapon.key,
            name: wName,
            effect: wEffect
          });
        }
      } else {
        // 40% ARMATURA DI CLASSE
        const armors = ARMOR_POOLS[p.cls]?.[tier];
        if (armors && armors.length > 0) {
          const qRoll = Math.random();
          const armorIdx = qRoll < 0.50 ? 0 : qRoll < 0.85 ? 1 : 2;
          const selectedArmor = armors[Math.min(armorIdx, armors.length - 1)];

          equipArmor(p, selectedArmor);
          this.stateService.touch();

          const aName = this.stateService.equipmentName(selectedArmor.key, 'armors');
          let aEffect = `Classe Armatura: +${selectedArmor.bonus}`;
          if (selectedArmor.drBonus) aEffect += `, Riduzione Danno: +${selectedArmor.drBonus}`;
          if (selectedArmor.specialDmgBonus) aEffect += `, Danni Magici: +${selectedArmor.specialDmgBonus}`;
          if (selectedArmor.specialHealBonus) aEffect += `, Cure Magiche: +${selectedArmor.specialHealBonus}`;
          if (selectedArmor.critBonus) aEffect += `, Soglia Critico: -${selectedArmor.critBonus}`;

          drops.push({
            type: 'armor',
            id: selectedArmor.key,
            name: aName,
            effect: aEffect
          });
        }
      }

      // Reliquie Boss
      const pool = RELIC_CLASS_POOLS[cur.player!.cls];
      if (pool) {
        const available = pool.filter(id => !cur.player!.relics.includes(id));
        if (available.length > 0) {
          const relicId = this.dice.pick(available);
          applyRelicEffect(cur.player!, relicId);
          cur.player!.relics.push(relicId);
          this.stateService.touch();

          const relicName = this.stateService.t('relics.' + relicId + '.name');
          const relicEffect = this.stateService.t('relics.' + relicId + '.effect');
          drops.push({ type: 'relic', id: relicId, name: relicName, effect: relicEffect });
        }
      }
    }

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

    if (wasBoss) {
      final.phase = null;
      final.rollingDie = { active: false, value: null, cls: '' };
      final.bossRewardModal = { name, xp, gold, drops };
      this.stateService.touch();
    } else {
      this.stateService.touch();
      if (levelsToGain > 0) { 
        this.levelUpService.startLevelUp(); 
      } else { 
        final.phase = 'explore'; 
        this.stateService.touch(); 
      }
    }
  }

  confirmBossReward(): void {
    const s = this.stateService.state();
    s.bossRewardModal = null;
    this.stateService.touch();

    if (s.pendingLevelUps > 0) { 
      this.levelUpService.startLevelUp(); 
    } else { 
      s.phase = 'explore'; 
      this.stateService.touch(); 
    }
  }

  gameOver(): void {
    const s = this.stateService.state();
    s.screen = 'gameover';
    this.stateService.touch();
  }
}