import { Injectable } from '@angular/core';
import { mod } from '../data/game.data';

export interface WeightedItem<T> { v: T; w: number; }

@Injectable({ providedIn: 'root' })
export class DiceService {
  rnd(n: number): number {
    return Math.floor(Math.random() * n) + 1;
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
   *  Questo metodo prende il minimo tra b e v, e poi il massimo tra a e il risultato precedente
   */
  clamp(v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Picks an item from an array based on weighted probabilities.
   * @param items 
   * @returns 
   */
  weightedPick<T>(items: WeightedItem<T>[]): T {
    const total = items.reduce((s, i) => s + i.w, 0);
    let r = Math.random() * total;
    for (const it of items) {
      if (r < it.w) return it.v;
      r -= it.w;
    }
    return items[items.length - 1].v;
  }
}
