import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  ViewChild,
  computed,
  effect,
  signal
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';
import { CLASS_DATA } from '../../data/game.data';
import { StatKey } from '../../models/game.models';
import { DiceWidgetComponent } from '../dice-widget/dice-widget.component';
import { LevelUpModalComponent } from '../level-up-modal/level-up-modal.component';
import { BossRewardModalComponent } from '../boss-reward-modal/boss-reward-modal.component';
import { xpToNext } from '../../data/monster.data';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

interface DieFace {
  value: number | null;
  sides: number;
}

const ITEM_ICONS: Record<string, string> = {
  potion: '🧪'
};

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [DiceWidgetComponent, LevelUpModalComponent, BossRewardModalComponent],
  templateUrl: './game-screen.component.html',
  styleUrl: './game-screen.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameScreenComponent implements AfterViewChecked {
  statKeys = STAT_KEYS;
  classData = CLASS_DATA;

  /**
   * Valore e lati restano quelli dell'ultimo tiro di quell'attore: se cambiassero
   * quando tira l'avversario, il dado fermo si ricostruirebbe e rifarebbe la frenata.
   */
  private readonly playerDie = signal<DieFace>({ value: null, sides: 20 });
  private readonly monsterDie = signal<DieFace>({ value: null, sides: 20 });

  readonly playerDieValue = computed(() => this.playerDie().value);
  readonly monsterDieValue = computed(() => this.monsterDie().value);
  readonly playerDieSides = computed(() => this.playerDie().sides);
  readonly monsterDieSides = computed(() => this.monsterDie().sides);

  readonly playerDieActive: Signal<boolean>;
  readonly monsterDieActive: Signal<boolean>;

  private lastPhase: string | null = null;
  private lastLogLength = 0;

  @ViewChild('logbox') logboxRef?: ElementRef<HTMLDivElement>;
  @ViewChild('scrollAnchor') scrollAnchorRef?: ElementRef<HTMLDivElement>;

  constructor(public game: GameService, public i18n: I18nService, public dice: DiceService) {
    const roll = computed(() => this.game.state().rollingDie);
    const isEnemyRoll = computed(() => {
      const rd = roll();
      return !!(rd && (rd.tag === 'monsterAttack' || rd.tag === 'monsterDamage'));
    });

    this.playerDieActive = computed(() => !!roll()?.active && !isEnemyRoll());
    this.monsterDieActive = computed(() => !!roll()?.active && isEnemyRoll());

    effect(() => {
      const rd = roll();
      if (!rd || rd.value === null) return;

      const face: DieFace = { value: rd.value, sides: rd.sides || 20 };
      if (isEnemyRoll()) {
        this.monsterDie.set(face);
      } else {
        this.playerDie.set(face);
      }
    });
  }

  s() { return this.game.state(); }
  p() { return this.game.state().player!; }
  pct(current: number, max: number): number { return max > 0 ? Math.round((current / max) * 100) : 0; }
  hpPct(): number { return this.pct(this.p().hp, this.p().maxHp); }
  xpNeeded(): number { return xpToNext(this.p().level); }
  xpPct(): number { return this.pct(this.p().xp, this.xpNeeded()); }
  hasPotion(): boolean { return this.p().inventory.some(i => i.type === 'potion'); }
  itemIcon(type: string): string { return ITEM_ICONS[type] ?? '🎒'; }
  acting(): boolean { return !!this.s().combatFlags.acting; }
  canSpecial(): boolean {
    const cls = this.p().cls;
    return !this.p().usedSpecial && !!this.i18n.t('classes.' + cls + '.active');
  }

  ngAfterViewChecked(): void {
    const el = this.logboxRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;

    const anchor = this.scrollAnchorRef?.nativeElement;
    if (!anchor) return;

    const curPhase = this.s().phase;
    const curLogLen = this.s().log.length;

    // Su mobile la pagina scorre solo quando cambia davvero qualcosa, per non
    // interrompere lo scroll manuale dell'utente.
    if (window.innerWidth <= 720) {
      if (this.lastPhase !== curPhase || this.lastLogLength !== curLogLen) {
        this.lastPhase = curPhase;
        this.lastLogLength = curLogLen;
        anchor.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }
    } else {
      anchor.scrollIntoView({ block: 'end', behavior: 'auto' });
    }
  }
}