import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { IconComponent, IconName } from '../../shared/icon/icon.component';
import { xpToNext } from '../../data/monster.data';

@Component({
  selector: 'app-character-sheet-modal',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './character-sheet-modal.component.html',
  styleUrl: './character-sheet-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetModalComponent {
  public isOpen = input<boolean>(false);
  public closeModal = output<void>();

  constructor(
    public readonly game: GameService,
    public readonly i18n: I18nService
  ) { }

  get player() {
    return this.game.state().player;
  }

  public getMod(statValue: number | string): number {
    const val = Number(statValue) || 10;
    return Math.floor((val - 10) / 2);
  }

  public formatMod(mod: number): string {
    if (mod > 0) return `+${mod}`;
    if (mod === 0) return '+0';
    return `${mod}`;
  }

  public getIconForClass(classKey: string): IconName {
    switch (classKey) {
      case 'fighter': return 'axe';
      case 'rogue': return 'dagger';
      case 'wizard': return 'staff';
      case 'cleric': return 'sun';
      default: return 'sword';
    }
  }

  public getXpNext(): number {
    if (!this.player) return 100;
    return xpToNext(this.player.level);
  }

  public getHpPercent(): number {
    if (!this.player || this.player.maxHp <= 0) return 0;
    return Math.min(100, Math.max(0, (this.player.hp / this.player.maxHp) * 100));
  }

  public getXpPercent(): number {
    if (!this.player) return 0;
    const req = this.getXpNext();
    return Math.min(100, Math.max(0, (this.player.xp / req) * 100));
  }

  public getAttackBonus(): string {
    if (!this.player) return '+0';
    const primaryMod = this.player.cls === 'rogue' || this.player.cls === 'wizard'
      ? this.getMod(this.player.stats.dex)
      : this.getMod(this.player.stats.str);
    const total = primaryMod + (this.player.weapon?.bonus || 0) + (this.player.flatAtkBonus || 0);
    return this.formatMod(total);
  }

  public getCritDisplay(): string {
    if (!this.player) return '20 / x2';
    const thresh = this.player.critThreshold || 20;
    const mult = this.player.critMultiplier || 2;
    const range = thresh < 20 ? `${thresh}-20` : '20';
    return `${range} (x${mult})`;
  }
}