import { Injectable } from '@angular/core';
import { FloorMap, MapNode, NodeStatus, NodeType } from '../models/game.models';
import { DiceService, WeightedItem } from './dice/dice.service';

/**
 * SERVIZIO GENERATORE MAPPA DAG (ALTA DENSITÀ COMBATTIMENTI D&D 3.5)
 * 
 * Ricalibrato per garantire un'alta presenza di scontri lungo la discesa:
 * - Layer 2..5: 75% di probabilità Combattimento (garantisce almeno 3 mostri per percorso).
 * - Layer 6: 40% Combattimento, 60% Supporto (Taverna/Mercante/Santuario).
 * - Visibilità: I Mercanti e la maggior parte dei Mostri (90%) mostrano la loro icona, 
 *   mentre trappole, tesori e il 10% dei mostri restano mascherati sotto '?'.
 */
@Injectable({ providedIn: 'root' })
export class MapGeneratorService {

  constructor(private readonly dice: DiceService) { }

  /**
   * Genera la mappa a 7 Layer per il Piano Globale indicato.
   * @param floorNumber Numero del Piano Globale (Piano 1, 2, ecc.)
   */
  public generateMapForFloor(floorNumber: number): FloorMap {
    const nodes: Record<string, MapNode> = {};
    const layers: string[][] = [];

    // =========================================================================
    // STEP 1: LAYOUT E DENSITÀ DEI LAYER (DAL LAYER 1 AL LAYER 7)
    // =========================================================================
    const layerCounts = [
      1,                         // Layer 1: Ingresso unico (Start eroe)
      this.dice.pick([3, 4, 5]), // Layer 2: Prima ramificazione
      this.dice.pick([3, 4, 5]), // Layer 3: Cunicoli centrali
      this.dice.pick([3, 4, 5]), // Layer 4: Cunicoli profondi
      this.dice.pick([3, 4, 5]), // Layer 5: Anfratti pre-santuario
      this.dice.pick([2, 3, 4]), // Layer 6: Ristoro / Pre-Boss
      1                          // Layer 7: Soglia del Boss Finale
    ];

    // =========================================================================
    // STEP 2: CREAZIONE NODI E MASCHERAMENTO
    // =========================================================================
    layerCounts.forEach((count, layerIndex) => {
      const currentLayerNum = layerIndex + 1; // 1..7
      const layerNodeIds: string[] = [];

      for (let nodeIdx = 0; nodeIdx < count; nodeIdx++) {
        const nodeId = `node_L${currentLayerNum}_${nodeIdx}`;
        layerNodeIds.push(nodeId);

        // Estrazione tipo reale dell'incontro
        const type = this.pickNodeTypeForLayer(currentLayerNum);

        // --- REGOLE VISIBILITÀ ---
        let isMystery = false;
        if (currentLayerNum > 1 && currentLayerNum < 7) {
          if (type === 'merchant') {
            isMystery = false; // Mercante sempre visibile
          } else if (type === 'combat') {
            isMystery = Math.random() < 0.10; // Solo 10% mostri nascosti sotto '?'
          } else {
            isMystery = true; // Trappole, Tesori, Altari, Taverne celati sotto '?'
          }
        }

        const initialStatus: NodeStatus = currentLayerNum === 1 ? 'current' : 'locked';

        nodes[nodeId] = {
          id: nodeId,
          layer: currentLayerNum,
          type,
          status: initialStatus,
          isMystery,
          nextNodes: []
        };
      }

      layers.push(layerNodeIds);
    });

    // =========================================================================
    // STEP 3: CONNETTI I LAYER CON INCROCI DI PERCORSO (DAG)
    // =========================================================================
    for (let l = 0; l < layers.length - 1; l++) {
      this.connectLayersIntricate(layers[l], layers[l + 1], nodes);
    }

    // =========================================================================
    // STEP 4: ATTIVAZIONE NODI ADIACENTI AL LAYER 1
    // =========================================================================
    const startNodeId = layers[0][0];
    nodes[startNodeId].nextNodes.forEach((nextId) => {
      nodes[nextId].status = 'available';
    });

    return {
      nodes,
      layers,
      currentNodeId: startNodeId
    };
  }

  /**
   * Assegna il tipo di incontro con alta concentrazione di combattimenti (75% nei layer 2..5).
   */
  private pickNodeTypeForLayer(layer: number): NodeType {
    if (layer === 7) return 'boss';
    if (layer === 1) return 'shrine';

    if (layer === 6) {
      // Layer 6: Ristoro ma con possibilità del 40% di trovare un ultimo mostro
      const prepPool: WeightedItem<NodeType>[] = [
        { v: 'combat', w: 40 },
        { v: 'shrine', w: 25 },
        { v: 'merchant', w: 20 },
        { v: 'tavern', w: 15 }
      ];
      return this.dice.weightedPick(prepPool);
    }

    // Layer 2..5: 75% Combattimenti garantiti per mantenere attiva la progressione XP
    const corePool: WeightedItem<NodeType>[] = [
      { v: 'combat', w: 75 },   // 75% Scontro Mostro (garantisce >= 3 combattimenti a percorso)
      { v: 'trap', w: 8 },      // 8% Trappola
      { v: 'treasure', w: 7 },  // 7% Forziere
      { v: 'shrine', w: 5 },    // 5% Altare
      { v: 'merchant', w: 3 },  // 3% Mercante
      { v: 'tavern', w: 2 }     // 2% Taverna
    ];
    return this.dice.weightedPick(corePool);
  }

  /**
   * Algoritmo di collegamento ad alta densità per creare percorsi intrecciati.
   */
  private connectLayersIntricate(
    currentLayerIds: string[],
    nextLayerIds: string[],
    nodes: Record<string, MapNode>
  ): void {
    const connectedNextIndices = new Set<number>();

    currentLayerIds.forEach((currId, currIdx) => {
      const ratio = currIdx / (currentLayerIds.length - 1 || 1);
      const targetBaseIdx = Math.floor(ratio * (nextLayerIds.length - 1));

      const primaryTargetId = nextLayerIds[targetBaseIdx];
      nodes[currId].nextNodes.push(primaryTargetId);
      connectedNextIndices.add(targetBaseIdx);

      if (nextLayerIds.length > 1 && Math.random() < 0.65) {
        const extraOffset = Math.random() < 0.5 ? 1 : -1;
        const extraIdx = targetBaseIdx + extraOffset;
        if (extraIdx >= 0 && extraIdx < nextLayerIds.length) {
          const extraTargetId = nextLayerIds[extraIdx];
          if (!nodes[currId].nextNodes.includes(extraTargetId)) {
            nodes[currId].nextNodes.push(extraTargetId);
            connectedNextIndices.add(extraIdx);
          }
        }
      }
    });

    nextLayerIds.forEach((nextId, nextIdx) => {
      if (!connectedNextIndices.has(nextIdx)) {
        const ratio = nextIdx / (nextLayerIds.length - 1 || 1);
        const sourceIdx = Math.floor(ratio * (currentLayerIds.length - 1));
        const sourceId = currentLayerIds[sourceIdx];

        if (!nodes[sourceId].nextNodes.includes(nextId)) {
          nodes[sourceId].nextNodes.push(nextId);
        }
      }
    });
  }
}