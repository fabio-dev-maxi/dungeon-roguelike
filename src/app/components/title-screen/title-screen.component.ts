import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-title-screen',
  standalone: true,
  templateUrl: './title-screen.component.html',
  styleUrl: './title-screen.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleScreenComponent {
  constructor(public game: GameService, public i18n: I18nService) {}
}
