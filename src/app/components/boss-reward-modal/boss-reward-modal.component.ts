import { Component } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-boss-reward-modal',
  standalone: true,
  template: `
    @if (reward(); as r) {
      <div class="modal-backdrop">
        <div class="panel modal-box">
          <div class="depth-badge">{{ i18n.tf('ui.bossDefeatedTitle', { name: r.name }) }}</div>

          <div class="sheet-row"><span>{{ i18n.t('ui.xpGainedLabel') }}</span><span class="num gain">+{{ r.xp }}</span></div>
          <div class="sheet-row"><span>{{ i18n.t('ui.goldGainedLabel') }}</span><span class="num gain">+{{ r.gold }}</span></div>

          <hr class="rule">
          <div class="small">{{ i18n.t('ui.dropsLabel') }}</div>
          @if (r.drops.length > 0) {
            @for (d of r.drops; track d.id) {
              <div style="margin:10px 0;">
                <b style="color:var(--torch);">{{ d.name }}</b>
                <p class="small" style="margin:2px 0 0;">{{ d.effect }}</p>
              </div>
            }
          } @else {
            <p class="small" style="margin-top:10px;">{{ i18n.t('ui.noDropsText') }}</p>
          }

          <div class="center" style="margin-top:20px;">
            <button class="btn" (click)="game.confirmBossReward()">{{ i18n.t('ui.continueButton') }}</button>
          </div>
        </div>
      </div>
    }
  `
})
export class BossRewardModalComponent {
  constructor(public game: GameService, public i18n: I18nService) {}

  reward() {
    return this.game.state().bossRewardModal;
  }
}
