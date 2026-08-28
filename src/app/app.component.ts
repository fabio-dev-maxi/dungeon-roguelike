import { Component, effect } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { GameService } from './services/game.service';
import { I18nService } from './services/i18n.service';
import { LangBarComponent } from './components/lang-bar/lang-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, LangBarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(public game: GameService, private i18n: I18nService) {
    effect(() => {
      const lang = this.game.state().lang;
      this.i18n.setLang(lang);
      document.documentElement.setAttribute('lang', this.i18n.t('htmlLang'));
      document.title = this.i18n.t('ui.title') + '   ' + this.i18n.t('ui.subtitle');
    });
  }
}