import { Injectable, Signal } from '@angular/core';
import { LangCode } from '../data/i18n.data';
import {
  Armor,
  ChoiceOption,
  ClassKey,
  GameState,
  MapNode,
  Monster,
  Player,
  StatKey,
  Weapon,
} from '../models/game.models';
import { CharacterService } from './character.service';
import { CombatService } from './encounter/combat.service';
import { EncounterService } from './encounter/encounter.service';
import { GameStateService } from './game-state.service';
import { LevelUpService } from './encounter/level-up.service';
import { MonsterService } from './encounter/monster.service';

/**
 * Facade centralizzato che coordina i sotto-servizi dell'applicazione
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

  get bestDepth(): Signal<number> {
    return this.stateService.bestDepth;
  }

  state(): GameState {
    return this.stateService.state();
  }

  freshState(prevLang: LangCode): GameState {
    return this.stateService.freshState(prevLang);
  }

  setLang(lang: LangCode): void {
    this.stateService.setLang(lang);
  }

  log(html: string, cls = ''): void {
    this.stateService.log(html, cls);
  }

  // --- CREAZIONE PERSONAGGIO (ZERO-TRUST ARCHITECTURE) ---
  rollStatsForCreate(name: string): void {
    this.characterService.rollStatsForCreate(name);
  }

  startCreateScreen(): void {
    this.characterService.startCreateScreen();
  }

  resetDraft(): void {
    this.characterService.resetDraft();
  }

  recordDraftStat(key: StatKey, value: number): void {
    this.characterService.recordDraftStat(key, value);
  }

  /**
   * Costruisce il personaggio attingendo ESCLUSIVAMENTE dal registro privato del CharacterService.
   * Non accetta più oggetti Stats dall'esterno.
   */
  buildPlayerFromDraft(name: string, classKey: ClassKey): void {
    const s = this.stateService.state();
    s.player = this.characterService.buildPlayerFromDraft(name, classKey);
    s.depth = 0;
    s.log = [];
    s.screen = 'run';
    s.phase = 'explore';
    this.stateService.touch();
    this.descendFloor();
  }

  weaponName(w: Weapon): string {
    return this.characterService.weaponName(w);
  }

  armorName(a: Armor): string {
    return this.characterService.armorName(a);
  }

  // --- MONSTER ---
  monsterDisplayName(m: Monster | null): string {
    return this.monsterService.monsterDisplayName(m);
  }

  /** Cambia il bersaglio dei prossimi attacchi del giocatore fra i mostri in campo. */
  selectTargetMonster(index: number): void {
    this.combatService.selectTargetMonster(index);
  }

  // --- ENCOUNTERS & EXPLORATION ---
  startFloor(): void {
    this.encounterService.startFloor();
  }

  descendFloor(): void {
    const s = this.state();
    s.rollingDie = { active: false, value: null, cls: '' };
    this.stateService.touch();
    this.startFloor();
  }

  resolveChoiceOption(opt: ChoiceOption): Promise<void> {
    return this.encounterService.resolveChoiceOption(opt, () =>
      this.combatService.gameOver()
    );
  }

  // --- COMBAT ---
  playerAttack(): Promise<void> {
    return this.combatService.playerAttack();
  }

  playerDefend(): Promise<void> {
    return this.combatService.playerDefend();
  }

  playerUseSpecial(): Promise<void> {
    return this.combatService.playerUseSpecial();
  }

  playerUsePotion(inventoryIndex?: number): Promise<void> {
    return this.combatService.playerUsePotion(inventoryIndex);
  }

  playerFlee(): Promise<void> {
    return this.combatService.playerFlee();
  }

  confirmBossReward(): void {
    this.combatService.confirmBossReward();
  }

  gameOver(): void {
    this.combatService.gameOver();
  }

  // --- LEVEL UP ---
  chooseLevelUpStat(statKey: StatKey): void {
    this.levelUpService.chooseLevelUpStat(statKey);
  }

  chooseLevelUpFeat(featId: string): void {
    this.levelUpService.chooseLevelUpFeat(featId);
  }

  rerollLevelUpHp(): void {
    this.levelUpService.rerollLevelUpHp();
  }

  confirmLevelUp(): void {
    this.levelUpService.confirmLevelUp();
  }

  // --- MISC UI CONTROLS ---
  toggleStats(): void {
    this.stateService.toggleStats();
  }

  toggleInventory(): void {
    this.stateService.toggleInventory();
  }

  restartGame(): void {
    this.stateService.restartGame();
  }

  // --- MAPPA A NODI ---
  selectMapNode(node: MapNode): void {
    this.encounterService.selectMapNode(node);
  }

  completeCurrentNode(): void {
    this.encounterService.completeCurrentNode();
  }

  openMapReadOnly(): void {
    const s = this.stateService.state();
    if (s.currentMap) {
      s.mapViewActive = true;
      this.stateService.touch();
    }
  }

  closeMapReadOnly(): void {
    const s = this.stateService.state();
    s.mapViewActive = false;
    this.stateService.touch();
  }

  confirmTreasure(): void {
    this.encounterService.confirmTreasure();
  }

  togglePowerAttack(): void {
    this.stateService.togglePowerAttack();
  }

  toggleCombatExpertise(): void {
    this.stateService.toggleCombatExpertise();
  }
}