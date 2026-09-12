import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BoardEngineService } from './services/board-engine.service';
import { BoardPhysicsService } from './services/board-physics.service';
import { BoardGridService } from './services/board-grid.service';
import { BoardEffectsService } from './services/board-effects.service';
import { UnitStats } from './models/board-types';

@Component({
  selector: 'app-board-test',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './board-test.component.html',
  styleUrl: './board-test.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardTestComponent implements AfterViewInit, OnDestroy {
  @ViewChild('boardCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly statusText = signal<string>('Ti trovi nelle profondità della caverna. Tocca un eroe per muoverti o per attaccare!');
  readonly isModalOpen = signal<boolean>(false);
  readonly modalMode = signal<'mage' | 'cleric_heal' | 'cleric_harm' | null>(null);
  readonly selectedUnitStats = signal<UnitStats | null>(null);

  private animFrameId?: number;
  private resizeObserver?: ResizeObserver;

  constructor(
    private ngZone: NgZone,
    private engine: BoardEngineService,
    private physics: BoardPhysicsService,
    private grid: BoardGridService,
    private effects: BoardEffectsService
  ) { }

  async ngAfterViewInit(): Promise<void> {
    await this.physics.initPhysics();
    const canvas = this.canvasRef.nativeElement;
    const { scene, camera } = this.engine.initThree(canvas);

    this.effects.initEffects(scene);
    this.grid.initGrid(scene, camera);
    this.grid.spawnPartyAndBoss();

    this.grid.bindPointerEvents(canvas, (event) => this.handleGridInteraction(event));

    this.resizeObserver = new ResizeObserver(() => this.engine.handleResize());
    this.resizeObserver.observe(canvas.parentElement || canvas);

    this.ngZone.runOutsideAngular(() => this.animateLoop());
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
    this.engine.dispose();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  onWindowResize(): void {
    setTimeout(() => this.engine.handleResize(), 100);
  }

  focusOnSelectedUnit(): void {
    const selected = this.grid.getSelectedUnit();
    if (selected) this.engine.focusOnPosition(selected.root.position);
  }

  selectSpell(spellType: 'fireball' | 'lightning' | 'missile' | 'cure' | 'harm'): void {
    const attackData = this.grid.getPendingAttack();
    if (!attackData) return;

    this.isModalOpen.set(false);

    if (spellType === 'cure') {
      this.effects.rollD20OnBoard(attackData.attacker, attackData.defender, 'cure', (msg) => this.statusText.set(msg));
    } else if (spellType === 'harm') {
      this.effects.rollD20OnBoard(attackData.attacker, attackData.defender, 'cleric_harm', (msg) => this.statusText.set(msg));
    } else {
      this.effects.rollD20OnBoard(attackData.attacker, attackData.defender, spellType, (msg) => this.statusText.set(msg));
    }

    this.grid.clearPendingAttack();
  }

  private handleGridInteraction(event: any): void {
    if (event.type === 'unitSelected') {
      this.selectedUnitStats.set(event.unit.stats);
      this.statusText.set(`${event.unit.stats.name}: Tocca una casella verde o un bersaglio.`);
    } else if (event.type === 'openSpellModal') {
      this.modalMode.set(event.modalType);
      this.isModalOpen.set(true);
    } else if (event.type === 'rangedArrowAttack') {
      this.effects.rollD20OnBoard(event.attacker, event.defender, 'arrow', (msg) => this.statusText.set(msg));
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