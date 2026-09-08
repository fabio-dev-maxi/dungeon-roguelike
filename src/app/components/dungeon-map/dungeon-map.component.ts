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
 * COMPONENTE MAPPA GOTICA VERTICALE
 * 
 * Gestisce il rendering del grafico, l'ispezione in sola lettura e la rivelazione
 * progressiva delle icone reali solo dopo la visita o per i nodi espliciti.
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

  /** Inverte la visualizzazione dei layer: Layer 7 (Boss) in alto, Layer 1 in basso */
  readonly reversedLayers = computed(() => {
    const map = this.currentMap();
    if (!map) return [];
    return map.layers
      .map((nodeIds, idx) => ({
        layerNum: idx + 1,
        nodeIds,
      }))
      .reverse();
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
   * Se il nodo è già stato visitato o si trova al suo interno, rivela l'icona reale.
   * Altrimenti si affida al flag `isMystery` impostato dal generatore.
   */
  public isHiddenMysteryNode(node: MapNode): boolean {
    if (node.status === 'visited' || node.status === 'current') {
      return false; // Rivela la vera natura del nodo appena esplorato
    }
    return !!node.isMystery;
  }

  /**
   * Restituisce l'icona specifica per il nodo.
   * Ritorna `null` per i nodi misteriosi in modo da renderizzare '?' nel template.
   */
  public getNodeIcon(node: MapNode): IconName | null {
    if (this.isHiddenMysteryNode(node)) {
      return null;
    }

    switch (node.type) {
      case 'combat':
        return 'swords'; // Icona spade incrociate per gli scontri con mostri visibili
      case 'boss':
        return 'crown';
      case 'trap':
        return 'skull';
      case 'treasure':
        return 'coin';
      case 'shrine':
        return 'sun';
      case 'merchant':
        return 'scroll';
      case 'tavern':
        return 'cup';
      default:
        return 'scroll';
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
      const x1 = sourceRect.left + sourceRect.width / 2 - viewportRect.left;
      const y1 = sourceRect.top + sourceRect.height / 2 - viewportRect.top;

      sourceNode.nextNodes.forEach((targetId) => {
        const targetNode = map.nodes[targetId];
        const targetEl = viewport.querySelector<HTMLElement>(`[data-node-id="${targetId}"]`);
        if (!targetEl || !targetNode) return;

        const targetRect = targetEl.getBoundingClientRect();
        const x2 = targetRect.left + targetRect.width / 2 - viewportRect.left;
        const y2 = targetRect.top + targetRect.height / 2 - viewportRect.top;

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