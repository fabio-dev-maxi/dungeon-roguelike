import { ClassKey, Player } from '../models/game.models';

export const RELIC_IDS = ['shadow_ring', 'giant_belt', 'blood_amulet'];

export const RELIC_CLASS_POOLS: Partial<Record<ClassKey, string[]>> = { fighter: RELIC_IDS };

export function applyRelicEffect(p: Player, relicId: string): void {
  if (relicId === 'blood_amulet') {
    p.critThreshold = (p.critThreshold || 20) - 1; // Riduce la soglia di 1 (es. da 20 a 19, o da 19 a 18)
  } else if (relicId === 'giant_belt') {
    p.stats.str += 3;
    p.maxHp += 10;
    p.hp += 10;
  } else if (relicId === 'shadow_ring') {
    p.stats.dex += 2;
    p.ac += 1;
  }
}
