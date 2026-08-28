import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { LANGS, LANG_LABELS, LangCode } from '../../data/i18n.data';

@Component({
  selector: 'app-lang-bar',
  standalone: true,
  templateUrl: './lang-bar.component.html',
  styleUrl: './lang-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LangBarComponent {
  langs = LANGS;
  labels = LANG_LABELS;

  constructor(public game: GameService) {}

  select(l: LangCode): void {
    this.game.setLang(l);
  }
}
