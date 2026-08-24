import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-dice-widget',
  standalone: true,
  template: `
    @if (game.state().rollingDie.value !== null) {
      <div class="die-wrap">
        <div class="die" [class]="game.state().rollingDie.cls">{{ game.state().rollingDie.value }}</div>
        <div class="die-caption">
          @if (game.state().rollingDie.active) {
            {{ i18n.t('ui.dieRolling') }}
          } @else {
            <b>{{ i18n.t('ui.diceLetter') }}{{ game.state().rollingDie.sides }}</b> — {{ i18n.t('ui.dieDone') }}
          }
        </div>
      </div>
    }
  `
})
export class DiceWidgetComponent {
  constructor(public game: GameService, public i18n: I18nService) {}
}
