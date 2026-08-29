import { Component, effect } from '@angular/core';
import { GameService } from './services/game.service';
import { I18nService } from './services/i18n.service';
import { LangBarComponent } from './components/lang-bar/lang-bar.component';
import { TitleScreenComponent } from './components/title-screen/title-screen.component';
import { CharacterCreationComponent } from './components/character-creation/character-creation.component';
import { GameScreenComponent } from './components/game-screen/game-screen.component';
import { GameOverComponent } from './components/game-over/game-over.component';
import { IconComponent } from './shared/icon/icon.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    LangBarComponent,
    TitleScreenComponent,
    CharacterCreationComponent,
    GameScreenComponent,
    GameOverComponent,
    IconComponent
  ],
  template: `
    <!-- Ambient ember particles: purely decorative, fixed behind everything. -->
    <div class="ember-field" aria-hidden="true">
      @for (e of embers; track $index) {
        <span class="ember" [style.left.%]="e.left" [style.--drift]="e.drift + 'px'"
              [style.animation-duration.s]="e.duration" [style.animation-delay.s]="e.delay"></span>
      }
    </div>

    <div class="topbar">
      <div class="topbar-inner">
        <div class="brand-mark">
          <app-icon name="layers" [size]="16"></app-icon>
          <span>{{ i18n.t('ui.title') }}</span>
        </div>
        <app-lang-bar></app-lang-bar>
      </div>
    </div>

    <div id="app">
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
  /** Purely cosmetic ember particles; fixed set so values stay stable across change detection. */
  embers = Array.from({ length: 16 }, (_, i) => ({
    left: Math.round((i * 6.3) % 100),
    duration: 9 + ((i * 37) % 11),
    delay: -((i * 53) % 14),
    drift: ((i % 5) - 2) * 14
  }));

  constructor(public game: GameService, public i18n: I18nService) {
    // Keep <html lang> and the document title in sync with the active language.
    effect(() => {
      const lang = this.game.state().lang;
      this.i18n.setLang(lang);
      document.documentElement.setAttribute('lang', this.i18n.t('htmlLang'));
      document.title = this.i18n.t('ui.title') + ' — ' + this.i18n.t('ui.subtitle');
    });
  }
}
