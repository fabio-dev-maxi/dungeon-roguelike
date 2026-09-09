import { Injectable } from '@angular/core';
import { CharacterService } from './character.service';
import { CombatService } from './encounter/combat.service';
import { EncounterService } from './encounter/encounter.service';
import { GameStateService } from './game-state.service';
import { DiceService } from './dice/dice.service';
import { LevelUpService } from './encounter/level-up.service';
import {
  ClassKey,
  MapNode,
  Stats,
  StatKey,
} from '../models/game.models';
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
  bossReach: Record<
    string,
    { reach: number; survive: number; levels: number[] }
  >;
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
    private readonly characterService: CharacterService,
    private readonly encounterService: EncounterService,
    private readonly combatService: CombatService,
    private readonly stateService: GameStateService,
    private readonly levelUpService: LevelUpService,
    private readonly dice: DiceService
  ) { }

  private setSimulationMode(active: boolean): void {
    if (active) {
      this.origBestDepth = this.stateService.bestDepth();
      this.origLog = this.stateService.log.bind(this.stateService);
      this.origTouch = this.stateService.touch.bind(this.stateService);
      this.origAnimateRollAsync = this.stateService.animateRollAsync.bind(this.stateService);
      this.origWait = this.stateService.wait.bind(this.stateService);

      this.stateService.log = () => { };
      this.stateService.touch = () => { };
      this.stateService.animateRollAsync = async (val: number | number[]) => {
        return Array.isArray(val) ? val.reduce((a, b) => a + b, 0) : val;
      };
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

  private generateStrongStats(cls: ClassKey): Stats {
    const rolls: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = [
        this.dice.rollDie(6),
        this.dice.rollDie(6),
        this.dice.rollDie(6),
        this.dice.rollDie(6),
      ];
      r.sort((a, b) => a - b);
      r.shift();
      rolls.push(r.reduce((a, b) => a + b, 0));
    }
    rolls.sort((a, b) => b - a);
    rolls[0] = Math.max(rolls[0], 16);
    rolls[1] = Math.max(rolls[1], 14);

    const primary = CLASS_DATA[cls].primary;
    const atkStat = CLASS_DATA[cls].atkStat;
    const stats: Stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

    stats[primary] = rolls[0];
    if (atkStat !== primary) {
      stats['con'] = rolls[1];
      stats[atkStat] = rolls[2];
      const remainingKeys = (['str', 'dex', 'con', 'int', 'wis', 'cha'] as StatKey[]).filter(
        (k) => k !== primary && k !== 'con' && k !== atkStat
      );
      remainingKeys.forEach((k, idx) => (stats[k] = rolls[3 + idx]));
    } else {
      stats['con'] = rolls[1];
      const remainingKeys = (['str', 'dex', 'con', 'int', 'wis', 'cha'] as StatKey[]).filter(
        (k) => k !== primary && k !== 'con'
      );
      remainingKeys.forEach((k, idx) => (stats[k] = rolls[2 + idx]));
    }
    return stats;
  }

  public async runBatch(cls: ClassKey, N: number): Promise<SimulationResult> {
    this.setSimulationMode(true);
    const deathsByDepth: Record<number, number> = {};
    const deathsByBoss: Record<string, number> = {};
    const bossReach: Record<string, { reach: number; survive: number; levels: number[] }> = {};
    const BOSS_IDS = [
      'boss1', 'boss2', 'boss3', 'chimera', 'archdemon',
      'lich', 'hydra', 'dragon_red', 'kraken', 'tarrasque',
    ];
    BOSS_IDS.forEach((id) => (bossReach[id] = { reach: 0, survive: 0, levels: [] }));

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
      avgDeathDepth: deathCount ? totalDeathDepth / deathCount : null,
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
        avgFinalDR: Number((totalDRSum / N).toFixed(1)),
      },
    };
  }

  private async simulateSingleRun(cls: ClassKey) {
    const s = this.stateService.freshState('it');
    const stats = this.generateStrongStats(cls);

    // Registra i punteggi generati dal simulatore nello stato della bozza privata
    this.characterService.resetDraft();
    (Object.keys(stats) as StatKey[]).forEach((k) => {
      this.characterService.recordDraftStat(k, stats[k]);
    });

    // Costruisce il personaggio per il batch attraverso il canale protetto
    s.player = this.characterService.buildPlayerFromDraft('Sim', cls);
    s.screen = 'run';
    (this.stateService as any)._state = s;

    let isDead = false;
    let currentFloor = 0;
    const runDrops = { relics: 0, weapons: 0, armors: 0, gold: 0 };
    const bossEncounters: Record<string, { reached: boolean; survived: boolean; level: number }> = {};
    const BOSS_IDS = [
      'boss1', 'boss2', 'boss3', 'chimera', 'archdemon',
      'lich', 'hydra', 'dragon_red', 'kraken', 'tarrasque',
    ];
    BOSS_IDS.forEach((id) => (bossEncounters[id] = { reached: false, survived: false, level: 0 }));

    for (let floor = 1; floor <= 50; floor++) {
      currentFloor = floor;
      this.encounterService.startFloor();

      for (let layerIdx = 0; layerIdx < 7; layerIdx++) {
        const map = s.currentMap;
        if (!map) break;

        const layerNodeIds = map.layers[layerIdx];
        if (!layerNodeIds || layerNodeIds.length === 0) break;

        const selectedNodeId = this.pickBestNodeForSim(map.nodes, layerNodeIds, s.player!);
        const node = map.nodes[selectedNodeId];

        this.encounterService.selectMapNode(node);

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
            if (!s.player!.usedSpecial) {
              await this.combatService.playerUseSpecial();
            } else if (
              s.player!.hp < s.player!.maxHp * 0.35 &&
              s.player!.inventory.some((i) => i.type === 'potion')
            ) {
              await this.combatService.playerUsePotion();
            } else {
              await this.combatService.playerAttack();
            }
          }

          if (s.player!.hp <= 0) {
            isDead = true;
            return {
              died: true,
              depth: currentFloor,
              bossId: isBoss ? mId : null,
              bossEncounters,
              runDrops,
              finalAC: s.player!.ac,
              finalDR: s.player!.damageReduction || 0,
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
          const choice = s.pendingChoice;
          const opt = choice.options[0];
          await this.encounterService.resolveChoiceOption(opt, () => {
            isDead = true;
          });

          if (isDead) {
            return {
              died: true,
              depth: currentFloor,
              bossId: null,
              bossEncounters,
              runDrops,
              finalAC: s.player!.ac,
              finalDR: s.player!.damageReduction || 0,
            };
          }
        }
      }
    }

    return {
      died: false,
      depth: 50,
      bossId: null,
      bossEncounters,
      runDrops,
      finalAC: s.player!.ac,
      finalDR: s.player!.damageReduction || 0,
    };
  }

  private pickBestNodeForSim(
    nodes: Record<string, MapNode>,
    candidateIds: string[],
    player: any
  ): string {
    const availableCandidates = candidateIds.filter((id) => nodes[id].status === 'available');
    const pool = availableCandidates.length > 0 ? availableCandidates : candidateIds;

    const lowHp = player.hp / player.maxHp < 0.4;
    if (lowHp) {
      const restNode = pool.find((id) => nodes[id].type === 'tavern' || nodes[id].type === 'shrine');
      if (restNode) return restNode;
    }

    const prefNode = pool.find((id) => nodes[id].type === 'treasure' || nodes[id].type === 'merchant');
    if (prefNode) return prefNode;

    return this.dice.pick(pool);
  }

  private async processPendingLevelUps(): Promise<void> {
    const s = this.stateService.state();
    while (s.pendingLevelUps > 0) {
      this.levelUpService.startLevelUp();
      if (s.levelUp?.step === 'stat') {
        this.levelUpService.chooseLevelUpStat('str');
      }
      if (s.levelUp?.step === 'feat' && s.levelUp.availableFeats?.length) {
        this.levelUpService.chooseLevelUpFeat(s.levelUp.availableFeats[0].id);
      }
      await this.levelUpService.rollLevelUpHp();
      this.levelUpService.confirmLevelUp();
    }
  }
}