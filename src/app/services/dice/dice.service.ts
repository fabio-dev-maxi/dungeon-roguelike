import { Injectable } from '@angular/core';
import { mod } from '../../data/game.data';

export interface WeightedItem<T> { v: T; w: number; }

/**
 * Utility per tiri di dado (d20, dadi danno, estrazioni pesate)
 */
@Injectable({ providedIn: 'root' })
export class DiceService {

  /**
   * Genera un numero decimale casuale nell'intervallo [0, 1) crittograficamente sicuro
   */
  private secureRandom(): number {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / 4294967296; // Divisione per 2^32
  }

  rnd(n: number): number {
    if (n <= 0) return 1;
    return Math.floor(this.secureRandom() * n) + 1;
  }

  rollDie(d: number): number {
    return this.rnd(d);
  }

  rollNdM(n: number, d: number): number {
    let total = 0;
    for (let i = 0; i < n; i++) total += this.rollDie(d);
    return total;
  }

  mod(stat: number): number {
    return mod(stat);
  }

  fmtMod(m: number): string {
    return (m >= 0 ? '+' + m : '' + m);
  }

  /**
   * Limita un valore nell'intervallo [a, b]
   * @param v 
   * @param a 
   * @param b 
   * @returns 
   */
  clamp(v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.secureRandom() * arr.length)];
  }

  weightedPick<T>(items: WeightedItem<T>[]): T {
    const total = items.reduce((s, i) => s + i.w, 0);
    let r = this.secureRandom() * total;
    for (const it of items) {
      if (r < it.w) return it.v;
      r -= it.w;
    }
    return items[items.length - 1].v;
  }
}