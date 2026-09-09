import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice/dice.service';
import { CLASS_DATA } from '../../data/game.data';
import { StatKey } from '../../models/game.models';
import { IconComponent, IconName } from '../../shared/icon/icon.component';
import { STAT_ICONS } from '../../shared/icon/icon-maps';
import { DiceWidgetComponent } from '../dice-widget/dice-widget.component';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

@Component({
  selector: 'app-level-up-modal',
  standalone: true,
  imports: [IconComponent, DiceWidgetComponent],
  templateUrl: './level-up-modal.component.html',
  styleUrl: './level-up-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LevelUpModalComponent {
  readonly Number = Number;
  statKeys = STAT_KEYS;
  classData = CLASS_DATA;

  // Sincronizzazione diretta con il valore reale del dado (faccia pura) durante il tiro
  readonly hpDieValue = computed(() => {
    const rd = this.game.state().rollingDie;
    if (rd && rd.tag === 'levelhp' && rd.value !== null) {
      return rd.value;
    }
    return this.game.state().levelUp?.hpRollBase ?? null;
  });

  readonly hpDieSides = computed(() => this.classData[this.p().cls].hitDie);

  readonly hpDieActive = computed(() => {
    const rd = this.game.state().rollingDie;
    return !!rd?.active && rd.tag === 'levelhp';
  });

  constructor(
    public game: GameService,
    public i18n: I18nService,
    public dice: DiceService
  ) { }

  s() { return this.game.state(); }
  p() { return this.game.state().player!; }
  levelUp() { return this.game.state().levelUp; }
  statIcon(k: StatKey): IconName { return STAT_ICONS[k]; }

  selectStat(k: StatKey): void {
    this.game.chooseLevelUpStat(k);
  }

  selectFeat(featId: string): void {
    this.game.chooseLevelUpFeat(featId);
  }

  confirmHp(): void {
    this.game.confirmLevelUp();
  }
}