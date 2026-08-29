import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';
import { CLASS_DATA } from '../../data/game.data';
import { ChoiceOption, ClassKey, StatKey } from '../../models/game.models';
import { DiceWidgetComponent } from '../dice-widget/dice-widget.component';
import { LevelUpModalComponent } from '../level-up-modal/level-up-modal.component';
import { BossRewardModalComponent } from '../boss-reward-modal/boss-reward-modal.component';
import { IconComponent, IconName } from '../../shared/icon/icon.component';
import { CLASS_ICONS, STAT_ICONS } from '../../shared/icon/icon-maps';
import { xpToNext } from '../../data/monster.data';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Purely presentational: maps a choice option (trap/shrine/merchant/tavern) to an icon. */
function iconForChoice(o: ChoiceOption): IconName {
  if (o.stat) return STAT_ICONS[o.stat];
  switch (o.action) {
    case 'heal': return 'heart';
    case 'buff': return 'star';
    case 'potion': return 'flask';
    case 'upgrade': return 'hammer';
    case 'rest': return 'cup';
    case 'drink': return 'flask';
    case 'skip': return 'x';
    default: return 'dot';
  }
}

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [DiceWidgetComponent, LevelUpModalComponent, BossRewardModalComponent, IconComponent],
  templateUrl: './game-screen.component.html',
  styleUrl: './game-screen.component.css'
})
export class GameScreenComponent implements AfterViewChecked {
  statKeys = STAT_KEYS;
  classData = CLASS_DATA;

  private lastPlayerValue: number | null = null;
  private lastMonsterValue: number | null = null;
  private lastPhase: string | null = null;
  private lastLogLength = 0;

  @ViewChild('logbox') logboxRef?: ElementRef<HTMLDivElement>;

  constructor(public game: GameService, public i18n: I18nService, public dice: DiceService) {}

  s() { return this.game.state(); }
  p() { return this.game.state().player!; }

  hpPct(): number { return Math.round((this.p().hp / this.p().maxHp) * 100); }
  xpNeeded(): number { return xpToNext(this.p().level); }
  xpPct(): number { return Math.round((this.p().xp / this.xpNeeded()) * 100); }
  hasPotion(): boolean { return this.p().inventory.some(i => i.type === 'potion'); }
  acting(): boolean { return !!this.s().combatFlags.acting; }
  canSpecial(): boolean {
    const cls = this.p().cls;
    return !this.p().usedSpecial && !!this.i18n.t('classes.' + cls + '.active');
  }

  classIcon(cls: ClassKey): IconName { return CLASS_ICONS[cls]; }
  statIcon(k: StatKey): IconName { return STAT_ICONS[k]; }
  choiceIcon(o: ChoiceOption): IconName { return iconForChoice(o); }

  private isEnemyRoll(): boolean {
    const rd = this.s().rollingDie;
    return !!(rd && rd.tag === 'monsterAttack');
  }

  playerDieActive(): boolean {
    const rd = this.s().rollingDie;
    return !!(rd && rd.active && !this.isEnemyRoll());
  }

  playerDieValue(): number | null {
    const rd = this.s().rollingDie;
    if (rd && !this.isEnemyRoll() && rd.value !== null) {
      this.lastPlayerValue = rd.value;
    }
    return this.lastPlayerValue;
  }

  monsterDieActive(): boolean {
    const rd = this.s().rollingDie;
    return !!(rd && rd.active && this.isEnemyRoll());
  }

  monsterDieValue(): number | null {
    const rd = this.s().rollingDie;
    if (rd && this.isEnemyRoll() && rd.value !== null) {
      this.lastMonsterValue = rd.value;
    }
    return this.lastMonsterValue;
  }

  ngAfterViewChecked(): void {
    const el = this.logboxRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;

    const curPhase = this.s().phase;
    const curLogLen = this.s().log.length;

    // Su mobile porta automaticamente il focus sui pulsanti ogni volta che il turno cambia o viene aggiunto del testo
    if (window.innerWidth <= 720) {
      if (this.lastPhase !== curPhase || this.lastLogLength !== curLogLen) {
        this.lastPhase = curPhase;
        this.lastLogLength = curLogLen;
        const anchor = document.getElementById('scroll-anchor');
        anchor?.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }
    } else {
      const anchor = document.getElementById('scroll-anchor');
      if (anchor) {
        anchor.scrollIntoView({ block: 'end', behavior: 'auto' });
      }
    }

    document.body.style.paddingTop = '';
    document.body.classList.remove('has-topbar');
  }

  // Aggiungi questi due metodi nella classe GameScreenComponent:
playerDieSides(): number {
  const rd = this.s().rollingDie;
  if (rd && !this.isEnemyRoll() && rd.sides) {
    return rd.sides;
  }
  return 20;
}

monsterDieSides(): number {
  const rd = this.s().rollingDie;
  if (rd && this.isEnemyRoll() && rd.sides) {
    return rd.sides;
  }
  return 20;
}
}
