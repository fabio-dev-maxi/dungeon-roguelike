import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { StatKey } from '../../models/game.models';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

@Component({
  selector: 'app-level-up-modal',
  standalone: true,
  templateUrl: './level-up-modal.component.html',
  styleUrl: './level-up-modal.component.css'
})
export class LevelUpModalComponent {
  statKeys = STAT_KEYS;

  constructor(public game: GameService, public i18n: I18nService) {}

  s() { return this.game.state(); }
  p() { return this.game.state().player!; }
  levelUp() { return this.game.state().levelUp; }

  selectStat(k: StatKey): void {
    this.game.chooseLevelUpStat(k);
  }

  selectFeat(featId: string): void {
    this.game.chooseLevelUpFeat(featId);
  }
}