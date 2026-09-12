import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon/icon.component';
import { BoardEngineService } from './service/board-engine.service';
import { BoardPhysicsService } from './service/board-physics.service';
import { BoardGridService } from './service/board-grid.service';
import { UnitStats } from './models/board-types';
import { BoardEffectsService } from './service/board-effects.service';


@Component({
  selector: 'app-board-test',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './board-test.component.html',
  styleUrl: './board-test.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardTestComponent implements AfterViewInit, OnDestroy {
  @ViewChild('boardCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly statusText = signal<string>('Ti trovi nelle profondità della caverna. Tocca un eroe per muoverti o per attaccare!');
  readonly isModalOpen = signal<boolean>(false);
  readonly selectedUnitStats = signal<UnitStats | null>(null);

  private animFrameId?: number;

  constructor(
    private ngZone: NgZone,
    private engine: BoardEngineService,
    private physics: BoardPhysicsService,
    private grid: BoardGridService,
    private effects: BoardEffectsService
  ) { }

  async ngAfterViewInit(): Promise<void> {
    await this.physics.initPhysics();
    const { scene, camera } = this.engine.initThree(this.canvasRef.nativeElement);

    this.effects.initEffects(scene);
    this.grid.initGrid(scene, camera);
    this.grid.spawnPartyAndBoss();

    this.grid.bindPointerEvents(this.canvasRef.nativeElement, (event) => this.handleGridInteraction(event));

    this.ngZone.runOutsideAngular(() => {
      this.animateLoop();
    });
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.engine.dispose();
  }

  focusOnSelectedUnit(): void {
    this.engine.focusOnPosition(this.grid.getSelectedUnit()?.root.position || { x: 0, y: 0, z: 0 } as any);
  }

  rotateCamera(degrees: number): void {
    this.engine.rotateCamera(degrees);
  }

  selectSpell(spellType: 'fireball' | 'lightning' | 'missile'): void {
    const attackData = this.grid.getPendingAttack();
    if (!attackData) return;

    this.isModalOpen.set(false);
    this.effects.rollD20OnBoard(attackData.attacker, attackData.defender, spellType, (msg) => this.statusText.set(msg));
    this.grid.clearPendingAttack();
  }

  private handleGridInteraction(event: any): void {
    if (event.type === 'unitSelected') {
      this.selectedUnitStats.set(event.unit.stats);
      this.statusText.set(`${event.unit.stats.name}: Tocca una casella verde o un nemico ROSSO.`);
    } else if (event.type === 'openSpellModal') {
      this.isModalOpen.set(true);
    } else if (event.type === 'meleeAttack') {
      this.effects.rollD20OnBoard(event.attacker, event.defender, 'melee', (msg) => this.statusText.set(msg));
    }
  }

  private animateLoop(): void {
    this.animFrameId = requestAnimationFrame(() => this.animateLoop());
    const delta = this.engine.getDelta();

    this.physics.step();
    this.grid.updateMovement(delta);
    this.effects.updateEffects(delta);
    this.physics.syncUnits(this.grid.getUnits());

    this.engine.render();
  }
}