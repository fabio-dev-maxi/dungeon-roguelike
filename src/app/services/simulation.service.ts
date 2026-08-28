import { Injectable } from '@angular/core';
import { CharacterService } from './character.service';
import { CombatService } from './combat.service';
import { EncounterService } from './encounter.service';
import { GameStateService } from './game-state.service';
import { DiceService } from './dice.service';
import { LevelUpService } from './level-up.service';
import { ClassKey, ChoiceOption, PendingChoice } from '../models/game.models';
import { CLASS_DATA } from '../data/game.data';

export interface DropsSummary {
  relicsCollected: number;
  weaponsCollected: number;
  armorsCollected: number;
  bonusGoldCollected: number;
  avgRelicsPerRun: number;
  avgFinalAC: number;
  avgFinalDR: number;
}

export interface SimulationResult {
  cls: ClassKey;
  N: number;
  completions: number;
  completionRate: number;
  avgDeathDepth: number | null;
  deathsByDepth: Record<number, number>;
  deathsByBoss: Record<string, number>;
  bossReach: Record<string, { reach: number; survive: number; levels: number[] }>;
  dropsSummary: DropsSummary;
}

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private origLog?: typeof GameStateService.prototype.log;
  private origTouch?: typeof GameStateService.prototype.touch;
  private origAnimateRollAsync?: typeof GameStateService.prototype.animateRollAsync;
  private origWait?: typeof GameStateService.prototype.wait;
  private origBestDepth = 0;

  constructor(
    private characterService: CharacterService,
    private encounterService: EncounterService,
    private combatService: CombatService,
    private stateService: GameStateService,
    private levelUpService: LevelUpService,
    private dice: DiceService
  ) { }

  private setSimulationMode(active: boolean) {
    if (active) {
      this.origBestDepth = this.stateService.bestDepth();
      this.origLog = this.stateService.log.bind(this.stateService);
      this.origTouch = this.stateService.touch.bind(this.stateService);
      this.origAnimateRollAsync = this.stateService.animateRollAsync.bind(this.stateService);
      this.origWait = this.stateService.wait.bind(this.stateService);
      this.stateService.log = () => { };
      this.stateService.touch = () => { };
      this.stateService.animateRollAsync = async (val) => val;
      this.stateService.wait = async () => { };
    } else {
      if (this.origLog) this.stateService.log = this.origLog;
      if (this.origTouch) this.stateService.touch = this.origTouch;
      if (this.origAnimateRollAsync) this.stateService.animateRollAsync = this.origAnimateRollAsync;
      if (this.origWait) this.stateService.wait = this.origWait;
      this.stateService.restartGame();
      this.stateService.bestDepth.set(this.origBestDepth);
    }
  }

  async runBatch(cls: ClassKey, N: number): Promise<SimulationResult> {
    this.setSimulationMode(true);
    const deathsByDepth: Record<number, number> = {};
    const deathsByBoss: Record<string, number> = {};
    const bossReach: Record<string, { reach: number; survive: number; levels: number[] }> = {};

    const BOSS_IDS = ['boss1', 'boss2', 'boss3', 'chimera', 'archdemon', 'lich', 'hydra', 'dragon_red', 'kraken', 'tarrasque'];
    BOSS_IDS.forEach(id => bossReach[id] = { reach: 0, survive: 0, levels: [] });

    let completions = 0;
    let totalDeathDepth = 0;
    let deathCount = 0;

    let relicsCollected = 0;
    let weaponsCollected = 0;
    let armorsCollected = 0;
    let bonusGoldCollected = 0;
    let totalACSum = 0;
    let totalDRSum = 0;

    try {
      for (let i = 0; i < N; i++) {
        const runResult = await this.simulateSingleRun(cls);

        relicsCollected += runResult.runDrops.relics;
        weaponsCollected += runResult.runDrops.weapons;
        armorsCollected += runResult.runDrops.armors;
        bonusGoldCollected += runResult.runDrops.gold;
        totalACSum += runResult.finalAC;
        totalDRSum += runResult.finalDR;

        if (runResult.died) {
          deathCount++;
          totalDeathDepth += runResult.depth;
          const bucket = Math.ceil(runResult.depth / 5) * 5;
          deathsByDepth[bucket] = (deathsByDepth[bucket] || 0) + 1;

          if (runResult.bossId) {
            deathsByBoss[runResult.bossId] = (deathsByBoss[runResult.bossId] || 0) + 1;
          }
        } else {
          completions++;
        }

        for (const [id, stats] of Object.entries(runResult.bossEncounters)) {
          if (stats.reached) {
            bossReach[id].reach++;
            bossReach[id].levels.push(stats.level);
            if (stats.survived) {
              bossReach[id].survive++;
            }
          }
        }
      }
    } finally {
      this.setSimulationMode(false);
    }

    return {
      cls,
      N,
      completions,
      completionRate: completions / N,
      avgDeathDepth: deathCount ? (totalDeathDepth / deathCount) : null,
      deathsByDepth,
      deathsByBoss,
      bossReach,
      dropsSummary: {
        relicsCollected,
        weaponsCollected,
        armorsCollected,
        bonusGoldCollected,
        avgRelicsPerRun: Number((relicsCollected / N).toFixed(2)),
        avgFinalAC: Number((totalACSum / N).toFixed(1)),
        avgFinalDR: Number((totalDRSum / N).toFixed(1))
      }
    };
  }

  private async simulateSingleRun(cls: ClassKey) {
    const s = this.stateService.freshState('it');
    const stats = this.characterService.rollAllStats();
    s.player = this.characterService.buildPlayer('Sim', cls, stats);
    s.screen = 'run';

    (this.stateService as any)._state = s;

    let isDead = false;
    let currentDepth = 0;
    const runDrops = { relics: 0, weapons: 0, armors: 0, gold: 0 };
    const bossEncounters: Record<string, { reached: boolean; survived: boolean; level: number }> = {};
    const BOSS_IDS = ['boss1', 'boss2', 'boss3', 'chimera', 'archdemon', 'lich', 'hydra', 'dragon_red', 'kraken', 'tarrasque'];
    BOSS_IDS.forEach(id => bossEncounters[id] = { reached: false, survived: false, level: 0 });

    for (let depth = 1; depth <= 50; depth++) {
      s.depth = depth;
      currentDepth = depth;

      this.encounterService.startFloor();

      // All'interno del metodo simulateSingleRun() in SimulationService:

      if (s.phase === 'combat' && s.monster) {
        const mId = s.monster.id;
        const isBoss = s.monster.isBoss;

        if (isBoss) {
          bossEncounters[mId].reached = true;
          bossEncounters[mId].level = s.player!.level;
        }

        let rounds = 0;
        while (s.player!.hp > 0 && s.monster && s.monster.hp > 0 && rounds < 100) {
          rounds++;

          // 1. Usa subito l'abilità speciale se disponibile al primo turno
          if (!s.player!.usedSpecial) {
            await this.combatService.playerUseSpecial();
          }
          // 2. Se l'abilità è già stata usata, bevi una pozione in caso di HP critici (< 35%)
          else if (s.player!.hp < s.player!.maxHp * 0.35 && s.player!.inventory.some(i => i.type === 'potion')) {
            await this.combatService.playerUsePotion();
          }
          // 3. Attacco standard
          else {
            await this.combatService.playerAttack();
          }
        }

        if (s.player!.hp <= 0) {
          isDead = true;
          return {
            died: true,
            depth: currentDepth,
            bossId: isBoss ? mId : null,
            bossEncounters,
            runDrops,
            finalAC: s.player!.ac,
            finalDR: s.player!.damageReduction || 0
          };
        }

        if (isBoss) {
          bossEncounters[mId].survived = true;
          if (s.bossRewardModal) {
            for (const drop of s.bossRewardModal.drops) {
              if (drop.type === 'relic') runDrops.relics++;
              else if (drop.type === 'weapon') runDrops.weapons++;
              else if (drop.type === 'armor') runDrops.armors++;
              else if (drop.type === 'gold') runDrops.gold++;
            }
            this.combatService.confirmBossReward();
          }
        }

        await this.processPendingLevelUps();
      } else if (s.phase === 'choice' && s.pendingChoice) {
        const choiceOpt = this.pickOptimalChoice(s.pendingChoice, s.player!);

        if (choiceOpt) {
          if (s.pendingChoice.canFail) {
            s.pendingChoice.onChoose!(choiceOpt);
            s.phase = 'explore';
          } else if (s.pendingChoice.onChoose) {
            s.pendingChoice.onChoose(choiceOpt);
            s.phase = 'explore';
          } else if (s.pendingChoice.onResolve) {
            const statMod = this.dice.mod(s.player!.stats[choiceOpt.stat as any]);
            const roll = this.dice.rnd(20);
            s.pendingChoice.onResolve(roll + statMod >= s.pendingChoice.dc!);
            s.phase = 'explore';

            if (s.player!.hp <= 0) {
              return {
                died: true,
                depth: currentDepth,
                bossId: null,
                bossEncounters,
                runDrops,
                finalAC: s.player!.ac,
                finalDR: s.player!.damageReduction || 0
              };
            }
          }
        }
      }

      if (s.phase === 'explore') {
        continue;
      }
    }

    return {
      died: false,
      depth: 50,
      bossId: null,
      bossEncounters,
      runDrops,
      finalAC: s.player!.ac,
      finalDR: s.player!.damageReduction || 0
    };
  }

  private pickOptimalChoice(choice: PendingChoice, p: import('../models/game.models').Player): ChoiceOption {
    if (choice.options.some(o => o.stat === 'dex')) {
      return choice.options.find(o => o.stat === 'dex')!;
    }
    if (choice.options.some(o => o.action === 'heal')) {
      return p.hp < p.maxHp ? choice.options.find(o => o.action === 'heal')! : choice.options.find(o => o.action === 'skip')!;
    }
    if (choice.options.some(o => o.action === 'potion')) {
      const potionOpt = choice.options.find(o => o.action === 'potion');
      const upgradeOpt = choice.options.find(o => o.action === 'upgrade');
      const potionsCount = p.inventory.filter(i => i.type === 'potion').length;

      if (p.gold >= (potionOpt?.cost || 0) && potionsCount < 4) return potionOpt!;
      if (p.gold >= (upgradeOpt?.cost || 0)) return upgradeOpt!;
      return choice.options.find(o => o.action === 'skip')!;
    }
    if (choice.options.some(o => o.action === 'rest')) {
      const restOpt = choice.options.find(o => o.action === 'rest');
      const drinkOpt = choice.options.find(o => o.action === 'drink');
      if (p.gold >= (restOpt?.cost || 0) && p.hp < p.maxHp * 0.7) return restOpt!;
      return drinkOpt!;
    }

    return choice.options[0];
  }

  private async processPendingLevelUps() {
    const s = this.stateService.state();
    let safetyCounter = 0;

    while (s.phase === 'levelup' && safetyCounter < 50) {
      safetyCounter++;
      if (!s.levelUp) break;
      if (s.levelUp.step === 'stat') {
        const p = s.player!;
        const primaryStat = CLASS_DATA[p.cls].primary;
        const statToPick = p.level % 4 === 0 ? 'con' : primaryStat;

        this.levelUpService.chooseLevelUpStat(statToPick);
      } else if (s.levelUp.step === 'feat') {
        const avail = s.levelUp.availableFeats || [];
        if (avail.length > 0) {
          this.levelUpService.chooseLevelUpFeat(avail[0].id);
        } else {
          s.levelUp.step = 'hp';
          await this.levelUpService.rollLevelUpHp();
        }
      } else if (s.levelUp.step === 'hp') {
        await this.levelUpService.rollLevelUpHp();
        const hitDie = CLASS_DATA[s.player!.cls].hitDie;
        if ((s.levelUp.hpRollBase || 0) < hitDie / 2 && !s.levelUp.rerolled) {
          this.levelUpService.rerollLevelUpHp();
        }

        this.levelUpService.confirmLevelUp();
      }
    }
  }
}