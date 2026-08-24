import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { LANGS, LANG_LABELS, LangCode } from '../../data/i18n.data';

@Component({
  selector: 'app-lang-bar',
  standalone: true,
  template: `
    <div class="langbar">
      @for (l of langs; track l) {
        <button
          class="langbtn"
          [class.active]="l === game.state().lang"
          (click)="select(l)">{{ labels[l] }}</button>
      }
    </div>
  `
})
export class LangBarComponent {
  langs = LANGS;
  labels = LANG_LABELS;

  constructor(public game: GameService) {}

  select(l: LangCode): void {
    this.game.setLang(l);
  }
}
