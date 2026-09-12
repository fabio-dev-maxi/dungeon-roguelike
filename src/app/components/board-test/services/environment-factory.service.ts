import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentFactoryService {
  private textureLoader = new THREE.TextureLoader();
  private atlasTexture: THREE.Texture | null = null;

  constructor() {
    this.loadAtlas();
  }

  private loadAtlas(): THREE.Texture {
    if (!this.atlasTexture) {
      this.atlasTexture = this.textureLoader.load('images/dungeon-atlas.jpg');
      this.atlasTexture.colorSpace = THREE.SRGBColorSpace;
    }
    return this.atlasTexture;
  }

  public getSubTexture(offsetX: number, offsetY: number, repeatX: number, repeatY: number): THREE.Texture {
    const baseTex = this.loadAtlas();
    const subTex = baseTex.clone();
    subTex.needsUpdate = true;
    subTex.offset.set(offsetX, offsetY);
    subTex.repeat.set(repeatX, repeatY);
    return subTex;
  }

  // === MATERIALI DALL'ATLAS ===

  public createFloorTileMaterial(): THREE.MeshStandardMaterial {
    const tileTex = this.getSubTexture(0.01, 0.52, 0.37, 0.40);
    return new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.8,
      metalness: 0.1
    });
  }

  public createWallMaterial(): THREE.MeshStandardMaterial {
    const wallTex = this.getSubTexture(0.0, 0.0, 0.55, 0.50);
    return new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.9,
      metalness: 0.05
    });
  }

  public createCrateMaterial(): THREE.MeshStandardMaterial {
    const crateTex = this.getSubTexture(0.56, 0.02, 0.18, 0.25);
    return new THREE.MeshStandardMaterial({
      map: crateTex,
      roughness: 0.7,
      metalness: 0.1
    });
  }

  public createCrystalMaterial(): THREE.MeshStandardMaterial {
    const crystalTex = this.getSubTexture(0.56, 0.62, 0.14, 0.35);
    return new THREE.MeshStandardMaterial({
      map: crystalTex,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1
    });
  }

  public createShieldMaterial(): THREE.MeshStandardMaterial {
    // Coordinata UV mirata sull'icona dello scudo nel riquadro I dell'atlas
    const shieldTex = this.getSubTexture(0.85, 0.08, 0.14, 0.22);
    return new THREE.MeshStandardMaterial({
      map: shieldTex,
      roughness: 0.4,
      metalness: 0.3,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  public createWoodCrateTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#5C2E0B';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 120, 120);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // === MESH E PROPS 3D ===

  public createFloorMesh(totalBoardWidth: number, wallThickness = 0.8): THREE.Mesh {
    // Dimensione del basamento esattamente pari all'esterno delle mura per evitare sporgenze
    const outerSize = totalBoardWidth + wallThickness * 2;
    const floorGeo = new THREE.BoxGeometry(outerSize, 0.2, outerSize);
    const floorMat = this.createWallMaterial();
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.1, 0);
    floorMesh.receiveShadow = true;
    return floorMesh;
  }

  public createTilesGroup(boardSize: number, tileSize: number, offset: number): THREE.Group {
    const tilesGroup = new THREE.Group();
    const tileMat = this.createFloorTileMaterial();

    for (let x = 0; x < boardSize; x++) {
      for (let z = 0; z < boardSize; z++) {
        const tileGeo = new THREE.BoxGeometry(tileSize * 0.98, 0.08, tileSize * 0.98);
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(x * tileSize - offset, 0.04, z * tileSize - offset);
        tile.receiveShadow = true;
        tile.userData = { isTile: true, gridX: x, gridZ: z };
        tilesGroup.add(tile);
      }
    }
    return tilesGroup;
  }

  public createCaveWallMesh(width: number, height: number, depth: number): THREE.Mesh {
    const wallMat = this.createWallMaterial();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  public createCrateMesh(size: number, customTexture?: THREE.CanvasTexture | THREE.Texture): THREE.Mesh {
    const crateMat = customTexture
      ? new THREE.MeshStandardMaterial({ map: customTexture, roughness: 0.7 })
      : this.createCrateMaterial();

    const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), crateMat);
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;
    return crateMesh;
  }

  public createCrystalMesh(): THREE.Group {
    const group = new THREE.Group();
    const crystalMat = this.createCrystalMaterial();
    const count = 4;

    for (let i = 0; i < count; i++) {
      const height = 0.5 + Math.random() * 0.4;
      const geo = new THREE.ConeGeometry(0.14, height, 5);
      const mesh = new THREE.Mesh(geo, crystalMat);
      mesh.position.set(
        (Math.random() - 0.5) * 0.35,
        height / 2,
        (Math.random() - 0.5) * 0.35
      );
      mesh.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.3
      );
      mesh.castShadow = true;
      group.add(mesh);
    }

    const light = new THREE.PointLight(0x00f0ff, 1.5, 3);
    light.position.set(0, 0.5, 0);
    group.add(light);

    return group;
  }

  public createShieldMesh(): THREE.Group {
    const group = new THREE.Group();
    const shieldMat = this.createShieldMaterial();

    const shieldGeo = new THREE.PlaneGeometry(0.5, 0.7);
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.rotation.x = -Math.PI / 3;
    shieldMesh.rotation.z = Math.PI / 12;
    shieldMesh.position.set(0, 0.2, 0);
    shieldMesh.castShadow = true;
    shieldMesh.receiveShadow = true;

    // Retro scuro in metallo per dare spessore 3D
    const backGeo = new THREE.PlaneGeometry(0.5, 0.7);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.8 });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.rotation.x = Math.PI / 3;
    backMesh.position.set(0, 0.19, -0.01);

    group.add(shieldMesh, backMesh);
    return group;
  }

  public createRockMesh(): THREE.Mesh {
    const rockGeo = new THREE.DodecahedronGeometry(0.45, 1);
    const rockMat = this.createWallMaterial();
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    return rockMesh;
  }

  public createSelectionRing(): THREE.Mesh {
    const ringGeo = new THREE.RingGeometry(0.38, 0.52, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.visible = false;
    return selectionRing;
  }
}