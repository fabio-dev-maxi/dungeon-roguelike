import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  NgZone,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-dice-widget',
  standalone: true,
  templateUrl: './dice-widget.component.html',
  styleUrl: './dice-widget.component.css'
})
export class DiceWidgetComponent implements OnChanges, OnDestroy {
  @Input() value: number | null = null;
  @Input() isActive = false;
  @Input() label = 'Dado';
  @Input() themeColor = '#8b0000';
  @Input() borderColor = '#d4af37';
  @Input() labelColor = '#d4af37';

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private diceMesh?: THREE.Mesh;
  private animFrameId?: number;
  private stopAnimFrameId?: number;
  private targetQuaternions: THREE.Quaternion[] = [];

  private isRollingAnim = false;

  @ViewChild('diceCanvas') set canvasRef(ref: ElementRef<HTMLCanvasElement> | undefined) {
    if (ref && !this.scene) {
      this.initThree(ref.nativeElement);
      this.createD20();
      this.ngZone.runOutsideAngular(() => this.animate());

      if (this.isActive) {
        this.isRollingAnim = true;
      } else if (this.value !== null && this.targetQuaternions.length > 0 && this.diceMesh) {
        const idx = Math.max(0, Math.min(19, this.value - 1));
        this.diceMesh.quaternion.copy(this.targetQuaternions[idx]);
      }
    } else if (!ref && this.scene) {
      this.destroyThree();
    }
  }

  constructor(private ngZone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.diceMesh) return;

    if (this.isActive) {
      this.isRollingAnim = true;
    } else {
      this.isRollingAnim = false;
      if (this.value !== null && this.targetQuaternions.length > 0) {
        const idx = Math.max(0, Math.min(19, this.value - 1));
        this.stopRollAnimation(idx);
      }
    }
  }

  private initThree(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.z = 3.2;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(3, 4, 5);
    this.scene.add(dirLight);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(80, 80);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private createD20Materials(): THREE.MeshStandardMaterial[] {
    const materials: THREE.MeshStandardMaterial[] = [];
    for (let i = 1; i <= 20; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = this.themeColor;
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 85px Cinzel, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), 128, 162);

      materials.push(
        new THREE.MeshStandardMaterial({
          map: new THREE.CanvasTexture(canvas),
          roughness: 0.3,
          metalness: 0.2,
          flatShading: true
        })
      );
    }
    return materials;
  }

  private createD20(): void {
    if (!this.scene) return;
    const baseGeometry = new THREE.IcosahedronGeometry(1, 0);
    const geometry = baseGeometry.toNonIndexed();
    geometry.clearGroups();

    const uvs: number[] = [];
    const pos = geometry.attributes['position'];
    this.targetQuaternions = [];

    for (let i = 0; i < 20; i++) {
      geometry.addGroup(i * 3, 3, i);
      uvs.push(0.5, 0.9, 0.05, 0.1, 0.95, 0.1);

      const v0 = new THREE.Vector3().fromBufferAttribute(pos, i * 3);
      const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1);
      const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);

      const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);
      const zPrime = centroid.clone().normalize();
      const yPrime = new THREE.Vector3().subVectors(v0, centroid).normalize();
      const xPrime = new THREE.Vector3().crossVectors(yPrime, zPrime).normalize();

      const m = new THREE.Matrix4().set(
        xPrime.x, xPrime.y, xPrime.z, 0,
        yPrime.x, yPrime.y, yPrime.z, 0,
        zPrime.x, zPrime.y, zPrime.z, 0,
        0,        0,        0,        1
      );
      this.targetQuaternions.push(new THREE.Quaternion().setFromRotationMatrix(m));
    }

    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.diceMesh = new THREE.Mesh(geometry, this.createD20Materials());
    this.scene.add(this.diceMesh);
  }

  private stopRollAnimation(targetIdx: number): void {
    if (!this.diceMesh) return;
    this.isRollingAnim = false;

    if (this.stopAnimFrameId) {
      cancelAnimationFrame(this.stopAnimFrameId);
    }

    const targetQ = this.targetQuaternions[targetIdx];
    const snapQ = this.diceMesh.quaternion.clone();

    const duration = 600;
    const startTime = performance.now();

    const animateStop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      if (this.diceMesh) {
        this.diceMesh.quaternion.slerpQuaternions(snapQ, targetQ, easeOut);
      }

      if (progress < 1) {
        this.stopAnimFrameId = requestAnimationFrame(animateStop);
      } else if (this.diceMesh) {
        this.diceMesh.quaternion.copy(targetQ);
        this.stopAnimFrameId = undefined;
      }
    };
    this.stopAnimFrameId = requestAnimationFrame(animateStop);
  }

  private animate = (): void => {
    if (this.diceMesh && this.isRollingAnim) {
      this.diceMesh.rotation.x += 0.22;
      this.diceMesh.rotation.y += 0.28;
      this.diceMesh.rotation.z += 0.14;
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    this.animFrameId = requestAnimationFrame(this.animate);
  };

  private destroyThree(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.stopAnimFrameId) cancelAnimationFrame(this.stopAnimFrameId);
    this.scene = undefined;
    this.renderer = undefined;
    this.diceMesh = undefined;
  }

  ngOnDestroy(): void {
    this.destroyThree();
  }
}