import { Component, Input } from '@angular/core';

/**
 * Small hand-authored line-icon set for the whole app.
 *
 * Design intent: every icon here is a *reinforcement* next to an existing
 * i18n label, never the sole carrier of meaning — so a modest glyph is fine,
 * the text always disambiguates it. Icons are stroke-only line art on a
 * 24x24 grid (fill="none", currentColor), so a single `color` on the host
 * re-themes an icon consistently with the surrounding UI (gold/blood/emerald).
 *
 * Pure presentation: this component holds no game logic and reads no state.
 */
export type IconName =
  | 'sword' | 'dagger' | 'staff' | 'sun'
  | 'shield' | 'heart' | 'coin' | 'star'
  | 'flask' | 'gem' | 'scroll' | 'skull'
  | 'boot' | 'stairs' | 'layers' | 'book'
  | 'eye' | 'fist' | 'feather' | 'backpack'
  | 'key' | 'hammer' | 'cup' | 'crown'
  | 'arrow-right' | 'globe' | 'check' | 'x' | 'dot';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name) {
        @case ('sword') {
          <line x1="18.5" y1="3.5" x2="7" y2="15"/>
          <line x1="9.2" y1="10.6" x2="12" y2="13.4"/>
          <line x1="7" y1="15" x2="5" y2="19"/>
          <circle cx="5" cy="19.4" r="1" fill="currentColor" stroke="none"/>
        }
        @case ('dagger') {
          <line x1="7" y1="7" x2="17" y2="17"/>
          <line x1="17" y1="7" x2="7" y2="17"/>
          <line x1="9.5" y1="9.5" x2="8.3" y2="10.7"/>
          <line x1="14.5" y1="9.5" x2="15.7" y2="10.7"/>
        }
        @case ('staff') {
          <line x1="12" y1="4.6" x2="12" y2="21"/>
          <circle cx="12" cy="4.2" r="2.2"/>
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="5"/>
          <line x1="20" y1="12" x2="22.5" y2="12"/>
          <line x1="17.66" y1="17.66" x2="19.42" y2="19.42"/>
          <line x1="12" y1="20" x2="12" y2="22.5"/>
          <line x1="6.34" y1="17.66" x2="4.58" y2="19.42"/>
          <line x1="4" y1="12" x2="1.5" y2="12"/>
          <line x1="6.34" y1="6.34" x2="4.58" y2="4.58"/>
          <line x1="12" y1="4" x2="12" y2="1.5"/>
          <line x1="17.66" y1="6.34" x2="19.42" y2="4.58"/>
        }
        @case ('shield') {
          <polygon points="12,2 20,5 20,12 12,22 4,12 4,5"/>
        }
        @case ('heart') {
          <circle cx="8" cy="9" r="4.5"/>
          <circle cx="16" cy="9" r="4.5"/>
          <polygon points="3.7,10.5 20.3,10.5 12,21"/>
        }
        @case ('coin') {
          <circle cx="12" cy="12" r="8"/>
          <circle cx="12" cy="12" r="3.6"/>
        }
        @case ('star') {
          <polygon points="12,3 14.12,9.09 20.56,9.22 15.42,13.11 17.29,19.28 12,15.6 6.71,19.28 8.58,13.11 3.44,9.22 9.88,9.09"/>
        }
        @case ('flask') {
          <line x1="10" y1="2" x2="10" y2="7"/>
          <line x1="14" y1="2" x2="14" y2="7"/>
          <line x1="10" y1="2" x2="14" y2="2"/>
          <polygon points="10,7 14,7 19,21 5,21"/>
          <line x1="6.6" y1="17" x2="17.4" y2="17"/>
        }
        @case ('gem') {
          <polygon points="12,2 19,9 12,22 5,9"/>
          <line x1="5" y1="9" x2="19" y2="9"/>
          <line x1="12" y1="2" x2="9" y2="9"/>
          <line x1="12" y1="2" x2="15" y2="9"/>
        }
        @case ('scroll') {
          <rect x="4" y="5" width="16" height="14" rx="2"/>
          <line x1="7" y1="10" x2="17" y2="10"/>
          <line x1="7" y1="14" x2="14" y2="14"/>
        }
        @case ('skull') {
          <circle cx="12" cy="10" r="7"/>
          <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none"/>
          <line x1="8" y1="16" x2="16" y2="16"/>
          <line x1="9" y1="16" x2="9" y2="18.5"/>
          <line x1="12" y1="16.5" x2="12" y2="19.5"/>
          <line x1="15" y1="16" x2="15" y2="18.5"/>
        }
        @case ('boot') {
          <polygon points="6,3 10,3 10,13 16,13 18,17 18,20 4,20 4,13 6,13"/>
        }
        @case ('stairs') {
          <polyline points="4,6 4,10 9,10 9,14 14,14 14,18 19,18"/>
          <polyline points="15.5,18 19,18 19,14.5"/>
        }
        @case ('layers') {
          <polyline points="4,7 12,10.2 20,7"/>
          <polyline points="4,12 12,15.2 20,12"/>
          <polyline points="4,17 12,20.2 20,17"/>
        }
        @case ('book') {
          <rect x="4" y="4" width="16" height="16" rx="1.4"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
          <line x1="6.5" y1="8" x2="10" y2="8"/>
          <line x1="14" y1="8" x2="17.5" y2="8"/>
        }
        @case ('eye') {
          <path d="M2.5 12C5 7.5 8.3 5.3 12 5.3S19 7.5 21.5 12C19 16.5 15.7 18.7 12 18.7S5 16.5 2.5 12Z"/>
          <circle cx="12" cy="12" r="2.6"/>
        }
        @case ('fist') {
          <rect x="6" y="9.5" width="12" height="9" rx="3.2"/>
          <line x1="9" y1="6.5" x2="9" y2="9.5"/>
          <line x1="12" y1="5.5" x2="12" y2="9.5"/>
          <line x1="15" y1="6.5" x2="15" y2="9.5"/>
        }
        @case ('feather') {
          <line x1="5" y1="19.5" x2="19" y2="5.5"/>
          <line x1="8.2" y1="16.3" x2="11.2" y2="15.1"/>
          <line x1="11.4" y1="13.1" x2="14.4" y2="11.9"/>
          <line x1="14.6" y1="9.9" x2="17.6" y2="8.7"/>
        }
        @case ('backpack') {
          <rect x="9" y="3.5" width="6" height="5" rx="1.3"/>
          <rect x="6" y="8" width="12" height="12.5" rx="2.4"/>
          <line x1="9" y1="12.5" x2="15" y2="12.5"/>
        }
        @case ('key') {
          <circle cx="7.2" cy="7.2" r="3.9"/>
          <line x1="10" y1="10" x2="19.5" y2="19.5"/>
          <line x1="16.2" y1="15.7" x2="18.4" y2="13.5"/>
          <line x1="18.3" y1="17.8" x2="20.4" y2="15.7"/>
        }
        @case ('hammer') {
          <line x1="6" y1="19" x2="13.3" y2="11.7"/>
          <rect x="12.2" y="4.6" width="7.6" height="5" rx="1" transform="rotate(45 16 7.1)"/>
        }
        @case ('cup') {
          <polygon points="6,8 16,8 15,20 7,20"/>
          <rect x="16" y="10" width="4" height="6.4" rx="2"/>
        }
        @case ('crown') {
          <polyline points="4,18 4,9 8.3,13 12,6 15.7,13 20,9 20,18"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        }
        @case ('arrow-right') {
          <line x1="4" y1="12" x2="18" y2="12"/>
          <polyline points="13,7 18,12 13,17"/>
        }
        @case ('globe') {
          <circle cx="12" cy="12" r="9"/>
          <ellipse cx="12" cy="12" rx="4" ry="9"/>
          <line x1="3.2" y1="12" x2="20.8" y2="12"/>
        }
        @case ('check') {
          <polyline points="4,13 9,18 20,6"/>
        }
        @case ('x') {
          <line x1="6" y1="6" x2="18" y2="18"/>
          <line x1="18" y1="6" x2="6" y2="18"/>
        }
        @default {
          <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>
        }
      }
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      flex-shrink: 0;
    }
  `]
})
export class IconComponent {
  @Input() name: IconName | string = 'dot';
  @Input() size = 20;
}
