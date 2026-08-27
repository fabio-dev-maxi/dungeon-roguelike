import { Component, effect } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { GameService } from './services/game.service';
import { I18nService } from './services/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div id="app">
      <nav class="top-nav">
        <a routerLink="/" class="nav-link">🎮 Gioco</a>
        <a routerLink="/admin" class="nav-link">⚙️ Admin & Simulatore</a>
      </nav>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .top-nav {
      display: flex;
      gap: 16px;
      justify-content: flex-start;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px dashed rgba(210, 154, 68, 0.3);
    }
    .nav-link {
      font-family: 'Space Mono', monospace;
      font-size: 0.8rem;
      color: var(--parchment-dim, #cabb95);
      text-decoration: none;
      letter-spacing: 0.05em;
      padding: 4px 8px;
      border-radius: 2px;
      transition: all 0.15s ease;
    }
    .nav-link:hover {
      color: var(--torch, #d29a44);
      background: rgba(210, 154, 68, 0.1);
    }
  `]
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