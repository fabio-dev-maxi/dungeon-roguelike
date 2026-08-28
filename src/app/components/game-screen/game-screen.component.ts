import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [DiceWidgetComponent, LevelUpModalComponent, BossRewardModalComponent],
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
  @ViewChild('scrollAnchor') scrollAnchorRef?: ElementRef<HTMLDivElement>;

  constructor(public game: GameService, public i18n: I18nService, public dice: DiceService) {}

  s() { return this.game.state(); }
  p() { return this.game.state().player!; }
  pct(current: number, max: number): number { return max > 0 ? Math.round((current / max) * 100) : 0; }
  hpPct(): number { return this.pct(this.p().hp, this.p().maxHp); }
  xpNeeded(): number { return xpToNext(this.p().level); }
  xpPct(): number { return this.pct(this.p().xp, this.xpNeeded()); }
  hasPotion(): boolean { return this.p().inventory.some(i => i.type === 'potion'); }
  acting(): boolean { return !!this.s().combatFlags.acting; }
  canSpecial(): boolean {
    const cls = this.p().cls;
    return !this.p().usedSpecial && !!this.i18n.t('classes.' + cls + '.active');
  }

  private isEnemyRoll(): boolean {
    const rd = this.s().rollingDie;
    return !!(rd && (rd.tag === 'monsterAttack' || rd.tag === 'monsterDamage'));
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