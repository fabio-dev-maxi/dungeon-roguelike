import { Injectable, Signal } from '@angular/core';
import { LangCode } from '../data/i18n.data';
import { Armor, ChoiceOption, ClassKey, GameState, Monster, Player, StatKey, Stats, Weapon } from '../models/game.models';
import { CharacterService } from './character.service';
import { CombatService } from './combat.service';
import { EncounterService } from './encounter.service';
import { GameStateService } from './game-state.service';
import { LevelUpService } from './level-up.service';
import { MonsterService } from './monster.service';

/**
 * Facade centralizzato che coordina i sotto-servizi
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(
    private stateService: GameStateService,
    private characterService: CharacterService,
    private monsterService: MonsterService,
    private encounterService: EncounterService,
    private combatService: CombatService,
    private levelUpService: LevelUpService
  ) { }

  get bestDepth(): Signal<number> { return this.stateService.bestDepth; }

  state(): GameState { return this.stateService.state(); }
  freshState(prevLang: LangCode): GameState { return this.stateService.freshState(prevLang); }
  setLang(lang: LangCode): void { this.stateService.setLang(lang); }
  log(html: string, cls = ''): void { this.stateService.log(html, cls); }

  // Character
  rollStatsForCreate(name: string): void { this.characterService.rollStatsForCreate(name); }
  buildPlayer(name: string, classKey: ClassKey, stats: Stats): Player { return this.characterService.buildPlayer(name, classKey, stats); }
  startCreateScreen(): void { this.characterService.startCreateScreen(); }
  chooseClass(classKey: ClassKey, name: string): void {
    this.characterService.chooseClass(classKey, name, () => this.descendFloor());
  }
  weaponName(w: Weapon): string { return this.characterService.weaponName(w); }
  armorName(a: Armor): string { return this.characterService.armorName(a); }

  // Monster
  monsterDisplayName(m: Monster | null): string { return this.monsterService.monsterDisplayName(m); }

  // Encounters & Exploration
  startFloor(): void { this.encounterService.startFloor(); }
  descendFloor(): void {
    const s = this.state();
    s.rollingDie = { active: false, value: null, cls: '' };
    this.stateService.touch();
    this.startFloor();
  }
  resolveChoiceOption(opt: ChoiceOption): Promise<void> {
    return this.encounterService.resolveChoiceOption(opt, () => this.combatService.gameOver());
  }

  // Combat
  playerAttack(): Promise<void> { return this.combatService.playerAttack(); }
  playerDefend(): Promise<void> { return this.combatService.playerDefend(); }
  playerUseSpecial(): Promise<void> { return this.combatService.playerUseSpecial(); }
  playerUsePotion(): Promise<void> { return this.combatService.playerUsePotion(); }
  playerFlee(): Promise<void> { return this.combatService.playerFlee(); }
  confirmBossReward(): void { this.combatService.confirmBossReward(); }
  gameOver(): void { this.combatService.gameOver(); }

  // Level Up
  chooseLevelUpStat(statKey: StatKey): void { this.levelUpService.chooseLevelUpStat(statKey); }
  chooseLevelUpFeat(featId: string): void { this.levelUpService.chooseLevelUpFeat(featId); }
  rerollLevelUpHp(): void { this.levelUpService.rerollLevelUpHp(); }
  confirmLevelUp(): void { this.levelUpService.confirmLevelUp(); }

  // Misc UI Controls
  toggleStats(): void { this.stateService.toggleStats(); }
  toggleInventory(): void { this.stateService.toggleInventory(); }
  restartGame(): void { this.stateService.restartGame(); }
}