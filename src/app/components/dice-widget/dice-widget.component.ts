import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  input,
} from "@angular/core";
import * as THREE from "three";
import { DicePhysicsService, PhysicalDieBody } from "../../services/dice/dice-physics.service";
import { Dice3dFactoryService, getShapeScaleMultiplier } from "../../services/dice/dice-3d-factory.service";

/** Durata della fase di interpolazione di assestamento finale (ms) */
export const DICE_SETTLE_MS = 320;
const DICE_CANVAS_SIZE = 80;

/**
 * Componente UI del Dado 3D WebGL.
 * Gestisce l'aggancio del Canvas al DOM, gli input Signal reattivi di Angular,
 * e delega la fisica e la generazione delle geometrie ai relativi servizi dedicati.
 */
@Component({
  selector: "app-dice-widget",
  standalone: true,
  templateUrl: "./dice-widget.component.html",
  styleUrl: "./dice-widget.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiceWidgetComponent implements OnDestroy {
  /** Valore numerico per dado singolo (es. d20 attacco) */
  readonly value = input<number | null>(null);
  /** Array di valori numerici per lanci multipli (es. 2d4, 3d6) */
  readonly values = input<number[] | null | undefined>(null);
  /** Stato attivo del lancio (attiva il loop di animazione/fisica) */
  readonly isActive = input(false);
  /** Numero di facce del dado */
  readonly sides = input(20);
  /** Colore primario del dado */
  readonly themeColor = input("#8b0000");
  /** Colore delle cifre sul dado */
  readonly labelColor = input("#ffffff");

  /** Segnale computato: restituisce true se il lancio coinvolge più dadi */
  readonly isMultiDice = computed(() => (this.values()?.length ?? 0) > 1);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private diceMesh?: THREE.Mesh;
  private physicalDice: PhysicalDieBody[] = [];
  private multiRollStartTime = 0;

  private animFrameId?: number;
  private stopAnimFrameId?: number;
  private retryTimeoutId?: ReturnType<typeof setTimeout>;
  private targetQuaternions: THREE.Quaternion[] = [];
  private isRollingAnim = false;
  private builtSides: number | null = null;
  private canvasEl?: HTMLCanvasElement;
  private isDestroyed = false;

  @ViewChild("diceCanvas")
  set canvasRef(ref: ElementRef<HTMLCanvasElement> | undefined) {
    if (ref && !this.scene && !this.isDestroyed) {
      this.canvasEl = ref.nativeElement;
      this.bindContextEvents(this.canvasEl);
      this.initThree(this.canvasEl);
      this.rebuildMesh();
      this.syncRollState();
    } else if (!ref && this.scene) {
      this.destroyThree();
    }
  }

  constructor(
    private readonly ngZone: NgZone,
    private readonly diceFactory: Dice3dFactoryService,
    private readonly dicePhysics: DicePhysicsService
  ) {
    // Effetto reattivo Angular: traccia i cambi di input e sincronizza il rendering 3D
    effect(() => {
      const sides = this.sides();
      const active = this.isActive();
      const value = this.value();
      const values = this.values();

      void active; void value; void values;

      if (!this.scene || this.isDestroyed) return;

      this.updateViewportSize();
      const normalizedSides = this.diceFactory.normalizeSides(sides);
      if (this.builtSides !== normalizedSides) {
        this.rebuildMesh();
      }
      this.syncRollState();
    });
  }

  /**
   * Registra gli ascoltatori per la perdita e il ripristino del contesto WebGL.
   */
  private bindContextEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);
  }

  private unbindContextEvents(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener("webglcontextlost", this.onContextLost);
    canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
  }

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.isRollingAnim = false;
    this.cancelAnimationLoop();
    this.cancelSettle();
  };

  private onContextRestored = (): void => {
    if (this.isDestroyed) return;
    this.recreateDiceEngine();
  };

  /** Gestione degli errori di rendering con tentativi di ripristino ritardati */
  private handleRenderError(): void {
    if (this.isDestroyed) return;
    this.cancelAnimationLoop();
    this.cancelSettle();
    this.destroyThree(false);
    if (this.retryTimeoutId !== undefined) clearTimeout(this.retryTimeoutId);
    this.retryTimeoutId = setTimeout(() => {
      this.retryTimeoutId = undefined;
      if (!this.isDestroyed) this.recreateDiceEngine();
    }, 150);
  }

  private recreateDiceEngine(): void {
    if (!this.canvasEl || this.isDestroyed) return;
    try {
      this.destroyThree(false);
      this.initThree(this.canvasEl);
      this.rebuildMesh();
      this.syncRollState();
    } catch (error) {
      console.error("Impossibile ripristinare il dado 3D:", error);
      this.handleRenderError();
    }
  }

  private rebuildMesh(): void {
    const normalizedSides = this.diceFactory.normalizeSides(this.sides());
    this.builtSides = normalizedSides;
    this.buildDiceMesh();
  }

  /**
   * Smista la gestione dello stato tra Dado Singolo (rotazione classica)
   * e Multi-Dado (simulazione fisica 3D).
   */
  private syncRollState(): void {
    if (this.isMultiDice()) {
      if (this.physicalDice.length === 0) return;
      if (this.isActive()) {
        this.cancelSettle();
        this.rebuildMesh();
        this.startMultiPhysicalRoll();
        return;
      }
      this.cancelAnimationLoop();
      this.stopMultiRollAnimation();
      return;
    }

    // --- DADO SINGOLO (d20, Tiro PF, ecc.) ---
    if (!this.diceMesh) return;
    if (this.isActive()) {
      this.cancelSettle();
      this.isRollingAnim = true;
      this.startAnimationLoop();
      return;
    }
    this.isRollingAnim = false;
    this.cancelAnimationLoop();
    const value = this.value();
    if (value !== null && this.targetQuaternions.length > 0) {
      const targetIdx = Math.max(0, Math.min(this.targetQuaternions.length - 1, Math.trunc(value) - 1));
      this.stopRollAnimation(targetIdx);
      return;
    }
    this.renderFrame();
  }

  private cancelSettle(): void {
    if (this.stopAnimFrameId !== undefined) {
      cancelAnimationFrame(this.stopAnimFrameId);
      this.stopAnimFrameId = undefined;
    }
  }

  private cancelAnimationLoop(): void {
    if (this.animFrameId !== undefined) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = undefined;
    }
  }

  /**
   * Inizializza la Scena, la Camera e il WebGLRenderer di Three.js.
   */
  private initThree(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.z = 3.4;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(3, 4, 5);
    this.scene.add(directionalLight);

    const isMobile = this.isMobileViewport();
    const reducedMotion = this.prefersReducedMotion();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !isMobile && !reducedMotion,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(this.getPixelRatio());
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.updateViewportSize();
  }

  /**
   * Aggiorna le dimensioni della viewport del Canvas e l'aspect ratio della telecamera.
   */
  private updateViewportSize(): void {
    if (!this.renderer || !this.camera) return;
    const isMulti = this.isMultiDice();
    const isMobile = this.isMobileViewport();

    const multiWidth = isMobile ? 180 : 230;
    const w = isMulti ? multiWidth : DICE_CANVAS_SIZE;
    const h = DICE_CANVAS_SIZE;

    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.z = isMulti ? (isMobile ? 3.1 : 2.6) : 3.4;
    this.camera.updateProjectionMatrix();
  }

  private isMobileViewport(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private getPixelRatio(): number {
    if (typeof window === "undefined") return 1;
    const dpr = window.devicePixelRatio || 1;
    return this.isMobileViewport() ? Math.min(dpr, 1.25) : Math.min(dpr, 1.5);
  }

  private renderFrame(): void {
    if (!this.renderer || !this.scene || !this.camera || this.isDestroyed) return;
    if (this.renderer.getContext().isContextLost()) return;
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.warn("Errore durante il rendering del dado 3D:", error);
      this.handleRenderError();
    }
  }

  /** Loop di animazione continuo per Dado Singolo (esegue fuori dalla Zone di Angular per prestazioni) */
  private startAnimationLoop(): void {
    if (this.animFrameId !== undefined || !this.diceMesh || !this.renderer || !this.scene || !this.camera || this.isDestroyed) return;
    this.ngZone.runOutsideAngular(() => {
      const tick = (): void => {
        if (this.isDestroyed || !this.isRollingAnim || !this.diceMesh) {
          this.animFrameId = undefined;
          this.renderFrame();
          return;
        }
        try {
          this.diceMesh.rotation.x += 0.22;
          this.diceMesh.rotation.y += 0.28;
          this.diceMesh.rotation.z += 0.14;
          this.renderFrame();
          if (this.isDestroyed || !this.isRollingAnim) {
            this.animFrameId = undefined;
            return;
          }
          this.animFrameId = requestAnimationFrame(tick);
        } catch (error) {
          this.animFrameId = undefined;
          this.handleRenderError();
        }
      };
      this.animFrameId = requestAnimationFrame(tick);
    });
  }

  /** Assestamento Slerp sul numero per Dado Singolo */
  private stopRollAnimation(targetIdx: number): void {
    if (!this.diceMesh || this.targetQuaternions.length === 0) return;
    this.isRollingAnim = false;
    this.cancelAnimationLoop();
    this.cancelSettle();

    this.diceMesh.position.set(0, 0, 0);
    const validIdx = Math.max(0, Math.min(this.targetQuaternions.length - 1, targetIdx));
    const targetQ = this.targetQuaternions[validIdx];
    const snapQ = this.diceMesh.quaternion.clone();

    if (this.prefersReducedMotion()) {
      this.diceMesh.quaternion.copy(targetQ);
      this.renderFrame();
      return;
    }

    const startTime = performance.now();
    const animateStop = (now: number): void => {
      if (!this.diceMesh || this.isDestroyed) {
        this.stopAnimFrameId = undefined;
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DICE_SETTLE_MS, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      this.diceMesh.quaternion.slerpQuaternions(snapQ, targetQ, easeOut);
      this.renderFrame();
      if (progress < 1) {
        this.stopAnimFrameId = requestAnimationFrame(animateStop);
        return;
      }
      this.diceMesh.quaternion.copy(targetQ);
      this.stopAnimFrameId = undefined;
      this.renderFrame();
    };
    this.stopAnimFrameId = requestAnimationFrame(animateStop);
  }

  /** Costruisce i Mesh 3D nella scena per Dado Singolo o Multi-Dado */
  private buildDiceMesh(): void {
    if (!this.scene) return;
    this.cancelSettle();

    if (this.diceMesh) {
      this.scene.remove(this.diceMesh);
      this.diceMesh = undefined;
    }
    this.physicalDice.forEach((b) => this.scene?.remove(b.mesh));
    this.physicalDice = [];

    const numSides = this.diceFactory.normalizeSides(this.sides());
    const shape = this.diceFactory.getShape(numSides);
    this.targetQuaternions = shape.quaternions;

    const maxAnisotropy = this.renderer?.capabilities.getMaxAnisotropy() ?? 1;
    const materials = this.diceFactory.getMaterials(
      numSides,
      this.themeColor(),
      this.labelColor(),
      this.isMobileViewport(),
      maxAnisotropy
    );

    if (this.isMultiDice()) {
      const list = this.values()!;
      const count = list.length;
      const shapeMult = getShapeScaleMultiplier(numSides);

      list.forEach((val, idx) => {
        const mesh = new THREE.Mesh(shape.geometry, materials);
        const baseScale = count > 3 ? 0.50 : count === 3 ? 0.58 : 0.68;
        const finalScale = baseScale * shapeMult;
        mesh.scale.set(finalScale, finalScale, finalScale);

        this.scene!.add(mesh);

        const validIdx = Math.max(0, Math.min(this.targetQuaternions.length - 1, val - 1));
        const targetQ = this.targetQuaternions[validIdx] ?? new THREE.Quaternion();

        // Passo di distanziamento visivo aumentato
        const spreadStep = count > 3 ? 1.30 : count === 3 ? 1.55 : 1.85;
        const spread = (idx - (count - 1) / 2) * spreadStep;

        this.physicalDice.push({
          mesh,
          pos: new THREE.Vector3(spread, 0, 0),
          vel: new THREE.Vector3(),
          rot: targetQ.clone(),
          angVel: new THREE.Vector3(),
          radius: 0.5 * finalScale,
          targetQ,
          val,
        });

        mesh.position.set(spread, 0, 0);
        mesh.quaternion.copy(targetQ);
      });
    } else {
      this.diceMesh = new THREE.Mesh(shape.geometry, materials);
      this.diceMesh.position.set(0, 0, 0);
      this.diceMesh.scale.set(1, 1, 1);
      this.scene.add(this.diceMesh);

      const value = this.value();
      if (value !== null && this.targetQuaternions.length > 0) {
        const idx = Math.max(0, Math.min(this.targetQuaternions.length - 1, Math.trunc(value) - 1));
        this.diceMesh.quaternion.copy(this.targetQuaternions[idx]);
      }
    }
  }

  /** Avvia la simulazione della fisica multi-dado mediante il DicePhysicsService */
  private startMultiPhysicalRoll(): void {
    this.cancelAnimationLoop();
    this.multiRollStartTime = performance.now();
    this.dicePhysics.initMultiRoll(this.physicalDice);

    const isMobile = this.isMobileViewport();
    // Confini della board ampliati per consentire ai dadi di muoversi più largamente
    const trayW = isMobile ? 1.9 : 2.5;
    const trayH = 0.75;
    const dt = 0.016;

    this.ngZone.runOutsideAngular(() => {
      const tick = () => {
        if (this.isDestroyed || !this.isActive()) {
          this.animFrameId = undefined;
          return;
        }
        const elapsed = performance.now() - this.multiRollStartTime;
        const rollProgress = Math.min(elapsed / 480, 1.0);

        this.dicePhysics.updateMultiPhysicsStep(this.physicalDice, dt, trayW, trayH, rollProgress);
        this.renderFrame();
        this.animFrameId = requestAnimationFrame(tick);
      };
      this.animFrameId = requestAnimationFrame(tick);
    });
  }

  /** Assestamento finale Multi-Dado nei punti reali di atterraggio sulla board */
  private stopMultiRollAnimation(): void {
    if (this.physicalDice.length === 0) return;

    this.cancelAnimationLoop();
    this.cancelSettle();

    const count = this.physicalDice.length;
    // Spaziatura per l'assestamento finale ricalibrata
    const spreadStep = count > 3 ? 1.30 : count === 3 ? 1.55 : 1.85;

    if (this.prefersReducedMotion()) {
      this.physicalDice.forEach((b, idx) => {
        const spread = (idx - (count - 1) / 2) * spreadStep;
        b.mesh.position.set(spread, 0, 0);
        b.mesh.quaternion.copy(b.targetQ);
      });
      this.renderFrame();
      return;
    }

    const initialSnaps = this.physicalDice.map((b) => ({
      snapQ: b.mesh.quaternion.clone(),
      snapPos: b.mesh.position.clone(),
      targetQ: b.targetQ.clone(),
      targetPos: new THREE.Vector3(b.mesh.position.x, -0.15, b.mesh.position.z),
    }));

    const startTime = performance.now();
    const animateStop = (now: number): void => {
      if (this.isDestroyed || this.physicalDice.length === 0) {
        this.stopAnimFrameId = undefined;
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DICE_SETTLE_MS, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      this.physicalDice.forEach((b, idx) => {
        const snap = initialSnaps[idx];
        if (snap) {
          b.mesh.quaternion.slerpQuaternions(snap.snapQ, snap.targetQ, easeOut);
          b.mesh.position.lerpVectors(snap.snapPos, snap.targetPos, easeOut);
        }
      });

      this.renderFrame();

      if (progress < 1) {
        this.stopAnimFrameId = requestAnimationFrame(animateStop);
        return;
      }

      this.physicalDice.forEach((b, idx) => {
        const snap = initialSnaps[idx];
        if (snap) {
          b.mesh.quaternion.copy(snap.targetQ);
          b.mesh.position.copy(snap.targetPos);
        }
      });
      this.stopAnimFrameId = undefined;
      this.renderFrame();
    };

    this.stopAnimFrameId = requestAnimationFrame(animateStop);
  }

  /** Distruzione del componente e rilascio risorse */
  private destroyThree(forceContextLoss = false): void {
    this.cancelAnimationLoop();
    this.cancelSettle();
    if (this.retryTimeoutId !== undefined) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = undefined;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (forceContextLoss) {
        this.renderer.forceContextLoss();
      }
    }
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;
    this.diceMesh = undefined;
    this.physicalDice = [];
    this.targetQuaternions = [];
    this.builtSides = null;
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.canvasEl) {
      this.unbindContextEvents(this.canvasEl);
    }
    this.destroyThree(true);
    this.diceFactory.disposeMaterials();
  }
}