import { Injectable, signal } from '@angular/core';
import { I18N, LangCode } from '../data/i18n.data';

/**
 * Risoluzione traduzioni e formattazione dinamica delle stringhe
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  currentLang = signal<LangCode>('it');

  setLang(lang: LangCode): void {
    this.currentLang.set(lang);
  }

  t(path: string): any {
    const lang = this.currentLang();
    const keys = path.split('.');
    let cur: any = I18N[lang];
    for (const k of keys) {
      if (!cur) return path;
      cur = cur[k];
    }
    return cur ?? path;
  }

  tf(path: string, vars: Record<string, any> = {}): string {
    let res = this.t(path);
    if (typeof res !== 'string') return path;
    for (const [k, v] of Object.entries(vars)) {
      res = res.replaceAll(`{${k}}`, String(v));
    }
    return res;
  }
}