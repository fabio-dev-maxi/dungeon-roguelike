import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';
import { CLASS_DATA, xpToNext } from '../../data/game.data';
import { ChoiceOption, StatKey } from '../../models/game.models';
import { DiceWidgetComponent } from '../dice-widget/dice-widget.component';
import { LevelUpModalComponent } from '../level-up-modal/level-up-modal.component';
import { BossRewardModalComponent } from '../boss-reward-modal/boss-reward-modal.component';

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

    const anchor = document.getElementById('scroll-anchor');
    if (anchor && window.innerWidth > 720) {
      anchor.scrollIntoView({ block: 'end', behavior: 'auto' });
    }

    // RIPRISTINATO IL FLOW NATURALE DEL BODY (Elimina lo spazio vuoto gigante in alto su mobile)
    document.body.style.paddingTop = '';
    document.body.classList.remove('has-topbar');
  }
}