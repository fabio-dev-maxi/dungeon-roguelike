import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-game-over',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="panel center">
      <div class="gameover-icon"><app-icon name="skull" [size]="46"></app-icon></div>
      <h2>{{ i18n.t('ui.gameOverTitle') }}</h2>
      <div class="score-box">
        <span class="n">{{ game.state().depth }}</span>
        <span class="l">{{ i18n.t('ui.floorsDescended') }}</span>
      </div>
      <p class="epitaph">"{{ epitaph }}"</p>

      <div class="gameover-stats">
        <span class="stat"><app-icon name="coin" [size]="14"></app-icon>{{ i18n.tf('ui.goldCollected', { gold: game.state().player!.gold }) }}</span>
        <span class="stat"><app-icon name="crown" [size]="14"></app-icon>{{ i18n.tf('ui.sessionRecord', { depth: game.bestDepth() }) }}</span>
      </div>

      <div style="margin-top:24px;">
        <button class="btn primary" (click)="game.restartGame()">
          <app-icon name="stairs" [size]="16"></app-icon>{{ i18n.t('ui.restartButton') }}
        </button>
      </div>
    </div>
  `
})
export class GameOverComponent {
  epitaph: string;

  constructor(public game: GameService, public i18n: I18nService, dice: DiceService) {
    this.epitaph = dice.pick(this.i18n.t('epitaphs'));
  }
}
