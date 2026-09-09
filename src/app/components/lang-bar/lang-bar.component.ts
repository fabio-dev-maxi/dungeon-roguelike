import { ChangeDetectionStrategy, Component, ElementRef, HostListener, signal } from '@angular/core';
import { GameService } from '../../services/game.service';
import { LANGS, LANG_LABELS, LangCode } from '../../data/i18n.data';

export const LANG_FLAGS: Record<LangCode, string> = {
  it: '🇮🇹',
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪'
};

@Component({
  selector: 'app-lang-bar',
  standalone: true,
  templateUrl: './lang-bar.component.html',
  styleUrl: './lang-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LangBarComponent {
  langs = LANGS;
  labels = LANG_LABELS;
  flags = LANG_FLAGS;
  isOpen = signal(false);

  constructor(public game: GameService, private elementRef: ElementRef) { }

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  select(l: LangCode): void {
    this.game.setLang(l);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}