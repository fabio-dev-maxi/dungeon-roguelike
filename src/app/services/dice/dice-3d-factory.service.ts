import { Injectable } from '@angular/core';
import * as THREE from 'three';

/** Interfaccia per la geometria 3D e i quaternioni di orientamento delle facce */
export interface DiceShape {
  /** Geometria BufferGeometry del poliedro */
  geometry: THREE.BufferGeometry;
  /** Array dei quaternioni di rotazione per allineare ciascuna faccia verso la camera */
  quaternions: THREE.Quaternion[];
}

// Costanti di risoluzione delle texture per le facce dei dadi
const DESKTOP_FACE_TEXTURE_SIZE = 384;
const MOBILE_FACE_TEXTURE_SIZE = 256;

/**
 * Calcola il moltiplicatore di scala per uniformare il volume visivo dei diversi poliedri.
 * @param sides Numero di facce del dado (4, 6, 8, 10, 12, 20)
 * @returns Moltiplicatore di scala proporzionale
 */
export function getShapeScaleMultiplier(sides: number): number {
  switch (sides) {
    case 4:
      return 1.25; // Il d4 (tetraedro) necessita di maggior scala visiva
    case 6:
      return 1.25; // Il d6 (cubo) scalato a 1.25 per pareggiare gli altri dadi
    case 8:
      return 1.0;
    case 10:
      return 1.0;
    case 12:
      return 0.95;
    case 20:
    default:
      return 0.95;
  }
}

/**
 * Servizio preposto alla creazione, normalizzazione geometrica,
 * rendering delle texture 2D e gestione della memoria (caching/dispose) dei dadi 3D.
 */
@Injectable({ providedIn: 'root' })
export class Dice3dFactoryService {
  /** Cache delle geometrie calcolate per evitare di ricrearle a ogni lancio */
  private readonly shapeCache = new Map<number, DiceShape>();
  /** Cache dei materiali WebGL isolati per combinazione di colore e numero facce */
  private readonly materialCache = new Map<string, THREE.MeshStandardMaterial[]>();

  /**
   * Normalizza il numero di facce ai tipi supportati (d4, d6, d8, d10, d12, d20).
   * @param sides Numero di facce in ingresso
   */
  public normalizeSides(sides: number): number {
    const normalized = Math.trunc(sides);
    return [4, 6, 8, 10, 12, 20].includes(normalized) ? normalized : 20;
  }

  /**
   * Recupera dalla cache o genera ex-novo la geometria 3D del dado richiesto.
   * @param numSides Numero di facce
   */
  public getShape(numSides: number): DiceShape {
    let shape = this.shapeCache.get(numSides);
    if (!shape) {
      shape = this.createShape(numSides);
      this.shapeCache.set(numSides, shape);
    }
    return shape;
  }

  /**
   * Genera o recupera dalla cache l'array di materiali con le texture dei numeri applicate alle facce.
   * @param numSides Numero facce del dado
   * @param themeColor Colore di sfondo del dado (es. rosso sangue o verde)
   * @param labelColor Colore del numero (es. oro o bianco)
   * @param isMobile Se true, usa texture a risoluzione ridotta per GPU mobile
   * @param maxAnisotropy Livello massimo di anisotropia supportato dalla scheda grafica
   */
  public getMaterials(
    numSides: number,
    themeColor: string,
    labelColor: string,
    isMobile: boolean,
    maxAnisotropy = 1
  ): THREE.MeshStandardMaterial[] {
    const key = `${numSides}|${themeColor}|${labelColor}`;
    let materials = this.materialCache.get(key);
    if (!materials) {
      materials = this.createDiceMaterials(numSides, themeColor, labelColor, isMobile, maxAnisotropy);
      this.materialCache.set(key, materials);
    }
    return materials;
  }

  /**
   * Rilascia le risorse GPU impegnate dalle texture e dai materiali della cache.
   */
  public disposeMaterials(): void {
    this.materialCache.forEach((materials) => {
      materials.forEach((material) => {
        material.map?.dispose(); // Dispone la texture Canvas2D
        material.dispose();      // Dispone il materiale Shader WebGL
      });
    });
    this.materialCache.clear();
  }

  /**
   * Crea i materiali con texture 2D disegnate dinamicamente via HTML Canvas.
   */
  private createDiceMaterials(
    numSides: number,
    themeColor: string,
    labelColor: string,
    isMobile: boolean,
    maxAnisotropy: number
  ): THREE.MeshStandardMaterial[] {
    const materials: THREE.MeshStandardMaterial[] = [];
    const textureSize = isMobile ? MOBILE_FACE_TEXTURE_SIZE : DESKTOP_FACE_TEXTURE_SIZE;
    const anisotropy = Math.min(maxAnisotropy, 2);

    for (let i = 1; i <= numSides; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = textureSize;
      canvas.height = textureSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      // Disegna lo sfondo colorato della faccia
      ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = themeColor;
      ctx.fillRect(0, 0, textureSize, textureSize);

      // Calibrazione della dimensione del font Cinzel in base al tipo di dado
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

      ctx.font = `700 ${fontSize}px Cinzel, serif, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Tratto d'ombra scuro di contorno per migliorare la leggibilità
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(i.toString(), textureSize / 2, textY);

      // Riempimento interno del numero
      ctx.fillStyle = labelColor;
      ctx.fillText(i.toString(), textureSize / 2, textY);

      // Conversione del Canvas 2D in Texture Three.js
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
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

  /**
   * Genera la geometria nativa Three.js e applica la normalizzazione a raggio unitario.
   */
  private getGeometryForSides(sides: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;

    // Costruzione custom per il trapezoedro pentagonale (d10)
    if (sides === 10) {
      const H = 1.2, R = 0.95;
      const h = H * Math.pow(Math.tan(Math.PI / 10), 2);
      const topApex = [0, H, 0], botApex = [0, -H, 0];
      const uVerts: number[][] = [], lVerts: number[][] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5;
        uVerts.push([R * Math.cos(angle), h, R * Math.sin(angle)]);
        lVerts.push([R * Math.cos(((i + 0.5) * 2 * Math.PI) / 5), -h, R * Math.sin(((i + 0.5) * 2 * Math.PI) / 5)]);
      }
      const positions: number[] = [], uvs: number[] = [];
      const addPlanarKite = (A: number[], Right: number[], Bottom: number[], Left: number[]) => {
        const vA = new THREE.Vector3(...A), vR = new THREE.Vector3(...Right), vB = new THREE.Vector3(...Bottom), vL = new THREE.Vector3(...Left);
        const C = new THREE.Vector3().add(vA).add(vR).add(vB).add(vL).divideScalar(4);
        const N = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(vR, vA), new THREE.Vector3().subVectors(vL, vA)).normalize();
        if (N.dot(C) < 0) N.negate();
        const Y = new THREE.Vector3().subVectors(vA, C).normalize();
        const X = new THREE.Vector3().crossVectors(Y, N).normalize();
        const projectUV = (V: THREE.Vector3): [number, number] => {
          const diff = new THREE.Vector3().subVectors(V, C);
          return [0.5 + diff.dot(X) / 2.0, 0.5 + diff.dot(Y) / 2.0];
        };
        positions.push(...A, ...Right, ...Bottom); uvs.push(...projectUV(vA), ...projectUV(vR), ...projectUV(vB));
        positions.push(...A, ...Bottom, ...Left); uvs.push(...projectUV(vA), ...projectUV(vB), ...projectUV(vL));
      };
      for (let i = 0; i < 5; i++) addPlanarKite(topApex, uVerts[(i + 1) % 5], lVerts[i], uVerts[i]);
      for (let i = 0; i < 5; i++) addPlanarKite(uVerts[i], lVerts[i], botApex, lVerts[(i + 4) % 5]);
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    } else if (sides === 6) {
      geometry = new THREE.BoxGeometry(1, 1, 1);
    } else if (sides === 12) {
      geometry = new THREE.DodecahedronGeometry(1, 0);
    } else {
      switch (sides) {
        case 8: geometry = new THREE.OctahedronGeometry(1, 0); break;
        case 4: geometry = new THREE.TetrahedronGeometry(1, 0); break;
        case 20: default: geometry = new THREE.IcosahedronGeometry(1, 0); break;
      }
    }

    // Conversione a geometria non indicizzata per applicare materiali separati a ciascuna faccia
    geometry = geometry.toNonIndexed();

    // Normalizzazione matematica del raggio della sfera circoscritta ad un valore unitario (R = 1.0)
    geometry.computeBoundingSphere();
    const sphereRadius = geometry.boundingSphere?.radius || 1;
    if (sphereRadius > 0) {
      geometry.scale(1 / sphereRadius, 1 / sphereRadius, 1 / sphereRadius);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  /**
   * Crea la struttura geometrica completa calcolando i quaternioni d'orientamento per ogni faccia.
   */
  private createShape(numSides: number): DiceShape {
    const geometry = this.getGeometryForSides(numSides);
    const quaternions: THREE.Quaternion[] = [];

    if (numSides === 6) {
      // Rotazioni Eulero standard per le 6 facce del cubo d6
      const eulers = [
        new THREE.Euler(0, -Math.PI / 2, 0),
        new THREE.Euler(0, Math.PI / 2, 0),
        new THREE.Euler(Math.PI / 2, 0, 0),
        new THREE.Euler(-Math.PI / 2, 0, 0),
        new THREE.Euler(0, 0, 0),
        new THREE.Euler(0, Math.PI, 0),
      ];
      eulers.forEach((e) => quaternions.push(new THREE.Quaternion().setFromEuler(e)));
    } else {
      geometry.clearGroups();
      const pos = geometry.attributes["position"];
      if (!pos) throw new Error(`Geometria del dado ${numSides} priva dell'attributo position.`);

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
          const normal = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0)).normalize();
          if (normal.dot(centroid) < 0) normal.negate();
          const up = new THREE.Vector3().subVectors(v0, centroid);
          const yPrime = up.sub(normal.clone().multiplyScalar(up.dot(normal))).normalize();
          const xPrime = new THREE.Vector3().crossVectors(yPrime, normal).normalize();
          const matrix = new THREE.Matrix4().set(xPrime.x, xPrime.y, xPrime.z, 0, yPrime.x, yPrime.y, yPrime.z, 0, normal.x, normal.y, normal.z, 0, 0, 0, 0, 1);
          quaternions.push(new THREE.Quaternion().setFromRotationMatrix(matrix));
          for (let j = 0; j < 9; j++) {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i * 9 + j);
            const diff = new THREE.Vector3().subVectors(v, centroid);
            uvs.push(0.5 + diff.dot(xPrime) / 1.5, 0.5 + diff.dot(yPrime) / 1.5);
          }
        }
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      } else if (numSides === 10) {
        for (let i = 0; i < 10; i++) {
          geometry.addGroup(i * 6, 6, i);
          const vA = new THREE.Vector3().fromBufferAttribute(pos, i * 6);
          const vR = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 1);
          const vL = new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 5);
          const centroid = new THREE.Vector3().add(vA).add(vR).add(new THREE.Vector3().fromBufferAttribute(pos, i * 6 + 2)).add(vL).divideScalar(4);
          const normal = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(vR, vA), new THREE.Vector3().subVectors(vL, vA)).normalize();
          if (normal.dot(centroid) < 0) normal.negate();
          const up = new THREE.Vector3().subVectors(vA, centroid);
          const yPrime = up.sub(normal.clone().multiplyScalar(up.dot(normal))).normalize();
          const xPrime = new THREE.Vector3().crossVectors(yPrime, normal).normalize();
          const matrix = new THREE.Matrix4().set(xPrime.x, xPrime.y, xPrime.z, 0, yPrime.x, yPrime.y, yPrime.z, 0, normal.x, normal.y, normal.z, 0, 0, 0, 0, 1);
          quaternions.push(new THREE.Quaternion().setFromRotationMatrix(matrix));
        }
      } else {
        const uvs: number[] = [];
        for (let i = 0; i < numSides; i++) {
          geometry.addGroup(i * 3, 3, i);
          uvs.push(0.5, 0.9, 0.1, 0.15, 0.9, 0.15);
          const v0 = new THREE.Vector3().fromBufferAttribute(pos, i * 3);
          const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1);
          const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);
          const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);
          const normal = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0)).normalize();
          if (normal.dot(centroid) < 0) normal.negate();
          const up = new THREE.Vector3().subVectors(v0, centroid);
          const yPrime = up.sub(normal.clone().multiplyScalar(up.dot(normal))).normalize();
          const xPrime = new THREE.Vector3().crossVectors(yPrime, normal).normalize();
          const matrix = new THREE.Matrix4().set(xPrime.x, xPrime.y, xPrime.z, 0, yPrime.x, yPrime.y, yPrime.z, 0, normal.x, normal.y, normal.z, 0, 0, 0, 0, 1);
          quaternions.push(new THREE.Quaternion().setFromRotationMatrix(matrix));
        }
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      }
    }
    return { geometry, quaternions };
  }
}