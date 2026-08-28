import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { TitleScreenComponent } from '../title-screen/title-screen.component';
import { CharacterCreationComponent } from '../character-creation/character-creation.component';
import { GameScreenComponent } from '../game-screen/game-screen.component';
import { GameOverComponent } from '../game-over/game-over.component';

/** Instrada la vista corrente in base alla schermata di gioco attiva. */
@Component({
  selector: 'app-main-game',
  standalone: true,
  imports: [
    TitleScreenComponent,
    CharacterCreationComponent,
    GameScreenComponent,
    GameOverComponent
  ],
  templateUrl: './main-game.component.html'
})
export class MainGameComponent {
  constructor(public game: GameService) {}
}