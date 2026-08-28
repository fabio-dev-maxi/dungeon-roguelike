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
  @Input() sides: number = 20;
  @Input() label = 'Dado';
  @Input() themeColor = '#8b0000';
  @Input() labelColor = '#ffffff'; // <- Definito qui, bianco di default

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
      this.buildDiceMesh();
      this.ngZone.runOutsideAngular(() => this.animate());
      if (this.isActive) {
        this.isRollingAnim = true;
      }
    } else if (!ref && this.scene) {
      this.destroyThree();
    }
  }

  constructor(private ngZone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sides'] && !changes['sides'].firstChange) {
      this.buildDiceMesh();
    }

    if (!this.diceMesh) return;

    if (this.isActive) {
      this.isRollingAnim = true;
    } else {
      this.isRollingAnim = false;
      if (this.value !== null && this.targetQuaternions.length > 0) {
        const idx = Math.max(0, Math.min(this.sides - 1, this.value - 1));
        this.stopRollAnimation(idx);
      }
    }
  }

  private initThree(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.z = 3.4;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(3, 4, 5);
    this.scene.add(dirLight);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(80, 80);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private getGeometryForSides(sides: number): THREE.BufferGeometry {
    if (sides === 10) {
      const H = 1.20;
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

      const addPlanarKite = (A: number[], Right: number[], Bottom: number[], Left: number[]) => {
        const vA = new THREE.Vector3(...A), vR = new THREE.Vector3(...Right), vB = new THREE.Vector3(...Bottom), vL = new THREE.Vector3(...Left);
        const C = new THREE.Vector3().add(vA).add(vR).add(vB).add(vL).divideScalar(4);
        const v1 = new THREE.Vector3().subVectors(vR, vA), v2 = new THREE.Vector3().subVectors(vL, vA);
        const N = new THREE.Vector3().crossVectors(v1, v2).normalize();
        if (N.dot(C) < 0) N.negate();
        const Y = new THREE.Vector3().subVectors(vA, C).normalize();
        const X = new THREE.Vector3().crossVectors(Y, N).normalize();

        const projectUV = (V: THREE.Vector3): [number, number] => {
          const diff = new THREE.Vector3().subVectors(V, C);
          return [0.5 + diff.dot(X) / 2.0, 0.5 + diff.dot(Y) / 2.0];
        };

        const uvA = projectUV(vA), uvR = projectUV(vR), uvB = projectUV(vB), uvL = projectUV(vL);
        positions.push(...A, ...Right, ...Bottom); uvs.push(...uvA, ...uvR, ...uvB);
        positions.push(...A, ...Bottom, ...Left); uvs.push(...uvA, ...uvB, ...uvL);
      };

      for (let i = 0; i < 5; i++) addPlanarKite(topApex, uVerts[(i + 1) % 5], lVerts[i], uVerts[i]);
      for (let i = 0; i < 5; i++) addPlanarKite(uVerts[i], lVerts[i], botApex, lVerts[(i + 4) % 5]);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.computeVertexNormals();
      return geometry;
    }

    if (sides === 6) {
      return new THREE.BoxGeometry(1.3, 1.3, 1.3);
    }

    if (sides === 12) {
      return new THREE.DodecahedronGeometry(1.1, 0).toNonIndexed();
    }

    let geom: THREE.BufferGeometry;
    switch (sides) {
      case 8: geom = new THREE.OctahedronGeometry(1, 0); break;
      case 4: geom = new THREE.TetrahedronGeometry(1, 0); break;
      case 20: default: geom = new THREE.IcosahedronGeometry(1, 0); break;
    }
    return geom.toNonIndexed();
  }

  private createDiceMaterials(numSides: number): THREE.MeshStandardMaterial[] {
    const materials: THREE.MeshStandardMaterial[] = [];

    for (let i = 1; i <= numSides; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Sfondo colore tema senza bordi
      ctx.fillStyle = this.themeColor;
      ctx.fillRect(0, 0, 256, 256);

      let fontSize = '60px';
      let textY = 128;
      let lineWidth = 6;

      if (numSides === 6) {
        fontSize = '100px';
        textY = 128;
        lineWidth = 10;
      } else if (numSides === 10) {
        fontSize = '65px';
        textY = 135; 
        lineWidth = 6;
      } else if (numSides === 12) {
        fontSize = '55px';
        textY = 128;
        lineWidth = 6;
      } else {
        fontSize = '60px';
        textY = 145; 
        lineWidth = 6;
      }

      ctx.font = `bold ${fontSize} Cinzel, serif, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Bordo nero del testo
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(i.toString(), 128, textY);
      
      // Riempimento testo (usa l'input labelColor)
      ctx.fillStyle = this.labelColor;
      ctx.fillText(i.toString(), 128, textY);

      materials.push(
        new THREE.MeshStandardMaterial({
          map: new THREE.CanvasTexture(canvas),
          roughness: 0.25,
          metalness: 0.15,
          flatShading: true
        })
      );
    }
    return materials;
  }

  private buildDiceMesh(): void {
    if (!this.scene) return;

    if (this.diceMesh) {
      this.scene.remove(this.diceMesh);
      this.diceMesh.geometry.dispose();
      if (Array.isArray(this.diceMesh.material)) {
        this.diceMesh.material.forEach(m => m.dispose());
      }
      this.diceMesh = undefined;
    }

    const numSides = this.sides || 20;
    const geometry = this.getGeometryForSides(numSides);
    this.targetQuaternions = [];

    if (numSides === 6) {
      const eulers = [
        new THREE.Euler(0, -Math.PI / 2, 0),
        new THREE.Euler(0, Math.PI / 2, 0),
        new THREE.Euler(Math.PI / 2, 0, 0),
        new THREE.Euler(-Math.PI / 2, 0, 0),
        new THREE.Euler(0, 0, 0),
        new THREE.Euler(0, Math.PI, 0)
      ];
      for (let i = 0; i < 6; i++) {
        this.targetQuaternions.push(new THREE.Quaternion().setFromEuler(eulers[i]));
      }
    } else {
      geometry.clearGroups();
      const pos = geometry.attributes['position'];

      if (numSides === 12) {
        const uvs: number[] = [];
        for (let i = 0; i < 12; i++) {
          geometry.addGroup(i * 9, 9, i);

          const centroid = new THREE.Vector3();
          for (let j = 0; j < 9; j++) centroid.add(new THREE.Vector3().fromBufferAttribute(pos, i * 9 + j));
          centroid.divideScalar(9);

          const v0 = new THREE.Vector3().fromBufferAttribute(pos, i * 9);
          const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 9 + 1);
          const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 9 + 2);

          const normal = new THREE.Vector3().crossVectors(
            new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0)
          ).normalize();
          if (normal.dot(centroid) < 0) normal.negate();

          const up = new THREE.Vector3().subVectors(v0, centroid);
          const yPrime = up.sub(normal.clone().multiplyScalar(up.dot(normal))).normalize();
          const xPrime = new THREE.Vector3().crossVectors(yPrime, normal).normalize();

          const m = new THREE.Matrix4().set(xPrime.x, xPrime.y, xPrime.z, 0, yPrime.x, yPrime.y, yPrime.z, 0, normal.x, normal.y, normal.z, 0, 0, 0, 0, 1);
          this.targetQuaternions.push(new THREE.Quaternion().setFromRotationMatrix(m));

          for (let j = 0; j < 9; j++) {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i * 9 + j);
            const diff = new THREE.Vector3().subVectors(v, centroid);
            uvs.push(0.5 + (diff.dot(xPrime) / 1.5), 0.5 + (diff.dot(yPrime) / 1.5));
          }
        }
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      } else if (numSides === 10) {
        for (let i = 0; i < 10; i++) {
          geometry.addGroup(i * 6, 6, i);
          const vA = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 0);
          const vR = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 1);
          const vB = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 2);
          const vL = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 5);

          const centroid = new THREE.Vector3().add(vA).add(vR).add(vB).add(vL).divideScalar(4);
          const normal = new THREE.Vector3().crossVectors(
            new THREE.Vector3().subVectors(vR, vA),
            new THREE.Vector3().subVectors(vL, vA)
          ).normalize();
          if (normal.dot(centroid) < 0) normal.negate();

          const up = new THREE.Vector3().subVectors(vA, centroid);
          const yPrime = up.sub(normal.clone().multiplyScalar(up.dot(normal))).normalize();
          const xPrime = new THREE.Vector3().crossVectors(yPrime, normal).normalize();

          const m = new THREE.Matrix4().set(
            xPrime.x, xPrime.y, xPrime.z, 0,
            yPrime.x, yPrime.y, yPrime.z, 0,
            normal.x, normal.y, normal.z, 0,
            0, 0, 0, 1
          );
          this.targetQuaternions.push(new THREE.Quaternion().setFromRotationMatrix(m));
        }
      } else {
        const uvs: number[] = [];
        for (let i = 0; i < numSides; i++) {
          geometry.addGroup(i * 3, 3, i);
          uvs.push(0.5, 0.90, 0.10, 0.15, 0.90, 0.15);

          const v0 = new THREE.Vector3().fromBufferAttribute(pos, i * 3);
          const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1);
          const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);

          const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);
          const normal = new THREE.Vector3().crossVectors(
            new THREE.Vector3().subVectors(v1, v0),
            new THREE.Vector3().subVectors(v2, v0)
          ).normalize();
          if (normal.dot(centroid) < 0) normal.negate();

          const up = new THREE.Vector3().subVectors(v0, centroid);
          const yPrime = up.sub(normal.clone().multiplyScalar(up.dot(normal))).normalize();
          const xPrime = new THREE.Vector3().crossVectors(yPrime, normal).normalize();

          const m = new THREE.Matrix4().set(
            xPrime.x, xPrime.y, xPrime.z, 0,
            yPrime.x, yPrime.y, yPrime.z, 0,
            normal.x, normal.y, normal.z, 0,
            0, 0, 0, 1
          );
          this.targetQuaternions.push(new THREE.Quaternion().setFromRotationMatrix(m));
        }
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      }
    }

    const materials = this.createDiceMaterials(numSides);
    this.diceMesh = new THREE.Mesh(geometry, materials);
    this.scene.add(this.diceMesh);

    if (this.value !== null && this.targetQuaternions.length > 0) {
      const idx = Math.max(0, Math.min(numSides - 1, this.value - 1));
      this.diceMesh.quaternion.copy(this.targetQuaternions[idx]);
    }
  }

  private stopRollAnimation(targetIdx: number): void {
    if (!this.diceMesh || this.targetQuaternions.length === 0) return;
    this.isRollingAnim = false;
    if (this.stopAnimFrameId) {
      cancelAnimationFrame(this.stopAnimFrameId);
    }

    const validIdx = Math.max(0, Math.min(this.targetQuaternions.length - 1, targetIdx));
    const targetQ = this.targetQuaternions[validIdx];
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