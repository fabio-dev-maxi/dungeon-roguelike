import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { StatKey } from '../../models/game.models';
import { IconComponent, IconName } from '../../shared/icon/icon.component';
import { STAT_ICONS } from '../../shared/icon/icon-maps';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/**
 * Purely presentational heuristic: picks a sensible icon for a feat based on
 * keywords in its id, so every class's feat pool gets a reasonable glyph
 * without this component needing to hardcode each class's exact feat ids.
 */
function iconForFeat(id: string): IconName {
  const s = id.toLowerCase();
  if (/crit|devastat|assassin|precision|deadly/.test(s)) return 'star';
  if (/skin|shield|armor|guard|dodge|iron/.test(s)) return 'shield';
  if (/vigor|tough|health|vital|hp/.test(s)) return 'heart';
  if (/arcane|mystic|mind|mana|spell/.test(s)) return 'book';
  if (/divine|holy|heal|zeal|sacred|faith/.test(s)) return 'sun';
  if (/gold|fortune|purse|treasure/.test(s)) return 'coin';
  if (/evade|evasion|reflex|flee|shadow|step/.test(s)) return 'boot';
  if (/weapon|master|power|attack|strike|blade|savage/.test(s)) return 'sword';
  return 'scroll';
}

@Component({
  selector: 'app-level-up-modal',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './level-up-modal.component.html',
  styleUrl: './level-up-modal.component.css'
})
export class LevelUpModalComponent {
  statKeys = STAT_KEYS;

  constructor(public game: GameService, public i18n: I18nService) {}

  s() { return this.game.state(); }
  p() { return this.game.state().player!; }
  levelUp() { return this.game.state().levelUp; }

  statIcon(k: StatKey): IconName { return STAT_ICONS[k]; }
  featIcon(id: string): IconName { return iconForFeat(id); }

  selectStat(k: StatKey): void {
    this.game.chooseLevelUpStat(k);
  }

  selectFeat(featId: string): void {
    this.game.chooseLevelUpFeat(featId);
  }
}