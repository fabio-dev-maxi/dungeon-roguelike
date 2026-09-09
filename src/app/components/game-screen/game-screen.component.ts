import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  ViewChild,
  computed,
  effect,
  signal,
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice/dice.service';
import { CLASS_DATA } from '../../data/game.data';
import { StatKey, ChoiceOption, ClassKey } from '../../models/game.models';
import { DiceWidgetComponent } from '../dice-widget/dice-widget.component';
import { LevelUpModalComponent } from '../level-up-modal/level-up-modal.component';
import { BossRewardModalComponent } from '../boss-reward-modal/boss-reward-modal.component';
import { xpToNext } from '../../data/monster.data';
import { IconComponent, IconName } from '../../shared/icon/icon.component';
import { CLASS_ICONS, STAT_ICONS } from '../../shared/icon/icon-maps';
import { DungeonMapComponent } from '../dungeon-map/dungeon-map.component';
import { CharacterSheetModalComponent } from '../character-sheet-modal/character-sheet-modal.component';
import { PotionGroup, PotionService } from '../../services/encounter/potion.service';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

interface DieFace {
  value: number | null;
  values?: number[] | null;
  sides: number;
}

function iconForChoice(o: ChoiceOption): IconName {
  if (o.stat) return STAT_ICONS[o.stat];

  switch (o.action) {
    case 'heal':
      return 'heart';
    case 'buff':
      return 'star';
    case 'potion':
      return 'flask';
    case 'upgrade':
      return 'hammer';
    case 'rest':
      return 'cup';
    case 'drink':
      return 'flask';
    case 'skip':
      return 'x';
    default:
      return 'dot';
  }
}

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [
    DiceWidgetComponent,
    LevelUpModalComponent,
    BossRewardModalComponent,
    DungeonMapComponent,
    IconComponent,
    CharacterSheetModalComponent,
  ],
  templateUrl: './game-screen.component.html',
  styleUrl: './game-screen.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameScreenComponent implements AfterViewChecked {
  statKeys = STAT_KEYS;
  classData = CLASS_DATA;

  private readonly playerDie = signal<DieFace>({
    value: null,
    values: null,
    sides: 20,
  });

  private readonly monsterDie = signal<DieFace>({
    value: null,
    values: null,
    sides: 20,
  });

  // Signals letti dal template HTML
  readonly playerDieValue = computed(() => this.playerDie().value);
  readonly playerDieSides = computed(() => this.playerDie().sides);

  readonly monsterDieValue = computed(() => this.monsterDie().value);
  readonly monsterDieSides = computed(() => this.monsterDie().sides);

  // Nella classe GameScreenComponent:
  readonly playerDieValues = computed<number[] | null>(() => this.playerDie().values ?? null);
  readonly monsterDieValues = computed<number[] | null>(() => this.monsterDie().values ?? null);

  readonly playerDieActive: Signal<boolean>;
  readonly monsterDieActive: Signal<boolean>;

  // Aggiungi questo segnale per controllare la visibilità della scheda
  public isCharacterSheetOpen = signal<boolean>(false);

  // --- GESTIONE POZIONI RAGGRUPPATE ---
  readonly showPotionPopover = signal(false);
  readonly showPotionModal = signal(false);
  readonly selectedPotionKey = signal<string | null>(null); // Traccia la pozione selezionata per chiave (es. "2d6")

  showRelicPopover = signal(false);

  private lastPhase: string | null = null;
  private lastLogLength = 0;

  @ViewChild('logbox') logboxRef?: ElementRef<HTMLDivElement>;
  @ViewChild('scrollAnchor') scrollAnchorRef?: ElementRef<HTMLDivElement>;

  constructor(
    public game: GameService,
    public i18n: I18nService,
    public dice: DiceService,
    public potionService: PotionService,
  ) {
    const roll = computed(() => this.game.state().rollingDie);

    const isEnemyRoll = computed(() => {
      const rd = roll();

      return !!(
        rd &&
        (rd.tag === 'monsterAttack' ||
          rd.tag === 'monsterDamage' ||
          rd.tag === 'monsterCritConfirm')
      );
    });

    this.playerDieActive = computed(() => {
      const rd = roll();

      return !!rd?.active && !isEnemyRoll() && rd?.tag !== 'levelhp';
    });

    this.monsterDieActive = computed(() => !!roll()?.active && isEnemyRoll());

    effect(() => {
      const rd = roll();
      if (!rd || rd.value === null) return;
      const face: DieFace = {
        value: rd.value,
        values: rd.values,
        sides: rd.sides || 20,
      };
      if (isEnemyRoll()) {
        this.monsterDie.set(face);
      } else if (rd.tag !== 'levelhp') {
        this.playerDie.set(face);
      }
    });
  }

  readonly potionsList = computed(() => {
    const player = this.game.state().player;
    if (!player) return [];
    return player.inventory
      .map((item, index) => ({ item, index }))
      .filter((x) => x.item.type === 'potion');
  });

  togglePotionPopover(): void {
    if (this.potionCount() > 0) {
      this.showPotionPopover.update((v) => !v);
    }
  }

  closePotionPopover(): void {
    this.showPotionPopover.set(false);
  }

  readonly groupedPotions = computed<PotionGroup[]>(() => {
    return this.potionService.groupPotions(this.p().inventory);
  });

  usePotionAction(): void {
    const groups = this.potionService.groupPotions(this.p().inventory);
    if (groups.length === 0) return;

    if (this.potionCount() === 1) {
      this.showPotionPopover.set(false);
      this.game.playerUsePotion(groups[0].firstIndex);
    } else {
      this.showPotionPopover.set(false);
      this.selectedPotionKey.set(groups[0].key);
      this.showPotionModal.set(true);
    }
  }

  selectPotionKey(key: string): void {
    this.selectedPotionKey.set(key);
  }

  confirmDrinkPotion(): void {
    const key = this.selectedPotionKey();
    if (!key) return;

    const group = this.potionService.groupPotions(this.p().inventory).find((g) => g.key === key);
    if (group) {
      this.showPotionModal.set(false);
      this.game.playerUsePotion(group.firstIndex);
    }
  }

  s() {
    return this.game.state();
  }

  p() {
    return this.game.state().player!;
  }

  pct(current: number, max: number): number {
    return max > 0 ? Math.round((current / max) * 100) : 0;
  }

  hpPct(): number {
    return this.pct(this.p().hp, this.p().maxHp);
  }

  xpNeeded(): number {
    return xpToNext(this.p().level);
  }

  xpPct(): number {
    return this.pct(this.p().xp, this.xpNeeded());
  }

  hasPotion(): boolean {
    return this.p().inventory.some((i) => i.type === 'potion');
  }

  potionCount(): number {
    return this.p()
      ? this.p().inventory.filter((i) => i.type === 'potion').length
      : 0;
  }

  acting(): boolean {
    return !!this.s().combatFlags.acting;
  }

  canSpecial(): boolean {
    const cls = this.p().cls;

    return !this.p().usedSpecial && !!this.i18n.t('classes.' + cls + '.active');
  }

  isLowHp = computed(() => {
    const player = this.game.state().player;

    return player ? player.hp / player.maxHp <= 0.25 : false;
  });

  critThreatDisplay = computed(() => {
    const player = this.game.state().player;

    if (!player) return '20 / x2';

    const t = player.critThreshold || 20;
    const m = player.critMultiplier || 2;

    return (t < 20 ? `${t}-20` : '20') + ` / x${m}`;
  });

  atkBonusDisplay = computed(() => {
    const player = this.game.state().player;

    if (!player) return '+0';

    const c = this.classData[player.cls];

    const modVal =
      this.dice.mod(player.stats[c.atkStat]) +
      (player.weapon.bonus || 0) +
      (player.tempAtkBonus || 0) +
      (player.flatAtkBonus || 0);

    return this.dice.fmtMod(modVal);
  });

  isRollingCrit = computed(() => this.game.state().rollingDie?.cls === 'crit');

  isCriticalConfirmed = computed(() => {
    const roll = this.game.state().rollingDie;
    return (
      roll?.cls === 'crit' &&
      (roll.tag === 'critConfirm' || roll.tag === 'monsterCritConfirm')
    );
  });

  isRollingFail = computed(() => this.game.state().rollingDie?.cls === 'fail');

  toggleRelicPopover(): void {
    if (this.p().relics.length > 0) {
      this.showRelicPopover.update((v) => !v);
    }
  }

  closeRelicPopover(): void {
    this.showRelicPopover.set(false);
  }

  classIcon(cls: ClassKey): IconName {
    return CLASS_ICONS[cls];
  }

  statIcon(k: StatKey): IconName {
    return STAT_ICONS[k];
  }

  choiceIcon(o: ChoiceOption): IconName {
    return iconForChoice(o);
  }

  encounterTitle(): string {
    const kind = this.s().pendingChoice?.kind;
    return this.i18n.t(`ui.${kind}EncounterTitle`);
  }

  encounterIcon(): IconName {
    switch (this.s().pendingChoice?.kind) {
      case 'trap':
        return 'skull';
      case 'shrine':
        return 'sun';
      case 'merchant':
        return 'coin';
      case 'tavern':
        return 'cup';
      default:
        return 'scroll';
    }
  }

  public confirmTreasure(): void {
    this.game.confirmTreasure();
  }

  ngAfterViewChecked(): void {
    const anchor = this.scrollAnchorRef?.nativeElement;
    if (!anchor) return;

    const state = this.s();
    const curPhase = state.phase;
    const curLogLen = state.log.length;

    const shouldScroll =
      this.lastPhase !== curPhase || this.lastLogLength !== curLogLen;

    if (!shouldScroll) return;

    this.lastPhase = curPhase;
    this.lastLogLength = curLogLen;

    // Evita una scrittura layout ad ogni ciclo di change detection.
    // Uno scroll diretto è più leggero di una coda di smooth-scroll ripetuta.
    anchor.scrollIntoView({
      block: 'end',
      behavior: 'auto',
    });
  }

  /**
   * Apre la Mappa del Piano in sola lettura durante uno scontro o un'interazione.
   */
  openMapReadOnly(): void {
    this.game.openMapReadOnly();
  }

  // Metodi per aprire e chiudere la scheda
  public openCharacterSheet(): void {
    this.isCharacterSheetOpen.set(true);
  }

  public closeSheet(): void {
    this.isCharacterSheetOpen.set(false);
  }

  /**
   * Conferma il completamento dell'anfratto e apre la mappa per scegliere il nodo successivo.
   */
  public confirmContinueNode(): void {
    this.game.completeCurrentNode();
  }
}
