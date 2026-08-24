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
  template: `
    <div class="panel">
      <h2>{{ i18n.t('ui.forgeTitle') }}</h2>
      <label class="field-label">{{ i18n.t('ui.nameLabel') }}</label>
      <input type="text" [placeholder]="i18n.t('ui.namePlaceholder')" [(ngModel)]="name">

      <div style="margin-top:16px;">
        <button class="btn" (click)="rollStats()">
          {{ stats ? i18n.t('ui.rerollButton') : i18n.t('ui.rollButton') }}
        </button>
      </div>

      @if (stats) {
        <div class="stat-grid">
          @for (k of statKeys; track k) {
            <div class="stat-box">
              <div class="label">{{ i18n.t('stats.' + k) }}</div>
              <div class="val num">{{ stats[k] }}</div>
              <div class="mod num">{{ dice.fmtMod(dice.mod(stats[k])) }}</div>
            </div>
          }
        </div>

        <h3 style="margin-top:22px;">{{ i18n.t('ui.chooseClassTitle') }}</h3>
        <div class="class-grid">
          @for (key of classKeys; track key) {
            <div class="class-card" (click)="choose(key)">
              <h3>{{ i18n.t('classes.' + key + '.name') }}</h3>
              <p>{{ i18n.t('classes.' + key + '.desc') }}</p>
              <p class="small" style="margin-top:6px;">
                {{ i18n.tf('ui.weaponCharLabel', {
                  weapon: i18n.t('weapons.' + classData[key].weaponKey),
                  dice: diceStr(key),
                  stat: i18n.t('stats.' + classData[key].atkStat)
                }) }}
              </p>
              <p class="small">
                {{ i18n.tf('ui.armorCharLabel', {
                  armor: i18n.t('armors.' + classData[key].armorKey),
                  bonus: classData[key].armor
                }) }}
              </p>
              @if (classData[key].atkStat !== classData[key].primary) {
                <p class="small">
                  {{ i18n.tf('ui.castingStatLabel', {
                    stat: i18n.t('stats.' + classData[key].primary),
                    mod: dice.fmtMod(dice.mod(stats[classData[key].primary]))
                  }) }}
                </p>
              }
              <span class="tag">{{ i18n.t('classes.' + key + '.special') }}</span>
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

  rollStats(): void {
    this.game.rollStatsForCreate(this.name);
  }

  choose(key: ClassKey): void {
    this.game.chooseClass(key, this.name.trim());
  }
}
