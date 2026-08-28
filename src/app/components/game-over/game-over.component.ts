import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';

@Component({
  selector: 'app-game-over',
  standalone: true,
  templateUrl: './game-over.component.html',
  styleUrl: './game-over.component.css'
})
export class GameOverComponent {
  epitaph: string;

  constructor(public game: GameService, public i18n: I18nService, dice: DiceService) {
    this.epitaph = dice.pick(this.i18n.t('epitaphs'));
  }

  get floorsCompleted(): number {
    return Math.max(0, (this.game.state().depth || 1) - 1);
  }
}