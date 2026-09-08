import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { IconComponent, IconName } from '../../shared/icon/icon.component';
import { DropInfo } from '../../models/game.models';

/**
 * COMPONENTE MODALE RICOMPENSA BOTTINO BOSS
 * 
 * Visualizza l'esperienza, l'oro e il bottino (armi, armature, reliquie, pozioni)
 * conferiti dopo la sconfitta del Custode del Piano (Layer 7).
 */
@Component({
  selector: 'app-boss-reward-modal',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './boss-reward-modal.component.html',
  styleUrl: './boss-reward-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BossRewardModalComponent {
  constructor(
    public readonly game: GameService,
    public readonly i18n: I18nService
  ) { }

  /**
   * Mappa il tipo di bottino droppato alla rispettiva icona di sistema.
   * Gestisce anche il tipo 'potion' con l'icona 'flask'.
   */
  public getDropIcon(type: DropInfo['type']): IconName {
    switch (type) {
      case 'weapon':
        return 'sword';
      case 'armor':
        return 'shield';
      case 'relic':
        return 'gem';
      case 'potion':
        return 'flask'; // Icona per la pozione di cura
      default:
        return 'coin';
    }
  }

  public onConfirm(): void {
    this.game.confirmBossReward();
  }
}