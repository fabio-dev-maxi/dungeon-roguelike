import { Component, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SimulationService, SimulationResult } from '../../services/simulation.service';
import { ClassKey } from '../../models/game.models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, UpperCasePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  selectedClass: ClassKey | 'all' = 'fighter';
  runsCount = 500;
  isSimulating = false;
  results = signal<SimulationResult[]>([]);

  constructor(private simService: SimulationService) {}

  async startSimulation(): Promise<void> {
    this.isSimulating = true;
    this.results.set([]);

    // Lascia al browser un frame per mostrare lo stato "in corso" prima del batch sincrono.
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
      this.isSimulating = false;
    }
  }

  formatJson(data: SimulationResult): string {
    return JSON.stringify(data, null, 2);
  }
}
