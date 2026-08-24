import { Component, effect } from '@angular/core';
import { GameService } from './services/game.service';
import { I18nService } from './services/i18n.service';
import { LangBarComponent } from './components/lang-bar/lang-bar.component';
import { TitleScreenComponent } from './components/title-screen/title-screen.component';
import { CharacterCreationComponent } from './components/character-creation/character-creation.component';
import { GameScreenComponent } from './components/game-screen/game-screen.component';
import { GameOverComponent } from './components/game-over/game-over.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    LangBarComponent,
    TitleScreenComponent,
    CharacterCreationComponent,
    GameScreenComponent,
    GameOverComponent
  ],
  template: `
    <div id="app">
      <app-lang-bar></app-lang-bar>

      @switch (game.state().screen) {
        @case ('title') { <app-title-screen></app-title-screen> }
        @case ('create') { <app-character-creation></app-character-creation> }
        @case ('run') { <app-game-screen></app-game-screen> }
        @case ('gameover') { <app-game-over></app-game-over> }
      }
    </div>
  `
})
export class AppComponent {
  constructor(public game: GameService, private i18n: I18nService) {
    // Keep <html lang> and the document title in sync with the active language.
    effect(() => {
      const lang = this.game.state().lang;
      this.i18n.setLang(lang);
      document.documentElement.setAttribute('lang', this.i18n.t('htmlLang'));
      document.title = this.i18n.t('ui.title') + ' — ' + this.i18n.t('ui.subtitle');
    });
  }
}
