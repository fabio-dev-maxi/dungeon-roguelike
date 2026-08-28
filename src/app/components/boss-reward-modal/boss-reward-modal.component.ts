import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-boss-reward-modal',
  standalone: true,
  templateUrl: './boss-reward-modal.component.html',
  styleUrl: './boss-reward-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BossRewardModalComponent {
  constructor(public game: GameService, public i18n: I18nService) {}

  reward() {
    return this.game.state().bossRewardModal;
  }
}
