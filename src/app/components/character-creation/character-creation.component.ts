import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { DiceService } from '../../services/dice.service';
import { CustomDataService } from '../../services/custom-data.service';
import { CLASS_DATA, CLASS_KEYS } from '../../data/game.data';
import { ClassKey, StatKey, Stats } from '../../models/game.models';
import { IconComponent, IconName } from '../../shared/icon/icon.component';
import { CLASS_ICONS, STAT_ICONS } from '../../shared/icon/icon-maps';
import { PremadeHero } from '../../data/premade-heroes.data';

const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

@Component({
  selector: 'app-character-creation',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './character-creation.component.html',
  styleUrl: './character-creation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharacterCreationComponent {
  name = '';
  step = signal<1 | 2>(1);
  selectedClass = signal<ClassKey | null>(null);

  statKeys = STAT_KEYS;
  classKeys = CLASS_KEYS;
  classData = CLASS_DATA;

  assignedStats = signal<Partial<Record<StatKey, number>>>({});
  isSpinning = signal(false);
  displayHeroName = signal('???');
  currentHero = signal<PremadeHero | null>(null);

  assignedCount = computed(() => Object.keys(this.assignedStats()).length);
  isDraftComplete = computed(() => this.assignedCount() === 6);

  constructor(
    public game: GameService,
    public i18n: I18nService,
    public dice: DiceService,
    public customData: CustomDataService
  ) {}

  selectClass(key: ClassKey): void {
    this.selectedClass.set(key);
  }

  proceedToDraft(): void {
    if (!this.selectedClass()) return;
    this.step.set(2);
  }

  spinRoulette(): void {
    const cls = this.selectedClass();
    if (!cls || this.isSpinning() || this.isDraftComplete()) return;

    this.isSpinning.set(true);
    this.currentHero.set(null);

    const pool = this.customData.heroes()[cls];
    let counter = 0;
    const totalTicks = 20;

    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * pool.length);
      this.displayHeroName.set(pool[randomIdx].name);
      counter++;

      if (counter >= totalTicks) {
        clearInterval(interval);
        const finalHero = pool[this.dice.rnd(pool.length) - 1];
        this.displayHeroName.set(finalHero.name);
        this.currentHero.set(finalHero);
        this.isSpinning.set(false);
      }
    }, 60);
  }

  assignStat(key: StatKey, value: number): void {
    if (this.assignedStats()[key] !== undefined) return;

    this.assignedStats.update(curr => ({ ...curr, [key]: value }));
    this.currentHero.set(null);
    this.displayHeroName.set('???');
  }

  finishCreation(): void {
    const cls = this.selectedClass();
    const stats = this.assignedStats() as Stats;
    if (!cls || !this.isDraftComplete()) return;

    const finalName = this.name.trim() || this.i18n.t('ui.namePlaceholder');
    this.game.buildPlayerWithStats(finalName, cls, stats);
  }

  classIcon(key: ClassKey): IconName { return CLASS_ICONS[key]; }
  statIcon(key: StatKey): IconName { return STAT_ICONS[key]; }
}