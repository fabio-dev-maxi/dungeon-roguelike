import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';
import { CLASS_DATA, CLASS_KEYS } from '../../data/game.data';
import { ClassKey, StatKey } from '../../models/game.models';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

@Component({
  selector: 'app-character-creation',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './character-creation.component.html',
  styleUrl: './character-creation.component.css'
})
export class CharacterCreationComponent {
  name = '';
  statKeys = STAT_KEYS;
  classKeys = CLASS_KEYS;
  classData = CLASS_DATA;

  constructor(public game: GameService, public i18n: I18nService, public dice: DiceService) {}

  get stats() {
    return this.game.state().tempStats;
  }

  diceStr(key: ClassKey): string {
    const [n, d] = this.classData[key].weaponDice;
    return n + this.i18n.t('ui.diceLetter') + d;
  }

  rollStats(): void {
    this.game.rollStatsForCreate(this.name);
  }

  choose(key: ClassKey): void {
    this.game.chooseClass(key, this.name.trim());
  }
}
