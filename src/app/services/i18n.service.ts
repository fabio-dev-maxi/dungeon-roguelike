import { Injectable, signal } from '@angular/core';
import { I18N, LangCode } from '../data/i18n.data';

@Injectable({ providedIn: 'root' })
export class I18nService {
  lang = signal<LangCode>('it');

  setLang(lang: LangCode): void {
    this.lang.set(lang);
  }

  private currentDict(): any {
    return I18N[this.lang()] || I18N['it'];
  }

  /** Resolve a dotted path (e.g. "ui.title") against the active language, falling back to Italian. */
  t(path: string): any {
    const parts = path.split('.');
    let node: any = this.currentDict();
    for (const p of parts) node = node ? node[p] : undefined;
    if (node === undefined) {
      node = I18N['it'];
      for (const p of parts) node = node ? node[p] : undefined;
    }
    return node !== undefined ? node : path;
  }

  /** Replace {key} placeholders in a translated string with the given values. */
  fmt(str: string, vars: Record<string, any> = {}): string {
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ''));
  }

  /** Shortcut for t() + fmt(). */
  tf(path: string, vars: Record<string, any> = {}): string {
    return this.fmt(this.t(path), vars);
  }
}
