import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';

@Component({
  selector: 'app-game-over',
  standalone: true,
  template: `
    <div class="panel center">
      <h2>{{ i18n.t('ui.gameOverTitle') }}</h2>
      <div class="score-box">
        <span class="n">{{ game.state().depth }}</span>
        <span class="l">{{ i18n.t('ui.floorsDescended') }}</span>
      </div>
      <p class="epitaph">"{{ epitaph }}"</p>
      <p class="small">
        {{ i18n.tf('ui.goldCollected', { gold: game.state().player!.gold }) }}
        &middot;
        {{ i18n.tf('ui.sessionRecord', { depth: game.bestDepth() }) }}
      </p>
      <div style="margin-top:24px;">
        <button class="btn" (click)="game.restartGame()">{{ i18n.t('ui.restartButton') }}</button>
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
