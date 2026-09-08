import { Injectable } from '@angular/core';
import { ChoiceOption, MapNode, PendingChoice, StatKey } from '../models/game.models';
import { DiceService } from './dice.service';
import { GameStateService } from './game-state.service';
import { MapGeneratorService } from './map-generator.service';
import { MonsterService } from './monster.service';
import { EncounterDataService } from './encounter-data.service';

/**
 * SERVIZIO GESTORE INCONTRI E NAVIGAZIONE MAPPA
 * 
 * Coordina l'avvio del piano, l'interazione con i nodi della mappa DAG
 * e la risoluzione delle scelte (Trappole, Santuari, Mercanti, Taverne).
 */
@Injectable({ providedIn: 'root' })
export class EncounterService {
  constructor(
    private readonly stateService: GameStateService,
    private readonly monsterService: MonsterService,
    private readonly mapGenerator: MapGeneratorService,
    private readonly encounterData: EncounterDataService,
    private readonly dice: DiceService
  ) { }

  /**
   * Genera il nuovo piano con mappa verticale e apre il modal overlay della Mappa.
   */
  public startFloor(): void {
    const s = this.stateService.state();
    s.depth++;

    const completedFloors = Math.max(0, s.depth - 1);
    this.stateService.bestDepth.set(Math.max(this.stateService.bestDepth(), completedFloors));

    s.currentMap = this.mapGenerator.generateMapForFloor(s.depth);
    s.mapViewActive = true;
    s.phase = 'map';

    this.stateService.touch();
    this.stateService.log(
      this.stateService.tf('log.floorHeader', { depth: s.depth }),
      'sys floor'
    );
  }

  /**
   * Seleziona un nodo sulla mappa, sposta il giocatore e chiude il modal overlay per avviare l'incontro.
   */
  public selectMapNode(node: MapNode): void {
    const s = this.stateService.state();
    const map = s.currentMap;
    if (!map || node.status !== 'available') return;

    // Imposta il nodo precedente come visitato
    if (map.currentNodeId && map.nodes[map.currentNodeId]) {
      map.nodes[map.currentNodeId].status = 'visited';
    }

    // Disabilita tutti gli altri nodi attualmente 'available' non scelti
    Object.values(map.nodes).forEach((n) => {
      if (n.status === 'available') {
        n.status = 'locked';
      }
    });

    // Imposta il nodo selezionato come posizione corrente
    node.status = 'current';
    map.currentNodeId = node.id;
    s.mapViewActive = false; // Chiude il modal della mappa e mostra l'arena di combattimento/scelta

    this.stateService.touch();

    switch (node.type) {
      case 'combat':
        this.initCombatEncounter(s.depth, false);
        break;
      case 'boss':
        this.initCombatEncounter(s.depth, true);
        break;
      case 'trap':
        s.phase = 'choice';
        s.pendingChoice = this.makeTrapChoice();
        this.stateService.touch();
        this.stateService.log(this.stateService.t('log.trapIntro'), 'flavor');
        break;
      case 'treasure':
        this.resolveTreasure();
        break;
      case 'shrine':
        s.phase = 'choice';
        s.pendingChoice = this.makeShrineChoice();
        this.stateService.touch();
        this.stateService.log(this.stateService.t('log.shrineIntro'), 'flavor');
        break;
      case 'merchant':
        s.phase = 'choice';
        s.pendingChoice = this.makeMerchantChoice();
        this.stateService.touch();
        this.stateService.log(this.stateService.t('log.merchantIntro'), 'flavor');
        break;
      case 'tavern':
        s.phase = 'choice';
        s.pendingChoice = this.makeTavernChoice();
        this.stateService.touch();
        this.stateService.log(this.stateService.t('log.tavernIntro'), 'flavor');
        break;
    }
  }

  /**
   * Al completamento dell'incontro:
   * Se il nodo completato è il Boss (Layer 7), genera automaticamente il Piano Successivo.
   */
  public completeCurrentNode(): void {
    const s = this.stateService.state();
    const map = s.currentMap;
    if (!map || !map.currentNodeId) return;

    const currNode = map.nodes[map.currentNodeId];
    if (currNode) {
      currNode.status = 'visited';

      // SE IL NODO È IL BOSS DI LAYER 7: AVANZA AUTOMATICAMENTE AL PIANO SUCCESSIVO
      if (currNode.layer === 7 || currNode.type === 'boss') {
        this.startFloor();
        return;
      }

      // Sblocca solo i nodi figli collegati
      currNode.nextNodes.forEach((nextId) => {
        const nextNode = map.nodes[nextId];
        if (nextNode && nextNode.status === 'locked') {
          nextNode.status = 'available';
        }
      });
    }

    s.phase = 'map';
    s.mapViewActive = true;
    this.stateService.touch();
  }

  private initCombatEncounter(floorNumber: number, isBossNode: boolean): void {
    const s = this.stateService.state();
    const m = this.monsterService.makeMonster(floorNumber, isBossNode);
    s.monster = m;
    s.combatFlags = {};
    s.phase = 'combat';
    this.stateService.touch();

    const name = this.monsterService.monsterDisplayName(m);
    this.stateService.log(
      m.isBoss
        ? this.stateService.tf('log.bossAppear', { name })
        : this.stateService.tf('log.monsterAppear', { name })
    );
  }

  private getPotionConfigForDepth(depth: number): { dice: [number, number]; cost: number } {
    let n = 2;
    let d = 6;
    let cost = 8 + Math.floor(depth / 5) * 5;
    if (depth > 10) {
      d = 8;
      n = 2 + Math.floor((depth - 11) / 10);
    }
    return { dice: [n, d], cost };
  }

  public resolveTreasure(): void {
    const s = this.stateService.state();
    const gold = this.dice.rollNdM(2, 6) + s.depth * 2;
    s.player!.gold += gold;
    this.stateService.touch();
    this.stateService.log(this.stateService.tf('log.treasureFound', { gold }), 'flavor');

    if (Math.random() < 0.4) {
      const potionConfig = this.getPotionConfigForDepth(s.depth);
      s.player!.inventory.push({ type: 'potion', heal: potionConfig.dice });
      this.stateService.touch();
      this.stateService.log(
        this.stateService.tf('log.treasurePotion', { potion: this.stateService.t('potionName') }),
        'heal'
      );
    }

    this.completeCurrentNode();
  }

  public makeTrapChoice(): PendingChoice {
    const depth = this.stateService.state().depth;
    return this.encounterData.buildTrapEncounter(depth, (success: boolean) => {
      const s = this.stateService.state();
      if (success) {
        const gold = this.dice.rollNdM(1, 6) + Math.floor(s.depth / 2);
        s.player!.gold += gold;
        this.stateService.touch();
        this.stateService.log(this.stateService.tf('log.trapSuccess', { gold }), 'heal');
      } else {
        const diceN = 1 + Math.floor(s.depth / 12);
        const dmg = this.dice.rollNdM(diceN, 6);
        s.player!.hp = this.dice.clamp(s.player!.hp - dmg, 0, s.player!.maxHp);
        this.stateService.touch();
        this.stateService.log(this.stateService.tf('log.trapFail', { dmg }), 'dmg');
      }
    });
  }

  public makeShrineChoice(): PendingChoice {
    const depth = this.stateService.state().depth;
    return this.encounterData.buildShrineEncounter(depth, (opt: ChoiceOption) => {
      const s = this.stateService.state();
      if (opt.action === 'heal') {
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
    });
  }

  public makeMerchantChoice(): PendingChoice {
    const s = this.stateService.state();
    const potionConfig = this.getPotionConfigForDepth(s.depth);
    const potionLabel = `${this.stateService.tf('choices.buyPotion', { cost: potionConfig.cost })} [${potionConfig.dice[0]}d${potionConfig.dice[1]}]`;
    const upgradeCost = 15 + s.depth * 2;

    return {
      kind: 'merchant',
      dc: null,
      canFail: true,
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
          state.player!.inventory.push({ type: 'potion', heal: potionConfig.dice });
          this.stateService.log(
            this.stateService.tf('log.merchantBuyPotion', { potion: this.stateService.t('potionName') }),
            'heal'
          );
        } else if (opt.action === 'upgrade') {
          state.player!.gold -= opt.cost || 0;
          state.player!.weapon.bonus = (state.player!.weapon.bonus || 0) + 1;
          this.stateService.touch();
          this.stateService.log(
            this.stateService.tf('log.merchantUpgrade', {
              weapon: this.stateService.equipmentName(state.player!.weapon.key, 'weapons')
            }),
            'heal'
          );
        } else {
          this.stateService.log(this.stateService.t('log.merchantSkip'), 'flavor');
        }
        return true;
      }
    };
  }

  public makeTavernChoice(): PendingChoice {
    const s = this.stateService.state();
    const restCost = 18 + Math.floor(s.depth * 1.8);
    return {
      kind: 'tavern',
      dc: null,
      canFail: true,
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

  public async resolveChoiceOption(opt: ChoiceOption, onGameOver: () => void): Promise<void> {
    const s = this.stateService.state();
    const pc = s.pendingChoice;
    if (!pc) return;

    if (pc.canFail) {
      const ok = pc.onChoose!(opt);
      if (ok === false) return;
      s.pendingChoice = null;
      this.completeCurrentNode();
      return;
    }

    if (pc.onChoose) {
      pc.onChoose(opt);
      s.pendingChoice = null;
      this.completeCurrentNode();
      return;
    }

    const statMod = this.dice.mod(s.player!.stats[opt.stat as StatKey]);
    const raw = await this.stateService.animateRollAsync(this.dice.rnd(20), 20, 'check');
    const cur = this.stateService.state();
    const total = raw + statMod;
    const success = total >= pc.dc!;

    this.stateService.log(
      this.stateService.tf('log.checkResult', {
        stat: this.stateService.t('statAbbr.' + opt.stat),
        roll: raw,
        mod: this.dice.fmtMod(statMod),
        total,
        dc: pc.dc,
        result: success ? this.stateService.t('log.checkSuccess') : this.stateService.t('log.checkFail')
      })
    );

    pc.onResolve!(success);
    cur.pendingChoice = null;

    if (cur.player!.hp <= 0) {
      onGameOver();
    } else {
      this.completeCurrentNode();
    }
  }
}