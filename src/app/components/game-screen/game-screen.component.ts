import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';
import { CLASS_DATA, xpToNext } from '../../data/game.data';
import { ChoiceOption, StatKey } from '../../models/game.models';
import { DiceWidgetComponent } from '../dice-widget/dice-widget.component';
import { LevelUpModalComponent } from '../level-up-modal/level-up-modal.component';
import { BossRewardModalComponent } from '../boss-reward-modal/boss-reward-modal.component';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [DiceWidgetComponent, LevelUpModalComponent, BossRewardModalComponent],
  template: `
    <div class="game-grid">
      <!-- PANNELLO SCHEDA PERSONAGGIO & NEMICO -->
      <div class="panel" id="sheet-panel">
        <div class="depth-badge">{{ i18n.t('ui.floorLabel') }} <span class="num">{{ s().depth }}</span></div>
        <h3 class="char-name">{{ p().name }}</h3>
        <p class="small" style="margin-top:-6px;">
          {{ i18n.tf('ui.levelLabel', { cls: i18n.t('classes.' + p().cls + '.name'), level: p().level }) }}
        </p>

        <div class="hpbar-outer"><div class="hpbar-inner" [style.width.%]="hpPct()"></div></div>
        <div class="sheet-row"><span>{{ i18n.t('ui.hpLabel') }}</span><span class="num">{{ p().hp }} / {{ p().maxHp }}</span></div>
        <div class="sheet-row"><span>{{ i18n.t('ui.xpLabel') }}</span><span class="num">{{ p().xp }} / {{ xpNeeded() }}</span></div>
        <div class="hpbar-outer" style="height:8px;"><div class="hpbar-inner xpbar-inner" [style.width.%]="xpPct()"></div></div>
        <div class="sheet-row"><span>{{ i18n.t('ui.acLabel') }}</span><span class="num">{{ p().ac }}</span></div>
        <div class="sheet-row"><span>{{ i18n.t('ui.goldLabel') }}</span><span class="num">{{ p().gold }}</span></div>
        <div class="sheet-row"><span>{{ i18n.t('ui.weaponLabel') }}</span><span class="num">{{ game.weaponName(p().weapon) }}{{ p().weapon.bonus ? ' +' + p().weapon.bonus : '' }}</span></div>
        <div class="sheet-row"><span>{{ i18n.t('ui.dmgLabel') }}</span><span class="num">{{ p().weapon.dice[0] }}{{ i18n.t('ui.diceLetter') }}{{ p().weapon.dice[1] }} + {{ i18n.t('statAbbr.' + classData[p().cls].atkStat) }}</span></div>
        <div class="sheet-row"><span>{{ i18n.t('ui.armorLabel') }}</span><span class="num">{{ game.armorName(p().armor) }} (+{{ p().armor.bonus }})</span></div>

        <hr class="rule">
        <div class="toggle-row">
          <button class="stats-toggle" (click)="game.toggleStats()">
            {{ s().statsExpanded ? i18n.t('ui.hideStatsButton') : i18n.t('ui.showStatsButton') }}
          </button>
          <button class="stats-toggle" (click)="game.toggleInventory()">
            {{ s().inventoryExpanded ? i18n.t('ui.hideInventoryButton') : i18n.t('ui.showInventoryButton') }}
          </button>
        </div>

        @if (s().statsExpanded) {
          @for (k of statKeys; track k) {
            <div class="sheet-row"><span>{{ i18n.t('statAbbr.' + k) }}</span><span class="num">{{ p().stats[k] }} ({{ dice.fmtMod(dice.mod(p().stats[k])) }})</span></div>
          }
        }

        @if (s().inventoryExpanded) {
          <div class="small" style="margin-top:6px;">{{ i18n.t('ui.inventoryLabel') }}</div>
          <ul class="inv-list">
            @if (p().inventory.length === 0) {
              <li>&middot; {{ i18n.t('ui.emptyInventory') }}</li>
            }
            @for (item of p().inventory; track $index) {
              <li>&middot; {{ i18n.t('potionName') }}</li>
            }
          </ul>

          @if (p().relics.length > 0) {
            <div class="small" style="margin-top:6px;">{{ i18n.t('ui.relicsLabel') }}</div>
            <ul class="inv-list">
              @for (rid of p().relics; track rid) {
                <li>&middot; {{ i18n.t('relics.' + rid + '.name') }}</li>
              }
            </ul>
          }
        }

        @if (s().monster; as m) {
          <hr class="rule">
          <div class="small">{{ i18n.t('ui.enemyLabel') }}</div>
          <div class="sheet-row"><span class="enemy-name">{{ game.monsterDisplayName(m) }}</span><span class="num">{{ m.hp }}/{{ m.maxHp }}</span></div>
          <div class="sheet-row"><span>{{ i18n.t('ui.acShort') }}</span><span class="num">{{ m.ac }}</span></div>
        }
      </div>

      <!-- PANNELLO CENTRALE COMBAT LOG & AZIONI -->
      <div class="panel main-panel">
        <div class="log" id="logbox" #logbox>
          @for (l of s().log; track $index) {
            <p [class]="l.cls" [innerHTML]="l.html"></p>
          }
        </div>

        @if (s().phase === 'levelup' && s().levelUp?.step === 'hp') {
          <div class="depth-badge">{{ i18n.t('ui.levelUpTitle') }}</div>
          <p class="small">{{ i18n.t('ui.hpRollPrompt') }}</p>
        }

        <!-- ARENA DADI AD ALTEZZA FISSA -->
        <div class="dice-arena">
          <div class="dice-slot left">
            <app-dice-widget
              [label]="p().name || 'Giocatore'"
              [themeColor]="'#8b0000'"
              [borderColor]="'#d4af37'"
              [labelColor]="'#d4af37'"
              [value]="playerDieValue()"
              [isActive]="playerDieActive()">
            </app-dice-widget>
          </div>

          <div class="dice-slot right">
            @if (s().monster; as m) {
              <app-dice-widget
                [label]="game.monsterDisplayName(m)"
                [themeColor]="'#142918'"
                [borderColor]="'#34d399'"
                [labelColor]="'#34d399'"
                [value]="monsterDieValue()"
                [isActive]="monsterDieActive()">
              </app-dice-widget>
            }
          </div>
        </div>

        <!-- PULSANTIERA AZIONI AD ALTEZZA FISSA 2 RIGHE -->
        <div class="actions">
          @if (s().phase === 'explore') {
            <button class="btn" (click)="game.descendFloor()">{{ i18n.t('ui.descendButton') }}</button>
            @if (hasPotion()) {
              <button class="btn heal" (click)="game.playerUsePotion()">{{ i18n.t('ui.drinkPotionButton') }}</button>
            }
          }
          @if (s().phase === 'combat') {
            <button class="btn danger" [disabled]="acting()" (click)="game.playerAttack()">{{ i18n.t('ui.attackButton') }}</button>
            <button class="btn" [disabled]="acting()" (click)="game.playerDefend()">{{ i18n.t('ui.defendButton') }}</button>
            @if (canSpecial()) {
              <button class="btn" [disabled]="acting()" (click)="game.playerUseSpecial()">{{ i18n.t('classes.' + p().cls + '.specialName') }}</button>
            }
            @if (hasPotion()) {
              <button class="btn heal" [disabled]="acting()" (click)="game.playerUsePotion()">{{ i18n.t('ui.potionButton') }}</button>
            }
            <button class="btn" [disabled]="acting()" (click)="game.playerFlee()">{{ i18n.t('ui.fleeButton') }}</button>
          }
          @if (s().phase === 'choice' && s().pendingChoice) {
            @for (o of s().pendingChoice!.options; track $index) {
              <button class="btn" (click)="game.resolveChoiceOption(o)">{{ o.label }}</button>
            }
          }
          @if (s().phase === 'levelup' && s().levelUp?.step === 'hp' && s().levelUp?.hpRollTotal !== null) {
            @if (!s().levelUp?.rerolled) {
              <button class="btn" (click)="game.rerollLevelUpHp()">{{ i18n.t('ui.rerollHpButton') }}</button>
            }
            <button class="btn heal" (click)="game.confirmLevelUp()">{{ i18n.t('ui.confirmButton') }}</button>
          }
        </div>
        <div id="scroll-anchor" style="height:1px;"></div>
      </div>
    </div>

    @if (s().phase === 'levelup' && s().levelUp?.step === 'stat') {
      <app-level-up-modal></app-level-up-modal>
    }

    @if (s().bossRewardModal) {
      <app-boss-reward-modal></app-boss-reward-modal>
    }
  `,
  styles: [`
    .char-name, .enemy-name {
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 170px !important;
      display: inline-block !important;
    }

    /* CONTENITORE PRINCIPALE AD ALTEZZA FISSA RIGIDA */
    .main-panel {
      display: flex !important;
      flex-direction: column !important;
      height: 620px !important;
      min-height: 620px !important;
      max-height: 620px !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }

    /* LA CHAT ASSORBE DINAMICAMENTE LO SPAZIO RIMANENTE SENZA SPOSTARE NIENTE */
    .log {
      flex: 1 1 auto !important;
      min-height: 150px !important;
      width: 100% !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding-right: 8px !important;
      box-sizing: border-box !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    .log::-webkit-scrollbar {
      width: 6px;
    }
    .log::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
    }
    .log::-webkit-scrollbar-thumb {
      background: #d4af37;
      border-radius: 4px;
    }

    /* ARENA DADI FISSA E ANCORATA */
    .dice-arena {
      flex: 0 0 120px !important;
      height: 120px !important;
      min-height: 120px !important;
      max-height: 120px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      width: 100% !important;
      margin: 8px 0 !important;
      padding: 0 16px !important;
      background: rgba(0, 0, 0, 0.35) !important;
      border-radius: 10px !important;
      border: 1px solid rgba(212, 175, 55, 0.2) !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }

    .dice-slot {
      width: 200px !important;
      min-width: 200px !important;
      max-width: 200px !important;
      height: 110px !important;
      min-height: 110px !important;
      max-height: 110px !important;
      display: flex !important;
      align-items: center !important;
      flex-shrink: 0 !important;
    }

    .dice-slot.left {
      justify-content: flex-start !important;
    }

    .dice-slot.right {
      justify-content: flex-end !important;
    }

    /* PULSANTIERA BLOCCATA A 100PX PER HOSPITALIZZARE FINO A 2 RIGHE DI BOTTONI */
    .actions {
      flex: 0 0 100px !important;
      height: 100px !important;
      min-height: 100px !important;
      max-height: 100px !important;
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: center !important;
      align-content: center !important;
      gap: 6px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    /* UNIFORMIZZAZIONE BOTTONI PER GARANTIRE FIT PERFETTO */
    .actions .btn {
      padding: 6px 14px !important;
      font-size: 0.82rem !important;
      box-sizing: border-box !important;
    }
  `]
})
export class GameScreenComponent implements AfterViewChecked {
  statKeys = STAT_KEYS;
  classData = CLASS_DATA;

  private lastPlayerValue: number | null = null;
  private lastMonsterValue: number | null = null;

  @ViewChild('logbox') logboxRef?: ElementRef<HTMLDivElement>;

  constructor(public game: GameService, public i18n: I18nService, public dice: DiceService) {}

  s() { return this.game.state(); }
  p() { return this.game.state().player!; }

  hpPct(): number { return Math.round((this.p().hp / this.p().maxHp) * 100); }
  xpNeeded(): number { return xpToNext(this.p().level); }
  xpPct(): number { return Math.round((this.p().xp / this.xpNeeded()) * 100); }
  hasPotion(): boolean { return this.p().inventory.some(i => i.type === 'potion'); }
  acting(): boolean { return !!this.s().combatFlags.acting; }
  canSpecial(): boolean {
    const cls = this.p().cls;
    return !this.p().usedSpecial && !!this.i18n.t('classes.' + cls + '.active');
  }

  private isEnemyRoll(): boolean {
    const rd = this.s().rollingDie;
    return !!(rd && rd.tag === 'monsterAttack');
  }

  playerDieActive(): boolean {
    const rd = this.s().rollingDie;
    return !!(rd && rd.active && !this.isEnemyRoll());
  }

  playerDieValue(): number | null {
    const rd = this.s().rollingDie;
    if (rd && !this.isEnemyRoll() && rd.value !== null) {
      this.lastPlayerValue = rd.value;
    }
    return this.lastPlayerValue;
  }

  monsterDieActive(): boolean {
    const rd = this.s().rollingDie;
    return !!(rd && rd.active && this.isEnemyRoll());
  }

  monsterDieValue(): number | null {
    const rd = this.s().rollingDie;
    if (rd && this.isEnemyRoll() && rd.value !== null) {
      this.lastMonsterValue = rd.value;
    }
    return this.lastMonsterValue;
  }

  ngAfterViewChecked(): void {
    const el = this.logboxRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;

    const anchor = document.getElementById('scroll-anchor');
    if (anchor && window.innerWidth > 720) {
      anchor.scrollIntoView({ block: 'end', behavior: 'auto' });
    }

    const sheet = document.getElementById('sheet-panel');
    if (sheet && window.innerWidth <= 720) {
      document.body.style.paddingTop = (sheet.offsetHeight + 20) + 'px';
      document.body.classList.add('has-topbar');
    } else {
      document.body.style.paddingTop = '';
      document.body.classList.remove('has-topbar');
    }
  }
}