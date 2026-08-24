import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { StatKey } from '../../models/game.models';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

@Component({
  selector: 'app-level-up-modal',
  standalone: true,
  template: `
    <div class="modal-backdrop">
      <div class="panel modal-box">
        <div class="depth-badge">{{ i18n.t('ui.levelUpTitle') }}</div>
        <p class="small" style="text-align:center;">{{ i18n.t('ui.chooseStatPrompt') }}</p>
        <div class="actions" style="justify-content:center; margin-top:14px;">
          @for (k of statKeys; track k) {
            <button class="btn" (click)="game.chooseLevelUpStat(k)">
              {{ i18n.t('stats.' + k) }} ({{ player()!.stats[k] }} &rarr; {{ player()!.stats[k] + 1 }})
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class LevelUpModalComponent {
  statKeys = STAT_KEYS;

  constructor(public game: GameService, public i18n: I18nService) {}

  player() {
    return this.game.state().player;
  }
}
