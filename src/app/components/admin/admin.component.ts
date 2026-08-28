import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router'; // 1. Importa RouterLink
import { SimulationService, SimulationResult } from '../../services/simulation.service';
import { ClassKey } from '../../models/game.models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, RouterLink], // 2. Aggiungi RouterLink agli imports
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent {
  selectedClass: ClassKey | 'all' = 'fighter';
  runsCount = 500;
  readonly isSimulating = signal(false);
  readonly results = signal<SimulationResult[]>([]);

  constructor(private simService: SimulationService) {}

  async startSimulation(): Promise<void> {
    this.isSimulating.set(true);
    this.results.set([]);
    await new Promise(r => setTimeout(r, 50));
    try {
      if (this.selectedClass === 'all') {
        const classes: ClassKey[] = ['fighter', 'rogue', 'wizard', 'cleric'];
        const resList: SimulationResult[] = [];
        for (const cls of classes) {
          resList.push(await this.simService.runBatch(cls, this.runsCount));
        }
        this.results.set(resList);
      } else {
        const res = await this.simService.runBatch(this.selectedClass, this.runsCount);
        this.results.set([res]);
      }
    } catch (err) {
      console.error('Errore durante la simulazione:', err);
    } finally {
      this.isSimulating.set(false);
    }
  }

  formatJson(data: SimulationResult): string {
    return JSON.stringify(data, null, 2);
  }
}