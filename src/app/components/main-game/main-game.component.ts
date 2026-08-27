import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { TitleScreenComponent } from '../title-screen/title-screen.component';
import { CharacterCreationComponent } from '../character-creation/character-creation.component';
import { GameScreenComponent } from '../game-screen/game-screen.component';
import { GameOverComponent } from '../game-over/game-over.component';
import { LangBarComponent } from '../lang-bar/lang-bar.component';

/**
 * Componente wrapper per le viste principali del gioco con la barra della lingua.
 */
@Component({
  selector: 'app-main-game',
  standalone: true,
  imports: [
    TitleScreenComponent,
    CharacterCreationComponent,
    GameScreenComponent,
    GameOverComponent,
    LangBarComponent
  ],
  template: `
    <div class="game-wrapper">
      <div class="langbar-row">
        <app-lang-bar></app-lang-bar>
      </div>

      @switch (game.state().screen) {
        @case ('title') { <app-title-screen></app-title-screen> }
        @case ('create') { <app-character-creation></app-character-creation> }
        @case ('run') { <app-game-screen></app-game-screen> }
        @case ('gameover') { <app-game-over></app-game-over> }
      }
    </div>
  `,
  styles: [`
    .langbar-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 14px;
    }
  `]
})
export class MainGameComponent {
  constructor(public game: GameService) {}
}