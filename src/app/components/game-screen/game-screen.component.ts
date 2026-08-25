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
      <div class="panel" id="sheet-panel">
        <div class="depth-badge">{{ i18n.t('ui.floorLabel') }} <span class="num">{{ s().depth }}</span></div>
        <h3 style="font-size:.95rem;">{{ p().name }}</h3>
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
          <div class="sheet-row"><span>{{ game.monsterDisplayName(m) }}</span><span class="num">{{ m.hp }}/{{ m.maxHp }}</span></div>
          <div class="sheet-row"><span>{{ i18n.t('ui.acShort') }}</span><span class="num">{{ m.ac }}</span></div>
        }
      </div>

      <div class="panel">
        <div class="log" id="logbox" #logbox>
          @for (l of s().log; track $index) {
            <p [class]="l.cls" [innerHTML]="l.html"></p>
          }
        </div>

        @if (s().phase === 'levelup' && s().levelUp?.step === 'hp') {
          <div class="depth-badge">{{ i18n.t('ui.levelUpTitle') }}</div>
          <p class="small">{{ i18n.t('ui.hpRollPrompt') }}</p>
        }

        <app-dice-widget></app-dice-widget>

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
  `
})
export class GameScreenComponent implements AfterViewChecked {
  statKeys = STAT_KEYS;
  classData = CLASS_DATA;

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

  ngAfterViewChecked(): void {
    // Auto-scroll the log to the newest entry, and keep the compact sheet panel's
    // reserved space (mobile fixed layout) in sync with its actual rendered height.
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
