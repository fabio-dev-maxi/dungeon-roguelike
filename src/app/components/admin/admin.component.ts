import { Component, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SimulationService, SimulationResult } from '../../services/simulation.service';
import { ClassKey } from '../../models/game.models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UpperCasePipe],
  template: `
    <div class="panel">
      <div class="admin-header">
        <h2>Pannello Admin & Simulatore</h2>
      </div>

      <div class="config-card">
        <h3>Simulazione Bilanciamento</h3>
        <p class="small" style="margin-bottom: 12px;">
          Esegue simulazioni automatiche in batch sfruttando le regole TypeScript reali del gioco.
        </p>

        <div class="form-row">
          <div class="form-group">
            <label class="field-label">Classe da Testare</label>
            <select [(ngModel)]="selectedClass" class="admin-select">
              <option value="fighter">Guerriero</option>
              <option value="rogue">Ladro</option>
              <option value="wizard">Mago</option>
              <option value="cleric">Chierico</option>
              <option value="all">Tutte le Classi</option>
            </select>
          </div>

          <div class="form-group">
            <label class="field-label">Numero di Run (N)</label>
            <input type="number" [(ngModel)]="runsCount" min="10" max="5000" class="admin-input">
          </div>
        </div>

        <div style="margin-top: 16px;">
          <button class="btn" [disabled]="isSimulating" (click)="startSimulation()">
            {{ isSimulating ? 'Simulazione in corso...' : '⚡ Avvia Simulazione' }}
          </button>
        </div>
      </div>

      @if (results().length > 0) {
        <div class="results-container">
          <h3>Esito Simulazione</h3>

          @for (res of results(); track res.cls) {
            <div class="result-card">
              <h4 style="margin: 0 0 12px; font-family: 'Cinzel', serif;">
                Classe: <span style="color: var(--torch);">{{ res.cls | uppercase }}</span> (N={{ res.N }})
              </h4>
              
              <div class="stat-summary-grid">
                <div class="stat-box">
                  <div class="label">Vittorie (Piano 50)</div>
                  <div class="val num gain">{{ (res.completionRate * 100).toFixed(1) }}%</div>
                </div>
                <div class="stat-box">
                  <div class="label">Profondità Media Morte</div>
                  <div class="val num">{{ res.avgDeathDepth ? res.avgDeathDepth.toFixed(1) : 'N/A' }}</div>
                </div>
                <div class="stat-box">
                  <div class="label">Completamenti Totali</div>
                  <div class="val num">{{ res.completions }} / {{ res.N }}</div>
                </div>
              </div>

              <details style="margin-top: 16px;">
                <summary class="details-toggle">Visualizza JSON di Output completo</summary>
                <pre class="json-block">{{ formatJson(res) }}</pre>
              </details>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-header {
      margin-bottom: 20px;
    }
    .config-card {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #4a3a26;
      padding: 16px;
      border-radius: 3px;
      margin-bottom: 20px;
    }
    .form-row {
      display: flex;
      gap: 16px;
      margin-top: 14px;
      flex-wrap: wrap;
    }
    .form-group {
      flex: 1;
      min-width: 180px;
    }
    .admin-select, .admin-input {
      font-family: 'Space Mono', monospace;
      font-size: 0.9rem;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid #4a3a26;
      color: var(--parchment, #e9dcbe);
      padding: 8px 10px;
      width: 100%;
      border-radius: 2px;
      box-sizing: border-box;
    }
    .results-container {
      margin-top: 24px;
    }
    .result-card {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--torch-dim, #96702f);
      padding: 16px;
      border-radius: 3px;
      margin-top: 14px;
    }
    .stat-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .details-toggle {
      font-family: 'Space Mono', monospace;
      font-size: 0.8rem;
      color: var(--torch-dim, #96702f);
      cursor: pointer;
      padding: 6px 0;
    }
    .details-toggle:hover {
      color: var(--torch, #d29a44);
    }
    .json-block {
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #33261a;
      padding: 12px;
      font-family: 'Space Mono', monospace;
      font-size: 0.75rem;
      color: #a7f3d0;
      max-height: 350px;
      overflow-y: auto;
      border-radius: 2px;
      white-space: pre-wrap;
      word-break: break-all;
    }
  `]
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

    await new Promise(r => setTimeout(r, 50));

    try {
      if (this.selectedClass === 'all') {
        const classes: ClassKey[] = ['fighter', 'rogue', 'wizard', 'cleric'];
        const resList: SimulationResult[] = [];
        for (const cls of classes) {
          const res = await this.simService.runBatch(cls, this.runsCount);
          resList.push(res);
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

  formatJson(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}