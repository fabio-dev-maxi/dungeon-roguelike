import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-title-screen',
  standalone: true,
  template: `
    <div class="title-wrap">
      <h1>{{ i18n.t('ui.title') }}</h1>
      <div class="title-sub">{{ i18n.t('ui.subtitle') }}</div>
      <p class="lore">{{ i18n.t('ui.lore') }}</p>
      <button class="btn" (click)="game.startCreateScreen()">{{ i18n.t('ui.startButton') }}</button>
      @if (game.bestDepth() > 0) {
        <p class="small" style="margin-top:18px;">
          {{ i18n.tf('ui.bestDepthLabel', { depth: game.bestDepth() }) }}
        </p>
      }
    </div>
  `
})
export class TitleScreenComponent {
  constructor(public game: GameService, public i18n: I18nService) {}
}
