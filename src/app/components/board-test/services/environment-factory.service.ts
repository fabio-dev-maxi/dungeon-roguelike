import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentFactoryService {
  private textureLoader = new THREE.TextureLoader();
  private baseTexture: THREE.Texture | null = null;
  private pendingSubTextures: { subTex: THREE.Texture; offsetX: number; offsetY: number; repeatX: number; repeatY: number }[] = [];

  constructor() {
    // Caricamento asincrono sicuro: aggiorna tutte le sub-texture non appena l'atlas è pronto
    this.textureLoader.load('images/dungeon-atlas.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this.baseTexture = tex;
      this.pendingSubTextures.forEach(item => {
        item.subTex.image = tex.image;
        item.subTex.colorSpace = THREE.SRGBColorSpace;
        item.subTex.offset.set(item.offsetX, item.offsetY);
        item.subTex.repeat.set(item.repeatX, item.repeatY);
        item.subTex.needsUpdate = true;
      });
      this.pendingSubTextures = [];
    });
  }

  public getSubTexture(offsetX: number, offsetY: number, repeatX: number, repeatY: number): THREE.Texture {
    const subTex = new THREE.Texture();
    if (this.baseTexture && this.baseTexture.image) {
      subTex.image = this.baseTexture.image;
      subTex.colorSpace = THREE.SRGBColorSpace;
      subTex.offset.set(offsetX, offsetY);
      subTex.repeat.set(repeatX, repeatY);
      subTex.needsUpdate = true;
    } else {
      this.pendingSubTextures.push({ subTex, offsetX, offsetY, repeatX, repeatY });
    }
    return subTex;
  }

  // === RITAGLIO UV DALL'ATLAS ===

  public createFloorTileMaterial(): THREE.MeshStandardMaterial {
    const tileTex = this.getSubTexture(0.02, 0.52, 0.35, 0.42);
    return new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.8, metalness: 0.1 });
  }

  public createWallMaterial(): THREE.MeshStandardMaterial {
    const wallTex = this.getSubTexture(0.02, 0.02, 0.50, 0.45);
    return new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: 0.05 });
  }

  public createCrateMaterial(): THREE.MeshStandardMaterial {
    // Coordinate ritagliate esattamente sul riquadro G (Casse)
    const crateTex = this.getSubTexture(0.57, 0.03, 0.12, 0.22);
    return new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.6, metalness: 0.1 });
  }

  public createCrystalMaterial(): THREE.MeshStandardMaterial {
    const crystalTex = this.getSubTexture(0.57, 0.68, 0.12, 0.24);
    return new THREE.MeshStandardMaterial({
      map: crystalTex,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
  }

  public createShieldMaterial(): THREE.MeshStandardMaterial {
    // Coordinate ritagliate sullo scudo araldico nel riquadro I
    const shieldTex = this.getSubTexture(0.865, 0.08, 0.065, 0.18);
    return new THREE.MeshStandardMaterial({
      map: shieldTex,
      roughness: 0.3,
      metalness: 0.4,
      side: THREE.DoubleSide
    });
  }

  public createFireMaterial(): THREE.MeshStandardMaterial {
    // Riquadro B (Fuoco) convertito in Fiamma Blu tramite Emissive Azzurro
    const fireTex = this.getSubTexture(0.72, 0.68, 0.12, 0.24);
    return new THREE.MeshStandardMaterial({
      map: fireTex,
      color: 0x38bdf8,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
  }

  // === MESH 3D PROPS ===

  public createFloorMesh(totalBoardWidth: number, wallThickness: number): THREE.Mesh {
    const outerSize = totalBoardWidth + wallThickness * 2;
    const floorGeo = new THREE.BoxGeometry(outerSize, 0.2, outerSize);
    const floorMesh = new THREE.Mesh(floorGeo, this.createWallMaterial());
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
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.createWallMaterial());
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  public createCrateMesh(size: number): THREE.Mesh {
    const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), this.createCrateMaterial());
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;
    return crateMesh;
  }

  public createBlueFireMesh(): THREE.Group {
    const fireGroup = new THREE.Group();

    // Basamento di pietre del braciere
    const stoneRingGeo = new THREE.TorusGeometry(0.3, 0.08, 6, 8);
    const stoneRing = new THREE.Mesh(stoneRingGeo, this.createWallMaterial());
    stoneRing.rotation.x = Math.PI / 2;
    stoneRing.position.y = 0.08;
    fireGroup.add(stoneRing);

    // Fiamme blu incrociate
    const fireMat = this.createFireMaterial();
    const firePlane1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), fireMat);
    firePlane1.position.y = 0.4;
    const firePlane2 = firePlane1.clone();
    firePlane2.rotation.y = Math.PI / 2;
    fireGroup.add(firePlane1, firePlane2);

    // Luce blu emessa sul pavimento e sui muri
    const blueLight = new THREE.PointLight(0x00f0ff, 2.5, 6);
    blueLight.position.set(0, 0.5, 0);
    blueLight.castShadow = true;
    fireGroup.add(blueLight);

    return fireGroup;
  }

  public createCrystalMesh(): THREE.Group {
    const group = new THREE.Group();
    const crystalMat = this.createCrystalMaterial();

    for (let i = 0; i < 4; i++) {
      const height = 0.5 + Math.random() * 0.4;
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.14, height, 5), crystalMat);
      mesh.position.set((Math.random() - 0.5) * 0.35, height / 2, (Math.random() - 0.5) * 0.35);
      mesh.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
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

    // Scudo poggiato a terra
    const shieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), shieldMat);
    shieldMesh.rotation.x = -Math.PI / 3;
    shieldMesh.rotation.z = Math.PI / 12;
    shieldMesh.position.set(0, 0.2, 0);
    shieldMesh.castShadow = true;

    const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.8 }));
    backMesh.rotation.x = Math.PI / 3;
    backMesh.position.set(0, 0.19, -0.01);

    group.add(shieldMesh, backMesh);
    return group;
  }

  public createRockMesh(): THREE.Mesh {
    const rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), this.createWallMaterial());
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