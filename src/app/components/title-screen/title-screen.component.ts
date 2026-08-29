import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-title-screen',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="title-wrap">
      <div class="title-crest">
        <div class="rune-ring spin" style="width:220px;height:220px;"></div>
        <app-icon name="layers" [size]="64"></app-icon>
      </div>

      <h1>{{ i18n.t('ui.title') }}</h1>
      <div class="title-sub">{{ i18n.t('ui.subtitle') }}</div>
      <p class="lore">{{ i18n.t('ui.lore') }}</p>

      <div class="title-actions">
        <button class="btn primary" (click)="game.startCreateScreen()">
          <app-icon name="stairs" [size]="16"></app-icon>
          {{ i18n.t('ui.startButton') }}
        </button>
      </div>

      @if (game.bestDepth() > 0) {
        <p class="record-line">
          <app-icon name="crown" [size]="15"></app-icon>
          {{ i18n.tf('ui.bestDepthLabel', { depth: game.bestDepth() }) }}
        </p>
      }
    </div>
  `
})
export class TitleScreenComponent {
  constructor(public game: GameService, public i18n: I18nService) {}
}
