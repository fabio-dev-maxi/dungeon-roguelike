import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="game-footer">
      <div class="footer-divider">
        <span class="diamond-accent">◆</span>
      </div>
      <div class="footer-content">
        <span class="game-title">ENDLESS PITFALL</span>
        <span class="version-badge">v{{ gameVersion }}</span>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin-top: auto;
    }

    .game-footer {
      width: 100%;
      padding: 24px 16px 20px 16px;
      background: transparent;
      text-align: center;
      box-sizing: border-box;
    }

    .footer-divider {
      position: relative;
      height: 1px;
      width: 60%;
      max-width: 400px;
      margin: 0 auto 16px auto;
      background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4), transparent);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .diamond-accent {
      position: absolute;
      color: rgba(212, 175, 55, 0.6);
      font-size: 0.65rem;
      background: #0d0c10;
      padding: 0 8px;
    }

    .footer-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-family: 'Georgia', serif;
      font-size: 0.8rem;
      letter-spacing: 0.12em;
    }

    .game-title {
      color: #94a3b8;
      font-size: 0.75rem;
      text-transform: uppercase;
      opacity: 0.8;
    }

    .version-badge {
      color: #d4af37;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      background: rgba(212, 175, 55, 0.08);
      border: 1px solid rgba(212, 175, 55, 0.25);
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.72rem;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    }
  `]
})
export class FooterComponent {
  readonly gameVersion = environment.version;
}