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

interface DiceShape {
  geometry: THREE.BufferGeometry;
  quaternions: THREE.Quaternion[];
}

interface PhysicalDieBody {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Quaternion;
  angVel: THREE.Vector3;
  radius: number;
  targetQ: THREE.Quaternion;
  val: number;
}

/** Moltiplicatori di scala visiva riequilibrati per una via di mezzo ideale tra leggibilità e ingombro */
function getShapeScaleMultiplier(sides: number): number {
  switch (sides) {
    case 4:
      return 1.25; // Equilibrato per pareggiare il d6 senza risultare gigantesco
    case 6:
      return 0.85;
    case 8:
      return 0.95;
    case 10:
      return 0.95;
    case 12:
      return 0.90;
    case 20:
    default:
      return 0.90;
  }
}

const SHAPE_CACHE = new Map<number, DiceShape>();
export const DICE_SETTLE_MS = 320;
const DICE_CANVAS_SIZE = 80;
const DESKTOP_FACE_TEXTURE_SIZE = 384;
const MOBILE_FACE_TEXTURE_SIZE = 256;

/**
 * High-resolution face texture.
 * The widget itself is only 80x80 CSS pixels, but the numbers are rendered
 * at a resolution above their display size before being sampled by WebGL.
 * Mobile uses smaller textures to avoid exhausting its more limited GPU memory.
 */
@Component({
  selector: "app-dice-widget",
  standalone: true,
  templateUrl: "./dice-widget.component.html",
  styleUrl: "./dice-widget.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiceWidgetComponent implements OnDestroy {
  readonly value = input<number | null>(null);
  readonly values = input<number[] | null | undefined>(null);
  readonly isActive = input(false);
  readonly sides = input(20);
  readonly themeColor = input("#8b0000");
  readonly labelColor = input("#ffffff");

  readonly isMultiDice = computed(() => (this.values()?.length ?? 0) > 1);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private diceMesh?: THREE.Mesh;
  private physicalDice: PhysicalDieBody[] = [];

  /**
   * Continuous loop is used ONLY during the actual roll.
   * When idle there is no RAF loop.
   */
  private animFrameId?: number;

  /**
   * Short animation used to settle on the final face.
   */
  private stopAnimFrameId?: number;

  /**
   * Delayed WebGL recovery.
   */
  private retryTimeoutId?: ReturnType<typeof setTimeout>;

  /**
   * Materials contain textures allocated in a specific WebGL context. They
   * must never be shared with another dice widget or disposed by its teardown.
   */
  private readonly materialCache = new Map<string, THREE.MeshStandardMaterial[]>();
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

  constructor(private readonly ngZone: NgZone) {
    effect(() => {
      const sides = this.sides();
      const active = this.isActive();
      const value = this.value();
      const values = this.values();

      // Consume inputs so this effect tracks them.
      void active;
      void value;
      void values;

      if (!this.scene || this.isDestroyed) {
        return;
      }

      this.updateViewportSize();

      const normalizedSides = this.normalizeSides(sides);
      if (this.builtSides !== normalizedSides) {
        this.rebuildMesh();
      }
      this.syncRollState();
    });
  }

  private bindContextEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    canvas.addEventListener(
      "webglcontextrestored",
      this.onContextRestored,
      false
    );
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
    if (this.isDestroyed) {
      return;
    }
    this.recreateDiceEngine();
  };

  private handleRenderError(): void {
    if (this.isDestroyed) {
      return;
    }
    this.cancelAnimationLoop();
    this.cancelSettle();
    this.destroyThree(false);
    if (this.retryTimeoutId !== undefined) {
      clearTimeout(this.retryTimeoutId);
    }
    this.retryTimeoutId = setTimeout(() => {
      this.retryTimeoutId = undefined;
      if (!this.isDestroyed) {
        this.recreateDiceEngine();
      }
    }, 150);
  }

  /** Releases resources owned exclusively by this widget's renderer. */
  private disposeMaterials(): void {
    this.materialCache.forEach((materials) => {
      materials.forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
    });
    this.materialCache.clear();
  }

  private recreateDiceEngine(): void {
    if (!this.canvasEl || this.isDestroyed) {
      return;
    }
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
    const normalizedSides = this.normalizeSides(this.sides());
    this.builtSides = normalizedSides;
    this.buildDiceMesh();
  }

  /**
   * Synchronize the Angular state with the renderer.
   *
   * Idle:
   *   one render only.
   *
   * Rolling:
   *   continuous RAF.
   *
   * Settling:
   *   short RAF interpolation.
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

    // --- RAMO DADO SINGOLO (Originale d20 attacco, PF, ecc.) ---
    if (!this.diceMesh) {
      return;
    }
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
      const targetIdx = Math.max(
        0,
        Math.min(this.targetQuaternions.length - 1, Math.trunc(value) - 1)
      );
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

  private initThree(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.z = 3.4;

    /**
     * Soft ambient light for readable face colors.
     */
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    /**
     * Directional key light gives the die a clear 3D volume.
     */
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(3, 4, 5);
    this.scene.add(directionalLight);

    const isMobile = this.isMobileViewport();
    const reducedMotion = this.prefersReducedMotion();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      /**
       * MSAA is expensive on old mobile GPUs.
       * The texture itself is high-resolution, so mobile still looks sharp.
       */
      antialias: !isMobile && !reducedMotion,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(this.getPixelRatio());

    /**
     * Keep colors consistent between canvas textures and final render.
     */
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    /**
     * Subtle filmic response without requiring additional post-processing.
     */
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.updateViewportSize();
  }

  private updateViewportSize(): void {
    if (!this.renderer || !this.camera) return;
    const isMulti = this.isMultiDice();
    const w = isMulti ? 230 : DICE_CANVAS_SIZE;
    const h = DICE_CANVAS_SIZE;

    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Via di mezzo per l'inquadratura: 2.7 per multi-dado, 3.4 per dado singolo
    this.camera.position.z = isMulti ? 2.7 : 3.4;
    this.camera.updateProjectionMatrix();
  }

  private isMobileViewport(): boolean {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px)").matches
    );
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  private getPixelRatio(): number {
    if (typeof window === "undefined") {
      return 1;
    }
    const dpr = window.devicePixelRatio || 1;
    if (this.isMobileViewport()) {
      /**
       * 1.25 is enough for an 80x80 widget.
       * Higher values increase GPU work much faster than visual quality.
       */
      return Math.min(dpr, 1.25);
    }
    return Math.min(dpr, 1.5);
  }

  private getFaceTextureSize(): number {
    return this.isMobileViewport()
      ? MOBILE_FACE_TEXTURE_SIZE
      : DESKTOP_FACE_TEXTURE_SIZE;
  }

  private renderFrame(): void {
    if (!this.renderer || !this.scene || !this.camera || this.isDestroyed) {
      return;
    }
    if (this.renderer.getContext().isContextLost()) {
      return;
    }
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.warn(
        "Errore durante il rendering del dado 3D, ripristino in corso...",
        error
      );
      this.handleRenderError();
    }
  }

  /**
   * Continuous rendering exists only while the dice is spinning.
   */
  private startAnimationLoop(): void {
    if (
      this.animFrameId !== undefined ||
      !this.diceMesh ||
      !this.renderer ||
      !this.scene ||
      !this.camera ||
      this.isDestroyed
    ) {
      return;
    }
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
          console.warn(
            "Errore durante il rendering del dado 3D, ripristino in corso...",
            error
          );
          this.handleRenderError();
        }
      };
      this.animFrameId = requestAnimationFrame(tick);
    });
  }

  private stopRollAnimation(targetIdx: number): void {
    if (!this.diceMesh || this.targetQuaternions.length === 0) {
      return;
    }
    this.isRollingAnim = false;
    this.cancelAnimationLoop();
    this.cancelSettle();

    this.diceMesh.position.set(0, 0, 0);

    const validIdx = Math.max(
      0,
      Math.min(this.targetQuaternions.length - 1, targetIdx)
    );
    const targetQ = this.targetQuaternions[validIdx];
    const snapQ = this.diceMesh.quaternion.clone();

    /**
     * Accessibility + performance:
     * skip interpolation when reduced motion is requested.
     */
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

  private buildDiceMesh(): void {
    if (!this.scene) {
      return;
    }
    this.cancelSettle();

    if (this.diceMesh) {
      this.scene.remove(this.diceMesh);
      this.diceMesh = undefined;
    }
    this.physicalDice.forEach((b) => this.scene?.remove(b.mesh));
    this.physicalDice = [];

    const numSides = this.normalizeSides(this.sides());
    const shape = this.getShape(numSides);
    this.targetQuaternions = shape.quaternions;
    const materials = this.getMaterials(numSides);

    if (this.isMultiDice()) {
      // --- COSTRUZIONE MULTI-DADO ---
      const list = this.values()!;
      const count = list.length;
      const shapeMult = getShapeScaleMultiplier(numSides);

      list.forEach((val, idx) => {
        const mesh = new THREE.Mesh(shape.geometry, materials);
        
        // Scala intermedia equilibrata
        const baseScale = count > 3 ? 0.48 : count === 3 ? 0.58 : 0.72;
        const finalScale = baseScale * shapeMult;
        mesh.scale.set(finalScale, finalScale, finalScale);

        this.scene!.add(mesh);

        const validIdx = Math.max(0, Math.min(this.targetQuaternions.length - 1, val - 1));
        const targetQ = this.targetQuaternions[validIdx] ?? new THREE.Quaternion();

        const spreadStep = count > 3 ? 0.95 : count === 3 ? 1.15 : 1.35;
        const spread = (idx - (count - 1) / 2) * spreadStep;

        this.physicalDice.push({
          mesh,
          pos: new THREE.Vector3(spread, 0, 0),
          vel: new THREE.Vector3(),
          rot: targetQ.clone(),
          angVel: new THREE.Vector3(),
          radius: 0.55 * finalScale,
          targetQ,
          val,
        });

        mesh.position.set(spread, 0, 0);
        mesh.quaternion.copy(targetQ);
      });
    } else {
      // --- COSTRUZIONE DADO SINGOLO (ORIGINALE) ---
      this.diceMesh = new THREE.Mesh(shape.geometry, materials);
      this.diceMesh.position.set(0, 0, 0);
      this.diceMesh.scale.set(1, 1, 1);
      this.scene.add(this.diceMesh);

      const value = this.value();
      if (value !== null && this.targetQuaternions.length > 0) {
        const idx = Math.max(
          0,
          Math.min(this.targetQuaternions.length - 1, Math.trunc(value) - 1)
        );
        this.diceMesh.quaternion.copy(this.targetQuaternions[idx]);
      }
    }
  }

  private startMultiPhysicalRoll(): void {
    this.cancelAnimationLoop();

    const count = this.physicalDice.length;
    const trayW = 2.1;
    const trayH = 0.7;

    this.physicalDice.forEach((b, idx) => {
      const spreadStep = count > 3 ? 0.9 : count === 3 ? 1.1 : 1.35;
      const spreadX = (idx - (count - 1) / 2) * spreadStep;

      b.pos.set(spreadX + (Math.random() - 0.5) * 0.25, 1.0 + Math.random() * 0.2, -0.2);
      b.vel.set(
        (Math.random() - 0.5) * 3.5,
        -3.8 - Math.random() * 1.8,
        (Math.random() - 0.5) * 2.2
      );
      b.angVel.set(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22
      );
    });

    const dt = 0.016;
    this.ngZone.runOutsideAngular(() => {
      const tick = () => {
        if (this.isDestroyed || !this.isActive()) {
          this.animFrameId = undefined;
          return;
        }
        this.updateMultiPhysicsStep(dt, trayW, trayH);
        this.renderFrame();
        this.animFrameId = requestAnimationFrame(tick);
      };
      this.animFrameId = requestAnimationFrame(tick);
    });
  }

  private updateMultiPhysicsStep(dt: number, trayW: number, trayH: number): void {
    const dice = this.physicalDice;

    dice.forEach((b) => {
      b.pos.addScaledVector(b.vel, dt);
      b.vel.y -= 22 * dt;

      const speed = b.angVel.length();
      if (speed > 0.001) {
        const axis = b.angVel.clone().normalize();
        const dq = new THREE.Quaternion().setFromAxisAngle(axis, speed * dt);
        b.rot.premultiply(dq);
      }

      if (b.pos.y <= -0.15) {
        b.pos.y = -0.15;
        if (b.vel.y < 0) {
          if (Math.abs(b.vel.y) > 0.25) {
            b.vel.y = -b.vel.y * 0.35;
            b.angVel.x += (Math.random() - 0.5) * Math.abs(b.vel.y) * 4;
            b.angVel.z += (Math.random() - 0.5) * Math.abs(b.vel.y) * 4;
          } else {
            b.vel.y = 0;
          }
        }
        b.vel.x *= 0.86;
        b.vel.z *= 0.86;
        b.angVel.multiplyScalar(0.82);
      }

      const limitX = trayW - b.radius;
      const limitZ = trayH - b.radius;

      if (Math.abs(b.pos.x) >= limitX) {
        b.pos.x = Math.sign(b.pos.x) * limitX;
        b.vel.x = -b.vel.x * 0.5;
        b.angVel.y += (Math.random() - 0.5) * 6;
      }
      if (Math.abs(b.pos.z) >= limitZ) {
        b.pos.z = Math.sign(b.pos.z) * limitZ;
        b.vel.z = -b.vel.z * 0.5;
        b.angVel.x += (Math.random() - 0.5) * 6;
      }

      b.vel.multiplyScalar(0.97);
      b.angVel.multiplyScalar(0.96);
    });

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < dice.length; i++) {
        for (let j = i + 1; j < dice.length; j++) {
          const dA = dice[i];
          const dB = dice[j];
          const delta = dB.pos.clone().sub(dA.pos);
          const dist = delta.length();
          const minDist = dA.radius + dB.radius + 0.08;

          if (dist < minDist && dist > 0.0001) {
            const normal = delta.clone().divideScalar(dist);
            const overlap = minDist - dist;

            dA.pos.addScaledVector(normal, -overlap * 0.55);
            dB.pos.addScaledVector(normal, overlap * 0.55);

            const relVel = dA.vel.clone().sub(dB.vel);
            const velAlongNormal = relVel.dot(normal);
            if (velAlongNormal > 0) {
              const impulse = 1.3 * velAlongNormal * 0.5;
              dA.vel.addScaledVector(normal, -impulse);
              dB.vel.addScaledVector(normal, impulse);

              dA.angVel.addScaledVector(normal, 8);
              dB.angVel.addScaledVector(normal, -8);
            }
          }
        }
      }
    }

    dice.forEach((b) => {
      b.mesh.position.copy(b.pos);
      b.mesh.quaternion.copy(b.rot);
    });
  }

  private stopMultiRollAnimation(): void {
    if (this.physicalDice.length === 0) return;

    this.cancelAnimationLoop();
    this.cancelSettle();

    const count = this.physicalDice.length;
    const spreadStep = count > 3 ? 0.95 : count === 3 ? 1.15 : 1.35;

    if (this.prefersReducedMotion()) {
      this.physicalDice.forEach((b, idx) => {
        const spread = (idx - (count - 1) / 2) * spreadStep;
        b.mesh.position.set(spread, 0, 0);
        b.mesh.quaternion.copy(b.targetQ);
      });
      this.renderFrame();
      return;
    }

    const initialSnaps = this.physicalDice.map((b, idx) => ({
      snapQ: b.mesh.quaternion.clone(),
      snapPos: b.mesh.position.clone(),
      targetQ: b.targetQ.clone(),
      targetPos: new THREE.Vector3(
        (idx - (count - 1) / 2) * spreadStep,
        0,
        0
      ),
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

  private normalizeSides(sides: number): number {
    const normalized = Math.trunc(sides);
    return [4, 6, 8, 10, 12, 20].includes(normalized) ? normalized : 20;
  }

  private getShape(numSides: number): DiceShape {
    let shape = SHAPE_CACHE.get(numSides);
    if (!shape) {
      shape = this.createShape(numSides);
      SHAPE_CACHE.set(numSides, shape);
    }
    return shape;
  }

  private getMaterials(numSides: number): THREE.MeshStandardMaterial[] {
    const key = `${numSides}|${this.themeColor()}|${this.labelColor()}`;
    let materials = this.materialCache.get(key);
    if (!materials) {
      materials = this.createDiceMaterials(numSides);
      this.materialCache.set(key, materials);
    }
    return materials;
  }

  private createDiceMaterials(numSides: number): THREE.MeshStandardMaterial[] {
    const materials: THREE.MeshStandardMaterial[] = [];
    const textureSize = this.getFaceTextureSize();
    const maxAnisotropy = this.renderer?.capabilities.getMaxAnisotropy() ?? 1;
    const anisotropy = Math.min(maxAnisotropy, 2);

    for (let i = 1; i <= numSides; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = textureSize;
      canvas.height = textureSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      /**
       * Render at high resolution.
       */
      ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = this.themeColor();
      ctx.fillRect(0, 0, textureSize, textureSize);

      let fontSize = Math.round(textureSize * 0.235);
      let textY = Math.round(textureSize * 0.565);
      let lineWidth = Math.round(textureSize * 0.023);

      if (numSides === 6) {
        fontSize = Math.round(textureSize * 0.39);
        textY = Math.round(textureSize * 0.5);
        lineWidth = Math.round(textureSize * 0.039);
      } else if (numSides === 10) {
        fontSize = Math.round(textureSize * 0.255);
        textY = Math.round(textureSize * 0.527);
      } else if (numSides === 12) {
        fontSize = Math.round(textureSize * 0.215);
        textY = Math.round(textureSize * 0.5);
      }

      /**
       * Preserve the project's Cinzel look while increasing raster quality.
       */
      ctx.font = `700 ${fontSize}px Cinzel, serif, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      /**
       * Dark outline protects the golden/white glyphs against all face
       * lighting conditions.
       */
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(i.toString(), textureSize / 2, textY);
      ctx.fillStyle = this.labelColor();
      ctx.fillText(i.toString(), textureSize / 2, textY);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;

      /**
       * Explicit texture filtering.
       */
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = anisotropy;

      materials.push(
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.25,
          metalness: 0.15,
          flatShading: true,
          emissive: "#2a0000",
          emissiveIntensity: 0.15,
        })
      );
    }
    return materials;
  }

  private getGeometryForSides(sides: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;

    if (sides === 10) {
      const H = 1.2;
      const R = 0.95;
      const h = H * Math.pow(Math.tan(Math.PI / 10), 2);
      const topApex = [0, H, 0];
      const botApex = [0, -H, 0];
      const uVerts: number[][] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5;
        uVerts.push([R * Math.cos(angle), h, R * Math.sin(angle)]);
      }
      const lVerts: number[][] = [];
      for (let i = 0; i < 5; i++) {
        const angle = ((i + 0.5) * 2 * Math.PI) / 5;
        lVerts.push([R * Math.cos(angle), -h, R * Math.sin(angle)]);
      }
      const positions: number[] = [];
      const uvs: number[] = [];
      const addPlanarKite = (
        A: number[],
        Right: number[],
        Bottom: number[],
        Left: number[]
      ): void => {
        const vA = new THREE.Vector3(...A);
        const vR = new THREE.Vector3(...Right);
        const vB = new THREE.Vector3(...Bottom);
        const vL = new THREE.Vector3(...Left);
        const C = new THREE.Vector3()
          .add(vA)
          .add(vR)
          .add(vB)
          .add(vL)
          .divideScalar(4);
        const v1 = new THREE.Vector3().subVectors(vR, vA);
        const v2 = new THREE.Vector3().subVectors(vL, vA);
        const N = new THREE.Vector3().crossVectors(v1, v2).normalize();
        if (N.dot(C) < 0) {
          N.negate();
        }
        const Y = new THREE.Vector3().subVectors(vA, C).normalize();
        const X = new THREE.Vector3().crossVectors(Y, N).normalize();
        const projectUV = (V: THREE.Vector3): [number, number] => {
          const diff = new THREE.Vector3().subVectors(V, C);
          return [0.5 + diff.dot(X) / 2.0, 0.5 + diff.dot(Y) / 2.0];
        };
        const uvA = projectUV(vA);
        const uvR = projectUV(vR);
        const uvB = projectUV(vB);
        const uvL = projectUV(vL);
        positions.push(...A, ...Right, ...Bottom);
        uvs.push(...uvA, ...uvR, ...uvB);
        positions.push(...A, ...Bottom, ...Left);
        uvs.push(...uvA, ...uvB, ...uvL);
      };
      for (let i = 0; i < 5; i++) {
        addPlanarKite(topApex, uVerts[(i + 1) % 5], lVerts[i], uVerts[i]);
      }
      for (let i = 0; i < 5; i++) {
        addPlanarKite(uVerts[i], lVerts[i], botApex, lVerts[(i + 4) % 5]);
      }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    } else if (sides === 6) {
      geometry = new THREE.BoxGeometry(1, 1, 1);
    } else if (sides === 12) {
      geometry = new THREE.DodecahedronGeometry(1, 0);
    } else {
      switch (sides) {
        case 8:
          geometry = new THREE.OctahedronGeometry(1, 0);
          break;
        case 4:
          geometry = new THREE.TetrahedronGeometry(1, 0);
          break;
        case 20:
        default:
          geometry = new THREE.IcosahedronGeometry(1, 0);
          break;
      }
    }

    geometry = geometry.toNonIndexed();

    geometry.computeBoundingSphere();
    const sphereRadius = geometry.boundingSphere?.radius || 1;
    if (sphereRadius > 0) {
      geometry.scale(1 / sphereRadius, 1 / sphereRadius, 1 / sphereRadius);
    }
    geometry.computeVertexNormals();

    return geometry;
  }

  private createShape(numSides: number): DiceShape {
    const geometry = this.getGeometryForSides(numSides);
    const quaternions: THREE.Quaternion[] = [];

    if (numSides === 6) {
      const eulers = [
        new THREE.Euler(0, -Math.PI / 2, 0),
        new THREE.Euler(0, Math.PI / 2, 0),
        new THREE.Euler(Math.PI / 2, 0, 0),
        new THREE.Euler(-Math.PI / 2, 0, 0),
        new THREE.Euler(0, 0, 0),
        new THREE.Euler(0, Math.PI, 0),
      ];
      for (let i = 0; i < 6; i++) {
        quaternions.push(new THREE.Quaternion().setFromEuler(eulers[i]));
      }
    } else {
      geometry.clearGroups();
      const pos = geometry.attributes["position"];
      if (!pos) {
        throw new Error(
          `Geometria del dado ${numSides} priva dell'attributo position.`
        );
      }
      if (numSides === 12) {
        const uvs: number[] = [];
        for (let i = 0; i < 12; i++) {
          geometry.addGroup(i * 9, 9, i);
          const centroid = new THREE.Vector3();
          for (let j = 0; j < 9; j++) {
            centroid.add(
              new THREE.Vector3().fromBufferAttribute(pos, i * 9 + j)
            );
          }
          centroid.divideScalar(9);
          const v0 = new THREE.Vector3().fromBufferAttribute(pos, i * 9);
          const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 9 + 1);
          const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 9 + 2);
          const normal = new THREE.Vector3()
            .crossVectors(
              new THREE.Vector3().subVectors(v1, v0),
              new THREE.Vector3().subVectors(v2, v0)
            )
            .normalize();
          if (normal.dot(centroid) < 0) {
            normal.negate();
          }
          const up = new THREE.Vector3().subVectors(v0, centroid);
          const yPrime = up
            .sub(normal.clone().multiplyScalar(up.dot(normal)))
            .normalize();
          const xPrime = new THREE.Vector3()
            .crossVectors(yPrime, normal)
            .normalize();
          const matrix = new THREE.Matrix4().set(
            xPrime.x,
            xPrime.y,
            xPrime.z,
            0,
            yPrime.x,
            yPrime.y,
            yPrime.z,
            0,
            normal.x,
            normal.y,
            normal.z,
            0,
            0,
            0,
            0,
            1
          );
          quaternions.push(
            new THREE.Quaternion().setFromRotationMatrix(matrix)
          );
          for (let j = 0; j < 9; j++) {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i * 9 + j);
            const diff = new THREE.Vector3().subVectors(v, centroid);
            uvs.push(
              0.5 + diff.dot(xPrime) / 1.5,
              0.5 + diff.dot(yPrime) / 1.5
            );
          }
        }
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      } else if (numSides === 10) {
        for (let i = 0; i < 10; i++) {
          geometry.addGroup(i * 6, 6, i);
          const vA = new THREE.Vector3().fromBufferAttribute(pos, i * 6);
          const vR = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 1);
          const vB = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 2);
          const vL = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 5);
          const centroid = new THREE.Vector3()
            .add(vA)
            .add(vR)
            .add(vB)
            .add(vL)
            .divideScalar(4);
          const normal = new THREE.Vector3()
            .crossVectors(
              new THREE.Vector3().subVectors(vR, vA),
              new THREE.Vector3().subVectors(vL, vA)
            )
            .normalize();
          if (normal.dot(centroid) < 0) {
            normal.negate();
          }
          const up = new THREE.Vector3().subVectors(vA, centroid);
          const yPrime = up
            .sub(normal.clone().multiplyScalar(up.dot(normal)))
            .normalize();
          const xPrime = new THREE.Vector3()
            .crossVectors(yPrime, normal)
            .normalize();
          const matrix = new THREE.Matrix4().set(
            xPrime.x,
            xPrime.y,
            xPrime.z,
            0,
            yPrime.x,
            yPrime.y,
            yPrime.z,
            0,
            normal.x,
            normal.y,
            normal.z,
            0,
            0,
            0,
            0,
            1
          );
          quaternions.push(
            new THREE.Quaternion().setFromRotationMatrix(matrix)
          );
        }
      } else {
        const uvs: number[] = [];
        for (let i = 0; i < numSides; i++) {
          geometry.addGroup(i * 3, 3, i);
          uvs.push(0.5, 0.9, 0.1, 0.15, 0.9, 0.15);
          const v0 = new THREE.Vector3().fromBufferAttribute(pos, i * 3);
          const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1);
          const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);
          const centroid = new THREE.Vector3()
            .add(v0)
            .add(v1)
            .add(v2)
            .divideScalar(3);
          const normal = new THREE.Vector3()
            .crossVectors(
              new THREE.Vector3().subVectors(v1, v0),
              new THREE.Vector3().subVectors(v2, v0)
            )
            .normalize();
          if (normal.dot(centroid) < 0) {
            normal.negate();
          }
          const up = new THREE.Vector3().subVectors(v0, centroid);
          const yPrime = up
            .sub(normal.clone().multiplyScalar(up.dot(normal)))
            .normalize();
          const xPrime = new THREE.Vector3()
            .crossVectors(yPrime, normal)
            .normalize();
          const matrix = new THREE.Matrix4().set(
            xPrime.x,
            xPrime.y,
            xPrime.z,
            0,
            yPrime.x,
            yPrime.y,
            yPrime.z,
            0,
            normal.x,
            normal.y,
            normal.z,
            0,
            0,
            0,
            0,
            1
          );
          quaternions.push(
            new THREE.Quaternion().setFromRotationMatrix(matrix)
          );
        }
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      }
    }
    return {
      geometry,
      quaternions,
    };
  }

  /**
   * Release Three.js resources.
   *
   * forceContextLoss is reserved for final component destruction.
   */
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
    this.disposeMaterials();
  }
}