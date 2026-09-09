import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { I18nService } from '../../services/i18n.service';
import { MapNode } from '../../models/game.models';
import { IconComponent, IconName } from '../../shared/icon/icon.component';

export interface MapConnectionLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  status: 'active' | 'visited' | 'locked';
}

/**
 * COMPONENTE MAPPA GOTICA VERTICALE (DISCESA NORD -> SUD)
 * 
 * Renderizza i 7 layer del piano con progressione dall'alto verso il basso (Nord -> Sud):
 * - Layer 1 (Ingresso): In cima al modal.
 * - Layer 2..6 (Ramificazioni): Nel cuore della discesa.
 * - Layer 7 (Soglia del Boss): Negli abissi in fondo alla modale.
 */
@Component({
  selector: 'app-dungeon-map',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './dungeon-map.component.html',
  styleUrl: './dungeon-map.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DungeonMapComponent implements AfterViewInit {
  @ViewChild('mapViewport') private mapViewportRef?: ElementRef<HTMLDivElement>;

  readonly currentMap = computed(() => this.game.state().currentMap);
  readonly isReadOnly = computed(() => this.game.state().phase !== 'map');

  /**
   * Ordina i layer da Nord a Sud (dall'alto verso il basso) per accentuare l'effetto discesa:
   * Layer 1 (Ingresso) in alto, Layer 7 (Boss) in fondo.
   */
  readonly orderedLayers = computed(() => {
    const map = this.currentMap();
    if (!map) return [];
    return map.layers.map((nodeIds, idx) => ({
      layerNum: idx + 1,
      nodeIds,
    }));
  });

  readonly connections = signal<MapConnectionLine[]>([]);

  constructor(
    public readonly game: GameService,
    public readonly i18n: I18nService
  ) { }

  public ngAfterViewInit(): void {
    setTimeout(() => this.recalculateConnections(), 60);
  }

  @HostListener('window:resize')
  public onResize(): void {
    this.recalculateConnections();
  }

  public onNodeClick(node: MapNode): void {
    if (this.isReadOnly() || node.status !== 'available') return;
    this.game.selectMapNode(node);
  }

  public closeMapReadOnly(): void {
    this.game.closeMapReadOnly();
  }

  /**
   * Determina se il nodo deve mostrare il punto interrogativo '?'.
   * Se il nodo è già stato visitato o l'eroe vi si trova sopra, rivela l'icona reale.
   */
  public isHiddenMysteryNode(node: MapNode): boolean {
    if (node.status === 'visited' || node.status === 'current') {
      return false; // Rivela la vera natura del nodo esplorato
    }
    return !!node.isMystery;
  }

  /**
    * Mappa ciascun tipo di incontro all'icona SVG tematica corrispondente.
    */
  public getNodeIcon(node: MapNode): IconName | null {
    if (this.isHiddenMysteryNode(node)) {
      return null; // Mostra il punto interrogativo '?' per i nodi celati
    }

    switch (node.type) {
      case 'combat':
        return 'swords'; // Spade incrociate
      case 'boss':
        return 'crown';  // Corona del Custode
      case 'trap':
        return 'skull';  // Teschio delle trappole
      case 'treasure':
        return 'chest';  // Forziere del tesoro in ferro e legno
      case 'shrine':
        return 'sun';    // Altare sacro e radioso
      case 'merchant':
        return 'scale';    // Sacco di monete del mercante
      case 'tavern':
        return 'cup';    // Boccale di idromele
      default:
        return 'chest';
    }
  }

  /**
   * Etichetta del tooltip: maschera come 'Anfratto Ignoto' se il nodo è celato.
   */
  public getNodeTypeLabel(node: MapNode): string {
    if (this.isHiddenMysteryNode(node)) {
      return 'Anfratto Ignoto (?)';
    }

    switch (node.type) {
      case 'combat':
        return 'Scontro Tattico';
      case 'boss':
        return 'Custode del Piano';
      case 'trap':
        return 'Trappola Mortale';
      case 'treasure':
        return 'Forziere del Tesoro';
      case 'shrine':
        return 'Altare Sacro';
      case 'merchant':
        return 'Mercante Ambulante';
      case 'tavern':
        return 'Taverna del Rifugio';
      default:
        return 'Anfratto Oscuro';
    }
  }

  /**
   * Traccia e aggiorna i collegamenti vettoriali SVG dall'alto verso il basso.
   */
  private recalculateConnections(): void {
    const map = this.currentMap();
    const viewport = this.mapViewportRef?.nativeElement;
    if (!map || !viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const newConnections: MapConnectionLine[] = [];

    Object.values(map.nodes).forEach((sourceNode) => {
      const sourceEl = viewport.querySelector<HTMLElement>(`[data-node-id="${sourceNode.id}"]`);
      if (!sourceEl) return;

      const sourceRect = sourceEl.getBoundingClientRect();
      const cx1 = sourceRect.left + sourceRect.width / 2 - viewportRect.left;
      const cy1 = sourceRect.top + sourceRect.height / 2 - viewportRect.top;
      const r1 = sourceRect.width / 2; // Raggio del nodo di partenza

      sourceNode.nextNodes.forEach((targetId) => {
        const targetNode = map.nodes[targetId];
        const targetEl = viewport.querySelector<HTMLElement>(`[data-node-id="${targetId}"]`);
        if (!targetEl || !targetNode) return;

        const targetRect = targetEl.getBoundingClientRect();
        const cx2 = targetRect.left + targetRect.width / 2 - viewportRect.left;
        const cy2 = targetRect.top + targetRect.height / 2 - viewportRect.top;
        const r2 = targetRect.width / 2; // Raggio del nodo di arrivo

        // Calcolo vettoriale della distanza e offset sui bordi dei cerchi
        const dx = cx2 - cx1;
        const dy = cy2 - cy1;
        const dist = Math.hypot(dx, dy);

        let x1 = cx1;
        let y1 = cy1;
        let x2 = cx2;
        let y2 = cy2;

        if (dist > r1 + r2) {
          const ux = dx / dist;
          const uy = dy / dist;

          // Trasla il punto iniziale verso l'esterno di r1 e il punto finale indietro di r2
          x1 = cx1 + ux * r1;
          y1 = cy1 + uy * r1;
          x2 = cx2 - ux * r2;
          y2 = cy2 - uy * r2;
        }

        let lineStatus: 'active' | 'visited' | 'locked' = 'locked';
        if (
          (sourceNode.status === 'visited' || sourceNode.status === 'current') &&
          targetNode.status === 'available'
        ) {
          lineStatus = 'active';
        } else if (
          (sourceNode.status === 'visited' || sourceNode.status === 'current') &&
          (targetNode.status === 'visited' || targetNode.status === 'current')
        ) {
          lineStatus = 'visited';
        }

        newConnections.push({
          id: `${sourceNode.id}->${targetId}`,
          x1,
          y1,
          x2,
          y2,
          status: lineStatus,
        });
      });
    });

    this.connections.set(newConnections);
  }
}