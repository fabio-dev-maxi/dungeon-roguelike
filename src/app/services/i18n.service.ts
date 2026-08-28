import { Injectable, signal } from '@angular/core';
import { I18N, LangCode } from '../data/i18n.data';

/**
 * Servizio di risoluzione traduzioni e formattazione dinamica delle stringhe.
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
    if (!cur) return path;

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

  /**
   * I nomi dell'equipaggiamento avanzato stanno sotto `equipment` in alcune lingue
   * e sotto `weapons`/`armors` in altre: senza questo fallback una delle due forme
   * mostrerebbe la chiave grezza al posto del nome.
   */
  equipmentName(key: string, kind: 'weapons' | 'armors'): string {
    const fromEquipment = this.t(`equipment.${key}.name`);
    if (typeof fromEquipment === 'string' && !fromEquipment.startsWith('equipment.')) {
      return fromEquipment;
    }
    return this.t(`${kind}.${key}`);
  }
}