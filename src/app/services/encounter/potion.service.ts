import { Injectable } from '@angular/core';
import { InventoryItem, Player } from '../../models/game.models';
import { DiceService } from '../dice/dice.service';

export interface PotionConfig {
  dice: [number, number];
  cost: number;
}

export interface PotionGroup {
  key: string;
  heal: [number, number];
  count: number;
  firstIndex: number;
}

@Injectable({ providedIn: 'root' })
export class PotionService {
  constructor(private readonly dice: DiceService) { }

  /**
   * Calcola potenza (dadi) e costo della pozione in base alla profondità del piano.
   */
  public getConfigForDepth(depth: number): PotionConfig {
    let n = 2;
    let d = 6;
    let cost = 8 + Math.floor(depth / 5) * 5;

    if (depth > 10) {
      d = 8;
      n = 2 + Math.floor((depth - 11) / 10);
    }

    return { dice: [n, d], cost };
  }

  /**
   * Genera un oggetto pozione pronto per l'inventario scalato sul piano corrente.
   */
  public createPotionItem(depth: number): InventoryItem {
    const config = this.getConfigForDepth(depth);
    return { type: 'potion', heal: config.dice };
  }

  /**
   * Aggrega le pozioni nell'inventario in gruppi omogenei per l'interfaccia utente.
   */
  public groupPotions(inventory: InventoryItem[]): PotionGroup[] {
    const map = new Map<string, PotionGroup>();

    inventory.forEach((item, index) => {
      if (item.type === 'potion') {
        const key = `${item.heal[0]}d${item.heal[1]}`;
        const existing = map.get(key);
        if (existing) {
          existing.count++;
        } else {
          map.set(key, {
            key,
            heal: item.heal,
            count: 1,
            firstIndex: index,
          });
        }
      }
    });

    return Array.from(map.values());
  }

  /**
   * Consuma la pozione selezionata, calcola i Punti Ferita e aggiorna l'inventario.
   */
  public consumePotion(
    player: Player,
    inventoryIndex: number
  ): {
    healAmount: number;
    totalHeal: number;
    potion: InventoryItem;
    rolls: number[];
    dmgRoll: number;
    dmgMax: number;
  } | null {
    if (
      inventoryIndex < 0 ||
      inventoryIndex >= player.inventory.length ||
      player.inventory[inventoryIndex].type !== 'potion'
    ) {
      return null;
    }

    // 1. Rimuove la pozione dall'inventario
    const potion = player.inventory.splice(inventoryIndex, 1)[0];
    const [n, d] = potion.heal;

    // 2. Calcola i dadi e le cure (TUTTA la logica matematica è qui)
    const rolls = Array.from({ length: n }, () => this.dice.rollDie(d));
    const dmgRoll = rolls.reduce((a, b) => a + b, 0);
    const dmgMax = n * d;
    const totalHeal = dmgRoll + (player.potionHealBonus || 0);

    // 3. Applica la cura al giocatore
    const oldHp = player.hp;
    player.hp = this.dice.clamp(player.hp + totalHeal, 0, player.maxHp);
    const healAmount = player.hp - oldHp;

    // Ritorna il "risultato" dell'operazione
    return { healAmount, totalHeal, potion, rolls, dmgRoll, dmgMax };
  }
}