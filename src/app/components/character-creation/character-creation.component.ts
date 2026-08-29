import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';
import { CLASS_DATA, CLASS_KEYS } from '../../data/game.data';
import { ClassKey, StatKey } from '../../models/game.models';
import { IconComponent, IconName } from '../../shared/icon/icon.component';
import { CLASS_ICONS, STAT_ICONS } from '../../shared/icon/icon-maps';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

@Component({
  selector: 'app-character-creation',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="panel">
      <h2><app-icon name="scroll" [size]="20"></app-icon>{{ i18n.t('ui.forgeTitle') }}</h2>

      <label class="field-label">{{ i18n.t('ui.nameLabel') }}</label>
      <input type="text" [placeholder]="i18n.t('ui.namePlaceholder')" [(ngModel)]="name">

      <div style="margin-top:16px;">
        <button class="btn" (click)="rollStats()">
          <app-icon name="dot" [size]="14"></app-icon>
          {{ stats ? i18n.t('ui.rerollButton') : i18n.t('ui.rollButton') }}
        </button>
      </div>

      @if (stats) {
        <div class="stat-grid">
          @for (k of statKeys; track k) {
            <div class="stat-box">
              <div class="sigil sigil--sm"><app-icon [name]="statIcon(k)" [size]="16"></app-icon></div>
              <div>
                <span class="label">{{ i18n.t('stats.' + k) }}</span>
                <div class="val num">{{ stats[k] }}</div>
                <div class="mod num">{{ dice.fmtMod(dice.mod(stats[k])) }}</div>
              </div>
            </div>
          }
        </div>

        <h3 style="margin-top:22px;">{{ i18n.t('ui.chooseClassTitle') }}</h3>
        <div class="class-grid">
          @for (key of classKeys; track key) {
            <div class="class-card" tabindex="0" (click)="choose(key)" (keydown.enter)="choose(key)">
              <div class="class-card-head">
                <div class="sigil"><app-icon [name]="classIcon(key)" [size]="24"></app-icon></div>
                <h3 style="margin:0;">{{ i18n.t('classes.' + key + '.name') }}</h3>
              </div>
              <p class="desc">{{ i18n.t('classes.' + key + '.desc') }}</p>
              <div class="traits">
                <div class="trait">
                  <app-icon name="sword" [size]="14"></app-icon>
                  {{ i18n.tf('ui.weaponCharLabel', {
                    weapon: i18n.t('weapons.' + classData[key].weaponKey),
                    dice: diceStr(key),
                    stat: i18n.t('stats.' + classData[key].atkStat)
                  }) }}
                </div>
                <div class="trait">
                  <app-icon name="shield" [size]="14"></app-icon>
                  {{ i18n.tf('ui.armorCharLabel', {
                    armor: i18n.t('armors.' + classData[key].armorKey),
                    bonus: classData[key].armor
                  }) }}
                </div>
                @if (classData[key].atkStat !== classData[key].primary) {
                  <div class="trait">
                    <app-icon [name]="statIcon(classData[key].primary)" [size]="14"></app-icon>
                    {{ i18n.tf('ui.castingStatLabel', {
                      stat: i18n.t('stats.' + classData[key].primary),
                      mod: dice.fmtMod(dice.mod(stats[classData[key].primary]))
                    }) }}
                  </div>
                }
              </div>
              <span class="tag">
                <app-icon name="scroll" [size]="14"></app-icon>
                {{ i18n.t('classes.' + key + '.special') }}
              </span>
            </div>
          }
        </div>
      }
    </div>
  `
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

  classIcon(key: ClassKey): IconName { return CLASS_ICONS[key]; }
  statIcon(key: StatKey): IconName { return STAT_ICONS[key]; }

  rollStats(): void {
    this.game.rollStatsForCreate(this.name);
  }

  choose(key: ClassKey): void {
    this.game.chooseClass(key, this.name.trim());
  }
}
